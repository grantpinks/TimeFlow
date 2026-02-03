import esbuild from 'esbuild';

// Build configuration for production deployment
// Bundle EVERYTHING except Prisma (which has native binaries)
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/index.cjs',
  // Only externalize @prisma/client (has native binaries that can't be bundled)
  external: ['@prisma/client'],
  logLevel: 'info',
  minify: false,
  sourcemap: false,
});

console.log('✅ Backend bundled successfully');
