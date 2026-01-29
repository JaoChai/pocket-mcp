import { z } from 'zod';

/**
 * Common validation patterns used across multiple tools
 * Centralizing these reduces duplication and makes updates easier
 */
export const Validations = {
  // String validations
  nonEmptyString: z.string().min(1),
  shortString: z.string().min(1).max(100),
  mediumString: z.string().min(1).max(500),
  longString: z.string().min(1),

  // Numeric importance/strength (1-5 scale)
  importance: z.number().min(1).max(5),
  strength: z.number().min(1).max(5),
  percentage: z.number().min(0).max(100),

  // List/pagination limits
  limitSmall: z.number().min(1).max(20),
  limitMedium: z.number().min(1).max(50),
  limitLarge: z.number().min(1).max(100),

  // Similarity and weight scores (0-1 range)
  similarity: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  threshold: z.number().min(0).max(1),

  // Day ranges
  daysShort: z.number().min(1).max(90),
  daysLong: z.number().min(1).max(365),

  // ID validations
  id: z.string().min(1),

  // URL/Link validations
  url: z.string().url(),
  optionalUrl: z.string().url().optional(),
};

/**
 * Default values for common parameters
 */
/**
 * Default values for common parameters
 */
export const Defaults = {
  limit: 50,
  limitSmall: 20,
  limitLarge: 100,
  importanceThreshold: 3,
  similarityThreshold: 0.7,
  daysOld: 7,
};

/**
 * Additional limit validators for specific use cases
 */
export const LimitValidations = {
  limitMediumLarge: z.number().min(1).max(50),
  limitMediumSmall: z.number().min(1).max(20),
};
