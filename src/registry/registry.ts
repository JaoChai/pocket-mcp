import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import type { ToolDefinition, ToolCategory } from './types.js';
import { wrapHandler } from './wrapHandler.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDefinition = ToolDefinition<any>;

/**
 * Tool Registry - manages tool registration and provides centralized error handling
 */
export class ToolRegistry {
  private tools: Map<string, AnyToolDefinition> = new Map();

  /**
   * Register a single tool definition
   */
  register<T extends z.AnyZodObject>(tool: ToolDefinition<T>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: AnyToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Apply all registered tools to an MCP server instance
   */
  applyToServer(server: McpServer): void {
    for (const tool of this.tools.values()) {
      server.tool(
        tool.name,
        tool.description,
        tool.schema.shape,
        wrapHandler(tool.name, tool.schema, tool.handler)
      );
    }
    logger.info(`Applied ${this.tools.size} tools to MCP server`);
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): AnyToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.category === category);
  }

  /**
   * Get total count of registered tools
   */
  get size(): number {
    return this.tools.size;
  }
}

// Singleton instance
export const registry = new ToolRegistry();
