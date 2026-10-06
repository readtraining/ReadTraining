// Vercel entrypoint. Vercel Services checks that the entrypoint exists before the
// build runs, so it cannot point at dist/ directly. This file is committed and
// re-exports the self-contained bundle that build.mjs writes to dist/index.mjs.
export { default } from './dist/index.mjs'
