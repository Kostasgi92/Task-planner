// Bundles the API into a single Node file (no workspace/TS resolution needed at runtime).
import { build } from 'esbuild';

export async function bundleApi({ entry, outfile, footer }) {
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    sourcemap: true,
    // Optional native binding that pg tries to load; not used.
    external: ['pg-native'],
    logLevel: 'warning',
    ...(footer ? { footer: { js: footer } } : {}),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await bundleApi({ entry: 'src/server.ts', outfile: 'dist/server.cjs' });
  console.log('Built apps/api/dist/server.cjs');
}
