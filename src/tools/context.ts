import { z } from 'zod';
import { getPocketBase } from '../pocketbase/client.js';
import { logger } from '../utils/logger.js';

// Schema definitions
export const GetProjectContextSchema = z.object({
  project: z.string().min(1).describe('Project name'),
  include: z.array(z.enum(['tech_stack', 'recent_decisions', 'recent_bugs', 'patterns', 'preferences']))
    .optional()
    .describe('What to include in context (default: all)'),
  limit: z.number().min(1).max(20).optional().describe('Max items per category (default: 5)'),
});

export const GetPreferencesSchema = z.object({
  category: z.enum(['coding_style', 'tools', 'workflow', 'communication', 'other', 'all'])
    .optional()
    .describe('Preference category (default: all)'),
});

// Get project context
export async function getProjectContext(input: z.infer<typeof GetProjectContextSchema>) {
  const pb = await getPocketBase();
  const include = input.include || ['tech_stack', 'recent_decisions', 'recent_bugs', 'patterns', 'preferences'];
  const limit = input.limit || 5;

  const context: {
    project: {
      name: string;
      description: string;
      tech_stack: string[];
      status: string;
    } | null;
    recent_decisions: Array<{
      title: string;
      chosen: string;
      rationale: string;
      created: string;
    }>;
    recent_bugs: Array<{
      error_type: string;
      error_message: string;
      solution: string;
      created: string;
    }>;
    patterns_used: Array<{
      name: string;
      category: string;
    }>;
    preferences: Array<{
      category: string;
      preference: string;
    }>;
  } = {
    project: null,
    recent_decisions: [],
    recent_bugs: [],
    patterns_used: [],
    preferences: [],
  };

  try {
    // Get project info
    const project = await pb.collection('projects').getFirstListItem(`name="${input.project}"`);
    context.project = {
      name: project.name,
      description: project.description || '',
      tech_stack: project.tech_stack || [],
      status: project.status || 'active',
    };

    const projectId = project.id;

    // Get recent decisions
    if (include.includes('recent_decisions')) {
      try {
        const decisions = await pb.collection('decisions').getList(1, limit, {
          filter: `project="${projectId}"`,
          sort: '-created',
        });
        context.recent_decisions = decisions.items.map(d => ({
          title: d.title,
          chosen: d.chosen,
          rationale: d.rationale,
          created: d.created,
        }));
      } catch {
        // No decisions found
      }
    }

    // Get recent bugs
    if (include.includes('recent_bugs')) {
      try {
        const bugs = await pb.collection('bugs_and_fixes').getList(1, limit, {
          filter: `project="${projectId}"`,
          sort: '-created',
        });
        context.recent_bugs = bugs.items.map(b => ({
          error_type: b.error_type,
          error_message: b.error_message.slice(0, 100),
          solution: b.solution.slice(0, 200),
          created: b.created,
        }));
      } catch {
        // No bugs found
      }
    }

    // Get patterns used in project (from observations)
    if (include.includes('patterns')) {
      try {
        const observations = await pb.collection('observations').getList(1, limit, {
          filter: `project="${projectId}" && type="pattern"`,
          sort: '-created',
        });
        context.patterns_used = observations.items.map(o => ({
          name: o.title,
          category: o.category || 'other',
        }));
      } catch {
        // No patterns found
      }
    }

    // Get user preferences
    if (include.includes('preferences')) {
      try {
        const prefs = await pb.collection('user_preferences').getList(1, limit, {
          sort: '-strength',
        });
        context.preferences = prefs.items.map(p => ({
          category: p.category,
          preference: p.preference,
        }));
      } catch {
        // No preferences found
      }
    }

    return context;
  } catch (error) {
    logger.error('Failed to get project context', error);

    // Return minimal context if project not found
    return {
      project: null,
      recent_decisions: [],
      recent_bugs: [],
      patterns_used: [],
      preferences: [],
      message: `Project "${input.project}" not found`,
    };
  }
}

// Get user preferences
export async function getPreferences(input: z.infer<typeof GetPreferencesSchema>) {
  const pb = await getPocketBase();
  const category = input.category || 'all';

  try {
    let filter = '';
    if (category !== 'all') {
      filter = `category="${category}"`;
    }

    const prefs = await pb.collection('user_preferences').getFullList({
      filter,
      sort: '-strength,-created',
    });

    return {
      total: prefs.length,
      preferences: prefs.map(p => ({
        id: p.id,
        category: p.category,
        preference: p.preference,
        reason: p.reason,
        examples: p.examples || [],
        strength: p.strength,
      })),
    };
  } catch (error) {
    logger.error('Failed to get preferences', error);
    return {
      total: 0,
      preferences: [],
    };
  }
}

// Save user preference
export const SavePreferenceSchema = z.object({
  category: z.enum(['coding_style', 'tools', 'workflow', 'communication', 'other']).describe('Preference category'),
  preference: z.string().min(1).describe('The preference'),
  reason: z.string().optional().describe('Reason for this preference'),
  examples: z.array(z.string()).optional().describe('Examples'),
  strength: z.number().min(1).max(5).optional().describe('How strong is this preference (1-5)'),
});

export async function savePreference(input: z.infer<typeof SavePreferenceSchema>) {
  const pb = await getPocketBase();

  try {
    // Check if similar preference exists
    try {
      const existing = await pb.collection('user_preferences').getFirstListItem(
        `category="${input.category}" && preference~"${input.preference.slice(0, 50)}"`
      );

      // Update existing preference
      await pb.collection('user_preferences').update(existing.id, {
        reason: input.reason || existing.reason,
        examples: [...(existing.examples || []), ...(input.examples || [])],
        strength: input.strength || existing.strength,
      });

      return {
        success: true,
        id: existing.id,
        message: 'Preference updated',
      };
    } catch {
      // Create new preference
      const record = await pb.collection('user_preferences').create({
        category: input.category,
        preference: input.preference,
        reason: input.reason,
        examples: input.examples || [],
        strength: input.strength || 3,
      });

      return {
        success: true,
        id: record.id,
        message: 'Preference saved',
      };
    }
  } catch (error) {
    logger.error('Failed to save preference', error);
    throw error;
  }
}
