import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
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
    // when the welcome email went out (sent once, on the first confirmed sign-in; null = not sent yet)
    welcomeSentAt: timestamp('welcome_sent_at', { withTimezone: true }),
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
    // the person's job in the organisation, as they wrote it (a business account's "Your role", e.g. Operations Manager)
    jobTitle: text('job_title'),
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

// ---- the course catalogue's one list (brief §4) ---------------------------------------------------------------------------
// Categories > sub-categories > topics, delivery methods and course levels, stored once. The public filters, the provider's
// course form and the admin all read this list through the API, so they can never drift apart. Public reference data: read by
// the API only (RLS on, no policy), changed only by admins (Part B: Catalogue settings). `position` orders each level;
// `active` = false retires an entry without breaking courses that use it.
// A method's and a level's web address is always its name in lower case with hyphens ("Live online" -> live-online), so the
// name a person sees and the word in the address are the same word; the database refuses anything else.
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    active: boolean('active').notNull().default(true),
  },
  (t) => [uniqueIndex('categories_slug_key').on(t.slug), check('categories_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)],
).enableRLS()

export const subcategories = pgTable(
  'subcategories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    active: boolean('active').notNull().default(true),
  },
  (t) => [uniqueIndex('subcategories_category_slug_key').on(t.categoryId, t.slug), check('subcategories_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)],
).enableRLS()

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subcategoryId: uuid('subcategory_id')
      .notNull()
      .references(() => subcategories.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    active: boolean('active').notNull().default(true),
  },
  (t) => [uniqueIndex('topics_subcategory_slug_key').on(t.subcategoryId, t.slug), check('topics_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)],
).enableRLS()

export const deliveryMethods = pgTable(
  'delivery_methods',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    active: boolean('active').notNull().default(true),
  },
  (t) => [check('delivery_methods_slug_is_name', sql`${t.slug} = trim(both '-' from lower(regexp_replace(${t.name}, '[^A-Za-z0-9]+', '-', 'g')))`)],
).enableRLS()

export const courseLevels = pgTable(
  'course_levels',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    active: boolean('active').notNull().default(true),
  },
  (t) => [check('course_levels_slug_is_name', sql`${t.slug} = trim(both '-' from lower(regexp_replace(${t.name}, '[^A-Za-z0-9]+', '-', 'g')))`)],
).enableRLS()

export type Profile = typeof profiles.$inferSelect
export type Organisation = typeof organisations.$inferSelect
export type OrganisationMember = typeof organisationMembers.$inferSelect
export type AdminUser = typeof adminUsers.$inferSelect
export type ActivityLogEntry = typeof activityLog.$inferSelect
export type NewActivityLogEntry = typeof activityLog.$inferInsert
export type Category = typeof categories.$inferSelect
export type DeliveryMethod = typeof deliveryMethods.$inferSelect
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
