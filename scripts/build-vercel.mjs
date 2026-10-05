// Produces a Vercel "Build Output API v3" bundle in .vercel/output:
//   static/          → the web app (Vite build)
//   functions/api.func → the whole Express API as one Node function, served at /api/*
// Same origin for both, so no CORS and the browser never sends tokens cross-site.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleApi } from '../apps/api/build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.vercel/output');
const fn = path.join(out, 'functions/api.func');

if (!process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'VITE_CLERK_PUBLISHABLE_KEY must be set at build time (Vercel → Settings → Environment Variables).',
  );
}

rmSync(out, { recursive: true, force: true });

execSync('pnpm --filter @tasknest/web build', { cwd: root, stdio: 'inherit' });
cpSync(path.join(root, 'apps/web/dist'), path.join(out, 'static'), { recursive: true });

mkdirSync(fn, { recursive: true });
await bundleApi({
  entry: path.join(root, 'apps/api/src/vercel.ts'),
  outfile: path.join(fn, 'index.cjs'),
  // Export the Express app itself as the handler.
  footer: 'module.exports = module.exports.default;',
});
writeFileSync(
  path.join(fn, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.cjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      maxDuration: 10,
      // Frankfurt — keep it next to the database (Neon: AWS eu-central-1).
      regions: [process.env.VERCEL_FUNCTION_REGION ?? 'fra1'],
    },
    null,
    2,
  ),
);

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

writeFileSync(
  path.join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: securityHeaders, continue: true },
        {
          src: '/assets/(.*)',
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        { src: '/api(?:/.*)?', dest: '/api' },
        { handle: 'filesystem' },
        // Client-side routes (/settings, /category/3, /sign-in/...) all load the SPA.
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('Vercel output ready in .vercel/output');
