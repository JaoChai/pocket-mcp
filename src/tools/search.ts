import { z } from 'zod';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';
import { createEmbedding, cosineSimilarity } from '../utils/embeddings.js';

// Schema definitions
export const SearchKnowledgeSchema = z.object({
  query: z.string().min(1).describe('Search query'),
  collections: z.array(z.enum(['observations', 'decisions', 'bugs_and_fixes', 'patterns', 'code_snippets']))
    .optional()
    .describe('Collections to search in (default: all)'),
  project: z.string().optional().describe('Filter by project name'),
  limit: z.number().min(1).max(50).optional().describe('Maximum results (default: 10)'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
});

export const SemanticSearchSchema = z.object({
  query: z.string().min(1).describe('Natural language query'),
  collections: z.array(z.enum(['observation', 'decision', 'bug', 'pattern', 'snippet']))
    .optional()
    .describe('Source types to search (default: all)'),
  threshold: z.number().min(0).max(1).optional().describe('Similarity threshold (default: 0.7)'),
  limit: z.number().min(1).max(20).optional().describe('Maximum results (default: 5)'),
});

// Full-text search across collections
export async function searchKnowledge(input: z.infer<typeof SearchKnowledgeSchema>) {
  const pb = await getPocketBase();
  const collections = input.collections || ['observations', 'decisions', 'bugs_and_fixes', 'patterns', 'code_snippets'];
  const limit = input.limit || 10;

  const results: Array<{
    collection: string;
    id: string;
    title: string;
    content: string;
    created: string;
    relevance: string;
  }> = [];

  // Build filter for project
  let projectFilter = '';
  if (input.project) {
    try {
      const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
      projectFilter = `project="${project.id}"`;
    } catch {
      // Project not found, continue without filter
    }
  }

  // Build filter for tags
  let tagsFilter = '';
  if (input.tags && input.tags.length > 0) {
    tagsFilter = input.tags.map(tag => `tags~"${tag}"`).join(' || ');
  }

  for (const collectionName of collections) {
    try {
      // Build search filter based on collection type
      let searchFilter = '';
      const query = input.query.toLowerCase();

      switch (collectionName) {
        case 'observations':
          searchFilter = `title~"${query}" || content~"${query}"`;
          break;
        case 'decisions':
          searchFilter = `title~"${query}" || context~"${query}" || rationale~"${query}"`;
          break;
        case 'bugs_and_fixes':
          searchFilter = `error_message~"${query}" || solution~"${query}" || root_cause~"${query}"`;
          break;
        case 'patterns':
          searchFilter = `name~"${query}" || problem~"${query}" || solution~"${query}"`;
          break;
        case 'code_snippets':
          searchFilter = `title~"${query}" || description~"${query}" || code~"${query}"`;
          break;
      }

      // Combine filters
      const filters = [searchFilter];
      if (projectFilter) filters.push(projectFilter);
      if (tagsFilter) filters.push(`(${tagsFilter})`);

      const finalFilter = filters.join(' && ');

      const records = await pb.collection(collectionName).getList(1, limit, {
        filter: finalFilter,
        sort: '-created',
      });

      for (const record of records.items) {
        results.push({
          collection: collectionName,
          id: record.id,
          title: record.title || record.name || record.error_message?.slice(0, 50) || 'Untitled',
          content: record.content || record.solution || record.code || record.rationale || '',
          created: record.created,
          relevance: 'keyword-match',
        });
      }
    } catch (error) {
      logger.error(`Search failed in ${collectionName}`, error);
    }
  }

  // Sort by created date (most recent first)
  results.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  return {
    query: input.query,
    total: results.length,
    results: results.slice(0, limit),
  };
}

// Collection name mapping
const COLLECTION_MAP: Record<string, string> = {
  observation: 'observations',
  decision: 'decisions',
  bug: 'bugs_and_fixes',
  pattern: 'patterns',
  snippet: 'code_snippets',
};

// Semantic search using embeddings with pagination
export async function semanticSearch(input: z.infer<typeof SemanticSearchSchema>) {
  const pb = await getPocketBase();
  const threshold = input.threshold || 0.7;
  const limit = input.limit || 5;
  const sourceTypes = input.collections || ['observation', 'decision', 'bug', 'pattern', 'snippet'];

  try {
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(input.query);

    // Build type filter
    const typeFilter = sourceTypes.map(t => `source_type="${t}"`).join(' || ');

    // Paginated search with early exit
    const scores: Array<{
      sourceType: string;
      sourceId: string;
      similarity: number;
    }> = [];

    const batchSize = 200;
    const maxPages = 10; // Safety limit
    let page = 1;

    while (page <= maxPages) {
      const batch = await pb.collection('embeddings').getList(page, batchSize, {
        filter: typeFilter,
        sort: '-created',
      });

      // Calculate similarities for this batch
      for (const embedding of batch.items) {
        const similarity = cosineSimilarity(queryEmbedding, embedding.vector as number[]);
        if (similarity >= threshold) {
          scores.push({
            sourceType: embedding.source_type,
            sourceId: embedding.source_id,
            similarity,
          });
        }
      }

      // Early exit conditions
      const highQualityResults = scores.filter(s => s.similarity >= 0.85);
      if (highQualityResults.length >= limit * 2) {
        logger.info(`Early exit: found ${highQualityResults.length} high-quality results`);
        break;
      }

      // Check if we've processed all embeddings
      if (page * batchSize >= batch.totalItems) {
        break;
      }

      page++;
    }

    if (page > maxPages) {
      logger.warn('Semantic search reached page limit');
    }

    // Sort by similarity (highest first)
    scores.sort((a, b) => b.similarity - a.similarity);

    // Fetch actual records for top results
    const results: Array<{
      type: string;
      id: string;
      title: string;
      content: string;
      similarity: number;
    }> = [];

    for (const score of scores.slice(0, limit)) {
      try {
        const collectionName = COLLECTION_MAP[score.sourceType];
        if (!collectionName) continue;

        const record = await pb.collection(collectionName).getOne(score.sourceId);

        results.push({
          type: score.sourceType,
          id: record.id,
          title: record.title || record.name || record.error_message?.slice(0, 50) || 'Untitled',
          content: (record.content || record.solution || record.code || record.rationale || '').slice(0, 300),
          similarity: Math.round(score.similarity * 100) / 100,
        });
      } catch {
        // Record might have been deleted
        logger.warn(`Record ${score.sourceId} not found`);
      }
    }

    return {
      query: input.query,
      total: results.length,
      results,
    };
  } catch (error) {
    logger.error('Semantic search failed', error);
    throw error;
  }
}
