import { z } from 'zod';
import { defineTool } from '../registry/defineTool.js';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';
import { getActiveSessionId } from './session.js';
import { toThaiTime, nowISO } from '../utils/date.js';
import { getOrCreateProject } from '../utils/project.js';
import {
  CommonFields,
  PriorityEnum,
  TaskStatusEnum,
  ProjectEntityBase,
  FieldSelectionBase,
} from '../schemas/index.js';
import { pickFields, DefaultFields } from '../utils/field-picker.js';

// ============================================
// SCHEMA DEFINITIONS
// ============================================

const CreateTaskSchema = ProjectEntityBase.extend({
  title: CommonFields.title,
  description: CommonFields.description,
  feature: CommonFields.feature,
  priority: CommonFields.priority,
  due_date: CommonFields.dueDate,
});

const UpdateTaskSchema = z.object({
  task_id: CommonFields.taskId,
  title: CommonFields.titleOptional,
  description: CommonFields.description,
  status: TaskStatusEnum.optional().describe('New status'),
  priority: CommonFields.priority,
  blocked_reason: CommonFields.blockedReason,
  due_date: CommonFields.dueDate,
  tags: CommonFields.tags,
});

const GetTasksSchema = z.object({
  project: CommonFields.project,
  status: TaskStatusEnum.optional().describe('Filter by status'),
  feature: CommonFields.feature,
  priority: CommonFields.priority,
  limit: CommonFields.limitMedium,
  fields: z
    .array(z.string())
    .optional()
    .describe('Fields to return. Default: ["id", "title", "status", "priority", "created"]'),
});

const GetProjectProgressSchema = z.object({
  project: CommonFields.projectRequired,
  include_details: CommonFields.includeDetails,
});

const DeleteTaskSchema = z.object({
  task_id: CommonFields.taskId,
  soft_delete: CommonFields.softDelete,
});

// ============================================
// TOOL DEFINITIONS
// ============================================

export const createTask = defineTool({
  name: 'create_task',
  description: 'Create a new task for tracking work progress',
  category: 'task',
  schema: CreateTaskSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const projectId = await getOrCreateProject(input.project);
    const sessionId = getActiveSessionId();

    const record = await pb.collection('tasks').create({
      session: sessionId,
      project: projectId,
      title: input.title,
      description: input.description || '',
      feature: input.feature || '',
      status: 'pending',
      priority: input.priority || 'medium',
      due_date: input.due_date || null,
      tags: input.tags || [],
    });

    logger.info(`Created task: ${input.title}`);

    return {
      success: true,
      id: record.id,
      title: input.title,
      feature: input.feature || null,
      priority: input.priority || 'medium',
      created: toThaiTime(record.created),
      message: `Task "${input.title}" created successfully`,
    };
  },
});

export const updateTask = defineTool({
  name: 'update_task',
  description: 'Update task status, priority, or other details',
  category: 'task',
  schema: UpdateTaskSchema,
  handler: async (input) => {
    const pb = await getPocketBase();

    // Verify task exists
    const existing = await pb.collection('tasks').getOne(input.task_id);

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) {
      updateData.status = input.status;
      // Set completed_at when marking as done
      if (input.status === 'done') {
        updateData.completed_at = nowISO();
      }
    }
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.blocked_reason !== undefined) updateData.blocked_reason = input.blocked_reason;
    if (input.due_date !== undefined) updateData.due_date = input.due_date;
    if (input.tags !== undefined) updateData.tags = input.tags;

    const updated = await pb.collection('tasks').update(input.task_id, updateData);

    logger.info(`Updated task: ${existing.title} -> status: ${input.status || existing.status}`);

    return {
      success: true,
      id: updated.id,
      title: updated.title,
      status: updated.status,
      updated: toThaiTime(updated.updated),
      message: `Task "${updated.title}" updated successfully`,
    };
  },
});

export const getTasks = defineTool({
  name: 'get_tasks',
  description: 'Get list of tasks with optional filters (project, status, feature, priority)',
  category: 'task',
  schema: GetTasksSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const limit = input.limit || 50;

    // Build filter
    const filters: string[] = [];

    if (input.project) {
      try {
        const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
        filters.push(`project="${project.id}"`);
      } catch {
        return {
          total: 0,
          tasks: [],
          message: `Project "${input.project}" not found`,
        };
      }
    }

    if (input.status) {
      filters.push(`status="${input.status}"`);
    }

    if (input.feature) {
      filters.push(`feature="${input.feature}"`);
    }

    if (input.priority) {
      filters.push(`priority="${input.priority}"`);
    }

    const filter = filters.length > 0 ? filters.join(' && ') : '';

    const tasks = await pb.collection('tasks').getList(1, limit, {
      filter,
      sort: '-created',
    });

    const fields = input.fields || DefaultFields.task;
    const allTasks = tasks.items.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || null,
      feature: t.feature || null,
      status: t.status,
      priority: t.priority,
      created: toThaiTime(t.created),
      completed_at: t.completed_at ? toThaiTime(t.completed_at) : null,
      due_date: t.due_date || null,
      blocked_reason: t.blocked_reason || null,
    }));
    const taskList = pickFields(allTasks, fields) as typeof allTasks;

    logger.info(`Retrieved ${taskList.length} tasks with fields: ${fields.join(', ')}`);

    return {
      total: tasks.totalItems,
      showing: taskList.length,
      tasks: taskList,
      fields, // Echo back for clarity
    };
  },
});

export const getProjectProgress = defineTool({
  name: 'get_project_progress',
  description:
    'Get project progress summary with completion stats, tasks by feature, and next up items',
  category: 'task',
  schema: GetProjectProgressSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const includeDetails = input.include_details !== false;

    // Find project
    let projectId: string;
    try {
      const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
      projectId = project.id;
    } catch {
      return {
        success: false,
        message: `Project "${input.project}" not found`,
      };
    }

    // Get all tasks for this project
    const allTasks = await pb.collection('tasks').getFullList({
      filter: `project="${projectId}"`,
      sort: '-created',
    });

    // Calculate stats
    const stats = {
      total: allTasks.length,
      done: 0,
      in_progress: 0,
      pending: 0,
      blocked: 0,
      cancelled: 0,
    };

    const byFeature: Record<
      string,
      { total: number; done: number; pending: number; in_progress: number }
    > = {};
    const recentCompleted: Array<{ id: string; title: string; completed_at: string }> = [];
    const nextUp: Array<{ id: string; title: string; priority: string; feature: string | null }> =
      [];

    for (const task of allTasks) {
      // Count by status
      switch (task.status) {
        case 'done':
          stats.done++;
          if (task.completed_at) {
            recentCompleted.push({
              id: task.id,
              title: task.title,
              completed_at: toThaiTime(task.completed_at),
            });
          }
          break;
        case 'in_progress':
          stats.in_progress++;
          break;
        case 'pending':
          stats.pending++;
          nextUp.push({
            id: task.id,
            title: task.title,
            priority: task.priority || 'medium',
            feature: task.feature || null,
          });
          break;
        case 'blocked':
          stats.blocked++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }

      // Count by feature
      const featureName = task.feature || 'Uncategorized';
      if (!byFeature[featureName]) {
        byFeature[featureName] = { total: 0, done: 0, pending: 0, in_progress: 0 };
      }
      byFeature[featureName].total++;
      if (task.status === 'done') byFeature[featureName].done++;
      if (task.status === 'pending') byFeature[featureName].pending++;
      if (task.status === 'in_progress') byFeature[featureName].in_progress++;
    }

    // Sort by priority for next up
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    nextUp.sort(
      (a, b) =>
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
    );

    // Calculate completion percentage
    const completionPercent =
      stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

    const result: Record<string, unknown> = {
      project: input.project,
      completion_percent: completionPercent,
      stats,
      by_feature: byFeature,
    };

    if (includeDetails) {
      result.recent_completed = recentCompleted.slice(0, 5);
      result.next_up = nextUp.slice(0, 5);
    }

    logger.info(`Project progress for ${input.project}: ${completionPercent}% complete`);

    return result;
  },
});

export const deleteTask = defineTool({
  name: 'delete_task',
  description: 'Delete or cancel a task',
  category: 'task',
  schema: DeleteTaskSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const softDelete = input.soft_delete !== false;

    // Verify task exists
    const existing = await pb.collection('tasks').getOne(input.task_id);

    if (softDelete) {
      // Mark as cancelled
      await pb.collection('tasks').update(input.task_id, {
        status: 'cancelled',
      });

      logger.info(`Soft deleted (cancelled) task: ${existing.title}`);

      return {
        success: true,
        id: input.task_id,
        title: existing.title,
        action: 'cancelled',
        message: `Task "${existing.title}" marked as cancelled`,
      };
    } else {
      // Hard delete
      await pb.collection('tasks').delete(input.task_id);

      logger.info(`Deleted task: ${existing.title}`);

      return {
        success: true,
        id: input.task_id,
        title: existing.title,
        action: 'deleted',
        message: `Task "${existing.title}" deleted permanently`,
      };
    }
  },
});

// Export all tools as array for easy registration
export const taskTools = [createTask, updateTask, getTasks, getProjectProgress, deleteTask];
