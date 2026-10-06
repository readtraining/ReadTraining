// Bundles the API and all of its packages into one file (dist/index.mjs).
// Vercel deploys only the apps/api folder, so pnpm's shared node_modules at the
// repo root are not available at runtime; a self-contained bundle avoids that.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.mts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  // CommonJS packages bundled into ESM still call require() for Node built-ins.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
})
