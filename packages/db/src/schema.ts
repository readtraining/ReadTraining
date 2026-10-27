import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
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
    // a provider's public profile (Milestone 2): shown on /providers/[slug] once they are approved. logo_path is a file in the
    // public course-media bucket; socials = { facebook?, linkedin?, youtube? } (https links); booking_terms and
    // cancellation_policy are the provider's own terms, shown on their profile and their courses.
    logoPath: text('logo_path'),
    headline: text('headline'),
    bio: text('bio'),
    city: text('city'),
    socials: jsonb('socials').$type<{ facebook?: string; linkedin?: string; youtube?: string }>().notNull().default({}),
    bookingTerms: text('booking_terms'),
    cancellationPolicy: text('cancellation_policy'),
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
  // the super admin: the platform's owner, a Full admin nobody else can change or remove; at most one (index below)
  isSuper: boolean('is_super').notNull().default(false),
  // an invited admin (Admin › Team or pnpm admin:bootstrap): invited_at is when the latest invite went out, accepted_at when
  // they set their password. While invited and not accepted, the row gives no access. admin_only: the account was made by the
  // invite (no public sign-up), so it is a staff login only and stays out of the learner lists.
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  adminOnly: boolean('admin_only').notNull().default(false),
  createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  },
  (t) => [index('admin_users_created_by_idx').on(t.createdBy), uniqueIndex('admin_users_one_super').on(t.isSuper).where(sql`${t.isSuper}`)],
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

// ---- courses (Milestone 2) ------------------------------------------------------------------------------------------------
// One table for every course, in two kinds (the shared-listing model, as on Hurak):
// - shared: a public course page written by ReadTraining staff (for example "SIA Door Supervisor"). No provider of its own;
//   providers' courses join it, and the page lists them with their dates and the number of providers.
// - provider: a provider's own course, with their content, price and terms. Under a shared page (parent_id) or on its own
//   (parent_id null: it has its own public page). The provider writes it; an admin approves it before it shows.
// A course's id is a whole number from 1000 (orders.course_id, coupons.courses, the home page's featured courses and saved
// baskets hold these numbers; the sample courses before Milestone 2 used 1–52, so the two never mix). Every table here has RLS
// on and no policy: the public site and the workspaces read and write only through the API.
// Status: draft → pending (sent for approval) → live, or changes (asked for changes) → pending again; live ↔ paused. A
// content edit to a live course waits in course_revisions while the live version stays up; prices and dates change at once.
export const courseKind = pgEnum('course_kind', ['shared', 'provider'])
export const courseStatus = pgEnum('course_status', ['draft', 'pending', 'changes', 'live', 'paused'])
export const courseModel = pgEnum('course_model', ['bookings', 'enquiries'])
export const courses = pgTable(
  'courses',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity({ startWith: 1000 }),
    kind: courseKind('kind').notNull(),
    // a provider course under a shared page; null = a shared page itself, or a provider course with its own page
    parentId: integer('parent_id').references((): AnyPgColumn => courses.id, { onDelete: 'restrict' }),
    organisationId: uuid('organisation_id').references(() => organisations.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary'), // the short description under the title (the editor's subtitle)
    description: text('description'), // the long description; a blank line starts a new paragraph
    audience: text('audience'), // who it's for
    entryRequirements: text('entry_requirements'),
    outcomes: text('outcomes').array().notNull().default(sql`'{}'::text[]`), // what you'll learn
    features: text('features').array().notNull().default(sql`'{}'::text[]`),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'restrict' }),
    subcategoryId: uuid('subcategory_id').references(() => subcategories.id, { onDelete: 'restrict' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'restrict' }),
    level: text('level').references(() => courseLevels.slug, { onDelete: 'restrict' }),
    // how a provider course is taught: classroom and live-online have dates (cohorts); self-paced is "start any time" at price_pence
    method: text('method').references(() => deliveryMethods.slug, { onDelete: 'restrict' }),
    model: courseModel('model').notNull().default('bookings'),
    skillSaver: boolean('skill_saver').notNull().default(false),
    // false = only people with the link can book (the editor's "private"); listed = shown on ReadTraining's search and pages
    isPublic: boolean('is_public').notNull().default(true),
    listed: boolean('listed').notNull().default(true),
    pricePence: integer('price_pence'), // self-paced price, including VAT; classroom and live-online prices are on each cohort
    videoUrl: text('video_url'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    seoKeywords: text('seo_keywords').array().notNull().default(sql`'{}'::text[]`),
    status: courseStatus('status').notNull().default('draft'),
    statusNote: text('status_note'), // the admin's reason when they ask for changes or pause a course; the provider sees it
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedBy: uuid('decided_by').references(() => authUsers.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }), // first time it went live ("Newest" sorts by this)
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('courses_slug_key').on(t.slug),
    index('courses_parent_idx').on(t.parentId),
    index('courses_organisation_idx').on(t.organisationId),
    index('courses_status_idx').on(t.status),
    index('courses_category_idx').on(t.categoryId),
    index('courses_subcategory_idx').on(t.subcategoryId),
    index('courses_topic_idx').on(t.topicId),
    index('courses_level_idx').on(t.level),
    index('courses_method_idx').on(t.method),
    index('courses_decided_by_idx').on(t.decidedBy),
    index('courses_created_by_idx').on(t.createdBy),
    check('courses_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    // a shared page belongs to no provider and sits under nothing; a provider course always has its provider
    check('courses_kind_shape', sql`(${t.kind} = 'shared' and ${t.organisationId} is null and ${t.parentId} is null) or (${t.kind} = 'provider' and ${t.organisationId} is not null)`),
    check('courses_price_range', sql`${t.pricePence} is null or ${t.pricePence} between 0 and 10000000`),
  ],
).enableRLS()

// A content edit to a live course, waiting for an admin (at most one per course). `content` holds the edited fields as the
// editor saved them (title, summary, description, units, exams, FAQs…); approving copies them onto the course.
export const courseRevisionStatus = pgEnum('course_revision_status', ['pending', 'approved', 'rejected'])
export const courseRevisions = pgTable(
  'course_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    content: jsonb('content').notNull(),
    status: courseRevisionStatus('status').notNull().default('pending'),
    note: text('note'),
    submittedBy: uuid('submitted_by').references(() => authUsers.id, { onDelete: 'set null' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    decidedBy: uuid('decided_by').references(() => authUsers.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [
    index('course_revisions_course_idx').on(t.courseId),
    index('course_revisions_submitted_by_idx').on(t.submittedBy),
    index('course_revisions_decided_by_idx').on(t.decidedBy),
    uniqueIndex('course_revisions_one_pending').on(t.courseId).where(sql`${t.status} = 'pending'`),
  ],
).enableRLS()

// A course's syllabus, in order: each unit a title and its text (one topic per line).
export const courseUnits = pgTable(
  'course_units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    body: text('body'),
  },
  (t) => [index('course_units_course_idx').on(t.courseId, t.position)],
).enableRLS()

// The exam or assessment table, where a course has one: a row per unit with its pass mark and duration (as written).
export const courseExams = pgTable(
  'course_exams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    unit: text('unit').notNull(),
    passMark: text('pass_mark'),
    duration: text('duration'),
  },
  (t) => [index('course_exams_course_idx').on(t.courseId, t.position)],
).enableRLS()

// A course's own FAQs, written for that course only (never shared between courses).
export const courseFaqs = pgTable(
  'course_faqs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
  },
  (t) => [index('course_faqs_course_idx').on(t.courseId, t.position)],
).enableRLS()

// A course's images, in order (the first is the cover): files in the public course-media bucket.
export const courseImages = pgTable(
  'course_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    path: text('path').notNull(),
    alt: text('alt'),
  },
  (t) => [index('course_images_course_idx').on(t.courseId, t.position)],
).enableRLS()

// A provider's venues. lat/lng come from the postcode when the venue is saved, so search can sort by real distance.
export const venues = pgTable(
  'venues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    street: text('street').notNull(),
    city: text('city').notNull(),
    postcode: text('postcode'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('venues_organisation_idx').on(t.organisationId), index('venues_city_idx').on(t.city)],
).enableRLS()

// One bookable run of a provider course (classroom or live online; self-paced has none). `sessions` = the days, in order:
// [{ date: 'YYYY-MM-DD', end: 'YYYY-MM-DD', from: 'HH:MM', to: 'HH:MM' }]; starts_on/ends_on are the first and last day, for
// search. Classroom needs a venue; live online has a join link (it can be added after the cohort is made). Price includes VAT.
export const cohorts = pgTable(
  'cohorts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    method: text('method')
      .notNull()
      .references(() => deliveryMethods.slug, { onDelete: 'restrict' }),
    venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'restrict' }),
    joinUrl: text('join_url'),
    sessions: jsonb('sessions').$type<{ date: string; end: string; from: string; to: string }[]>().notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    capacity: integer('capacity').notNull(),
    pricePence: integer('price_pence').notNull(),
    wasPricePence: integer('was_price_pence'),
    details: text('details'), // the cohort's structure, shown to learners under the dates
    tutorUserId: uuid('tutor_user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    bookable: boolean('bookable').notNull().default(true), // the provider can stop new bookings without cancelling
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('cohorts_course_idx').on(t.courseId),
    index('cohorts_method_idx').on(t.method),
    index('cohorts_venue_idx').on(t.venueId),
    index('cohorts_starts_idx').on(t.startsOn),
    index('cohorts_tutor_idx').on(t.tutorUserId),
    index('cohorts_created_by_idx').on(t.createdBy),
    check('cohorts_method_dated', sql`${t.method} in ('classroom', 'live-online')`),
    check('cohorts_classroom_venue', sql`${t.method} <> 'classroom' or ${t.venueId} is not null`),
    check('cohorts_dates_order', sql`${t.endsOn} >= ${t.startsOn}`),
    check('cohorts_capacity_range', sql`${t.capacity} between 1 and 200`),
    check('cohorts_price_range', sql`${t.pricePence} between 1 and 10000000 and (${t.wasPricePence} is null or ${t.wasPricePence} > ${t.pricePence})`),
  ],
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
export type Course = typeof courses.$inferSelect
export type Cohort = typeof cohorts.$inferSelect
export type Venue = typeof venues.$inferSelect
export type Coupon = typeof coupons.$inferSelect
export type Order = typeof orders.$inferSelect
export type LedgerEntry = typeof ledgerEntries.$inferSelect
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
