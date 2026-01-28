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

// Helper function to check if record matches search query
function matchesQuery(record: Record<string, unknown>, fields: string[], query: string): boolean {
  const lowerQuery = query.toLowerCase();
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
      return true;
    }
  }
  return false;
}

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

  // Get project ID if specified
  let projectId: string | null = null;
  if (input.project) {
    try {
      const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
      projectId = project.id;
    } catch {
      // Project not found, continue without filter
    }
  }

  // Define search fields for each collection
  const searchFields: Record<string, string[]> = {
    observations: ['title', 'content'],
    decisions: ['title', 'context', 'rationale'],
    bugs_and_fixes: ['error_message', 'solution', 'root_cause'],
    patterns: ['name', 'problem', 'solution'],
    code_snippets: ['title', 'description', 'code'],
  };

  for (const collectionName of collections) {
    try {
      // Get all records and filter in code (avoid PocketBase OR filter issues)
      const records = await pb.collection(collectionName).getFullList({
        sort: '-created',
      });

      const fields = searchFields[collectionName] || ['title', 'content'];

      for (const record of records) {
        // Filter by project if specified
        if (projectId && record.project !== projectId) {
          continue;
        }

        // Filter by tags if specified
        if (input.tags && input.tags.length > 0) {
          const recordTags = (record.tags as string[]) || [];
          if (!input.tags.some(tag => recordTags.includes(tag))) {
            continue;
          }
        }

        // Check if record matches search query
        if (!matchesQuery(record, fields, input.query)) {
          continue;
        }

        results.push({
          collection: collectionName,
          id: record.id as string,
          title: (record.title || record.name || (record.error_message as string)?.slice(0, 50) || 'Untitled') as string,
          content: (record.content || record.solution || record.code || record.rationale || '') as string,
          created: record.created as string,
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

// Semantic search using embeddings
export async function semanticSearch(input: z.infer<typeof SemanticSearchSchema>) {
  const pb = await getPocketBase();
  const threshold = input.threshold || 0.7;
  const limit = input.limit || 5;
  const sourceTypes = input.collections || ['observation', 'decision', 'bug', 'pattern', 'snippet'];

  try {
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(input.query);

    // Get all embeddings (use getFullList to avoid PocketBase pagination issues)
    const allEmbeddings = await pb.collection('embeddings').getFullList();

    // Calculate similarities
    const scores: Array<{
      sourceType: string;
      sourceId: string;
      similarity: number;
    }> = [];

    for (const embedding of allEmbeddings) {
      // Filter by source type in code
      if (!sourceTypes.includes(embedding.source_type)) {
        continue;
      }

      // Skip embeddings with null/empty vectors
      if (!embedding.vector || !Array.isArray(embedding.vector) || embedding.vector.length === 0) {
        logger.warn(`Skipping embedding ${embedding.id} with invalid vector`);
        continue;
      }

      try {
        const similarity = cosineSimilarity(queryEmbedding, embedding.vector as number[]);
        if (similarity >= threshold) {
          scores.push({
            sourceType: embedding.source_type,
            sourceId: embedding.source_id,
            similarity,
          });
        }
      } catch (error) {
        logger.warn(`Failed to calculate similarity for ${embedding.id}:`, error);
      }
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
