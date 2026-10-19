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
    // why the status is what it is, from the admin who set it (changes asked for, rejected, suspended); the provider sees it
    statusNote: text('status_note'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
    // a provider's own commission in basis points (2500 = 25%); null = the platform default (platform_settings)
    commissionBps: integer('commission_bps'),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
    termsVersion: text('terms_version'),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('organisations_slug_key').on(t.slug),
    index('organisations_created_by_idx').on(t.createdBy),
    check('organisations_commission_range', sql`${t.commissionBps} between 0 and 6000`),
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

// Platform-wide settings an admin changes (for example the default commission), one row per key. Read and written by the API
// only (RLS on, no policy); a key with no row uses the API's built-in default.
export const platformSettings = pgTable(
  'platform_settings',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull(),
    updatedBy: uuid('updated_by').references(() => authUsers.id, { onDelete: 'set null' }),
    updatedAt: updatedAt(),
  },
  (t) => [index('platform_settings_updated_by_idx').on(t.updatedBy)],
).enableRLS()

// The site's editable content (Part B, B2): the trust numbers, the homepage's featured courses, testimonials and so on, one row
// per key, each in the shape the API checks for that key. A key with no row uses the website's built-in wording, so the site
// reads the same until an admin changes something. Read publicly through the API; written by admins only (RLS on, no policy).
export const siteContent = pgTable(
  'site_content',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull(),
    updatedBy: uuid('updated_by').references(() => authUsers.id, { onDelete: 'set null' }),
    updatedAt: updatedAt(),
  },
  (t) => [index('site_content_updated_by_idx').on(t.updatedBy)],
).enableRLS()

// Every version of every piece of site content that was ever saved: what an admin can look back at (the legal pages in
// particular: what did the terms say on a given day). Append-only, like the activity log: update, delete and truncate are
// blocked by a trigger (migration 0014). Read and written by the API only.
export const siteContentVersions = pgTable(
  'site_content_versions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    // no foreign key (like the activity log): removing an account must never have to change a history row
    savedBy: uuid('saved_by'),
    savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('site_content_versions_key_idx').on(t.key, t.savedAt.desc())],
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

// ---- coupons (Part B, B3) -------------------------------------------------------------------------------------------------
// Discount codes an admin creates: a percentage or an amount off (pence), an optional start and end, an optional limit on how
// many times it can be used, and what it applies to (everything, some categories by slug, or some courses by course number).
// Codes are stored in capitals and are unique; a coupon is never deleted (turned off instead), so past orders can still name it.
// `used` counts orders that used it (checkout adds to it once payments are real). Read and written by the API only.
export const couponKind = pgEnum('coupon_kind', ['percent', 'amount'])
export const couponScope = pgEnum('coupon_scope', ['all', 'categories', 'courses'])
export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    kind: couponKind('kind').notNull(),
    value: integer('value').notNull(), // whole percent (1-100) or pence
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    usageLimit: integer('usage_limit'),
    used: integer('used').notNull().default(0),
    scope: couponScope('scope').notNull().default('all'),
    categories: text('categories').array().notNull().default(sql`'{}'::text[]`),
    courses: integer('courses').array().notNull().default(sql`'{}'::integer[]`),
    active: boolean('active').notNull().default(true),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('coupons_code_key').on(t.code),
    index('coupons_created_by_idx').on(t.createdBy),
    check('coupons_code_format', sql`${t.code} ~ '^[A-Z0-9][A-Z0-9-]{2,29}$'`),
    check('coupons_value_range', sql`(${t.kind} = 'percent' and ${t.value} between 1 and 100) or (${t.kind} = 'amount' and ${t.value} between 1 and 10000000)`),
    check('coupons_dates_order', sql`${t.startsAt} is null or ${t.endsAt} is null or ${t.startsAt} < ${t.endsAt}`),
    check('coupons_limit_positive', sql`${t.usageLimit} is null or ${t.usageLimit} > 0`),
    check('coupons_used_positive', sql`${t.used} >= 0`),
  ],
).enableRLS()

// ---- money (Part B, B4) ---------------------------------------------------------------------------------------------------
// Orders, refunds, disputes and payouts, and the ledger every money movement is written to. No payment provider is connected
// yet: orders come from staff bookings (invoice, payment link or free) and test data, and refunds and payouts are RECORDED
// (decided, approved, marked sent) without moving money. When Stripe is connected it writes the same rows.
// Amounts are whole pence. An order keeps the card fee and commission rates it was booked at, so later rate changes never
// rewrite the past. Read and written by the API only (RLS on, no policy).
export const paymentMethod = pgEnum('payment_method', ['card', 'bnpl', 'invoice', 'payment_link', 'free'])
export const orderStatus = pgEnum('order_status', ['paid', 'part_refunded', 'refunded', 'cancelled'])
export const refundStatus = pgEnum('refund_status', ['requested', 'approved', 'declined'])
export const disputeStatus = pgEnum('dispute_status', ['open', 'won', 'lost'])
export const payoutStatus = pgEnum('payout_status', ['draft', 'approved', 'held', 'sent'])
// Hurak's seven transaction types
export const ledgerType = pgEnum('ledger_type', ['purchase', 'refund', 'cancel', 'dispute', 'charge', 'adjust', 'payout'])

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ref: text('ref').notNull(),
    buyerUserId: uuid('buyer_user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    buyerName: text('buyer_name').notNull(),
    buyerEmail: text('buyer_email').notNull(),
    buyerCompany: text('buyer_company'),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'restrict' }),
    courseId: integer('course_id').notNull(),
    courseTitle: text('course_title').notNull(),
    startsOn: date('starts_on'),
    quantity: integer('quantity').notNull(),
    unitPence: integer('unit_pence').notNull(),
    grossPence: integer('gross_pence').notNull(),
    method: paymentMethod('method').notNull(),
    status: orderStatus('status').notNull().default('paid'),
    feeBps: integer('fee_bps').notNull(),
    commissionBps: integer('commission_bps').notNull(),
    bookedBy: uuid('booked_by').references(() => authUsers.id, { onDelete: 'set null' }), // a staff booking: the admin
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('orders_ref_key').on(t.ref),
    index('orders_provider_idx').on(t.providerId, t.createdAt.desc()),
    index('orders_created_idx').on(t.createdAt.desc()),
    index('orders_buyer_idx').on(t.buyerUserId),
    index('orders_booked_by_idx').on(t.bookedBy),
    check('orders_amounts', sql`${t.quantity} between 1 and 500 and ${t.unitPence} >= 0 and ${t.grossPence} = ${t.unitPence} * ${t.quantity}`),
    check('orders_free_is_zero', sql`(${t.method} = 'free') = (${t.grossPence} = 0)`),
    check('orders_rates', sql`${t.feeBps} between 0 and 2000 and ${t.commissionBps} between 0 and 6000`),
  ],
).enableRLS()

export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    amountPence: integer('amount_pence').notNull(),
    reason: text('reason').notNull(),
    status: refundStatus('status').notNull().default('requested'),
    requestedBy: uuid('requested_by').references(() => authUsers.id, { onDelete: 'set null' }),
    decidedBy: uuid('decided_by').references(() => authUsers.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionNote: text('decision_note'),
    createdAt: createdAt(),
  },
  (t) => [
    index('refunds_order_idx').on(t.orderId),
    index('refunds_status_idx').on(t.status, t.createdAt.desc()),
    index('refunds_requested_by_idx').on(t.requestedBy),
    index('refunds_decided_by_idx').on(t.decidedBy),
    check('refunds_amount_positive', sql`${t.amountPence} > 0`),
  ],
).enableRLS()

export const disputes = pgTable(
  'disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    amountPence: integer('amount_pence').notNull(),
    reason: text('reason').notNull(),
    evidenceDue: date('evidence_due').notNull(),
    status: disputeStatus('status').notNull().default('open'),
    openedBy: uuid('opened_by').references(() => authUsers.id, { onDelete: 'set null' }),
    closedBy: uuid('closed_by').references(() => authUsers.id, { onDelete: 'set null' }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('disputes_order_idx').on(t.orderId),
    index('disputes_status_idx').on(t.status, t.evidenceDue),
    index('disputes_opened_by_idx').on(t.openedBy),
    index('disputes_closed_by_idx').on(t.closedBy),
    check('disputes_amount_positive', sql`${t.amountPence} > 0`),
  ],
).enableRLS()

export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ref: text('ref').notNull(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'restrict' }),
    periodEnd: date('period_end').notNull(), // covers everything in the ledger up to the end of this UK day
    amountPence: integer('amount_pence').notNull(),
    heldBackPence: integer('held_back_pence').notNull().default(0), // kept back for open refund requests and disputes
    status: payoutStatus('status').notNull().default('draft'),
    holdReason: text('hold_reason'),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    approvedBy: uuid('approved_by').references(() => authUsers.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    sentBy: uuid('sent_by').references(() => authUsers.id, { onDelete: 'set null' }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('payouts_ref_key').on(t.ref),
    index('payouts_provider_idx').on(t.providerId, t.createdAt.desc()),
    index('payouts_status_idx').on(t.status),
    index('payouts_created_by_idx').on(t.createdBy),
    index('payouts_approved_by_idx').on(t.approvedBy),
    index('payouts_sent_by_idx').on(t.sentBy),
    check('payouts_amounts', sql`${t.amountPence} > 0 and ${t.heldBackPence} >= 0`),
    check('payouts_second_approver', sql`${t.approvedBy} is null or ${t.createdBy} is null or ${t.approvedBy} <> ${t.createdBy}`),
  ],
).enableRLS()

// The ledger: one row per money movement, never changed or removed (a trigger blocks it), so a provider's balance and every
// payout can be rebuilt from it. Like the activity log it has no foreign keys. Signs are from the provider's side:
// `providerPence` is what the provider gains (negative for refunds, charges and payouts); `commissionPence` and `feePence` are
// ReadTraining's commission and the payment fee on the same movement.
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
    type: ledgerType('type').notNull(),
    providerId: uuid('provider_id').notNull(),
    orderId: uuid('order_id'),
    refundId: uuid('refund_id'),
    disputeId: uuid('dispute_id'),
    payoutId: uuid('payout_id'),
    grossPence: integer('gross_pence').notNull().default(0),
    feePence: integer('fee_pence').notNull().default(0),
    commissionPence: integer('commission_pence').notNull().default(0),
    providerPence: integer('provider_pence').notNull(),
    note: text('note'),
    createdBy: uuid('created_by'),
  },
  (t) => [
    index('ledger_provider_idx').on(t.providerId, t.at.desc()),
    index('ledger_order_idx').on(t.orderId),
    index('ledger_payout_idx').on(t.payoutId),
    index('ledger_at_idx').on(t.at.desc()),
    check('ledger_split_adds_up', sql`${t.grossPence} = ${t.feePence} + ${t.commissionPence} + ${t.providerPence} or ${t.type} in ('charge', 'adjust', 'payout')`),
  ],
).enableRLS()

export type Profile = typeof profiles.$inferSelect
export type Organisation = typeof organisations.$inferSelect
export type OrganisationMember = typeof organisationMembers.$inferSelect
export type AdminUser = typeof adminUsers.$inferSelect
export type ActivityLogEntry = typeof activityLog.$inferSelect
export type NewActivityLogEntry = typeof activityLog.$inferInsert
export type Category = typeof categories.$inferSelect
export type DeliveryMethod = typeof deliveryMethods.$inferSelect
export type Coupon = typeof coupons.$inferSelect
export type Order = typeof orders.$inferSelect
export type LedgerEntry = typeof ledgerEntries.$inferSelect
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
