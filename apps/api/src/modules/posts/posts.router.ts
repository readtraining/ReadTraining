import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { desc, eq, posts } from '@readtraining/db'

import { createTRPCRouter, publicProcedure } from '../../trpc/trpc.js'

export const postsRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.select().from(posts).orderBy(desc(posts.createdAt)),
  ),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.query.posts.findFirst({
        where: eq(posts.id, input.id),
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND' })
      return post
    }),

  create: publicProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [post] = await ctx.db.insert(posts).values(input).returning()
      return post
    }),
})
