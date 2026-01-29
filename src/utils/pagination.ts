/**
 * Cursor-based Pagination Utility
 * More efficient than offset-based pagination for large datasets
 */

export interface CursorPaginationInput {
  limit?: number;
  cursor?: string; // ID of last item from previous page
}

export interface CursorPaginationResult<T extends { id: string }> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Paginate results using cursor-based approach
 * More efficient than offset/limit for real-time data
 *
 * @param collection - PocketBase collection instance
 * @param options - Pagination options (limit, cursor, filter, sort)
 * @returns Paginated results with next cursor
 */
export async function paginateWithCursor<T extends { id: string }>(
  collection: any,
  options: {
    limit: number;
    cursor?: string;
    filter?: string;
    sort?: string;
  }
): Promise<CursorPaginationResult<T>> {
  const { limit, cursor, filter, sort = '-created' } = options;

  // Build filter with cursor condition
  let fullFilter = filter || '';

  if (cursor) {
    // Get the cursor item to find its created timestamp
    try {
      const cursorRecord = await collection.getOne(cursor);
      const cursorCondition = `created < "${cursorRecord.created}"`;
      fullFilter = fullFilter ? `(${fullFilter}) && ${cursorCondition}` : cursorCondition;
    } catch {
      // If cursor not found, just use original filter
    }
  }

  // Fetch limit + 1 to check if there are more items
  const result = await collection.getList(1, limit + 1, {
    filter: fullFilter || undefined,
    sort,
  });

  const hasMore = result.items.length > limit;
  const items = hasMore ? result.items.slice(0, limit) : result.items;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return {
    items: items as T[],
    nextCursor,
    hasMore,
  };
}

/**
 * Convert offset-based pagination to cursor response format
 * Used for backward compatibility with existing code
 */
export function offsetToCursor(
  items: Array<{ id: string }>,
  currentOffset: number,
  totalItems: number,
  pageSize: number
): CursorPaginationResult<{ id: string }> {
  const hasMore = currentOffset + pageSize < totalItems;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Build pagination metadata for response
 * Reduced metadata compared to traditional offset-based approach
 */
export function buildPaginationMeta(result: CursorPaginationResult<any>, showCount: number) {
  return {
    showing: showCount,
    hasMore: result.hasMore,
    nextCursor: result.nextCursor,
  };
}
