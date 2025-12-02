/**
 * Application Entry Point
 *
 * Bootstraps the Fastify server and listens on the configured port.
 */

import { buildServer } from './server.js';
import { env } from './config/env.js';

async function main() {
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
    const address = await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`TimeFlow backend listening at ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();

