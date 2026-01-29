import { z } from 'zod';
import { defineTool } from '../registry/defineTool.js';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';
import { saveEmbeddingAsync } from '../utils/embeddings.js';
import { getActiveSessionId } from './session.js';
import { toThaiTime, daysSince, daysAgo } from '../utils/date.js';
import { getOrCreateProject } from '../utils/project.js';
import {
  CommonFields,
  ProjectEntityBase,
  ObservationTypeEnum,
  ObservationCategoryEnum,
  ErrorTypeEnum,
  LanguageEnum,
  Validations,
} from '../schemas/index.js';

// ============================================
// SCHEMA DEFINITIONS
// ============================================

const CaptureObservationSchema = ProjectEntityBase.extend({
  type: ObservationTypeEnum,
  category: ObservationCategoryEnum.optional(),
  title: CommonFields.title,
  content: CommonFields.content,
  files: CommonFields.files,
  importance: CommonFields.importance,
});

const CaptureDecisionSchema = ProjectEntityBase.extend({
  title: CommonFields.title,
  context: z.string().min(1).describe('Context and problem being solved'),
  options: z.array(z.string()).optional().describe('Options that were considered'),
  chosen: Validations.nonEmptyString.describe('The option that was chosen'),
  rationale: CommonFields.rationale,
});

const CaptureBugSchema = ProjectEntityBase.extend({
  error_type: ErrorTypeEnum,
  error_message: CommonFields.errorMessage,
  root_cause: z.string().optional().describe('Root cause of the bug'),
  solution: Validations.nonEmptyString.describe('How the bug was fixed'),
  prevention: z.string().optional().describe('How to prevent this in the future'),
  files_affected: CommonFields.files,
});

const SaveSnippetSchema = ProjectEntityBase.extend({
  title: CommonFields.title,
  language: LanguageEnum,
  code: Validations.nonEmptyString.describe('The code snippet'),
  description: CommonFields.description,
  use_cases: z.array(z.string()).optional().describe('When to use this snippet'),
});

const RecordDecisionOutcomeSchema = z.object({
  decision_id: CommonFields.decisionId,
  outcome: CommonFields.content,
  would_do_again: z.boolean().describe('Would you make the same decision?'),
  outcome_notes: z.string().optional().describe('Additional notes or learnings'),
});

const GetPendingOutcomesSchema = z.object({
  project: CommonFields.project,
  days_old: CommonFields.daysOld,
  limit: CommonFields.limitSmall,
});

// ============================================
// TOOL DEFINITIONS
// ============================================

export const captureObservation = defineTool({
  name: 'capture_observation',
  description: 'Capture an observation, discovery, pattern, or insight',
  category: 'capture',
  schema: CaptureObservationSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const projectId = await getOrCreateProject(input.project);
    const sessionId = getActiveSessionId();

    const record = await pb.collection('observations').create({
      session: sessionId,
      project: projectId,
      type: input.type,
      category: input.category,
      title: input.title,
      content: input.content,
      files: input.files || [],
      tags: input.tags || [],
      importance: input.importance || 3,
    });

    // Save embedding asynchronously
    saveEmbeddingAsync('observation', record.id, `${input.title}\n${input.content}`);

    logger.info(`Captured observation: ${input.title}`);

    return {
      success: true,
      id: record.id,
      created: toThaiTime(record.created),
      message: `Observation "${input.title}" captured successfully`,
    };
  },
});

export const captureDecision = defineTool({
  name: 'capture_decision',
  description: 'Capture an important decision with context and rationale',
  category: 'capture',
  schema: CaptureDecisionSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const projectId = await getOrCreateProject(input.project);
    const sessionId = getActiveSessionId();

    const record = await pb.collection('decisions').create({
      session: sessionId,
      project: projectId,
      title: input.title,
      context: input.context,
      options: input.options || [],
      chosen: input.chosen,
      rationale: input.rationale,
      tags: input.tags || [],
    });

    // Save embedding asynchronously
    const embeddingContent = `${input.title}\n${input.context}\n${input.rationale}`;
    saveEmbeddingAsync('decision', record.id, embeddingContent);

    logger.info(`Captured decision: ${input.title}`);

    return {
      success: true,
      id: record.id,
      created: toThaiTime(record.created),
      message: `Decision "${input.title}" captured successfully`,
    };
  },
});

export const captureBug = defineTool({
  name: 'capture_bug',
  description: 'Capture a bug fix with error message, solution, and prevention tips',
  category: 'capture',
  schema: CaptureBugSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const projectId = await getOrCreateProject(input.project);
    const sessionId = getActiveSessionId();

    const record = await pb.collection('bugs_and_fixes').create({
      session: sessionId,
      project: projectId,
      error_type: input.error_type,
      error_message: input.error_message,
      root_cause: input.root_cause,
      solution: input.solution,
      prevention: input.prevention,
      files_affected: input.files_affected || [],
      tags: input.tags || [],
    });

    // Save embedding asynchronously
    const embeddingContent = `${input.error_message}\n${input.solution}\n${input.root_cause || ''}`;
    saveEmbeddingAsync('bug', record.id, embeddingContent);

    logger.info(`Captured bug fix: ${input.error_message.slice(0, 50)}...`);

    return {
      success: true,
      id: record.id,
      created: toThaiTime(record.created),
      message: `Bug fix captured successfully`,
    };
  },
});

export const saveSnippet = defineTool({
  name: 'save_snippet',
  description: 'Save a reusable code snippet',
  category: 'capture',
  schema: SaveSnippetSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const projectId = await getOrCreateProject(input.project);
    const sessionId = getActiveSessionId();

    const record = await pb.collection('code_snippets').create({
      session: sessionId,
      project: projectId,
      title: input.title,
      language: input.language,
      code: input.code,
      description: input.description,
      use_cases: input.use_cases || [],
      tags: input.tags || [],
      reuse_count: 0,
    });

    // Save embedding asynchronously
    const embeddingContent = `${input.title}\n${input.description || ''}\n${input.code}`;
    saveEmbeddingAsync('snippet', record.id, embeddingContent);

    logger.info(`Saved snippet: ${input.title}`);

    return {
      success: true,
      id: record.id,
      created: toThaiTime(record.created),
      message: `Snippet "${input.title}" saved successfully`,
    };
  },
});

export const recordDecisionOutcome = defineTool({
  name: 'record_decision_outcome',
  description: 'Record what actually happened after a decision was made',
  category: 'outcome',
  schema: RecordDecisionOutcomeSchema,
  handler: async (input) => {
    const pb = await getPocketBase();

    // Verify decision exists
    const decision = await pb.collection('decisions').getOne(input.decision_id);

    // Update with outcome
    const updated = await pb.collection('decisions').update(input.decision_id, {
      outcome: input.outcome,
      would_do_again: input.would_do_again,
      outcome_recorded_at: new Date().toISOString(),
      outcome_notes: input.outcome_notes || '',
    });

    // Log if decision was marked as "would not do again"
    if (!input.would_do_again) {
      logger.info(`Decision "${decision.title}" marked as would NOT do again - consider review`);
    }

    logger.info(`Recorded outcome for decision: ${decision.title}`);

    return {
      success: true,
      id: updated.id,
      title: decision.title,
      outcome_recorded_at: toThaiTime(updated.outcome_recorded_at),
      would_do_again: input.would_do_again,
      message: `Outcome recorded for decision "${decision.title}"`,
    };
  },
});

export const getPendingOutcomes = defineTool({
  name: 'get_pending_outcomes',
  description: 'Find decisions that need outcome tracking',
  category: 'outcome',
  schema: GetPendingOutcomesSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const daysOldFilter = input.days_old || 7;
    const limit = input.limit || 10;

    const cutoffDate = daysAgo(daysOldFilter);

    // Build filter - decisions without outcome that are older than cutoff
    let filter = `outcome="" && created<="${cutoffDate}"`;

    if (input.project) {
      try {
        const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
        filter += ` && project="${project.id}"`;
      } catch {
        return {
          total: 0,
          pending_outcomes: [],
          message: `Project "${input.project}" not found`,
        };
      }
    }

    const decisions = await pb.collection('decisions').getList(1, limit, {
      filter,
      sort: 'created', // oldest first
      expand: 'project',
    });

    const pendingOutcomes = decisions.items.map((d) => ({
      id: d.id,
      title: d.title,
      chosen: d.chosen,
      project: d.expand?.project?.name || null,
      created: toThaiTime(d.created),
      days_since: daysSince(d.created),
    }));

    logger.info(`Found ${decisions.totalItems} decisions pending outcome tracking`);

    return {
      total: decisions.totalItems,
      showing: pendingOutcomes.length,
      days_old_filter: daysOldFilter,
      pending_outcomes: pendingOutcomes,
    };
  },
});

// Export all tools as array for easy registration
export const captureTools = [
  captureObservation,
  captureDecision,
  captureBug,
  saveSnippet,
  recordDecisionOutcome,
  getPendingOutcomes,
];
