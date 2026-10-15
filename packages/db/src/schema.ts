import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authenticatedRole, authUsers } from 'drizzle-orm/supabase'

// Every public table has RLS on. The API connects as `postgres` and skips RLS; RLS protects the Data API, which anyone can
// reach with the public key. Policies only ever let a signed-in user READ their own rows; every write goes through the API.
// Triggers, functions and the append-only rules live in the custom migration (0002_auth_profiles.sql).

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
const me = sql`(select auth.uid())`

export const organisationType = pgEnum('organisation_type', ['business', 'provider'])
export const organisationStatus = pgEnum('organisation_status', ['pending', 'changes_requested', 'active', 'suspended', 'rejected'])
// Provider roles follow Hurak (owner … assistant); business roles are owner and member. A trigger checks the role fits the type.
export const memberRole = pgEnum('member_role', [
  'owner',
  'admin',
  'tutor',
  'course_editor',
  'support',
  'sales',
  'accounts',
  'marketing',
  'assistant',
  'member',
])
export const memberStatus = pgEnum('member_status', ['invited', 'active'])
export const adminPreset = pgEnum('admin_preset', ['full', 'support', 'finance', 'custom'])
export const actorIdentity = pgEnum('actor_identity', ['student', 'business', 'provider', 'admin', 'system'])

// One row per sign-in (created by the auth.users trigger). Email and "verified" stay in auth.users.
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull().default(''),
    lastName: text('last_name').notNull().default(''),
    avatarUrl: text('avatar_url'),
    dateOfBirth: date('date_of_birth'),
    phone: text('phone'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: text('city'),
    postcode: text('postcode'),
    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
    marketingOptInAt: timestamp('marketing_opt_in_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [pgPolicy('profiles: read own', { for: 'select', to: authenticatedRole, using: sql`${me} = ${t.id}` })],
).enableRLS()

// A business or a training provider. Providers get a public page at /providers/[slug].
export const organisations = pgTable(
  'organisations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: organisationType('type').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    mobile: text('mobile'),
    status: organisationStatus('status').notNull().default('pending'),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
    termsVersion: text('terms_version'),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('organisations_slug_key').on(t.slug),
    index('organisations_created_by_idx').on(t.createdBy),
    pgPolicy('organisations: read where member', {
      for: 'select',
      to: authenticatedRole,
      using: sql`exists (select 1 from public.organisation_members m where m.organisation_id = ${t.id} and m.user_id = ${me})`,
    }),
  ],
).enableRLS()

export const organisationMembers = pgTable(
  'organisation_members',
  {
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull(),
    status: memberStatus('status').notNull().default('active'),
    invitedBy: uuid('invited_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.organisationId, t.userId] }),
    index('organisation_members_user_idx').on(t.userId),
    index('organisation_members_invited_by_idx').on(t.invitedBy),
    // exactly one account owner per organisation
    uniqueIndex('organisation_members_one_owner').on(t.organisationId).where(sql`${t.role} = 'owner'`),
    pgPolicy('organisation_members: read own', { for: 'select', to: authenticatedRole, using: sql`${me} = ${t.userId}` }),
  ],
).enableRLS()

// Platform staff. One role with switches (`permissions`) and presets; no Data API access at all (RLS on, no policy).
export const adminUsers = pgTable(
  'admin_users',
  {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  active: boolean('active').notNull().default(true),
  preset: adminPreset('preset').notNull().default('custom'),
  permissions: text('permissions').array().notNull().default(sql`'{}'::text[]`),
  refundLimitPence: integer('refund_limit_pence').notNull().default(10000),
  createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  },
  (t) => [index('admin_users_created_by_idx').on(t.createdBy)],
).enableRLS()

// Append-only record of every action (who, as which identity, what, on what, when). No foreign keys, so deleting a user or
// an organisation never has to change a log row; update, delete and truncate are blocked by triggers. No Data API access.
export const activityLog = pgTable(
  'activity_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
    actorUserId: uuid('actor_user_id'),
    actorIdentity: actorIdentity('actor_identity').notNull(),
    organisationId: uuid('organisation_id'),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    metadata: jsonb('metadata').notNull().default({}),
    ip: text('ip'),
  },
  (t) => [
    index('activity_log_at_idx').on(t.at.desc()),
    index('activity_log_actor_idx').on(t.actorUserId, t.at.desc()),
    index('activity_log_target_idx').on(t.targetType, t.targetId),
    index('activity_log_action_idx').on(t.action),
  ],
).enableRLS()

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: createdAt(),
}).enableRLS()

export type Profile = typeof profiles.$inferSelect
export type Organisation = typeof organisations.$inferSelect
export type OrganisationMember = typeof organisationMembers.$inferSelect
export type AdminUser = typeof adminUsers.$inferSelect
export type ActivityLogEntry = typeof activityLog.$inferSelect
export type NewActivityLogEntry = typeof activityLog.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
