import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registry } from './registry/index.js';
import { allTools } from './tools/index.js';
import { logger } from './utils/logger.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'pocketbase-brain',
    version: '1.0.0',
  });

  // Register all tools upfront (MCP protocol requires all tools at startup)
  registry.registerAll(allTools);
  registry.applyToServer(server);

  logger.info(`MCP Server created with ${allTools.length} tools registered.`);

  return server;
}
