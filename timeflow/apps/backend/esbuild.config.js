import esbuild from 'esbuild';

// Build configuration for production deployment
// Bundle EVERYTHING except Prisma (which has native binaries)
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  // Only externalize @prisma/client (has native binaries that can't be bundled)
  external: ['@prisma/client'],
  banner: {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`
  },
  logLevel: 'info',
  minify: false,
  sourcemap: false,
});

console.log('✅ Backend bundled successfully');
