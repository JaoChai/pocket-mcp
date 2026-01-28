#!/usr/bin/env npx tsx
/**
 * Migration script to update PocketBase collections with proper schema
 */

import PocketBase from 'pocketbase';
import 'dotenv/config';

const pb = new PocketBase(process.env.POCKETBASE_URL);

async function main() {
  console.log('🔄 Starting PocketBase migration...\n');

  // Authenticate as superuser
  await pb.collection('_superusers').authWithPassword(
    process.env.POCKETBASE_EMAIL!,
    process.env.POCKETBASE_PASSWORD!
  );
  console.log('✅ Authenticated as superuser\n');

  // Define collection schemas
  const collections: Record<string, { name: string; fields: any[] }> = {
    projects: {
      name: 'projects',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'editor', required: false },
        { name: 'tech_stack', type: 'json', required: false },
        { name: 'repo_url', type: 'url', required: false },
        { name: 'status', type: 'select', required: false, options: { values: ['active', 'archived', 'paused'] } },
      ],
    },
    sessions: {
      name: 'sessions',
      fields: [
        { name: 'project', type: 'text', required: false },
        { name: 'started_at', type: 'date', required: true },
        { name: 'ended_at', type: 'date', required: false },
        { name: 'goal', type: 'text', required: false },
        { name: 'outcome', type: 'select', required: false, options: { values: ['success', 'partial', 'failed', 'ongoing'] } },
        { name: 'summary', type: 'editor', required: false },
      ],
    },
    observations: {
      name: 'observations',
      fields: [
        { name: 'session', type: 'text', required: false },
        { name: 'project', type: 'text', required: false },
        { name: 'type', type: 'select', required: true, options: { values: ['discovery', 'pattern', 'insight', 'note'] } },
        { name: 'category', type: 'select', required: false, options: { values: ['architecture', 'code', 'performance', 'security', 'testing', 'devops', 'other'] } },
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'editor', required: true },
        { name: 'files', type: 'json', required: false },
        { name: 'tags', type: 'json', required: false },
        { name: 'importance', type: 'number', required: false, options: { min: 1, max: 5 } },
      ],
    },
    decisions: {
      name: 'decisions',
      fields: [
        { name: 'session', type: 'text', required: false },
        { name: 'project', type: 'text', required: false },
        { name: 'title', type: 'text', required: true },
        { name: 'context', type: 'editor', required: true },
        { name: 'options', type: 'json', required: false },
        { name: 'chosen', type: 'text', required: true },
        { name: 'rationale', type: 'editor', required: true },
        { name: 'outcome', type: 'editor', required: false },
        { name: 'would_do_again', type: 'bool', required: false },
        { name: 'tags', type: 'json', required: false },
      ],
    },
    bugs_and_fixes: {
      name: 'bugs_and_fixes',
      fields: [
        { name: 'session', type: 'text', required: false },
        { name: 'project', type: 'text', required: false },
        { name: 'error_type', type: 'select', required: true, options: { values: ['runtime', 'compile', 'logic', 'performance', 'security', 'other'] } },
        { name: 'error_message', type: 'editor', required: true },
        { name: 'root_cause', type: 'editor', required: false },
        { name: 'solution', type: 'editor', required: true },
        { name: 'prevention', type: 'editor', required: false },
        { name: 'time_to_fix', type: 'number', required: false },
        { name: 'files_affected', type: 'json', required: false },
        { name: 'tags', type: 'json', required: false },
      ],
    },
    patterns: {
      name: 'patterns',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'category', type: 'select', required: true, options: { values: ['design', 'architecture', 'testing', 'deployment', 'refactoring', 'other'] } },
        { name: 'problem', type: 'editor', required: true },
        { name: 'solution', type: 'editor', required: true },
        { name: 'example_code', type: 'editor', required: false },
        { name: 'when_to_use', type: 'json', required: false },
        { name: 'when_not_to_use', type: 'json', required: false },
        { name: 'related_patterns', type: 'json', required: false },
        { name: 'tags', type: 'json', required: false },
      ],
    },
    code_snippets: {
      name: 'code_snippets',
      fields: [
        { name: 'project', type: 'text', required: false },
        { name: 'title', type: 'text', required: true },
        { name: 'language', type: 'select', required: true, options: { values: ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'sql', 'bash', 'other'] } },
        { name: 'code', type: 'editor', required: true },
        { name: 'description', type: 'editor', required: false },
        { name: 'use_cases', type: 'json', required: false },
        { name: 'tags', type: 'json', required: false },
        { name: 'reuse_count', type: 'number', required: false },
      ],
    },
    retrospectives: {
      name: 'retrospectives',
      fields: [
        { name: 'session', type: 'text', required: false },
        { name: 'project', type: 'text', required: false },
        { name: 'period', type: 'select', required: true, options: { values: ['session', 'daily', 'weekly', 'monthly'] } },
        { name: 'what_went_well', type: 'json', required: false },
        { name: 'what_went_wrong', type: 'json', required: false },
        { name: 'lessons_learned', type: 'json', required: false },
        { name: 'action_items', type: 'json', required: false },
        { name: 'metrics', type: 'json', required: false },
      ],
    },
    resources: {
      name: 'resources',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'type', type: 'select', required: true, options: { values: ['article', 'video', 'documentation', 'book', 'course', 'tool', 'other'] } },
        { name: 'url', type: 'url', required: false },
        { name: 'summary', type: 'editor', required: false },
        { name: 'areas', type: 'json', required: false },
        { name: 'tags', type: 'json', required: false },
      ],
    },
    relationships: {
      name: 'relationships',
      fields: [
        { name: 'source_type', type: 'select', required: true, options: { values: ['project', 'observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'] } },
        { name: 'source_id', type: 'text', required: true },
        { name: 'relation', type: 'select', required: true, options: { values: ['uses', 'caused', 'fixed_by', 'led_to', 'related_to', 'depends_on', 'inspired_by'] } },
        { name: 'target_type', type: 'select', required: true, options: { values: ['project', 'observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'] } },
        { name: 'target_id', type: 'text', required: true },
        { name: 'context', type: 'editor', required: false },
      ],
    },
    user_preferences: {
      name: 'user_preferences',
      fields: [
        { name: 'category', type: 'select', required: true, options: { values: ['coding_style', 'tools', 'workflow', 'communication', 'other'] } },
        { name: 'preference', type: 'text', required: true },
        { name: 'reason', type: 'editor', required: false },
        { name: 'examples', type: 'json', required: false },
        { name: 'strength', type: 'number', required: false, options: { min: 1, max: 5 } },
      ],
    },
    embeddings: {
      name: 'embeddings',
      fields: [
        { name: 'source_type', type: 'select', required: true, options: { values: ['observation', 'decision', 'bug', 'pattern', 'snippet', 'resource'] } },
        { name: 'source_id', type: 'text', required: true },
        { name: 'content_hash', type: 'text', required: true },
        { name: 'vector', type: 'json', required: true },
        { name: 'model', type: 'text', required: true },
      ],
    },
    areas: {
      name: 'areas',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'editor', required: false },
        { name: 'skills', type: 'json', required: false },
        { name: 'standards', type: 'editor', required: false },
      ],
    },
  };

  // Convert our schema format to PocketBase format
  function convertToPocketBaseFields(fields: any[]): any[] {
    return fields.map((field, index) => {
      const baseField: any = {
        id: `field_${field.name}_${index}`,
        name: field.name,
        type: field.type,
        required: field.required || false,
        presentable: false,
        system: false,
        hidden: false,
      };

      switch (field.type) {
        case 'text':
          baseField.min = 0;
          baseField.max = 0;
          baseField.pattern = '';
          baseField.autogeneratePattern = '';
          baseField.primaryKey = false;
          break;
        case 'editor':
          baseField.convertURLs = false;
          baseField.maxSize = 0;
          break;
        case 'number':
          baseField.min = field.options?.min ?? null;
          baseField.max = field.options?.max ?? null;
          baseField.noDecimal = false;
          break;
        case 'bool':
          break;
        case 'date':
          baseField.min = '';
          baseField.max = '';
          break;
        case 'select':
          baseField.values = field.options?.values || [];
          baseField.maxSelect = 1;
          break;
        case 'json':
          baseField.maxSize = 0;
          break;
        case 'url':
          baseField.exceptDomains = null;
          baseField.onlyDomains = null;
          break;
      }

      return baseField;
    });
  }

  // Update each collection
  for (const [key, schema] of Object.entries(collections)) {
    try {
      console.log(`📦 Updating collection: ${schema.name}`);

      // Get existing collection
      const existingCollections = await pb.collections.getFullList();
      const existing = existingCollections.find(c => c.name === schema.name);

      if (!existing) {
        console.log(`  ⚠️  Collection ${schema.name} not found, skipping`);
        continue;
      }

      // Get existing fields (keep system fields like id, created, updated)
      const systemFields = (existing.fields || []).filter((f: any) => f.system);
      const newFields = convertToPocketBaseFields(schema.fields);

      // Merge fields
      const mergedFields = [...systemFields, ...newFields];

      // Update collection
      await pb.collections.update(existing.id, {
        fields: mergedFields,
      });

      console.log(`  ✅ Updated with ${newFields.length} fields`);
    } catch (error: any) {
      console.error(`  ❌ Failed to update ${schema.name}:`, error.message);
    }
  }

  console.log('\n✅ Migration completed!');

  // Create default project
  console.log('\n📁 Creating default project...');
  try {
    const existing = await pb.collection('projects').getFirstListItem('name="PocketBase"').catch(() => null);
    if (!existing) {
      const project = await pb.collection('projects').create({
        name: 'PocketBase',
        description: 'PocketBase Brain MCP Server - Second Brain for Claude Code',
        tech_stack: ['TypeScript', 'PocketBase', 'MCP', 'OpenAI'],
        status: 'active',
      });
      console.log(`✅ Created project: ${project.id}`);
    } else {
      console.log('ℹ️  Project "PocketBase" already exists');
    }
  } catch (error: any) {
    console.error('❌ Failed to create project:', error.message);
  }
}

main().catch(console.error);
