/**
 * Script to setup PocketBase collections for Second Brain MCP
 * Uses native fetch instead of SDK for better compatibility
 */

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

interface AuthResponse {
  token: string;
  record: { id: string; email: string };
}

interface CollectionRecord {
  id: string;
  name: string;
  schema?: Array<{ name: string }>;
  fields?: Array<{ name: string }>;
  indexes?: string[];
}

async function authenticate(): Promise<string> {
  console.log('Authenticating with PocketBase...');

  const response = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: POCKETBASE_EMAIL,
      password: POCKETBASE_PASSWORD,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Authentication failed: ${JSON.stringify(error)}`);
  }

  const data: AuthResponse = await response.json();
  console.log('Authenticated successfully as:', data.record.email);
  return data.token;
}

async function getCollections(token: string): Promise<CollectionRecord[]> {
  const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
    headers: { Authorization: token },
  });

  if (!response.ok) {
    throw new Error('Failed to get collections');
  }

  const data = await response.json();
  return data.items || data;
}

async function createCollection(token: string, collection: Record<string, unknown>): Promise<CollectionRecord> {
  const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(collection),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create collection: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function updateCollection(token: string, id: string, updates: Record<string, unknown>): Promise<CollectionRecord> {
  const response = await fetch(`${POCKETBASE_URL}/api/collections/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update collection: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function getCollection(token: string, id: string): Promise<CollectionRecord> {
  const response = await fetch(`${POCKETBASE_URL}/api/collections/${id}`, {
    headers: { Authorization: token },
  });

  if (!response.ok) {
    throw new Error('Failed to get collection');
  }

  return response.json();
}

async function setupCollections() {
  const token = await authenticate();

  // Get existing collections
  const existingCollections = await getCollections(token);
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
      const created = await createCollection(token, {
        name: name,
        type: collectionDef.type,
        schema: schemaWithoutRelations,
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
    const currentCollection = await getCollection(token, collectionId);
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

        await updateCollection(token, collectionId, { schema: newSchema });
        console.log(`[ADD] Added relation field '${field.name}' to '${name}' -> '${targetCollectionName}'`);
      } catch (error) {
        console.error(`[ERROR] Failed to add relation '${field.name}' to '${name}':`, error);
      }
    }
  }

  console.log('\n--- Setup complete! ---\n');
  console.log('Collections created/found:', Object.keys(collectionIds).length);
}

setupCollections().catch(console.error);
