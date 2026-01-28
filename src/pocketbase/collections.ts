// Collection Schema Definitions for PocketBase Second Brain

export const COLLECTIONS = {
  // Core Collections
  projects: {
    name: 'projects',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'tech_stack', type: 'json' },
      { name: 'repo_url', type: 'url' },
      { name: 'status', type: 'select', options: { values: ['active', 'archived', 'paused'] } },
    ],
  },

  sessions: {
    name: 'sessions',
    type: 'base',
    schema: [
      { name: 'project', type: 'relation', options: { collectionId: 'projects', maxSelect: 1 } },
      { name: 'started_at', type: 'date', required: true },
      { name: 'ended_at', type: 'date' },
      { name: 'goal', type: 'text' },
      { name: 'outcome', type: 'select', options: { values: ['success', 'partial', 'failed', 'ongoing'] } },
      { name: 'summary', type: 'text' },
    ],
  },

  areas: {
    name: 'areas',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'skills', type: 'json' },
      { name: 'standards', type: 'text' },
    ],
  },

  // Memory Collections - Episodic
  observations: {
    name: 'observations',
    type: 'base',
    schema: [
      { name: 'session', type: 'relation', options: { collectionId: 'sessions', maxSelect: 1 } },
      { name: 'project', type: 'relation', options: { collectionId: 'projects', maxSelect: 1 } },
      { name: 'type', type: 'select', required: true, options: { values: ['discovery', 'pattern', 'insight', 'note'] } },
      { name: 'category', type: 'select', options: { values: ['architecture', 'code', 'performance', 'security', 'testing', 'devops', 'other'] } },
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'text', required: true },
      { name: 'files', type: 'json' },
      { name: 'tags', type: 'json' },
      { name: 'importance', type: 'number', options: { min: 1, max: 5 } },
    ],
  },

  // Memory Collections - Semantic
  decisions: {
    name: 'decisions',
    type: 'base',
    schema: [
      { name: 'session', type: 'relation', options: { collectionId: 'sessions', maxSelect: 1 } },
      { name: 'project', type: 'relation', options: { collectionId: 'projects', maxSelect: 1 } },
      { name: 'title', type: 'text', required: true },
      { name: 'context', type: 'text', required: true },
      { name: 'options', type: 'json' },
      { name: 'chosen', type: 'text', required: true },
      { name: 'rationale', type: 'text', required: true },
      { name: 'outcome', type: 'text' },
      { name: 'would_do_again', type: 'bool' },
      { name: 'tags', type: 'json' },
    ],
  },

  bugs_and_fixes: {
    name: 'bugs_and_fixes',
    type: 'base',
    schema: [
      { name: 'session', type: 'relation', options: { collectionId: 'sessions', maxSelect: 1 } },
      { name: 'project', type: 'relation', options: { collectionId: 'projects', maxSelect: 1 } },
      { name: 'error_type', type: 'select', required: true, options: { values: ['runtime', 'compile', 'logic', 'performance', 'security', 'other'] } },
      { name: 'error_message', type: 'text', required: true },
      { name: 'root_cause', type: 'text' },
      { name: 'solution', type: 'text', required: true },
      { name: 'prevention', type: 'text' },
      { name: 'time_to_fix', type: 'number' },
      { name: 'files_affected', type: 'json' },
      { name: 'tags', type: 'json' },
    ],
  },

  patterns: {
    name: 'patterns',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'category', type: 'select', required: true, options: { values: ['design', 'architecture', 'testing', 'deployment', 'refactoring', 'other'] } },
      { name: 'problem', type: 'text', required: true },
      { name: 'solution', type: 'text', required: true },
      { name: 'example_code', type: 'text' },
      { name: 'when_to_use', type: 'json' },
      { name: 'when_not_to_use', type: 'json' },
      { name: 'related_patterns', type: 'json' },
      { name: 'tags', type: 'json' },
    ],
  },

  // Memory Collections - Procedural
  code_snippets: {
    name: 'code_snippets',
    type: 'base',
    schema: [
      { name: 'project', type: 'relation', options: { collectionId: 'projects', maxSelect: 1 } },
      { name: 'title', type: 'text', required: true },
      { name: 'language', type: 'select', required: true, options: { values: ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'sql', 'bash', 'other'] } },
      { name: 'code', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'use_cases', type: 'json' },
      { name: 'tags', type: 'json' },
      { name: 'reuse_count', type: 'number' },
    ],
  },

  // Learning Collections
  retrospectives: {
    name: 'retrospectives',
    type: 'base',
    schema: [
      { name: 'session', type: 'relation', options: { collectionId: 'sessions', maxSelect: 1 } },
      { name: 'project', type: 'relation', options: { collectionId: 'projects', maxSelect: 1 } },
      { name: 'period', type: 'select', required: true, options: { values: ['session', 'daily', 'weekly', 'monthly'] } },
      { name: 'what_went_well', type: 'json' },
      { name: 'what_went_wrong', type: 'json' },
      { name: 'lessons_learned', type: 'json' },
      { name: 'action_items', type: 'json' },
      { name: 'metrics', type: 'json' },
    ],
  },

  resources: {
    name: 'resources',
    type: 'base',
    schema: [
      { name: 'title', type: 'text', required: true },
      { name: 'type', type: 'select', required: true, options: { values: ['article', 'video', 'documentation', 'book', 'course', 'tool', 'other'] } },
      { name: 'url', type: 'url' },
      { name: 'summary', type: 'text' },
      { name: 'areas', type: 'relation', options: { collectionId: 'areas' } },
      { name: 'tags', type: 'json' },
    ],
  },

  // Relationship & Search Collections
  relationships: {
    name: 'relationships',
    type: 'base',
    schema: [
      { name: 'source_type', type: 'select', required: true, options: { values: ['project', 'observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'] } },
      { name: 'source_id', type: 'text', required: true },
      { name: 'relation', type: 'select', required: true, options: { values: ['uses', 'caused', 'fixed_by', 'led_to', 'related_to', 'depends_on', 'inspired_by'] } },
      { name: 'target_type', type: 'select', required: true, options: { values: ['project', 'observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'] } },
      { name: 'target_id', type: 'text', required: true },
      { name: 'context', type: 'text' },
    ],
  },

  user_preferences: {
    name: 'user_preferences',
    type: 'base',
    schema: [
      { name: 'category', type: 'select', required: true, options: { values: ['coding_style', 'tools', 'workflow', 'communication', 'other'] } },
      { name: 'preference', type: 'text', required: true },
      { name: 'reason', type: 'text' },
      { name: 'examples', type: 'json' },
      { name: 'strength', type: 'number', options: { min: 1, max: 5 } },
    ],
  },

  embeddings: {
    name: 'embeddings',
    type: 'base',
    schema: [
      { name: 'source_type', type: 'select', required: true, options: { values: ['observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'] } },
      { name: 'source_id', type: 'text', required: true },
      { name: 'content_hash', type: 'text', required: true },
      { name: 'vector', type: 'json', required: true },
      { name: 'model', type: 'text', required: true },
    ],
  },
} as const;

export type CollectionName = keyof typeof COLLECTIONS;
