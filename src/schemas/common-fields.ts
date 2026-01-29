import { z } from 'zod';
import { Validations } from './validations.js';
import {
  PriorityEnum,
  TaskStatusEnum,
  ObservationTypeEnum,
  ObservationCategoryEnum,
  ErrorTypeEnum,
  LanguageEnum,
  PreferenceCategoryEnum,
  RelationTypeEnum,
  CollectionNameEnum,
  RetroTypeEnum,
} from './enums.js';

/**
 * Reusable field definitions with descriptions for Claude
 * These are combined in schemas using .extend() to avoid duplication
 */
export const CommonFields = {
  // Project references
  project: z.string().optional().describe('Project name or ID'),
  projectRequired: z.string().min(1).describe('Project name'),

  // Tags and categorization
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
  categories: z.array(z.string()).optional().describe('Categories or labels'),

  // Importance and priority
  importance: Validations.importance.optional().describe('Importance level 1-5'),
  priority: PriorityEnum.optional().describe('Priority level (critical, high, medium, low)'),

  // Status fields
  status: TaskStatusEnum.optional().describe('Status (pending, in_progress, done, blocked, cancelled)'),
  taskStatus: TaskStatusEnum.describe('Task status'),

  // Title and description
  title: Validations.nonEmptyString.describe('Title'),
  titleOptional: z.string().optional().describe('Title'),
  description: z.string().optional().describe('Description'),

  // Content fields
  content: z.string().min(1).describe('Content'),
  contentOptional: z.string().optional().describe('Content'),

  // File references
  files: z.array(z.string()).optional().describe('Related file paths'),

  // Date fields
  dueDate: z.string().optional().describe('Due date (ISO format)'),
  createdDate: z.string().describe('Created date (ISO format)'),
  startDate: z.string().optional().describe('Start date (ISO format)'),
  endDate: z.string().optional().describe('End date (ISO format)'),

  // Limit parameters (for pagination)
  limitSmall: Validations.limitSmall.optional().describe('Maximum results (default: 20)'),
  limitMedium: Validations.limitMedium.optional().describe('Maximum results (default: 50)'),
  limitLarge: Validations.limitLarge.optional().describe('Maximum results (default: 100)'),

  // Query and search
  query: Validations.nonEmptyString.describe('Search query'),
  queryOptional: z.string().optional().describe('Search query'),
  filter: z.string().optional().describe('Filter expression'),

  // Specific domain fields
  observationType: ObservationTypeEnum.describe('Type (discovery, pattern, insight, note)'),
  observationCategory: ObservationCategoryEnum.describe('Category (architecture, code, performance, etc)'),
  errorType: ErrorTypeEnum.describe('Error type (runtime, compile, logic, performance, security, other)'),
  errorMessage: z.string().min(1).describe('Error message'),
  language: LanguageEnum.describe('Programming language'),
  preferenceCategory: PreferenceCategoryEnum.describe(
    'Preference category (coding_style, tools, workflow, communication, other)'
  ),
  relationType: RelationTypeEnum.describe('Relationship type (uses, caused, fixed_by, etc)'),
  collectionName: CollectionNameEnum.optional().describe('Collection to search'),
  retroType: RetroTypeEnum.optional().describe('Retrospective type (session, daily, weekly, monthly)'),

  // Numeric parameters
  daysOld: Validations.daysShort.optional().describe('Days old threshold (default: 7)'),
  similarityThreshold: Validations.similarity.optional().describe('Similarity threshold (0-1, default: 0.7)'),
  recencyWeight: Validations.weight.optional().describe('Weight for recency (default: 0.3)'),
  importanceWeight: Validations.weight.optional().describe('Weight for importance (default: 0.2)'),
  decayDays: Validations.daysLong.optional().describe('Days for recency decay (default: 30)'),
  strength: Validations.strength.optional().describe('Strength/preference level (1-5)'),

  // Boolean flags
  includeDetails: z.boolean().optional().describe('Include full details (default: true)'),
  multiSelect: z.boolean().optional().describe('Allow multiple selections'),
  softDelete: z.boolean().optional().describe('Soft delete instead of permanent (default: true)'),

  // Identifiers
  id: Validations.id.describe('Unique identifier'),
  idOptional: z.string().optional().describe('Unique identifier'),
  taskId: z.string().min(1).describe('Task ID'),
  decisionId: z.string().min(1).describe('Decision ID'),
  workflowId: z.string().min(1).describe('Workflow ID'),

  // Metadata
  feature: z.string().optional().describe('Feature group (e.g., "User Profile", "Auth")'),
  blockedReason: z.string().optional().describe('Reason if blocked'),
  rationale: z.string().describe('Reasoning or explanation'),

  // Contact/Communication
  email: z.string().email().optional().describe('Email address'),
  url: Validations.optionalUrl.describe('URL'),
};
