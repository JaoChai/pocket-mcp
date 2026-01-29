import { z } from 'zod';
import { defineTool } from '../registry/defineTool.js';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';
import { CommonFields, RetroTypeEnum, LimitValidations } from '../schemas/index.js';

// ============================================
// SCHEMA DEFINITIONS
// ============================================

const GenerateRetrospectiveSchema = z.object({
  project: CommonFields.project,
  period: RetroTypeEnum.optional().describe('Period for retrospective (default: session)'),
  what_went_well: z.array(z.string()).optional().describe('Things that went well'),
  what_went_wrong: z.array(z.string()).optional().describe('Things that could be improved'),
  lessons_learned: z.array(z.string()).optional().describe('Key lessons learned'),
  action_items: z.array(z.string()).optional().describe('Action items for improvement'),
});

const GetLessonsSchema = z.object({
  project: CommonFields.project,
  category: z.string().optional().describe('Filter by category'),
  limit: LimitValidations.limitMediumLarge.optional().describe('Maximum results (default: 10)'),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDateRange(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'daily':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default: // session - last 4 hours
      return new Date(now.getTime() - 4 * 60 * 60 * 1000);
  }
}

async function analyzeRecentActivity(
  pb: Awaited<ReturnType<typeof getPocketBase>>,
  projectId: string | null,
  period: string
): Promise<{ whatWentWell: string[]; whatWentWrong: string[]; lessonsLearned: string[]; actionItems: string[] }> {
  const result = { whatWentWell: [] as string[], whatWentWrong: [] as string[], lessonsLearned: [] as string[], actionItems: [] as string[] };

  const startDate = getDateRange(period);
  const dateFilter = `created>="${startDate.toISOString()}"`;
  const projectFilter = projectId ? ` && project="${projectId}"` : '';
  const filter = dateFilter + projectFilter;

  try {
    // Analyze decisions
    const decisions = await pb.collection('decisions').getFullList({ filter, sort: '-created' });
    for (const decision of decisions) {
      if (decision.would_do_again === true) {
        result.whatWentWell.push(`Decision: ${decision.title} - ${decision.chosen}`);
      } else if (decision.would_do_again === false) {
        result.whatWentWrong.push(`Decision to reconsider: ${decision.title}`);
        result.lessonsLearned.push(`Review decision: ${decision.title} - consider alternatives`);
      }
    }

    // Analyze bugs
    const bugs = await pb.collection('bugs_and_fixes').getFullList({ filter, sort: '-created' });
    if (bugs.length > 0) {
      result.whatWentWell.push(`Fixed ${bugs.length} bug(s)`);
      for (const bug of bugs) {
        if (bug.prevention) result.lessonsLearned.push(`Bug prevention: ${bug.prevention}`);
        if (bug.root_cause) result.actionItems.push(`Address root cause: ${bug.root_cause}`);
      }
    }

    // Analyze patterns discovered
    const observations = await pb.collection('observations').getFullList({ filter: filter + ` && type="pattern"`, sort: '-created' });
    if (observations.length > 0) {
      result.whatWentWell.push(`Discovered ${observations.length} pattern(s)`);
      for (const obs of observations) {
        result.lessonsLearned.push(`Pattern: ${obs.title}`);
      }
    }

    // Analyze high-importance observations
    const importantObs = await pb.collection('observations').getFullList({ filter: filter + ` && importance>=4`, sort: '-importance' });
    for (const obs of importantObs) {
      if (obs.type === 'insight') result.lessonsLearned.push(`Insight: ${obs.title}`);
    }
  } catch (error) {
    logger.error('Error analyzing recent activity', error);
  }

  return result;
}

async function calculateMetrics(
  pb: Awaited<ReturnType<typeof getPocketBase>>,
  projectId: string | null,
  period: string
): Promise<Record<string, number | string>> {
  const startDate = getDateRange(period);
  const dateFilter = `created>="${startDate.toISOString()}"`;
  const projectFilter = projectId ? ` && project="${projectId}"` : '';
  const filter = dateFilter + projectFilter;

  const metrics: Record<string, number | string> = { period };

  try {
    const observations = await pb.collection('observations').getList(1, 1, { filter });
    metrics.observations_count = observations.totalItems;

    const decisions = await pb.collection('decisions').getList(1, 1, { filter });
    metrics.decisions_count = decisions.totalItems;

    const bugs = await pb.collection('bugs_and_fixes').getList(1, 1, { filter });
    metrics.bugs_fixed = bugs.totalItems;

    const snippets = await pb.collection('code_snippets').getList(1, 1, { filter });
    metrics.snippets_saved = snippets.totalItems;
  } catch (error) {
    logger.error('Error calculating metrics', error);
  }

  return metrics;
}

// ============================================
// TOOL DEFINITIONS
// ============================================

export const generateRetrospective = defineTool({
  name: 'generate_retrospective',
  description: 'Generate a retrospective summary with lessons learned and action items',
  category: 'reflection',
  schema: GenerateRetrospectiveSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const period = input.period || 'session';

    let projectId: string | null = null;
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
      summary: { period, what_went_well: whatWentWell, what_went_wrong: whatWentWrong, lessons_learned: lessonsLearned, action_items: actionItems, metrics },
    };
  },
});

export const getLessons = defineTool({
  name: 'get_lessons',
  description: 'Get lessons learned from past retrospectives',
  category: 'reflection',
  schema: GetLessonsSchema,
  handler: async (input) => {
    const pb = await getPocketBase();
    const limit = input.limit || 10;
    let filter: string | undefined = undefined;

    if (input.project) {
      try {
        const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
        filter = `project="${project.id}"`;
      } catch {
        // Project not found, continue without filter
      }
    }

    const options: { sort: string; filter?: string; expand?: string } = { sort: '-created', expand: 'project' };
    if (filter) options.filter = filter;

    const retros = await pb.collection('retrospectives').getList(1, limit, options);

    // Aggregate all lessons
    const allLessons: Array<{ lesson: string; from_retro: string; period: string; created: string }> = [];

    for (const retro of retros.items) {
      const lessons = Array.isArray(retro.lessons_learned) ? retro.lessons_learned : [];
      for (const lesson of lessons) {
        if (typeof lesson === 'string' && lesson.trim()) {
          allLessons.push({ lesson, from_retro: retro.id, period: retro.period, created: retro.created });
        }
      }
    }

    return { total: allLessons.length, lessons: allLessons };
  },
});

export const reflectTools = [generateRetrospective, getLessons];
