import { postsRouter } from '../modules/posts/posts.router.js'
import { createTRPCRouter, publicProcedure } from './trpc.js'

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({
    status: 'ok',
    timestamp: new Date(),
  })),
  posts: postsRouter,
})

export type AppRouter = typeof appRouter
