'use client'

import { useState } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import SuperJSON from 'superjson'

import { getSupabase, isSupabaseConfigured } from '../supabase/client'
import { api } from './react'

// The signed-in person's access token for the API (Authorization: Bearer …); the API verifies it on every request.
// getSession() is fine here: it only reads the browser's own session, and the API never trusts it without checking.
async function authHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {}
  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// In production the API is served from the same domain (/api), so the URL is relative.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000')

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({ enabled: () => process.env.NODE_ENV === 'development' }),
        httpBatchLink({
          url: `${API_URL}/api/trpc`,
          transformer: SuperJSON,
          headers: authHeaders,
        }),
      ],
    }),
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  )
}
