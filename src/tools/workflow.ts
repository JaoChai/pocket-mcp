import { z } from 'zod';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';
import { createEmbedding, hashContent, cosineSimilarity } from '../utils/embeddings.js';
import { config } from '../config.js';

// ============================================
// SCHEMAS
// ============================================

const WorkflowStepSchema = z.object({
  order: z.number(),
  action: z.string(),
  description: z.string(),
  tool: z.string().optional(),
  command: z.string().optional(),
  check: z.string().optional(),
  optional: z.boolean().optional(),
});

export const SaveWorkflowSchema = z.object({
  project: z.string().optional().describe('Project name'),
  name: z.string().min(1).describe('Workflow name'),
  description: z.string().optional().describe('What this workflow accomplishes'),
  trigger: z.string().min(1).describe('When to use this workflow (e.g., "deploying to production")'),
  steps: z.array(WorkflowStepSchema).min(1).describe('Ordered list of steps'),
  tools_used: z.array(z.string()).optional().describe('Tools/commands used'),
  estimated_duration: z.number().optional().describe('Expected duration in minutes'),
  success_criteria: z.string().optional().describe('How to verify success'),
  tags: z.array(z.string()).optional(),
});

export const FindWorkflowSchema = z.object({
  query: z.string().min(1).describe('Natural language description of what you want to do'),
  project: z.string().optional().describe('Filter by project'),
  limit: z.number().min(1).max(10).optional().describe('Maximum results (default: 5)'),
});

export const GetWorkflowSchema = z.object({
  workflow_id: z.string().min(1).describe('ID of the workflow'),
});

export const RecordWorkflowExecutionSchema = z.object({
  workflow_id: z.string().min(1).describe('ID of the workflow'),
  duration_minutes: z.number().optional().describe('How long it actually took'),
  success: z.boolean().describe('Was execution successful?'),
  notes: z.string().optional().describe('Any notes about this execution'),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function saveWorkflowEmbedding(workflowId: string, content: string): Promise<void> {
  try {
    const pb = await getPocketBase();
    const contentHash = hashContent(content);
    const vector = await createEmbedding(content);

    // Delete existing embedding
    try {
      const existing = await pb.collection('embeddings').getFirstListItem(`source_id="${workflowId}" && source_type="workflow"`);
      await pb.collection('embeddings').delete(existing.id);
    } catch {
      // No existing embedding
    }

    await pb.collection('embeddings').create({
      source_type: 'workflow',
      source_id: workflowId,
      content_hash: contentHash,
      vector,
      model: config.openai.model,
    });

    logger.info(`Saved embedding for workflow ${workflowId}`);
  } catch (error) {
    logger.error('Failed to save workflow embedding', error);
    // Don't throw - embedding is secondary
  }
}

// ============================================
// IMPLEMENTATIONS
// ============================================

export async function saveWorkflow(input: z.infer<typeof SaveWorkflowSchema>) {
  const pb = await getPocketBase();

  // Get project ID
  let projectId = null;
  if (input.project) {
    try {
      const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
      projectId = project.id;
    } catch {
      // Create project if not exists
      const created = await pb.collection('projects').create({
        name: input.project,
        status: 'active',
      });
      projectId = created.id;
      logger.info(`Created new project: ${input.project}`);
    }
  }

  try {
    // Check for existing similar workflow
    const filter = projectId
      ? `name="${input.name}" && project="${projectId}"`
      : `name="${input.name}"`;

    let existingWorkflow;
    try {
      existingWorkflow = await pb.collection('workflows').getFirstListItem(filter);
    } catch {
      // No existing workflow
    }

    const workflowData = {
      project: projectId,
      name: input.name,
      description: input.description || '',
      trigger: input.trigger,
      steps: input.steps,
      tools_used: input.tools_used || [],
      estimated_duration: input.estimated_duration,
      success_criteria: input.success_criteria || '',
      tags: input.tags || [],
    };

    let record;
    let action: 'created' | 'updated';

    if (existingWorkflow) {
      // Update existing workflow
      record = await pb.collection('workflows').update(existingWorkflow.id, workflowData);
      action = 'updated';
    } else {
      // Create new workflow
      record = await pb.collection('workflows').create({
        ...workflowData,
        execution_count: 0,
      });
      action = 'created';
    }

    // Save embedding for semantic search
    const embeddingContent = `${input.name}\n${input.trigger}\n${input.description || ''}\n${input.steps.map(s => s.action).join('\n')}`;
    await saveWorkflowEmbedding(record.id, embeddingContent);

    return {
      success: true,
      id: record.id,
      message: `Workflow "${input.name}" ${action}`,
      action,
    };
  } catch (error) {
    logger.error('Failed to save workflow', error);
    throw error;
  }
}

export async function findWorkflow(input: z.infer<typeof FindWorkflowSchema>) {
  const pb = await getPocketBase();
  const limit = input.limit || 5;

  try {
    // Get query embedding
    const queryEmbedding = await createEmbedding(input.query);

    // Get all workflow embeddings
    const allEmbeddings = await pb.collection('embeddings').getFullList({
      filter: 'source_type="workflow"',
    });

    const scores: Array<{ id: string; similarity: number }> = [];

    for (const emb of allEmbeddings) {
      if (!emb.vector || !Array.isArray(emb.vector)) continue;

      const similarity = cosineSimilarity(queryEmbedding, emb.vector as number[]);
      if (similarity >= 0.5) {
        // Lower threshold for workflows
        scores.push({ id: emb.source_id, similarity });
      }
    }

    scores.sort((a, b) => b.similarity - a.similarity);

    // Fetch workflows
    const results: Array<{
      id: string;
      name: string;
      trigger: string;
      description: string;
      steps_count: number;
      execution_count: number;
      similarity: number;
    }> = [];

    for (const score of scores.slice(0, limit)) {
      try {
        const workflow = await pb.collection('workflows').getOne(score.id, {
          expand: 'project',
        });

        // Filter by project if specified
        if (input.project && workflow.expand?.project?.name !== input.project) {
          continue;
        }

        results.push({
          id: workflow.id,
          name: workflow.name,
          trigger: workflow.trigger,
          description: workflow.description || '',
          steps_count: (workflow.steps as unknown[])?.length || 0,
          execution_count: workflow.execution_count || 0,
          similarity: Math.round(score.similarity * 100) / 100,
        });
      } catch {
        // Workflow deleted
      }
    }

    return {
      query: input.query,
      total: results.length,
      workflows: results,
    };
  } catch (error) {
    logger.error('Failed to find workflow', error);
    throw error;
  }
}

export async function getWorkflow(input: z.infer<typeof GetWorkflowSchema>) {
  const pb = await getPocketBase();

  try {
    const workflow = await pb.collection('workflows').getOne(input.workflow_id, {
      expand: 'project',
    });

    return {
      id: workflow.id,
      name: workflow.name,
      project: workflow.expand?.project?.name || null,
      description: workflow.description,
      trigger: workflow.trigger,
      steps: (workflow.steps as Array<unknown>) || [],
      tools_used: workflow.tools_used,
      estimated_duration: workflow.estimated_duration,
      success_criteria: workflow.success_criteria,
      execution_count: workflow.execution_count || 0,
      avg_duration: workflow.avg_duration || null,
      last_executed: workflow.last_executed || null,
      tags: workflow.tags || [],
      created: workflow.created,
      updated: workflow.updated,
    };
  } catch (error) {
    logger.error('Failed to get workflow', error);
    throw error;
  }
}

export async function recordWorkflowExecution(input: z.infer<typeof RecordWorkflowExecutionSchema>) {
  const pb = await getPocketBase();

  try {
    const workflow = await pb.collection('workflows').getOne(input.workflow_id);

    const currentCount = workflow.execution_count || 0;
    const currentAvg = workflow.avg_duration || 0;

    // Calculate new average duration
    let newAvg = currentAvg;
    if (input.duration_minutes !== undefined) {
      newAvg =
        currentCount === 0
          ? input.duration_minutes
          : (currentAvg * currentCount + input.duration_minutes) / (currentCount + 1);
    }

    await pb.collection('workflows').update(input.workflow_id, {
      execution_count: currentCount + 1,
      last_executed: new Date().toISOString(),
      avg_duration: Math.round(newAvg * 10) / 10,
    });

    logger.info(`Recorded execution for workflow "${workflow.name}" (count: ${currentCount + 1})`);

    return {
      success: true,
      workflow: workflow.name,
      execution_count: currentCount + 1,
      avg_duration: Math.round(newAvg * 10) / 10,
      was_successful: input.success,
    };
  } catch (error) {
    logger.error('Failed to record workflow execution', error);
    throw error;
  }
}
