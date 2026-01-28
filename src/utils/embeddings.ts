import OpenAI from 'openai';
import pRetry, { AbortError } from 'p-retry';
import { config } from '../config.js';
import { logger } from './logger.js';
import crypto from 'crypto';

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
