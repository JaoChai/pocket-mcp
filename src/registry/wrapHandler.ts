import { z } from 'zod';
import { logger } from '../utils/logger.js';
import type { McpToolResponse } from './types.js';

/**
 * Wraps a tool handler with:
 * - Input validation via Zod schema
 * - Centralized error handling
 * - Consistent JSON response formatting
 * - Error logging
 *
 * @param toolName - Name of the tool (for logging)
 * @param schema - Zod schema for input validation
 * @param handler - The actual handler function
 * @returns Wrapped handler compatible with MCP server
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapHandler(
  toolName: string,
  schema: z.ZodType,
  handler: (input: any) => Promise<unknown>
): (args: unknown) => Promise<McpToolResponse> {
  return async (args: unknown): Promise<McpToolResponse> => {
    try {
      // Validate input
      const validatedInput = schema.parse(args);

      // Execute handler
      const result = await handler(validatedInput);

      // Return success response
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      // Log error with tool context
      logger.error(`${toolName} failed`, error);

      // Format error message
      let errorMessage: string;

      if (error instanceof z.ZodError) {
        errorMessage = `Validation error: ${error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }

      // Return error response
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  };
}
