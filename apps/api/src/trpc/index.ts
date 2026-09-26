import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

import type { AppRouter } from './router.js'

export type { AppRouter }
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>
