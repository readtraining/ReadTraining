import { createTRPCReact } from '@trpc/react-query'

// Type-only import: no API code ends up in the web bundle
import type { AppRouter } from '@readtraining/api'

export const api = createTRPCReact<AppRouter>()

export type { RouterInputs, RouterOutputs } from '@readtraining/api'
