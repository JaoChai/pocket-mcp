/**
 * Tool Categories and Triggers
 * Maps tools to categories and keywords that trigger their loading
 */

export const ToolCategories = {
  // Core tools - ALWAYS loaded
  core: ['get_current_session', 'search_knowledge', 'semantic_search'],

  // Session management
  session: ['create_session', 'end_session'],

  // Task management
  task: ['create_task', 'update_task', 'get_tasks', 'get_project_progress', 'delete_task'],

  // Knowledge capture
  capture: ['capture_observation', 'capture_decision', 'capture_bug', 'save_snippet'],

  // Decision outcome tracking
  outcome: ['record_decision_outcome', 'get_pending_outcomes'],

  // Workflow automation
  workflow: ['save_workflow', 'find_workflow', 'get_workflow', 'record_workflow_execution'],

  // Project context & preferences
  context: ['get_project_context', 'get_preferences', 'save_preference'],

  // Knowledge graph relationships
  relation: ['link_entities', 'get_relations', 'suggest_relations'],

  // Reflection & retrospectives
  reflection: ['generate_retrospective', 'get_lessons'],
} as const;

export type ToolCategory = keyof typeof ToolCategories;

/**
 * Trigger keywords for each category
 * When these keywords appear in user input, the category's tools are loaded
 */
export const CategoryTriggers: Record<ToolCategory, string[]> = {
  core: [], // Always loaded
  session: ['session', 'start', 'end', 'begin', 'work session'],
  task: ['task', 'todo', 'track', 'progress', 'feature', 'goal', 'create task', 'update task'],
  capture: ['save', 'capture', 'record', 'note', 'bug', 'decision', 'observation', 'snippet'],
  outcome: ['outcome', 'result', 'review', 'followup', 'follow-up', 'decision outcome'],
  workflow: ['workflow', 'procedure', 'process', 'step', 'automation', 'save workflow'],
  context: ['context', 'project', 'preference', 'setting', 'tech stack', 'stack'],
  relation: ['link', 'relate', 'connection', 'relationship', 'suggest relations'],
  reflection: [
    'retrospective',
    'reflect',
    'lesson',
    'learn',
    'retro',
    'lessons learned',
    'what went',
  ],
};

/**
 * Get categories that match input keywords
 */
export function getCategoriesByKeywords(text: string): ToolCategory[] {
  const lowerText = text.toLowerCase();
  const matches: ToolCategory[] = [];

  for (const [category, triggers] of Object.entries(CategoryTriggers)) {
    if (triggers.some((trigger) => lowerText.includes(trigger))) {
      matches.push(category as ToolCategory);
    }
  }

  return matches;
}

/**
 * Get all tool names for a specific category
 */
export function getToolsForCategory(category: ToolCategory): string[] {
  return [...ToolCategories[category]];
}

/**
 * Get categories for specific tools
 */
export function getCategoriesForTools(...toolNames: string[]): ToolCategory[] {
  const result: ToolCategory[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Object.entries(ToolCategories) as [ToolCategory, readonly string[]][]).forEach(
    ([category, tools]) => {
      if (toolNames.some((toolName) => tools.includes(toolName))) {
        if (!result.includes(category)) {
          result.push(category);
        }
      }
    }
  );

  return result;
}
