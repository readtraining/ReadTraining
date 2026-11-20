// The one permission table for the whole platform. The API enforces it (tRPC procedures) and the web server code checks it
// (layouts); the browser may only use it to hide buttons, never as the real check. Plain data and pure functions, no I/O,
// so every caller gets the same answer.
//
// Provider roles and what each may do follow the Hurak research (docs/auth-and-permissions.md §6, for the client to
// confirm); business roles are Hurak's owner/member; admins are one role with permission switches and presets.

export const PROVIDER_ROLES = ['owner', 'admin', 'tutor', 'course_editor', 'support', 'sales', 'accounts', 'marketing', 'assistant'] as const
export const BUSINESS_ROLES = ['owner', 'member'] as const
export type ProviderRole = (typeof PROVIDER_ROLES)[number]
export type BusinessRole = (typeof BUSINESS_ROLES)[number]
export type MemberRole = ProviderRole | BusinessRole

export type OrganisationType = 'business' | 'provider'
export type OrganisationStatus = 'pending' | 'changes_requested' | 'active' | 'suspended' | 'rejected'

export type Membership = {
  organisationId: string
  type: OrganisationType
  role: MemberRole
  status: 'invited' | 'active'
  organisationStatus: OrganisationStatus
  // an admin working in this provider's workspace as ReadTraining staff (an open `staff_access` session, loaded by the API's
  // actor): not a real member. `content`: they hold the admin `approve` switch (courses, dates, profile…); `pricing`: the
  // `pricing` switch (prices and price plans); `session`: the staff_access row. See STAFF_ACTIONS below.
  staff?: { pricing: boolean; content?: boolean; session?: string }
}

export type AdminAccess = {
  active: boolean
  preset: 'full' | 'support' | 'finance' | 'custom'
  permissions: string[]
  // with the custom preset: whole roles held together (Support and Finance), on top of `permissions`
  roles?: string[]
  refundLimitPence: number
  // has a verified authenticator (Supabase MFA): once set up, two-step sign-in is needed for every admin action
  twoStep?: boolean
  // a test copy waived the Full admins' two-step rule (ADMIN_TWO_STEP_OPTIONAL, apps/api/src/lib/actor.mts); never on live
  twoStepWaived?: boolean
  // the super admin (the platform's owner): a Full admin only they can change; see apps/api/src/modules/admin/team.mts
  isSuper?: boolean
}

// Who is asking. `aal` is the sign-in strength from the token: aal2 means two-step sign-in was completed.
export type Actor = {
  userId: string
  aal: 'aal1' | 'aal2'
  memberships: Membership[]
  admin: AdminAccess | null
}

// What the action is about. `organisationId` is required for provider and business actions; the rest only matter to the
// rules that read them.
export type Target = {
  organisationId?: string
  tutorUserId?: string | null // the tutor of the cohort / learner record ("own cohorts only")
  memberRole?: MemberRole // the team member being changed
  newRole?: MemberRole // the role being given
  memberUserId?: string // the team member being changed
  amountPence?: number // refunds and credit
  createdBy?: string | null // the person who started the thing being approved
}

// ---------------------------------------------------------------------------------------------------------------------------
// Provider workspace. ALL = every provider role. `own` = tutor, only for cohorts they teach.

const P_ALL: ProviderRole[] = [...PROVIDER_ROLES]
const PROVIDER_RULES = {
  'provider.workspace.open': { roles: P_ALL },
  'provider.performance.view': { roles: ['owner', 'admin', 'sales', 'accounts', 'marketing', 'assistant'] },
  'provider.reviews.view': { roles: ['owner', 'admin', 'support', 'sales', 'accounts', 'marketing', 'assistant'] },
  'provider.reviews.reply': { roles: ['owner', 'admin', 'support', 'marketing'] },
  'provider.courses.view': { roles: ['owner', 'admin', 'tutor', 'course_editor', 'support', 'sales', 'marketing', 'assistant'] },
  'provider.courses.edit': { roles: ['owner', 'admin', 'course_editor'] },
  'provider.courses.editPage': { roles: ['owner', 'admin', 'course_editor', 'marketing'] }, // landing page text and SEO
  'provider.courses.delete': { roles: ['owner', 'admin'] },
  'provider.pricing.view': { roles: ['owner', 'admin', 'course_editor', 'support', 'sales', 'accounts', 'assistant'] },
  'provider.pricing.edit': { roles: ['owner', 'admin', 'course_editor'] },
  'provider.cohorts.view': { roles: ['owner', 'admin', 'support', 'sales', 'assistant'], own: true },
  'provider.cohorts.edit': { roles: ['owner', 'admin'] },
  'provider.venues.view': { roles: ['owner', 'admin', 'support', 'sales', 'assistant'] }, // the Venues page
  'provider.records.view': { roles: ['owner', 'admin', 'support', 'assistant'], own: true }, // register, results, learning records
  'provider.records.edit': { roles: ['owner', 'admin'], own: true },
  'provider.learners.view': { roles: ['owner', 'admin', 'support', 'sales', 'accounts', 'assistant'], own: true },
  'provider.learners.edit': { roles: ['owner', 'admin', 'support', 'sales'] },
  'provider.orders.view': { roles: ['owner', 'admin', 'support', 'sales', 'accounts', 'assistant'] },
  'provider.orders.create': { roles: ['owner', 'admin', 'support', 'sales'] }, // new orders and payment links
  'provider.refunds.decide': { roles: ['owner', 'admin', 'support', 'accounts'] },
  'provider.finance.view': { roles: ['owner', 'admin', 'accounts', 'assistant'] }, // earnings, transactions, payouts, invoices
  'provider.finance.manage': { roles: ['owner', 'admin', 'accounts'] },
  'provider.leads.view': { roles: ['owner', 'admin', 'support', 'sales', 'assistant'] },
  'provider.leads.manage': { roles: ['owner', 'admin', 'sales'] },
  'provider.settings.view': { roles: ['owner', 'admin', 'course_editor', 'support', 'marketing', 'assistant'] },
  'provider.profile.edit': { roles: ['owner', 'admin', 'marketing'] }, // headline, biography, socials, logo
  'provider.profile.rename': { roles: ['owner', 'admin'] }, // the provider's name, while its application is still being reviewed
  'provider.review.send': { roles: ['owner', 'admin'] }, // send the account back for review after our team asked for changes (they read our note)
  'provider.terms.edit': { roles: ['owner', 'admin'] },
  'provider.faqs.edit': { roles: ['owner', 'admin', 'course_editor', 'marketing'] },
  'provider.qa.answer': { roles: ['owner', 'admin', 'course_editor', 'support'] },
  'provider.vat.view': { roles: ['owner', 'admin', 'accounts'] },
  'provider.vat.edit': { roles: ['owner', 'admin', 'accounts'] },
  'provider.emails.view': { roles: ['owner', 'admin', 'accounts'] }, // where order, refund and dispute notices go
  'provider.emails.edit': { roles: ['owner', 'admin', 'accounts'] },
  'provider.payoutAccount.manage': { roles: ['owner'] }, // Stripe / bank details
  'provider.team.view': { roles: ['owner', 'admin'] },
  'provider.team.manage': { roles: ['owner', 'admin'] },
  'provider.account.close': { roles: ['owner'] }, // close or transfer the provider account
} satisfies Record<string, { roles: ProviderRole[]; own?: boolean }>

const BUSINESS_RULES = {
  'business.workspace.open': { roles: ['owner', 'member'] },
  'business.book': { roles: ['owner', 'member'] },
  'business.places.assign': { roles: ['owner', 'member'] },
  'business.invoices.view': { roles: ['owner', 'member'] },
  'business.credit.manage': { roles: ['owner'] },
  'business.team.manage': { roles: ['owner'] },
  'business.settings.edit': { roles: ['owner'] },
} satisfies Record<string, { roles: BusinessRole[] }>

// ---------------------------------------------------------------------------------------------------------------------------
// Admin: one role, with switches. Each admin action needs one switch.

export const ADMIN_PERMISSIONS = [
  'approve', // providers and courses; also opening a provider's workspace as staff to edit its courses, dates and profile
  'catalogue',
  'pricing', // providers' prices and price plans (as staff in their workspace)
  'content',
  'orders.view',
  'orders.book', // book for a customer
  'orders.free', // free (bypass) bookings
  'refunds',
  'wallet',
  'disputes',
  'payouts',
  'adjustments', // ledger adjustments and charges
  'finance.settings',
  'coupons',
  'reviews',
  'suspend',
  'export',
  'admins',
  'platform.settings',
] as const
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

// Support: no refund power (the brief), so no wallet credit either, and none of Finance's money work
const SUPPORT_EXCLUDES: AdminPermission[] = ['refunds', 'wallet', 'payouts', 'adjustments', 'finance.settings', 'admins', 'platform.settings']
export const ADMIN_PRESETS: Record<'full' | 'support' | 'finance', AdminPermission[]> = {
  full: [...ADMIN_PERMISSIONS],
  support: ADMIN_PERMISSIONS.filter((p) => !SUPPORT_EXCLUDES.includes(p)),
  finance: ['orders.view', 'refunds', 'wallet', 'disputes', 'payouts', 'adjustments', 'finance.settings', 'export'],
}

// A rule's `permission`: the one switch it needs, any of several (an area several jobs read: the providers list serves approvals,
// payouts and staff bookings), or none (every admin). Reading an area needs one of the switches that works in it, so an admin
// sees only the parts of the panel they can work on (the menu, data/admin.js, follows the same switches).
const ADMIN_RULES = {
  'admin.panel.open': { permission: null },
  'admin.activity.view': { permission: null }, // the activity log viewer: every admin, each seeing their own areas' entries
  'admin.students.view': { permission: ['suspend', 'orders.book', 'orders.view', 'export'] }, // learners' list and records
  'admin.providers.view': { permission: ['approve', 'suspend', 'finance.settings', 'catalogue', 'orders.view', 'orders.book', 'payouts', 'pricing'] }, // the providers list and counts
  'admin.providers.read': { permission: ['approve', 'suspend', 'finance.settings'] }, // one provider's record (its private details)
  'admin.courses.view': { permission: ['approve', 'catalogue'] }, // courses, their approvals and counts
  'admin.courses.pick': { permission: ['approve', 'catalogue', 'orders.book', 'coupons', 'content'] }, // the live-course pickers
  'admin.catalogue.view': { permission: ['catalogue', 'approve', 'coupons'] }, // categories, methods, levels
  'admin.coupons.view': { permission: 'coupons' },
  'admin.commission.view': { permission: ['finance.settings', 'orders.view', 'export'] },
  'admin.emails.view': { permission: 'content' },
  'admin.content.view': { permission: ['content', 'platform.settings'] }, // site content and its history (the SEO words are a platform setting)
  'admin.customerReviews.view': { permission: 'content' },
  'admin.platform.view': { permission: 'platform.settings' },
  'admin.approvals.decide': { permission: 'approve', notOwnRequest: true },
  'admin.providers.staff': { permission: ['approve', 'pricing'] }, // edit a provider's work from the admin, as ReadTraining staff
  'admin.catalogue.edit': { permission: 'catalogue' },
  'admin.content.edit': { permission: 'content' },
  'admin.orders.view': { permission: 'orders.view' },
  'admin.orders.book': { permission: 'orders.book' },
  'admin.orders.bookFree': { permission: 'orders.free' },
  'admin.refunds.decide': { permission: 'refunds', limited: true, notOwnRequest: true },
  'admin.wallet.credit': { permission: 'wallet', limited: true },
  'admin.disputes.manage': { permission: 'disputes' },
  'admin.payouts.manage': { permission: 'payouts' },
  'admin.payouts.approve': { permission: 'payouts', notOwnRequest: true },
  'admin.adjustments.create': { permission: 'adjustments' },
  'admin.finance.settings': { permission: 'finance.settings' },
  'admin.coupons.manage': { permission: 'coupons' },
  'admin.reviews.moderate': { permission: 'reviews' },
  'admin.accounts.suspend': { permission: 'suspend' },
  'admin.data.export': { permission: 'export' },
  'admin.admins.manage': { permission: 'admins' },
  'admin.platform.settings': { permission: 'platform.settings' },
} satisfies Record<string, { permission: AdminPermission | readonly AdminPermission[] | null; limited?: boolean; notOwnRequest?: boolean }>

export type ProviderAction = keyof typeof PROVIDER_RULES
export type BusinessAction = keyof typeof BUSINESS_RULES
export type AdminAction = keyof typeof ADMIN_RULES
export type Action = ProviderAction | BusinessAction | AdminAction

export const PROVIDER_ACTIONS = Object.keys(PROVIDER_RULES) as ProviderAction[]
export const BUSINESS_ACTIONS = Object.keys(BUSINESS_RULES) as BusinessAction[]
export const ADMIN_ACTIONS = Object.keys(ADMIN_RULES) as AdminAction[]

// Two-step sign-in for every Full admin (one who has none yet is sent to set up an authenticator first) is switched OFF while the
// platform is being built and tested (the user's decision, 19 November 2026; the method, authenticator app or text message, is
// still to be decided): set FULL_ADMINS_NEED_TWO_STEP back to true before launch. An admin who has set up an authenticator is
// still asked for it (Admin › Team › Reset two-step removes it). A test copy may also waive the Full rule (`twoStepWaived`,
// ADMIN_TWO_STEP_OPTIONAL); live never does.
export const FULL_ADMINS_NEED_TWO_STEP = false
export const needsTwoStep = (admin: AdminAccess) => (FULL_ADMINS_NEED_TWO_STEP && admin.preset === 'full' && !admin.twoStepWaived) || admin.twoStep === true

// The roles one admin can hold together (Admin › Team: Support and Finance ticked for one person); Full is everything already
export const ADMIN_ROLES = ['support', 'finance'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

// The switches an admin actually holds: a preset's list, or for "custom" every switch of the roles they hold plus the switches
// chosen one by one.
export function adminPermissions(admin: AdminAccess | null): AdminPermission[] {
  if (!admin || !admin.active) return []
  const roles = (admin.roles ?? []).filter((r): r is AdminRole => (ADMIN_ROLES as readonly string[]).includes(r))
  const list = admin.preset === 'custom' ? [...new Set([...roles.flatMap((r) => ADMIN_PRESETS[r]), ...admin.permissions])] : ADMIN_PRESETS[admin.preset]
  return list.filter((p): p is AdminPermission => (ADMIN_PERMISSIONS as readonly string[]).includes(p))
}

// The switches this admin may give another admin (Admin team): the super admin any; anyone else only switches they hold
// themselves, and never "admins", so managing the team stays with the super admin (as adding Full admins does).
export function grantableAdminPermissions(admin: AdminAccess | null): AdminPermission[] {
  if (!admin || !admin.active) return []
  if (admin.isSuper) return [...ADMIN_PERMISSIONS]
  return adminPermissions(admin).filter((p) => p !== 'admins')
}

const isViewAction = (action: string) => action.endsWith('.view') || action.endsWith('.open')

// What an admin may change in a provider's work as ReadTraining staff (StaffEdit in the admin): the courses (their
// words, pictures, listing, learning options, settings), dates, venues, the provider's profile, terms and FAQs, and prices and
// price plans with the `pricing` switch. Never the provider's own decisions (sending, pausing or deleting a course, its account,
// team, VAT, payout account) or money (orders, refunds, payouts: the admin's own pages do those).
// What staff may read: only what those editors need (courses, dates and their tutors' names, price plans, profile, terms,
// venues). Never the provider's team list, learners, orders, money, VAT, reviews, leads or performance.
const STAFF_VIEWS = new Set<string>(['provider.workspace.open', 'provider.courses.view', 'provider.cohorts.view', 'provider.venues.view', 'provider.pricing.view', 'provider.settings.view'])
const STAFF_ACTIONS = new Set<string>(['provider.courses.edit', 'provider.courses.editPage', 'provider.cohorts.edit', 'provider.profile.edit', 'provider.profile.rename', 'provider.terms.edit', 'provider.faqs.edit'])

// Until our team approves a provider (its application pending, or changes asked), it can only look around and complete its
// application: its profile and name, its terms, sending the account for review, or closing it. Courses, dates, venues, price
// plans and everything else wait for the approval (the team decided no drafts before it, 12 November 2026).
const BEFORE_APPROVAL = new Set<string>(['provider.profile.edit', 'provider.profile.rename', 'provider.terms.edit', 'provider.review.send', 'provider.account.close'])
export const waitsForApproval = (action: string, organisationStatus: OrganisationStatus) =>
  action.startsWith('provider.') && (organisationStatus === 'pending' || organisationStatus === 'changes_requested') && !isViewAction(action) && !BEFORE_APPROVAL.has(action)

// ---------------------------------------------------------------------------------------------------------------------------
// The check. Denies anything it does not know.
export function can(actor: Actor | null, action: Action, target: Target = {}): boolean {
  if (!actor) return false

  if (action in ADMIN_RULES) {
    const rule: { permission: AdminPermission | readonly AdminPermission[] | null; limited?: boolean; notOwnRequest?: boolean } = ADMIN_RULES[action as AdminAction]
    const admin = actor.admin
    if (!admin || !admin.active) return false
    // a Full admin, and any admin who has set up an authenticator, must have completed two-step sign-in
    if (needsTwoStep(admin) && actor.aal !== 'aal2') return false
    const held = adminPermissions(admin)
    if (rule.permission && !(Array.isArray(rule.permission) ? rule.permission : [rule.permission]).some((p) => held.includes(p))) return false
    // nobody approves their own request
    if (rule.notOwnRequest && target.createdBy && target.createdBy === actor.userId) return false
    // refunds and credit above the admin's limit need a Full admin. The request gate has no amount yet, so procedures for
    // these actions must call can() again with `amountPence` before acting.
    if (rule.limited && admin.preset !== 'full' && target.amountPence !== undefined && target.amountPence > admin.refundLimitPence) return false
    return true
  }

  const isProvider = action in PROVIDER_RULES
  const isBusiness = action in BUSINESS_RULES
  if (!isProvider && !isBusiness) return false
  if (!target.organisationId) return false

  const membership = actor.memberships.find((m) => m.organisationId === target.organisationId && m.status === 'active')
  if (!membership || membership.type !== (isProvider ? 'provider' : 'business')) return false
  if (membership.organisationStatus === 'rejected') return false
  // ReadTraining staff: what the editors read, and the changes above, also on a suspended provider (fixing it is often why it
  // is suspended)
  if (membership.staff) {
    if (waitsForApproval(action, membership.organisationStatus)) return false
    if (isViewAction(action)) return STAFF_VIEWS.has(action)
    if (action === 'provider.pricing.edit') return membership.staff.pricing
    return STAFF_ACTIONS.has(action) && membership.staff.content !== false
  }
  // a suspended organisation can still be opened and read, but nothing can be changed
  if (membership.organisationStatus === 'suspended' && !isViewAction(action)) return false
  // not approved yet: only its application (above)
  if (waitsForApproval(action, membership.organisationStatus)) return false

  const rule: { roles: readonly MemberRole[]; own?: boolean } = isProvider ? PROVIDER_RULES[action as ProviderAction] : BUSINESS_RULES[action as BusinessAction]
  const allowed = rule.roles.includes(membership.role) || (rule.own === true && membership.role === 'tutor' && !!target.tutorUserId && target.tutorUserId === actor.userId)
  if (!allowed) return false

  // team changes: the owner can't be changed or removed by anyone, nobody gives the owner role, nobody changes their own role
  if (action === 'provider.team.manage' || action === 'business.team.manage') {
    if (target.memberRole === 'owner' || target.newRole === 'owner') return false
    if (target.memberUserId && target.memberUserId === actor.userId) return false
  }
  return true
}

// The identities this person can switch between (Switch Account).
export function identitiesOf(actor: Actor | null) {
  if (!actor) return []
  return [
    { kind: 'student' as const },
    ...actor.memberships
      // a provider an admin is working in as staff isn't one of their identities (no Switch account to it)
      .filter((m) => m.status === 'active' && m.organisationStatus !== 'rejected' && !m.staff)
      .map((m) => ({ kind: m.type, organisationId: m.organisationId, role: m.role })),
    ...(actor.admin?.active ? [{ kind: 'admin' as const }] : []),
  ]
}
