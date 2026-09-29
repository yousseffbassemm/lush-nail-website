import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests acting as a customer, staff and an admin.
 *   npm run test:e2e       production build + server
 *   npm run test:e2e:dev   Vite dev server, which also reports React development warnings
 */
export function makeConfig(dev: boolean) {
  const baseURL = dev ? 'http://localhost:4322' : 'http://localhost:4321'
  return defineConfig({
  testDir: '.',
  testIgnore: ['**/.tmp-*/**'],
  outputDir: dev ? '.results-dev' : '.results',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    timezoneId: 'Africa/Cairo',
    locale: 'en-GB',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined,
  },
  projects: [
    // Reduced motion keeps these deterministic; the "motion" project runs everything again with
    // the full choreography, the way most visitors see it.
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, contextOptions: { reducedMotion: 'reduce' } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, contextOptions: { reducedMotion: 'reduce' } } },
    { name: 'motion', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, contextOptions: { reducedMotion: 'no-preference' } } },
  ],
  webServer: {
    command: 'node e2e/serve.mjs',
    cwd: '..',
    url: `${baseURL}/api/auth/me`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { E2E_MODE: dev ? 'dev' : 'prod' },
    stdout: 'ignore',
    stderr: 'pipe',
  },
  })
}

export default makeConfig(false)
