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
}

export type AdminAccess = {
  active: boolean
  preset: 'full' | 'support' | 'finance' | 'custom'
  permissions: string[]
  refundLimitPence: number
  // has a verified authenticator (Supabase MFA): once set up, two-step sign-in is needed for every admin action
  twoStep?: boolean
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
  'provider.profile.edit': { roles: ['owner', 'admin', 'marketing'] }, // name, headline, biography, socials, logo
  'provider.terms.edit': { roles: ['owner', 'admin'] },
  'provider.faqs.edit': { roles: ['owner', 'admin', 'course_editor', 'marketing'] },
  'provider.qa.answer': { roles: ['owner', 'admin', 'course_editor', 'support'] },
  'provider.vat.view': { roles: ['owner', 'accounts'] },
  'provider.vat.edit': { roles: ['owner'] },
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
  'approve', // providers and courses
  'catalogue',
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
  'impersonate', // view the site as a user
  'export',
  'admins',
  'platform.settings',
] as const
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

const SUPPORT_EXCLUDES: AdminPermission[] = ['refunds', 'payouts', 'adjustments', 'finance.settings', 'admins', 'platform.settings']
export const ADMIN_PRESETS: Record<'full' | 'support' | 'finance', AdminPermission[]> = {
  full: [...ADMIN_PERMISSIONS],
  support: ADMIN_PERMISSIONS.filter((p) => !SUPPORT_EXCLUDES.includes(p)),
  finance: ['orders.view', 'refunds', 'wallet', 'disputes', 'payouts', 'adjustments', 'finance.settings', 'export'],
}

const ADMIN_RULES = {
  'admin.panel.open': { permission: null },
  'admin.approvals.decide': { permission: 'approve', notOwnRequest: true },
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
  'admin.impersonate': { permission: 'impersonate' },
  'admin.data.export': { permission: 'export' },
  'admin.admins.manage': { permission: 'admins' },
  'admin.platform.settings': { permission: 'platform.settings' },
} satisfies Record<string, { permission: AdminPermission | null; limited?: boolean; notOwnRequest?: boolean }>

export type ProviderAction = keyof typeof PROVIDER_RULES
export type BusinessAction = keyof typeof BUSINESS_RULES
export type AdminAction = keyof typeof ADMIN_RULES
export type Action = ProviderAction | BusinessAction | AdminAction

export const PROVIDER_ACTIONS = Object.keys(PROVIDER_RULES) as ProviderAction[]
export const BUSINESS_ACTIONS = Object.keys(BUSINESS_RULES) as BusinessAction[]
export const ADMIN_ACTIONS = Object.keys(ADMIN_RULES) as AdminAction[]

// Two-step sign-in is required for Full admins (the brief) and for any admin who has set up an authenticator.
export const needsTwoStep = (admin: AdminAccess) => admin.preset === 'full' || admin.twoStep === true

// The switches an admin actually holds: a preset's list, or the stored list for "custom".
export function adminPermissions(admin: AdminAccess | null): AdminPermission[] {
  if (!admin || !admin.active) return []
  const list = admin.preset === 'custom' ? admin.permissions : ADMIN_PRESETS[admin.preset]
  return list.filter((p): p is AdminPermission => (ADMIN_PERMISSIONS as readonly string[]).includes(p))
}

const isViewAction = (action: string) => action.endsWith('.view') || action.endsWith('.open')

// ---------------------------------------------------------------------------------------------------------------------------
// The check. Denies anything it does not know.
export function can(actor: Actor | null, action: Action, target: Target = {}): boolean {
  if (!actor) return false

  if (action in ADMIN_RULES) {
    const rule: { permission: AdminPermission | null; limited?: boolean; notOwnRequest?: boolean } = ADMIN_RULES[action as AdminAction]
    const admin = actor.admin
    if (!admin || !admin.active) return false
    // a Full admin, and any admin who has set up an authenticator, must have completed two-step sign-in
    if (needsTwoStep(admin) && actor.aal !== 'aal2') return false
    if (rule.permission && !adminPermissions(admin).includes(rule.permission)) return false
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
  // a suspended organisation can still be opened and read, but nothing can be changed
  if (membership.organisationStatus === 'suspended' && !isViewAction(action)) return false

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
      .filter((m) => m.status === 'active' && m.organisationStatus !== 'rejected')
      .map((m) => ({ kind: m.type, organisationId: m.organisationId, role: m.role })),
    ...(actor.admin?.active ? [{ kind: 'admin' as const }] : []),
  ]
}
