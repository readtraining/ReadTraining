import { TRPCError } from '@trpc/server'

import { sql } from '@readtraining/db'

import type { db as Db } from './db.mjs'

type Runner = Pick<typeof Db, 'execute'>

// A provider's name is used once: two providers called "TEST USER 2" can't be told apart in the directory, by learners or in
// the admin's lists. Names compare without case or extra spaces. A rejected application doesn't hold its name (it can't be seen
// anywhere), but its owner applying again is checked like anyone else. `except`: the provider being renamed.
export async function refuseTakenProviderName(db: Runner, name: string, except?: string) {
  const key = name.trim().replace(/\s+/g, ' ').toLowerCase()
  // inside a transaction, two people choosing a name at the same moment wait for each other until it commits
  await db.execute(sql`select pg_advisory_xact_lock(hashtext('readtraining.provider-name'))`)
  // '[[:space:]]', not '\s': a backslash inside the sql`` template is dropped before Postgres sees it ('\s' became 's')
  const [taken] = await db.execute<{ name: string }>(sql`
    select name from public.organisations
    where type = 'provider' and status <> 'rejected' and lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')) = ${key}
      and ${except ? sql`id <> ${except}::uuid` : sql`true`}
    limit 1`)
  if (taken)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `A provider called "${taken.name}" is already registered. Use your full company or trading name.`,
      cause: Object.assign(new Error('provider name taken'), { field: 'name' }),
    })
}
