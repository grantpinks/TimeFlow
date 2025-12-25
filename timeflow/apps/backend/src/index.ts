/**
 * Application Entry Point
 *
 * Bootstraps the Fastify server and listens on the configured port.
 */

// Log startup immediately - this runs BEFORE imports in ESM
console.log('🚀 TimeFlow backend starting...');
console.log('📋 Environment check:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  PORT:', process.env.PORT || '4000');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
console.log('  SESSION_SECRET:', process.env.SESSION_SECRET ? '✓ Set' : '✗ Missing');
console.log('  ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '✓ Set' : '✗ Missing');

import { buildServer } from './server.js';
import { env } from './config/env.js';

console.log('✅ Imports loaded successfully');

async function main() {
  console.log('🔧 Building Fastify server...');
  const server = await buildServer();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    console.log(`🌐 Listening on port ${env.PORT}...`);
    const address = await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`TimeFlow backend listening at ${address}`);
    console.log(`✅ Server ready at ${address}`);
  } catch (err) {
    server.log.error(err);
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ FATAL ERROR:');
  console.error(error);
  process.exit(1);
});

