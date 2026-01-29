import { z } from 'zod';
import { CommonFields } from './common-fields.js';

/**
 * Base schemas for common object patterns
 * These are used as foundations for specific tool schemas via .extend()
 */

// Base for entities that belong to a project
export const ProjectEntityBase = z.object({
  project: CommonFields.project,
  tags: CommonFields.tags,
});

// Base for searchable entities
export const SearchableEntityBase = z.object({
  query: CommonFields.query,
  project: CommonFields.project,
});

// Base for list/pagination operations
export const ListOptionsBase = z.object({
  limit: CommonFields.limitMedium,
  offset: z.number().min(0).optional().describe('Number of items to skip'),
});

// Base for field selection (for Phase 2)
export const FieldSelectionBase = z.object({
  fields: z
    .array(z.string())
    .optional()
    .describe('Fields to include in response. Supports nested fields with dot notation (e.g., "user.name")'),
});

// Base for cursor pagination (for Phase 3)
export const CursorPaginationBase = z.object({
  limit: z.number().min(1).max(100).optional().describe('Items per page (default: 20)'),
  cursor: z.string().optional().describe('Cursor from previous page (for pagination)'),
});

// Base for filtering operations
export const FilterableBase = z.object({
  filter: z.string().optional().describe('Filter expression'),
  sort: z.string().optional().describe('Sort field and direction (e.g., "-created")'),
});

// Base for time-based queries
export const TimeRangeBase = z.object({
  startDate: CommonFields.startDate,
  endDate: CommonFields.endDate,
});

// Base for importance-filtered queries
export const ImportanceFilterBase = z.object({
  minImportance: CommonFields.importance.optional().describe('Minimum importance level'),
  maxImportance: CommonFields.importance.optional().describe('Maximum importance level'),
});

// Base for similarity-based searches
export const SimilaritySearchBase = z.object({
  similarity: CommonFields.similarityThreshold,
  weight: z
    .object({
      similarity: CommonFields.recencyWeight,
      recency: CommonFields.recencyWeight,
      importance: CommonFields.importanceWeight,
    })
    .optional()
    .describe('Weights for similarity calculation'),
  decayDays: CommonFields.decayDays,
  threshold: z.number().min(0).max(1).optional().describe('Similarity threshold (default: 0.7)'),
});

// Base for capture operations (observations, decisions, bugs)
export const CaptureBase = ProjectEntityBase.extend({
  title: CommonFields.title,
  content: CommonFields.content,
  tags: CommonFields.tags,
});

// Base for workflow steps
export const WorkflowStepBase = z.object({
  order: z.number().min(1).describe('Step order'),
  action: z.string().min(1).describe('Action to perform'),
  description: z.string().describe('Step description'),
  tool: z.string().optional().describe('Tool to use'),
  command: z.string().optional().describe('Command to execute'),
  check: z.string().optional().describe('Verification step'),
  optional: z.boolean().optional().describe('Is this step optional'),
});

// Base for relationships
export const RelationshipBase = z.object({
  sourceType: CommonFields.relationType,
  sourceId: CommonFields.id,
  relationshipType: CommonFields.relationType,
  targetType: CommonFields.relationType,
  targetId: CommonFields.id,
  context: z.string().optional().describe('Context explaining the relationship'),
});

// Base for preferences
export const PreferenceBase = z.object({
  category: CommonFields.preferenceCategory,
  preference: CommonFields.title,
  reason: z.string().optional().describe('Reason for this preference'),
  strength: z.number().min(1).max(5).optional().describe('Preference strength (1-5)'),
});
