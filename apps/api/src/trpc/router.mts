import { adminRouter } from '../modules/admin/admin.router.mjs'
import { catalogueRouter } from '../modules/catalogue/catalogue.router.mjs'
import { contentRouter } from '../modules/content/content.router.mjs'
import { meRouter } from '../modules/me/me.router.mjs'
import { organisationsRouter } from '../modules/organisations/organisations.router.mjs'
import { providerRouter } from '../modules/provider/provider.router.mjs'
import { createTRPCRouter, publicProcedure } from './trpc.mjs'

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: new Date(),
  })),
  admin: adminRouter,
  catalogue: catalogueRouter,
  content: contentRouter,
  me: meRouter,
  organisations: organisationsRouter,
  provider: providerRouter,
})

export type AppRouter = typeof appRouter
