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
  collections: z.array(z.enum(['observation', 'decision', 'bug', 'pattern', 'snippet', 'workflow']))
    .optional()
    .describe('Source types to search (default: all)'),
  threshold: z.number().min(0).max(1).optional().describe('Similarity threshold (default: 0.7)'),
  limit: z.number().min(1).max(20).optional().describe('Maximum results (default: 5)'),
  // Recency weighting options
  recency_weight: z.number().min(0).max(1).optional().describe('Weight for recency (0=ignore, 1=strong, default: 0.3)'),
  importance_weight: z.number().min(0).max(1).optional().describe('Weight for importance (default: 0.2)'),
  decay_days: z.number().min(1).max(365).optional().describe('Days for recency decay (default: 30)'),
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
  workflow: 'workflows',
};

// Semantic search using embeddings with recency weighting
export async function semanticSearch(input: z.infer<typeof SemanticSearchSchema>) {
  const pb = await getPocketBase();
  const threshold = input.threshold || 0.7;
  const limit = input.limit || 5;
  const sourceTypes = input.collections || ['observation', 'decision', 'bug', 'pattern', 'snippet', 'workflow'];

  // Recency weighting parameters
  const recencyWeight = input.recency_weight ?? 0.3;
  const importanceWeight = input.importance_weight ?? 0.2;
  const decayDays = input.decay_days ?? 30;
  const similarityWeight = Math.max(0, 1 - recencyWeight - importanceWeight);

  try {
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(input.query);

    // Get all embeddings (use getFullList to avoid PocketBase pagination issues)
    const allEmbeddings = await pb.collection('embeddings').getFullList();

    // Calculate similarities and fetch records for scoring
    const scores: Array<{
      sourceType: string;
      sourceId: string;
      similarity: number;
      recencyScore: number;
      importanceScore: number;
      finalScore: number;
      created: string;
    }> = [];

    const now = Date.now();

    for (const embedding of allEmbeddings) {
      // Filter by source type in code
      if (!sourceTypes.includes(embedding.source_type)) {
        continue;
      }

      // Skip embeddings with null/empty vectors
      if (!embedding.vector || !Array.isArray(embedding.vector) || embedding.vector.length === 0) {
        continue;
      }

      try {
        const similarity = cosineSimilarity(queryEmbedding, embedding.vector as number[]);
        if (similarity < threshold) {
          continue;
        }

        // Fetch source record for metadata
        const collectionName = COLLECTION_MAP[embedding.source_type];
        if (!collectionName) continue;

        let record;
        try {
          record = await pb.collection(collectionName).getOne(embedding.source_id);
        } catch {
          continue; // Record deleted
        }

        // Calculate recency score (exponential decay)
        const createdDate = new Date(record.created).getTime();
        const daysOld = (now - createdDate) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.exp(-daysOld / decayDays);

        // Calculate importance score (normalize to 0-1)
        let importanceScore = 0.5; // Default middle importance
        if (record.importance !== undefined) {
          importanceScore = (record.importance - 1) / 4; // Convert 1-5 to 0-1
        } else if (record.strength !== undefined) {
          importanceScore = (record.strength - 1) / 4;
        } else if (embedding.source_type === 'decision') {
          // Decisions with outcomes are more important
          importanceScore = record.outcome ? 0.8 : 0.5;
        } else if (embedding.source_type === 'workflow') {
          // Frequently executed workflows are more important
          const execCount = record.execution_count || 0;
          importanceScore = Math.min(1, 0.3 + (execCount * 0.1));
        }

        // Calculate final weighted score
        const finalScore =
          similarity * similarityWeight +
          recencyScore * recencyWeight +
          importanceScore * importanceWeight;

        scores.push({
          sourceType: embedding.source_type,
          sourceId: embedding.source_id,
          similarity,
          recencyScore: Math.round(recencyScore * 100) / 100,
          importanceScore: Math.round(importanceScore * 100) / 100,
          finalScore: Math.round(finalScore * 100) / 100,
          created: record.created,
        });
      } catch (error) {
        logger.warn(`Failed to process embedding ${embedding.id}:`, error);
      }
    }

    // Sort by final weighted score (highest first)
    scores.sort((a, b) => b.finalScore - a.finalScore);

    // Fetch actual records for top results
    const results: Array<{
      type: string;
      id: string;
      title: string;
      content: string;
      similarity: number;
      recency_score: number;
      importance_score: number;
      final_score: number;
      created: string;
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
          content: (record.content || record.solution || record.code || record.rationale || record.description || '').slice(0, 300),
          similarity: Math.round(score.similarity * 100) / 100,
          recency_score: score.recencyScore,
          importance_score: score.importanceScore,
          final_score: score.finalScore,
          created: score.created,
        });
      } catch {
        // Record might have been deleted
        logger.warn(`Record ${score.sourceId} not found`);
      }
    }

    return {
      query: input.query,
      weights: {
        similarity: Math.round(similarityWeight * 100) / 100,
        recency: recencyWeight,
        importance: importanceWeight,
        decay_days: decayDays,
      },
      total: results.length,
      results,
    };
  } catch (error) {
    logger.error('Semantic search failed', error);
    throw error;
  }
}
