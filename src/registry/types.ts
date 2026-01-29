import { z } from 'zod';

/**
 * Tool categories for grouping related tools
 */
export type ToolCategory =
  | 'session'
  | 'task'
  | 'capture'
  | 'outcome'
  | 'workflow'
  | 'search'
  | 'context'
  | 'relation'
  | 'reflection';

/**
 * Generic tool definition interface for type-safe tool registration
 * Uses z.AnyZodObject to ensure schema has .shape property for MCP SDK
 */
export interface ToolDefinition<TSchema extends z.AnyZodObject = z.AnyZodObject> {
  /** Unique tool name (used for MCP registration) */
  name: string;

  /** Human-readable description for Claude */
  description: string;

  /** Zod schema for input validation */
  schema: TSchema;

  /** Tool handler function - receives validated input, returns JSON-serializable output */
  handler: (input: z.infer<TSchema>) => Promise<unknown>;

  /** Optional category for grouping */
  category?: ToolCategory;
}

/**
 * MCP tool response format (compatible with MCP SDK's expected return type)
 */
export interface McpToolResponse {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
