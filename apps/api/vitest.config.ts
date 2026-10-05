import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Local convenience: pick up TEST_DATABASE_URL from the repo's .env (CI sets it directly).
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // No .env file.
}

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    // All files share one test database.
    fileParallelism: false,
    env: { NODE_ENV: 'test' },
  },
});
