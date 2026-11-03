import { TRPCError } from '@trpc/server'

// Database errors in words a person can act on. A raw database error (and Drizzle's wrapper around it, whose message holds the
// whole query) must never reach the browser: it names tables and constraints. trpc.mts runs every procedure through
// `friendlyError`: a duplicate becomes a CONFLICT on the form field it belongs to; any other database error, and any other
// unexpected error, becomes a plain "something went wrong" (the real one is logged on the server).

type PgLike = { code?: unknown; constraint_name?: unknown; constraint?: unknown; severity?: unknown; message?: unknown }

// the first error in the cause chain that looks like a Postgres error (a five-character SQLSTATE code and a severity)
export function pgErrorOf(err: unknown): PgLike | null {
  let e: unknown = err
  for (let i = 0; i < 6 && e && typeof e === 'object'; i++) {
    const x = e as PgLike & { cause?: unknown }
    if (typeof x.code === 'string' && /^[0-9A-Z]{5}$/.test(x.code) && 'severity' in x) return x
    e = x.cause
  }
  return null
}

// each unique rule: the form field it belongs to and what to say
const UNIQUE: Record<string, { field: string | null; message: string }> = {
  coupons_code_key: { field: 'code', message: 'Another coupon already uses this code.' },
  categories_slug_key: { field: 'name', message: 'There is already a category with this name. Restore it or choose another name.' },
  subcategories_category_slug_key: { field: 'name', message: 'There is already a sub-category with this name here. Restore it or choose another name.' },
  topics_subcategory_slug_key: { field: 'name', message: 'There is already a topic with this name here. Restore it or choose another name.' },
  delivery_methods_pkey: { field: 'name', message: 'There is already a delivery method with this name. Restore it or choose another name.' },
  course_levels_pkey: { field: 'name', message: 'There is already a level with this name. Restore it or choose another name.' },
  courses_slug_key: { field: 'title', message: 'Another course has just taken this web address. Save again to get a new one.' },
  organisations_slug_key: { field: 'name', message: 'Another organisation already uses this name. Choose a slightly different one.' },
  reviews_order_key: { field: null, message: 'This booking already has a review.' },
  course_revisions_one_pending: { field: null, message: 'This course already has changes waiting for review.' },
  organisation_members_one_owner: { field: null, message: 'This organisation already has an owner.' },
  admin_users_one_super: { field: null, message: 'There is already a super admin.' },
  orders_ref_key: { field: null, message: 'That couldn’t be saved just now. Please try again.' },
  payouts_ref_key: { field: null, message: 'That couldn’t be saved just now. Please try again.' },
}

const GENERAL = 'Something went wrong on our side. Please try again in a moment.'
const fieldError = (code: 'BAD_REQUEST' | 'CONFLICT', message: string, field: string | null) =>
  new TRPCError({ code, message, cause: field ? Object.assign(new Error(message), { field }) : undefined })

/** The error to send instead of `error`, or null to send it as it is. `path` is only for the server log. */
export function friendlyError(error: TRPCError, path: string): TRPCError | null {
  const pg = pgErrorOf(error.cause ?? error)
  if (pg) {
    const constraint = String(pg.constraint_name ?? pg.constraint ?? '')
    switch (pg.code) {
      case '23505': {
        const known = UNIQUE[constraint]
        if (!known) console.error(`[db] unmapped unique rule ${constraint} on ${path}`)
        return fieldError('CONFLICT', known?.message ?? 'That already exists. Try a different value.', known?.field ?? null)
      }
      case '23503':
        return fieldError('CONFLICT', 'That is linked to something that has changed or is still in use. Reload the page and try again.', null)
      case '23514':
      case '23502':
      case '22001':
      case '22P02':
      case '22007':
      case '22008':
        console.error(`[db] ${pg.code} ${constraint} on ${path}: ${String(pg.message)}`)
        return fieldError('BAD_REQUEST', 'One of the values isn’t allowed. Check the form and try again.', null)
      default:
        console.error(`[db] ${String(pg.code)} on ${path}:`, pg.message)
        return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: GENERAL })
    }
  }
  // an error that isn't one of ours (a thrown Error or a library's): tRPC would send its own message, so send the plain one
  if (error.code === 'INTERNAL_SERVER_ERROR' && error.cause && !(error.cause instanceof TRPCError) && error.message === (error.cause as Error).message) {
    console.error(`[api] unexpected error on ${path}:`, error.cause)
    return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: GENERAL })
  }
  return null
}
