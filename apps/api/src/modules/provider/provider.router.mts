import { createTRPCRouter } from '../../trpc/trpc.mjs'
import { providerCoursesRouter } from './courses.mjs'
import { providerPlansRouter } from './plans.mjs'
import { providerProfileRouter } from './profile.mjs'
import { providerCohortsRouter, providerVenuesRouter } from './schedule.mjs'
import { providerTeamRouter, teamInviteRouter } from './team.mjs'

// The provider workspace (/provider/*): every procedure takes the provider's organisationId and checks the caller's role in it.
export const providerRouter = createTRPCRouter({
  courses: providerCoursesRouter,
  cohorts: providerCohortsRouter,
  venues: providerVenuesRouter,
  plans: providerPlansRouter,
  profile: providerProfileRouter,
  team: providerTeamRouter,
  // the invited person's side (/provider/join): signed in, not a member yet
  invites: teamInviteRouter,
})
