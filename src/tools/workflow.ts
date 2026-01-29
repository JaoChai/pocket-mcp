import { z } from 'zod';
import { defineTool } from '../registry/defineTool.js';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';
import { createEmbedding, cosineSimilarity, saveEmbedding } from '../utils/embeddings.js';
import { getOrCreateProject } from '../utils/project.js';
import { nowISO } from '../utils/date.js';
import {
  CommonFields,
  ProjectEntityBase,
  WorkflowStepBase,
  Validations,
} from '../schemas/index.js';

// ============================================
// SCHEMA DEFINITIONS
// ============================================

const SaveWorkflowSchema = ProjectEntityBase.extend({
  name: CommonFields.title,
  description: z.string().optional().describe('What this workflow accomplishes'),
  trigger: Validations.nonEmptyString.describe('When to use this workflow'),
  steps: z.array(WorkflowStepBase).min(1).describe('Ordered list of steps'),
  tools_used: z.array(z.string()).optional().describe('Tools/commands used'),
  estimated_duration: z.number().optional().describe('Expected duration in minutes'),
  success_criteria: z.string().optional().describe('How to verify success'),
});

const FindWorkflowSchema = z.object({
  query: CommonFields.query,
  project: CommonFields.project,
  limit: CommonFields.limitSmall,
});

const GetWorkflowSchema = z.object({
  workflow_id: CommonFields.workflowId,
});

const RecordWorkflowExecutionSchema = z.object({
  workflow_id: CommonFields.workflowId,
  duration_minutes: z.number().optional().describe('How long it actually took'),
  success: z.boolean().describe('Was execution successful?'),
  notes: z.string().optional().describe('Any notes about this execution'),
});

// ============================================
// TOOL DEFINITIONS
// ============================================

export const saveWorkflowTool = defineTool({
  name: 'save_workflow',
  description: 'Save a reusable workflow/procedure',
  category: 'workflow',
  schema: SaveWorkflowSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const projectId = await getOrCreateProject(input.project);

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
      record = await pb.collection('workflows').update(existingWorkflow.id, workflowData);
      action = 'updated';
    } else {
      record = await pb.collection('workflows').create({ ...workflowData, execution_count: 0 });
      action = 'created';
    }

    const embeddingContent = `${input.name}\n${input.trigger}\n${input.description || ''}\n${input.steps.map((s) => s.action).join('\n')}`;
    await saveEmbedding('workflow', record.id, embeddingContent, { onExisting: 'replace' });

    return { success: true, id: record.id, message: `Workflow "${input.name}" ${action}`, action };
  },
});

export const findWorkflow = defineTool({
  name: 'find_workflow',
  description: 'Find a workflow by describing what you want to do',
  category: 'workflow',
  schema: FindWorkflowSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const limit = input.limit || 5;
    const queryEmbedding = await createEmbedding(input.query);
    const allEmbeddings = await pb.collection('embeddings').getFullList({ filter: 'source_type="workflow"' });

    const scores: Array<{ id: string; similarity: number }> = [];
    for (const emb of allEmbeddings) {
      if (!emb.vector || !Array.isArray(emb.vector)) continue;
      const similarity = cosineSimilarity(queryEmbedding, emb.vector as number[]);
      if (similarity >= 0.5) scores.push({ id: emb.source_id, similarity });
    }
    scores.sort((a, b) => b.similarity - a.similarity);

    const results: Array<{ id: string; name: string; trigger: string; description: string; steps_count: number; execution_count: number; similarity: number }> = [];
    for (const score of scores.slice(0, limit)) {
      try {
        const workflow = await pb.collection('workflows').getOne(score.id, { expand: 'project' });
        if (input.project && workflow.expand?.project?.name !== input.project) continue;
        results.push({
          id: workflow.id, name: workflow.name, trigger: workflow.trigger,
          description: workflow.description || '', steps_count: (workflow.steps as unknown[])?.length || 0,
          execution_count: workflow.execution_count || 0, similarity: Math.round(score.similarity * 100) / 100,
        });
      } catch { /* Workflow deleted */ }
    }
    return { query: input.query, total: results.length, workflows: results };
  },
});

export const getWorkflow = defineTool({
  name: 'get_workflow',
  description: 'Get full details of a workflow including all steps',
  category: 'workflow',
  schema: GetWorkflowSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const workflow = await pb.collection('workflows').getOne(input.workflow_id, { expand: 'project' });
    return {
      id: workflow.id, name: workflow.name, project: workflow.expand?.project?.name || null,
      description: workflow.description, trigger: workflow.trigger, steps: (workflow.steps as Array<unknown>) || [],
      tools_used: workflow.tools_used, estimated_duration: workflow.estimated_duration,
      success_criteria: workflow.success_criteria, execution_count: workflow.execution_count || 0,
      avg_duration: workflow.avg_duration || null, last_executed: workflow.last_executed || null,
      tags: workflow.tags || [], created: workflow.created, updated: workflow.updated,
    };
  },
});

export const recordWorkflowExecution = defineTool({
  name: 'record_workflow_execution',
  description: 'Record that a workflow was executed',
  category: 'workflow',
  schema: RecordWorkflowExecutionSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const workflow = await pb.collection('workflows').getOne(input.workflow_id);
    const currentCount = workflow.execution_count || 0;
    const currentAvg = workflow.avg_duration || 0;
    let newAvg = currentAvg;
    if (input.duration_minutes !== undefined) {
      newAvg = currentCount === 0 ? input.duration_minutes : (currentAvg * currentCount + input.duration_minutes) / (currentCount + 1);
    }
    await pb.collection('workflows').update(input.workflow_id, {
      execution_count: currentCount + 1, last_executed: nowISO(), avg_duration: Math.round(newAvg * 10) / 10,
    });
    logger.info(`Recorded execution for workflow "${workflow.name}" (count: ${currentCount + 1})`);
    return { success: true, workflow: workflow.name, execution_count: currentCount + 1, avg_duration: Math.round(newAvg * 10) / 10, was_successful: input.success };
  },
});

export const workflowTools = [saveWorkflowTool, findWorkflow, getWorkflow, recordWorkflowExecution];
