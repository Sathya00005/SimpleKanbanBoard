import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: '.', // Look for tests in the current directory
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  // Let Jest handle integration tests; Playwright handles e2e and API tests
  testIgnore: ['**/*.integration.test.*'],
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  ...(process.env.CI ? { workers: 1 } : {}),
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  use: {
    // All API requests will be prefixed with this.
    baseURL: 'http://localhost:3001',
  },
});
