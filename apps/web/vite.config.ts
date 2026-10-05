import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const here = import.meta.dirname;

export default defineConfig(({ mode }) => {
  // Read VITE_* (and API_PORT) from the repo root .env as well.
  const env = { ...loadEnv(mode, path.resolve(here, '../..'), ''), ...process.env };
  // `vite --mode e2e`: swap Clerk for a local stand-in so Playwright can drive the UI
  // without real accounts. Never used for `vite build`.
  const isE2e = mode === 'e2e';

  return {
    envDir: path.resolve(here, '../..'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(here, 'src') },
        ...(isE2e
          ? [
              { find: '@clerk/react', replacement: path.resolve(here, 'e2e/mocks/clerk-react.tsx') },
              { find: '@clerk/themes/shadcn.css', replacement: path.resolve(here, 'e2e/mocks/empty.css') },
              { find: '@clerk/themes', replacement: path.resolve(here, 'e2e/mocks/clerk-themes.ts') },
            ]
          : []),
      ],
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: Number(env.WEB_PORT ?? 5173),
      proxy: {
        // Local dev: the API runs separately (pnpm dev); in production both share one origin.
        '/api': `http://localhost:${env.PORT ?? 3001}`,
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // Long-lived vendor chunks: app updates don't re-download React/Clerk.
          manualChunks: {
            react: ['react', 'react-dom', 'wouter', '@tanstack/react-query'],
            clerk: ['@clerk/react', '@clerk/themes'],
          },
        },
      },
    },
  };
});
