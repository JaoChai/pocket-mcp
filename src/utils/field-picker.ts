/**
 * Field Selection Utility for GraphQL-style field picking
 * Reduces response size by allowing clients to request only needed fields
 */

/**
 * Pick specified fields from an object or array of objects
 * Supports nested field access with dot notation (e.g., "user.name")
 *
 * @param data - Object or array of objects to pick fields from
 * @param fields - Array of field names to include
 * @returns Filtered object(s) with only requested fields
 */
export function pickFields<T extends Record<string, any>>(
  data: T | T[],
  fields?: string[]
): T | T[] | Partial<T> | Partial<T>[] {
  if (!fields || fields.length === 0) {
    return data; // No filtering - backward compatible
  }

  const pick = (obj: T): Partial<T> => {
    const result: Partial<T> = {};

    for (const field of fields) {
      // Support nested field access: "user.name"
      if (field.includes('.')) {
        const [parent, ...nested] = field.split('.');
        if (obj[parent as keyof T]) {
          result[parent as keyof T] = pickNestedField(
            obj[parent as keyof T],
            nested.join('.')
          ) as T[keyof T];
        }
      } else if (field in obj) {
        result[field as keyof T] = obj[field as keyof T];
      }
    }

    return result;
  };

  if (Array.isArray(data)) {
    return data.map(pick);
  }

  return pick(data);
}

/**
 * Helper function to access nested object properties
 */
function pickNestedField(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Default field selections for each entity type
 * Used when client doesn't specify fields parameter
 * Balances between useful info and small payload size
 */
export const DefaultFields: Record<string, string[]> = {
  // Task fields - core info for task management
  task: ['id', 'title', 'status', 'priority', 'created'],

  // Observation fields - discovery/pattern/insight
  observation: ['id', 'title', 'type', 'category', 'importance', 'created'],

  // Decision fields - what was decided
  decision: ['id', 'title', 'chosen', 'created'],

  // Bug fields - error info and fix
  bug: ['id', 'error_type', 'error_message', 'solution', 'created'],

  // Code snippet fields - what and where
  snippet: ['id', 'title', 'language', 'created'],

  // Workflow fields - name and when to use
  workflow: ['id', 'name', 'trigger', 'created'],

  // Project context - tech stack and status
  project: ['id', 'name', 'tech_stack', 'status'],

  // Preference fields
  preference: ['id', 'category', 'preference', 'strength'],

  // Retrospective/lesson fields
  lesson: ['id', 'title', 'category', 'created'],
};

/**
 * Fields that are computationally expensive to include
 * Excluded from default selections but can be explicitly requested
 */
export const ExpensiveFields = new Set([
  'description', // Long text
  'content', // Long text
  'code', // Long code snippets
  'steps', // Array of objects
  'expand', // Relation expansion
  'solution', // Detailed bug solution
  'rationale', // Detailed reasoning
]);

/**
 * Check if a field should be included based on expense
 *
 * @param field - Field name to check
 * @param requestedFields - Array of explicitly requested fields
 * @returns Whether the field should be included
 */
export function shouldIncludeField(field: string, requestedFields?: string[]): boolean {
  if (!requestedFields) {
    // Default: exclude expensive fields
    return !ExpensiveFields.has(field);
  }

  // If explicitly requested, include it
  return requestedFields.includes(field);
}
