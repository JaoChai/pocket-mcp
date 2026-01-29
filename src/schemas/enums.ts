import { z } from 'zod';

// Task priority levels
export const PriorityEnum = z.enum(['critical', 'high', 'medium', 'low']);
export type Priority = z.infer<typeof PriorityEnum>;

// Task status
export const TaskStatusEnum = z.enum(['pending', 'in_progress', 'done', 'blocked', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

// Session outcome
export const SessionOutcomeEnum = z.enum(['success', 'partial', 'failed']);
export type SessionOutcome = z.infer<typeof SessionOutcomeEnum>;

// Entity types for relationships
export const EntityTypeEnum = z.enum([
  'project',
  'observation',
  'decision',
  'bug',
  'pattern',
  'snippet',
  'resource',
]);
export type EntityType = z.infer<typeof EntityTypeEnum>;

// Observation types
export const ObservationTypeEnum = z.enum(['discovery', 'pattern', 'insight', 'note']);
export type ObservationType = z.infer<typeof ObservationTypeEnum>;

// Observation categories
export const ObservationCategoryEnum = z.enum([
  'architecture',
  'code',
  'performance',
  'security',
  'testing',
  'devops',
  'other',
]);
export type ObservationCategory = z.infer<typeof ObservationCategoryEnum>;

// Error types for bug tracking
export const ErrorTypeEnum = z.enum(['runtime', 'compile', 'logic', 'performance', 'security', 'other']);
export type ErrorType = z.infer<typeof ErrorTypeEnum>;

// Programming languages
export const LanguageEnum = z.enum([
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'java',
  'sql',
  'bash',
  'other',
]);
export type Language = z.infer<typeof LanguageEnum>;

// User preference categories
export const PreferenceCategoryEnum = z.enum([
  'coding_style',
  'tools',
  'workflow',
  'communication',
  'other',
]);
export type PreferenceCategory = z.infer<typeof PreferenceCategoryEnum>;

// Relationship types in knowledge graph
export const RelationTypeEnum = z.enum([
  'uses',
  'caused',
  'fixed_by',
  'led_to',
  'related_to',
  'depends_on',
  'inspired_by',
]);
export type RelationType = z.infer<typeof RelationTypeEnum>;

// Collection names for search
export const CollectionNameEnum = z.enum([
  'observations',
  'decisions',
  'bugs_and_fixes',
  'patterns',
  'code_snippets',
]);
export type CollectionName = z.infer<typeof CollectionNameEnum>;

// Source types for semantic search
export const SourceTypeEnum = z.enum(['observation', 'decision', 'bug', 'pattern', 'snippet', 'workflow']);
export type SourceType = z.infer<typeof SourceTypeEnum>;

// Task status for filtering (same as TaskStatus but as different name for clarity)
export const DecisionStatusEnum = z.enum(['pending', 'completed']);
export type DecisionStatus = z.infer<typeof DecisionStatusEnum>;

// Retrospective reflection types (for period)
export const RetroTypeEnum = z.enum(['session', 'daily', 'weekly', 'monthly']);
export type RetroType = z.infer<typeof RetroTypeEnum>;
