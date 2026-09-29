// Starts an isolated server for the end-to-end tests: a fresh database with demo data,
// cheaper password hashing and relaxed rate limits. E2E_MODE=dev runs Vite (to surface
// React development warnings) with the API behind it; the default serves the production build.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

const mode = process.env.E2E_MODE === 'dev' ? 'dev' : 'prod'
const dir = `e2e/.tmp-${mode}`
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

const env = { ...process.env, DB_PATH: `${dir}/e2e.db`, LUSH_SCRYPT_N: '16384', LUSH_RATE_LIMIT_SCALE: '50', NODE_NO_WARNINGS: '1' }
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const seeded = spawnSync(npx, ['tsx', 'server/cli/seed-demo.ts'], { env, stdio: 'inherit', shell: process.platform === 'win32' })
if (seeded.status !== 0) process.exit(seeded.status ?? 1)

const children =
  mode === 'prod'
    ? [spawn(npx, ['tsx', 'server/index.ts', '--production'], { env: { ...env, PORT: '4321' }, stdio: 'inherit' })]
    : [
        spawn(npx, ['tsx', 'server/index.ts'], { env: { ...env, PORT: '4331' }, stdio: 'inherit' }),
        spawn(npx, ['vite', '--port', '4322', '--strictPort'], { env: { ...env, API_PORT: '4331' }, stdio: 'inherit' }),
      ]

const stop = () => {
  children.forEach((child) => child.kill())
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
