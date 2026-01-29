import { z } from 'zod';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';

// Schema definitions
export const GenerateRetrospectiveSchema = z.object({
  project: z.string().optional().describe('Project name to reflect on'),
  period: z.enum(['session', 'daily', 'weekly', 'monthly']).optional().describe('Period for retrospective (default: session)'),
  what_went_well: z.array(z.string()).optional().describe('Things that went well'),
  what_went_wrong: z.array(z.string()).optional().describe('Things that could be improved'),
  lessons_learned: z.array(z.string()).optional().describe('Key lessons learned'),
  action_items: z.array(z.string()).optional().describe('Action items for improvement'),
});

export const GetLessonsSchema = z.object({
  project: z.string().optional().describe('Filter by project'),
  category: z.string().optional().describe('Filter by category'),
  limit: z.number().min(1).max(50).optional().describe('Maximum results (default: 10)'),
});

// Generate and save retrospective
export async function generateRetrospective(input: z.infer<typeof GenerateRetrospectiveSchema>) {
  const pb = await getPocketBase();
  const period = input.period || 'session';

  let projectId: string | null = null;

  // Get project ID if specified
  if (input.project) {
    try {
      const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
      projectId = project.id;
    } catch {
      // Project not found, continue without
    }
  }

  // If no input provided, analyze recent activity
  let whatWentWell = input.what_went_well || [];
  let whatWentWrong = input.what_went_wrong || [];
  let lessonsLearned = input.lessons_learned || [];
  let actionItems = input.action_items || [];

  // Auto-analyze if not provided
  if (!input.what_went_well && !input.what_went_wrong) {
    const analysis = await analyzeRecentActivity(pb, projectId, period);
    whatWentWell = analysis.whatWentWell;
    whatWentWrong = analysis.whatWentWrong;
    lessonsLearned = analysis.lessonsLearned;
    actionItems = analysis.actionItems;
  }

  try {
    // Calculate metrics
    const metrics = await calculateMetrics(pb, projectId, period);

    const record = await pb.collection('retrospectives').create({
      project: projectId,
      period,
      what_went_well: whatWentWell,
      what_went_wrong: whatWentWrong,
      lessons_learned: lessonsLearned,
      action_items: actionItems,
      metrics,
    });

    logger.info(`Generated retrospective for period: ${period}`);

    return {
      success: true,
      id: record.id,
      summary: {
        period,
        what_went_well: whatWentWell,
        what_went_wrong: whatWentWrong,
        lessons_learned: lessonsLearned,
        action_items: actionItems,
        metrics,
      },
    };
  } catch (error) {
    logger.error('Failed to generate retrospective', error);
    throw error;
  }
}

// Analyze recent activity to generate retrospective data
async function analyzeRecentActivity(
  pb: Awaited<ReturnType<typeof getPocketBase>>,
  projectId: string | null,
  period: string
): Promise<{
  whatWentWell: string[];
  whatWentWrong: string[];
  lessonsLearned: string[];
  actionItems: string[];
}> {
  const result = {
    whatWentWell: [] as string[],
    whatWentWrong: [] as string[],
    lessonsLearned: [] as string[],
    actionItems: [] as string[],
  };

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default: // session - last 4 hours
      startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  }

  const dateFilter = `created>="${startDate.toISOString()}"`;
  const projectFilter = projectId ? ` && project="${projectId}"` : '';
  const filter = dateFilter + projectFilter;

  try {
    // Analyze decisions
    const decisions = await pb.collection('decisions').getFullList({
      filter,
      sort: '-created',
    });

    for (const decision of decisions) {
      if (decision.would_do_again === true) {
        result.whatWentWell.push(`Decision: ${decision.title} - ${decision.chosen}`);
      } else if (decision.would_do_again === false) {
        result.whatWentWrong.push(`Decision to reconsider: ${decision.title}`);
        result.lessonsLearned.push(`Review decision: ${decision.title} - consider alternatives`);
      }
    }

    // Analyze bugs
    const bugs = await pb.collection('bugs_and_fixes').getFullList({
      filter,
      sort: '-created',
    });

    if (bugs.length > 0) {
      result.whatWentWell.push(`Fixed ${bugs.length} bug(s)`);

      // Extract prevention tips
      for (const bug of bugs) {
        if (bug.prevention) {
          result.lessonsLearned.push(`Bug prevention: ${bug.prevention}`);
        }
        if (bug.root_cause) {
          result.actionItems.push(`Address root cause: ${bug.root_cause}`);
        }
      }
    }

    // Analyze patterns discovered
    const observations = await pb.collection('observations').getFullList({
      filter: filter + ` && type="pattern"`,
      sort: '-created',
    });

    if (observations.length > 0) {
      result.whatWentWell.push(`Discovered ${observations.length} pattern(s)`);
      for (const obs of observations) {
        result.lessonsLearned.push(`Pattern: ${obs.title}`);
      }
    }

    // Analyze high-importance observations
    const importantObs = await pb.collection('observations').getFullList({
      filter: filter + ` && importance>=4`,
      sort: '-importance',
    });

    for (const obs of importantObs) {
      if (obs.type === 'insight') {
        result.lessonsLearned.push(`Insight: ${obs.title}`);
      }
    }

  } catch (error) {
    logger.error('Error analyzing recent activity', error);
  }

  return result;
}

// Calculate metrics for retrospective
async function calculateMetrics(
  pb: Awaited<ReturnType<typeof getPocketBase>>,
  projectId: string | null,
  period: string
): Promise<Record<string, number | string>> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  }

  const dateFilter = `created>="${startDate.toISOString()}"`;
  const projectFilter = projectId ? ` && project="${projectId}"` : '';
  const filter = dateFilter + projectFilter;

  const metrics: Record<string, number | string> = {
    period,
  };

  try {
    // Count observations
    const observations = await pb.collection('observations').getList(1, 1, { filter });
    metrics.observations_count = observations.totalItems;

    // Count decisions
    const decisions = await pb.collection('decisions').getList(1, 1, { filter });
    metrics.decisions_count = decisions.totalItems;

    // Count bugs fixed
    const bugs = await pb.collection('bugs_and_fixes').getList(1, 1, { filter });
    metrics.bugs_fixed = bugs.totalItems;

    // Count snippets saved
    const snippets = await pb.collection('code_snippets').getList(1, 1, { filter });
    metrics.snippets_saved = snippets.totalItems;

  } catch (error) {
    logger.error('Error calculating metrics', error);
  }

  return metrics;
}

// Get past lessons learned
export async function getLessons(input: z.infer<typeof GetLessonsSchema>) {
  const pb = await getPocketBase();
  const limit = input.limit || 10;
  let filter: string | undefined = undefined;

  try {

    if (input.project) {
      try {
        const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
        filter = `project="${project.id}"`;
      } catch {
        // Project not found, continue without filter
      }
    }

    const options: { sort: string; filter?: string; expand?: string } = {
      sort: '-created',
      expand: 'project',
    };

    if (filter) {
      options.filter = filter;
    }

    const retros = await pb.collection('retrospectives').getList(1, limit, options);

    // Aggregate all lessons
    const allLessons: Array<{
      lesson: string;
      from_retro: string;
      period: string;
      created: string;
    }> = [];

    for (const retro of retros.items) {
      const lessons = Array.isArray(retro.lessons_learned) ? retro.lessons_learned : [];
      for (const lesson of lessons) {
        if (typeof lesson === 'string' && lesson.trim()) {
          allLessons.push({
            lesson,
            from_retro: retro.id,
            period: retro.period,
            created: retro.created,
          });
        }
      }
    }

    return {
      total: allLessons.length,
      lessons: allLessons,
    };
  } catch (error) {
    logger.error('Failed to get lessons', { error, filter, limit });
    return {
      total: 0,
      lessons: [],
      message: error instanceof Error ? error.message : 'Failed to retrieve lessons',
    };
  }
}
