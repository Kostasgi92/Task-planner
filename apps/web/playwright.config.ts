import { defineConfig, devices } from '@playwright/test';

const port = 5174;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices['Desktop Chrome'],
    // Deadlines are entered in local time; pin the zone so assertions are stable.
    timezoneId: 'Europe/Athens',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec vite --mode e2e --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
    env: { VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_e2e' },
  },
});
