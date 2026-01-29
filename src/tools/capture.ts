import { z } from 'zod';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';
import { createEmbedding, hashContent } from '../utils/embeddings.js';
import { getActiveSessionId } from './session.js';

// Helper function to convert UTC to Thai timezone (Asia/Bangkok)
function toThaiTime(utcDateString: string | undefined | null): string {
  if (!utcDateString) {
    return new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  const date = new Date(utcDateString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// Schema definitions
export const CaptureObservationSchema = z.object({
  project: z.string().optional().describe('Project name or ID'),
  type: z.enum(['discovery', 'pattern', 'insight', 'note']).describe('Type of observation'),
  category: z.enum(['architecture', 'code', 'performance', 'security', 'testing', 'devops', 'other']).optional(),
  title: z.string().min(1).describe('Short title for the observation'),
  content: z.string().min(1).describe('Detailed content of the observation'),
  files: z.array(z.string()).optional().describe('Related file paths'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
  importance: z.number().min(1).max(5).optional().describe('Importance level 1-5'),
});

export const CaptureDecisionSchema = z.object({
  project: z.string().optional().describe('Project name or ID'),
  title: z.string().min(1).describe('Decision title'),
  context: z.string().min(1).describe('Context and problem being solved'),
  options: z.array(z.string()).optional().describe('Options that were considered'),
  chosen: z.string().min(1).describe('The option that was chosen'),
  rationale: z.string().min(1).describe('Reasoning for the decision'),
  tags: z.array(z.string()).optional(),
});

export const CaptureBugSchema = z.object({
  project: z.string().optional().describe('Project name or ID'),
  error_type: z.enum(['runtime', 'compile', 'logic', 'performance', 'security', 'other']).describe('Type of error'),
  error_message: z.string().min(1).describe('The error message'),
  root_cause: z.string().optional().describe('Root cause of the bug'),
  solution: z.string().min(1).describe('How the bug was fixed'),
  prevention: z.string().optional().describe('How to prevent this in the future'),
  files_affected: z.array(z.string()).optional().describe('Files that were affected'),
  tags: z.array(z.string()).optional(),
});

export const SaveSnippetSchema = z.object({
  project: z.string().optional().describe('Project name or ID'),
  title: z.string().min(1).describe('Snippet title'),
  language: z.enum(['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'sql', 'bash', 'other']).describe('Programming language'),
  code: z.string().min(1).describe('The code snippet'),
  description: z.string().optional().describe('Description of what the snippet does'),
  use_cases: z.array(z.string()).optional().describe('When to use this snippet'),
  tags: z.array(z.string()).optional(),
});

// Helper to find or create project
async function getOrCreateProject(projectName?: string): Promise<string | null> {
  if (!projectName) return null;

  const pb = await getPocketBase();

  try {
    // Try to find existing project
    const existing = await pb.collection('projects').getFirstListItem(`name="${projectName}"`);
    return existing.id;
  } catch {
    // Create new project
    try {
      const created = await pb.collection('projects').create({
        name: projectName,
        status: 'active',
      });
      logger.info(`Created new project: ${projectName}`);
      return created.id;
    } catch (error) {
      logger.error('Failed to create project', error);
      return null;
    }
  }
}

// Save embedding for a record
async function saveEmbedding(sourceType: string, sourceId: string, content: string): Promise<void> {
  try {
    const pb = await getPocketBase();
    const contentHash = hashContent(content);

    // Check if embedding already exists
    try {
      await pb.collection('embeddings').getFirstListItem(
        `source_id="${sourceId}" && content_hash="${contentHash}"`
      );
      return; // Embedding already exists
    } catch {
      // Continue to create new embedding
    }

    const vector = await createEmbedding(content);

    await pb.collection('embeddings').create({
      source_type: sourceType,
      source_id: sourceId,
      content_hash: contentHash,
      vector: vector,
      model: 'text-embedding-3-small',
    });

    logger.info(`Saved embedding for ${sourceType}:${sourceId}`);
  } catch (error) {
    logger.error('Failed to save embedding', error);
  }
}

// Tool implementations
export async function captureObservation(input: z.infer<typeof CaptureObservationSchema>) {
  const pb = await getPocketBase();
  const projectId = await getOrCreateProject(input.project);
  const sessionId = getActiveSessionId();

  try {
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
    saveEmbedding('observation', record.id, `${input.title}\n${input.content}`).catch(() => {});

    logger.info(`Captured observation: ${input.title}`);

    return {
      success: true,
      id: record.id,
      created: toThaiTime(record.created),
      message: `Observation "${input.title}" captured successfully`,
    };
  } catch (error) {
    logger.error('Failed to capture observation', error);
    throw error;
  }
}

export async function captureDecision(input: z.infer<typeof CaptureDecisionSchema>) {
  const pb = await getPocketBase();
  const projectId = await getOrCreateProject(input.project);
  const sessionId = getActiveSessionId();

  try {
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
    saveEmbedding('decision', record.id, embeddingContent).catch(() => {});

    logger.info(`Captured decision: ${input.title}`);

    return {
      success: true,
      id: record.id,
      created: toThaiTime(record.created),
      message: `Decision "${input.title}" captured successfully`,
    };
  } catch (error) {
    logger.error('Failed to capture decision', error);
    throw error;
  }
}

export async function captureBug(input: z.infer<typeof CaptureBugSchema>) {
  const pb = await getPocketBase();
  const projectId = await getOrCreateProject(input.project);
  const sessionId = getActiveSessionId();

  try {
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
    saveEmbedding('bug', record.id, embeddingContent).catch(() => {});

    logger.info(`Captured bug fix: ${input.error_message.slice(0, 50)}...`);

    return {
      success: true,
      id: record.id,
      created: toThaiTime(record.created),
      message: `Bug fix captured successfully`,
    };
  } catch (error) {
    logger.error('Failed to capture bug', error);
    throw error;
  }
}

export async function saveSnippet(input: z.infer<typeof SaveSnippetSchema>) {
  const pb = await getPocketBase();
  const projectId = await getOrCreateProject(input.project);
  const sessionId = getActiveSessionId();

  try {
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
    saveEmbedding('snippet', record.id, embeddingContent).catch(() => {});

    logger.info(`Saved snippet: ${input.title}`);

    return {
      success: true,
      id: record.id,
      created: toThaiTime(record.created),
      message: `Snippet "${input.title}" saved successfully`,
    };
  } catch (error) {
    logger.error('Failed to save snippet', error);
    throw error;
  }
}

// ============================================
// OUTCOME TRACKING
// ============================================

export const RecordDecisionOutcomeSchema = z.object({
  decision_id: z.string().min(1).describe('ID of the decision to update'),
  outcome: z.string().min(1).describe('What actually happened'),
  would_do_again: z.boolean().describe('Would you make the same decision?'),
  outcome_notes: z.string().optional().describe('Additional notes or learnings'),
});

export const GetPendingOutcomesSchema = z.object({
  project: z.string().optional().describe('Filter by project name'),
  days_old: z.number().min(1).max(90).optional().describe('Only decisions older than N days (default: 7)'),
  limit: z.number().min(1).max(20).optional().describe('Maximum results (default: 10)'),
});

export async function recordDecisionOutcome(input: z.infer<typeof RecordDecisionOutcomeSchema>) {
  const pb = await getPocketBase();

  try {
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
  } catch (error) {
    logger.error('Failed to record decision outcome', error);
    throw error;
  }
}

export async function getPendingOutcomes(input: z.infer<typeof GetPendingOutcomesSchema>) {
  const pb = await getPocketBase();
  const daysOld = input.days_old || 7;
  const limit = input.limit || 10;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  try {
    // Build filter - decisions without outcome that are older than cutoff
    // PocketBase: use outcome="" for empty text field (no spaces around operators)
    let filter = `outcome="" && created<="${cutoffDate.toISOString()}"`;

    if (input.project) {
      try {
        const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
        filter += ` && project="${project.id}"`;
      } catch {
        // Project not found, return empty
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
      days_since: Math.floor((Date.now() - new Date(d.created).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    logger.info(`Found ${decisions.totalItems} decisions pending outcome tracking`);

    return {
      total: decisions.totalItems,
      showing: pendingOutcomes.length,
      days_old_filter: daysOld,
      pending_outcomes: pendingOutcomes,
    };
  } catch (error) {
    logger.error('Failed to get pending outcomes', error);
    throw error;
  }
}
