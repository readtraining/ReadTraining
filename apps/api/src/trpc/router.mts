import { meRouter } from '../modules/me/me.router.mjs'
import { postsRouter } from '../modules/posts/posts.router.mjs'
import { createTRPCRouter, publicProcedure } from './trpc.mjs'

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: new Date(),
  })),
  me: meRouter,
  posts: postsRouter,
})

export type AppRouter = typeof appRouter
