import OpenAI from 'openai';
import pRetry, { AbortError } from 'p-retry';
import { config } from '../config.js';
import { logger } from './logger.js';
import { getPocketBase } from '../pocketbase/client.js';
import crypto from 'crypto';

/**
 * Valid source types for embeddings
 */
export type EmbeddingSourceType =
  | 'observation'
  | 'decision'
  | 'bug'
  | 'snippet'
  | 'workflow'
  | 'pattern';

/**
 * Options for saveEmbedding
 */
export interface SaveEmbeddingOptions {
  /**
   * Update strategy when embedding already exists
   * - 'skip': Skip if contentHash matches (default for most entities)
   * - 'replace': Delete existing and create new (upsert pattern)
   */
  onExisting?: 'skip' | 'replace';
}

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }
  return openai;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    // Retry on rate limit (429) and server errors (5xx)
    return error.status === 429 || (error.status >= 500 && error.status < 600);
  }
  // Retry on network errors
  if (error instanceof Error && error.message.includes('ECONNRESET')) {
    return true;
  }
  return false;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI();

  const attemptEmbedding = async () => {
    try {
      const response = await client.embeddings.create({
        model: config.openai.model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      if (!isRetryableError(error)) {
        // Don't retry non-retryable errors (auth, bad request, etc.)
        throw new AbortError(error instanceof Error ? error.message : 'Non-retryable error');
      }
      throw error;
    }
  };

  try {
    return await pRetry(attemptEmbedding, {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 30000,
      factor: 2, // exponential backoff: 1s, 2s, 4s
      onFailedAttempt: (error) => {
        logger.warn(`Embedding attempt ${error.attemptNumber}/4 failed. ${error.retriesLeft} retries left.`);
      },
    });
  } catch (error) {
    logger.error('Failed to create embedding after retries', error);
    throw error;
  }
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Save embedding vector for a record
 *
 * @param sourceType - Type of the source entity
 * @param sourceId - ID of the source record
 * @param content - Text content to embed
 * @param options - Configuration options
 *
 * @example
 * // Skip if same content exists (default)
 * await saveEmbedding('observation', recordId, 'Title\nContent');
 *
 * // Always replace existing (for workflows)
 * await saveEmbedding('workflow', recordId, content, { onExisting: 'replace' });
 */
export async function saveEmbedding(
  sourceType: EmbeddingSourceType,
  sourceId: string,
  content: string,
  options: SaveEmbeddingOptions = {}
): Promise<void> {
  const { onExisting = 'skip' } = options;

  try {
    const pb = await getPocketBase();
    const contentHash = hashContent(content);

    if (onExisting === 'skip') {
      // Check if embedding already exists with same content
      try {
        await pb.collection('embeddings').getFirstListItem(
          `source_id="${sourceId}" && content_hash="${contentHash}"`
        );
        logger.debug(`Embedding already exists for ${sourceType}:${sourceId}`);
        return; // Skip - embedding already exists with same content
      } catch {
        // Continue to create new embedding
      }
    } else if (onExisting === 'replace') {
      // Delete existing embedding for this source
      try {
        const existing = await pb.collection('embeddings').getFirstListItem(
          `source_id="${sourceId}" && source_type="${sourceType}"`
        );
        await pb.collection('embeddings').delete(existing.id);
        logger.debug(`Deleted existing embedding for ${sourceType}:${sourceId}`);
      } catch {
        // No existing embedding - continue
      }
    }

    // Create embedding vector
    const vector = await createEmbedding(content);

    // Save to database
    await pb.collection('embeddings').create({
      source_type: sourceType,
      source_id: sourceId,
      content_hash: contentHash,
      vector: vector,
      model: config.openai.model,
    });

    logger.info(`Saved embedding for ${sourceType}:${sourceId}`);
  } catch (error) {
    logger.error(`Failed to save embedding for ${sourceType}:${sourceId}`, error);
    // Don't throw - embedding is secondary/optional
  }
}

/**
 * Save embedding asynchronously (fire and forget)
 * Wrapper for use in capture functions where embedding is non-blocking
 *
 * @param sourceType - Type of the source entity
 * @param sourceId - ID of the source record
 * @param content - Text content to embed
 * @param options - Configuration options
 */
export function saveEmbeddingAsync(
  sourceType: EmbeddingSourceType,
  sourceId: string,
  content: string,
  options: SaveEmbeddingOptions = {}
): void {
  saveEmbedding(sourceType, sourceId, content, options).catch(() => {
    // Swallow error - already logged in saveEmbedding
  });
}
