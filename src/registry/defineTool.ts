import { z } from 'zod';
import type { ToolDefinition, ToolCategory } from './types.js';

/**
 * Helper function to define a tool with full type inference
 *
 * @example
 * export const createSession = defineTool({
 *   name: 'create_session',
 *   description: 'Start a new work session',
 *   category: 'session',
 *   schema: CreateSessionSchema,
 *   handler: async (input) => {
 *     // input is fully typed based on schema
 *     return { success: true, id: '...' };
 *   },
 * });
 */
export function defineTool<TSchema extends z.AnyZodObject>(config: {
  name: string;
  description: string;
  schema: TSchema;
  handler: (input: z.infer<TSchema>) => Promise<unknown>;
  category?: ToolCategory;
}): ToolDefinition<TSchema> {
  return {
    name: config.name,
    description: config.description,
    schema: config.schema,
    handler: config.handler,
    category: config.category,
  };
}
