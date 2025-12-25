import esbuild from 'esbuild';

// Build configuration for production deployment
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  // Only externalize node_modules packages, NOT workspace packages
  external: [
    '@prisma/client',
    '@fastify/*',
    'fastify',
    'googleapis',
    'dotenv',
    'luxon',
    'zod',
  ],
  // Bundle workspace packages (@timeflow/*)
  packages: 'bundle',
  logLevel: 'info',
});

console.log('✅ Backend bundled successfully');
