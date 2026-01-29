import { z } from 'zod';
import { defineTool } from '../registry/defineTool.js';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';
import { getOrCreateProject } from '../utils/project.js';
import { nowISO } from '../utils/date.js';

// In-memory current session (per MCP server instance)
let currentSessionId: string | null = null;

// Schema definitions
const CreateSessionSchema = z.object({
  project: z.string().optional().describe('Project name'),
  goal: z.string().optional().describe('Session goal'),
});

const EndSessionSchema = z.object({
  outcome: z.enum(['success', 'partial', 'failed']).optional().describe('Session outcome'),
  summary: z.string().optional().describe('Session summary'),
});

const GetCurrentSessionSchema = z.object({});

// Tool definitions
export const createSession = defineTool({
  name: 'create_session',
  description: 'Start a new work session for tracking activities',
  category: 'session',
  schema: CreateSessionSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const projectId = await getOrCreateProject(input.project, { logCreation: false });

    // End any existing session first
    if (currentSessionId) {
      try {
        await pb.collection('sessions').update(currentSessionId, {
          ended_at: nowISO(),
          outcome: 'partial',
        });
        logger.info(`Auto-ended previous session: ${currentSessionId}`);
      } catch {
        // Ignore errors ending old session
      }
    }

    const record = await pb.collection('sessions').create({
      project: projectId,
      started_at: nowISO(),
      goal: input.goal,
      outcome: 'ongoing',
    });

    currentSessionId = record.id;
    logger.info(`Session started: ${record.id}`);

    return {
      success: true,
      id: record.id,
      message: `Session started${input.goal ? `: ${input.goal}` : ''}`,
    };
  },
});

export const endSession = defineTool({
  name: 'end_session',
  description: 'End the current work session with outcome and summary',
  category: 'session',
  schema: EndSessionSchema,
  handler: async (input) => {
    if (!currentSessionId) {
      return {
        success: false,
        message: 'No active session to end',
      };
    }

    const pb = await getPocketBase();

    await pb.collection('sessions').update(currentSessionId, {
      ended_at: nowISO(),
      outcome: input.outcome || 'success',
      summary: input.summary,
    });

    const endedId = currentSessionId;
    currentSessionId = null;

    logger.info(`Session ended: ${endedId}`);

    return {
      success: true,
      id: endedId,
      message: `Session ended with outcome: ${input.outcome || 'success'}`,
    };
  },
});

export const getCurrentSession = defineTool({
  name: 'get_current_session',
  description: 'Get information about the current active session',
  category: 'session',
  schema: GetCurrentSessionSchema,
  handler: async () => {
    if (!currentSessionId) {
      return {
        active: false,
        message: 'No active session',
      };
    }

    const pb = await getPocketBase();

    try {
      const session = await pb.collection('sessions').getOne(currentSessionId, {
        expand: 'project',
      });

      const startedAt = new Date(session.started_at);
      const now = new Date();
      const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);

      return {
        active: true,
        id: session.id,
        project: session.expand?.project?.name || null,
        goal: session.goal,
        started_at: session.started_at,
        duration_minutes: durationMinutes,
      };
    } catch {
      currentSessionId = null;
      return {
        active: false,
        message: 'Session not found',
      };
    }
  },
});

// Export all tools as array for easy registration
export const sessionTools = [createSession, endSession, getCurrentSession];

// Export for use by other modules
export function getActiveSessionId(): string | null {
  return currentSessionId;
}
