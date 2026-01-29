/**
 * Script to setup PocketBase collections for Second Brain MCP
 * Run with: npm run setup-collections
 */

import PocketBase from 'pocketbase';
import { COLLECTIONS } from '../src/pocketbase/collections.js';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'https://pocketbase-claudecode-u33070.vm.elestio.app';
const POCKETBASE_EMAIL = process.env.POCKETBASE_EMAIL || '';
const POCKETBASE_PASSWORD = process.env.POCKETBASE_PASSWORD || '';

interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  options?: Record<string, unknown>;
}

interface CollectionDef {
  name: string;
  type: string;
  schema: SchemaField[];
}

async function setupCollections() {
  const pb = new PocketBase(POCKETBASE_URL);

  console.log('Authenticating with PocketBase...');
  try {
    // PocketBase SDK 0.25+ requires object with identity/password
    const authResult = await pb.collection('_superusers').authWithPassword(
      POCKETBASE_EMAIL,
      POCKETBASE_PASSWORD,
      { fields: '*' }
    );
    console.log('Authenticated successfully as:', authResult.record.email);
  } catch (error) {
    console.error('Authentication failed:', error);
    process.exit(1);
  }

  // Get existing collections
  const existingCollections = await pb.collections.getFullList();
  const existingNames = new Set(existingCollections.map(c => c.name));

  // Collection creation order (respecting dependencies)
  const orderedCollections: (keyof typeof COLLECTIONS)[] = [
    'projects',
    'areas',
    'sessions',
    'observations',
    'decisions',
    'bugs_and_fixes',
    'patterns',
    'code_snippets',
    'retrospectives',
    'resources',
    'relationships',
    'user_preferences',
    'embeddings',
    'tasks',
  ];

  // First pass: Create collections without relations
  console.log('\n--- Creating collections (without relations) ---\n');

  const collectionIds: Record<string, string> = {};

  for (const collectionKey of orderedCollections) {
    const collectionDef = COLLECTIONS[collectionKey] as CollectionDef;
    const name = collectionDef.name;

    if (existingNames.has(name)) {
      console.log(`[SKIP] Collection '${name}' already exists`);
      const existing = existingCollections.find(c => c.name === name);
      if (existing) {
        collectionIds[name] = existing.id;
      }
      continue;
    }

    // Create collection without relation fields first
    const schemaWithoutRelations = collectionDef.schema
      .filter((field: SchemaField) => field.type !== 'relation')
      .map((field: SchemaField) => ({
        name: field.name,
        type: field.type,
        required: field.required || false,
        options: field.options || {},
      }));

    try {
      const created = await pb.collections.create({
        name: name,
        type: collectionDef.type,
        fields: schemaWithoutRelations,
      });
      console.log(`[CREATE] Collection '${name}' created with ID: ${created.id}`);
      collectionIds[name] = created.id;
    } catch (error) {
      console.error(`[ERROR] Failed to create collection '${name}':`, error);
    }
  }

  // Second pass: Add relation fields
  console.log('\n--- Adding relation fields ---\n');

  for (const collectionKey of orderedCollections) {
    const collectionDef = COLLECTIONS[collectionKey] as CollectionDef;
    const name = collectionDef.name;
    const collectionId = collectionIds[name];

    if (!collectionId) {
      console.log(`[SKIP] Collection '${name}' not found, skipping relations`);
      continue;
    }

    const relationFields = collectionDef.schema.filter((field: SchemaField) => field.type === 'relation');

    if (relationFields.length === 0) {
      continue;
    }

    // Get current collection
    const currentCollection = await pb.collections.getOne(collectionId);
    const currentSchema = currentCollection.schema || currentCollection.fields || [];
    const existingFieldNames = new Set(currentSchema.map((f: { name: string }) => f.name));

    for (const field of relationFields) {
      if (existingFieldNames.has(field.name)) {
        console.log(`[SKIP] Field '${field.name}' already exists in '${name}'`);
        continue;
      }

      const targetCollectionName = (field.options as { collectionId: string })?.collectionId;
      const targetCollectionId = collectionIds[targetCollectionName];

      if (!targetCollectionId) {
        console.log(`[SKIP] Target collection '${targetCollectionName}' not found for relation '${field.name}'`);
        continue;
      }

      try {
        const newSchema = [
          ...currentSchema,
          {
            name: field.name,
            type: 'relation',
            required: field.required || false,
            options: {
              collectionId: targetCollectionId,
              cascadeDelete: false,
              maxSelect: (field.options as { maxSelect?: number })?.maxSelect || null,
              displayFields: [],
            },
          },
        ];

        await pb.collections.update(collectionId, { schema: newSchema });
        console.log(`[ADD] Added relation field '${field.name}' to '${name}' -> '${targetCollectionName}'`);
      } catch (error) {
        console.error(`[ERROR] Failed to add relation '${field.name}' to '${name}':`, error);
      }
    }
  }

  // Create indexes for better search performance
  console.log('\n--- Creating indexes ---\n');

  const indexDefinitions = [
    { collection: 'observations', field: 'title' },
    { collection: 'observations', field: 'type' },
    { collection: 'decisions', field: 'title' },
    { collection: 'bugs_and_fixes', field: 'error_message' },
    { collection: 'patterns', field: 'name' },
    { collection: 'code_snippets', field: 'title' },
    { collection: 'relationships', field: 'source_id' },
    { collection: 'relationships', field: 'target_id' },
    { collection: 'embeddings', field: 'source_id' },
    // Tasks collection indexes
    { collection: 'tasks', field: 'project' },
    { collection: 'tasks', field: 'status' },
    { collection: 'tasks', field: 'priority' },
    { collection: 'tasks', field: 'feature' },
  ];

  for (const indexDef of indexDefinitions) {
    const collectionId = collectionIds[indexDef.collection];
    if (!collectionId) continue;

    try {
      const collection = await pb.collections.getOne(collectionId);
      const indexName = `idx_${indexDef.collection}_${indexDef.field}`;
      const existingIndexes = collection.indexes || [];

      if (existingIndexes.some((idx: string) => idx.includes(indexDef.field))) {
        console.log(`[SKIP] Index on '${indexDef.field}' already exists in '${indexDef.collection}'`);
        continue;
      }

      await pb.collections.update(collectionId, {
        indexes: [
          ...existingIndexes,
          `CREATE INDEX ${indexName} ON ${indexDef.collection} (${indexDef.field})`,
        ],
      });
      console.log(`[INDEX] Created index '${indexName}'`);
    } catch (error) {
      console.log(`[SKIP] Index creation for '${indexDef.collection}.${indexDef.field}' skipped`);
    }
  }

  console.log('\n--- Setup complete! ---\n');
  console.log('Collections created:', Object.keys(collectionIds).length);
}

setupCollections().catch(console.error);
