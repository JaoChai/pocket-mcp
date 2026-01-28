#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';
import { healthCheck } from './pocketbase/client.js';

async function main() {
  logger.info('Starting PocketBase Brain MCP Server...');

  // Verify PocketBase connection
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    logger.error('PocketBase health check failed. Please check your configuration.');
    logger.error('Required environment variables:');
    logger.error('  - POCKETBASE_URL');
    logger.error('  - POCKETBASE_EMAIL');
    logger.error('  - POCKETBASE_PASSWORD');
    logger.error('  - OPENAI_API_KEY');
    process.exit(1);
  }

  logger.info('PocketBase connection verified');

  // Create and start server
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  logger.info('PocketBase Brain MCP Server running on STDIO');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
