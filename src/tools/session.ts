import { z } from 'zod';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';

// In-memory current session (per MCP server instance)
let currentSessionId: string | null = null;

// Schema definitions
export const CreateSessionSchema = z.object({
  project: z.string().optional().describe('Project name'),
  goal: z.string().optional().describe('Session goal'),
});

export const EndSessionSchema = z.object({
  outcome: z.enum(['success', 'partial', 'failed']).optional().describe('Session outcome'),
  summary: z.string().optional().describe('Session summary'),
});

export const GetCurrentSessionSchema = z.object({});

// Helper to get or create project
async function getOrCreateProject(projectName?: string): Promise<string | null> {
  if (!projectName) return null;

  const pb = await getPocketBase();
  try {
    const existing = await pb.collection('projects').getFirstListItem(`name="${projectName}"`);
    return existing.id;
  } catch {
    try {
      const created = await pb.collection('projects').create({
        name: projectName,
        status: 'active',
      });
      return created.id;
    } catch {
      return null;
    }
  }
}

// Tool implementations
export async function createSession(input: z.infer<typeof CreateSessionSchema>) {
  const pb = await getPocketBase();
  const projectId = await getOrCreateProject(input.project);

  try {
    // End any existing session first
    if (currentSessionId) {
      try {
        await pb.collection('sessions').update(currentSessionId, {
          ended_at: new Date().toISOString(),
          outcome: 'partial',
        });
        logger.info(`Auto-ended previous session: ${currentSessionId}`);
      } catch {
        // Ignore errors ending old session
      }
    }

    const record = await pb.collection('sessions').create({
      project: projectId,
      started_at: new Date().toISOString(),
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
  } catch (error) {
    logger.error('Failed to create session', error);
    throw error;
  }
}

export async function endSession(input: z.infer<typeof EndSessionSchema>) {
  if (!currentSessionId) {
    return {
      success: false,
      message: 'No active session to end',
    };
  }

  const pb = await getPocketBase();

  try {
    await pb.collection('sessions').update(currentSessionId, {
      ended_at: new Date().toISOString(),
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
  } catch (error) {
    logger.error('Failed to end session', error);
    throw error;
  }
}

export async function getCurrentSession(_input: z.infer<typeof GetCurrentSessionSchema>) {
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
}

// Export for use by capture.ts
export function getActiveSessionId(): string | null {
  return currentSessionId;
}
