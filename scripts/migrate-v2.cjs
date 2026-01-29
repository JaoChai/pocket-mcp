#!/usr/bin/env node
/**
 * Migration Script v2: Add Outcome Tracking + Workflows + Enhanced Search
 *
 * This script:
 * 1. Creates 'workflows' collection
 * 2. Adds 'outcome_recorded_at' and 'outcome_notes' to 'decisions' collection
 * 3. Updates 'embeddings' source_type to include 'workflow'
 * 4. Updates 'relationships' source_type/target_type to include 'workflow'
 */

const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL;
const POCKETBASE_EMAIL = process.env.POCKETBASE_EMAIL;
const POCKETBASE_PASSWORD = process.env.POCKETBASE_PASSWORD;

if (!POCKETBASE_URL || !POCKETBASE_EMAIL || !POCKETBASE_PASSWORD) {
  console.error('❌ Missing environment variables. Please set POCKETBASE_URL, POCKETBASE_EMAIL, POCKETBASE_PASSWORD');
  process.exit(1);
}

const baseUrl = new URL(POCKETBASE_URL);

// HTTP request helper
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: baseUrl.hostname,
      port: baseUrl.port || 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = token;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, body: json });
          } else {
            resolve(json);
          }
        } catch (e) {
          reject({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function authenticate() {
  console.log('🔐 Authenticating with PocketBase...');

  // Try new API first (PocketBase 0.23+), then fallback to old API
  try {
    const result = await request('POST', '/api/collections/_superusers/auth-with-password', {
      identity: POCKETBASE_EMAIL,
      password: POCKETBASE_PASSWORD,
    });
    console.log('✅ Authenticated successfully (superusers)');
    return result.token;
  } catch (e) {
    // Fallback to old admin auth endpoint
    const result = await request('POST', '/api/admins/auth-with-password', {
      identity: POCKETBASE_EMAIL,
      password: POCKETBASE_PASSWORD,
    });
    console.log('✅ Authenticated successfully (admins)');
    return result.token;
  }
}

async function getCollections(token) {
  const result = await request('GET', '/api/collections', null, token);
  return result.items || result;
}

async function createCollection(token, collectionData) {
  return await request('POST', '/api/collections', collectionData, token);
}

async function updateCollection(token, collectionId, updates) {
  return await request('PATCH', `/api/collections/${collectionId}`, updates, token);
}

async function migrate() {
  try {
    const token = await authenticate();
    const collections = await getCollections(token);

    // Create map of existing collections
    const collectionMap = {};
    for (const col of collections) {
      collectionMap[col.name] = col;
    }

    // 1. Create workflows collection if not exists
    console.log('\n📦 Checking workflows collection...');
    if (!collectionMap['workflows']) {
      console.log('   Creating workflows collection...');
      await createCollection(token, {
        name: 'workflows',
        type: 'base',
        schema: [
          { name: 'project', type: 'relation', options: { collectionId: collectionMap['projects']?.id, maxSelect: 1 } },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'trigger', type: 'text', required: true },
          { name: 'steps', type: 'json', required: true },
          { name: 'tools_used', type: 'json' },
          { name: 'estimated_duration', type: 'number' },
          { name: 'success_criteria', type: 'text' },
          { name: 'tags', type: 'json' },
          { name: 'execution_count', type: 'number' },
          { name: 'last_executed', type: 'date' },
          { name: 'avg_duration', type: 'number' },
        ],
      });
      console.log('   ✅ workflows collection created');
    } else {
      console.log('   ℹ️  workflows collection already exists');
    }

    // 2. Update decisions collection - add outcome_recorded_at and outcome_notes
    console.log('\n📦 Checking decisions collection...');
    const decisionsCol = collectionMap['decisions'];
    if (decisionsCol) {
      const schema = decisionsCol.schema || decisionsCol.fields || [];
      const existingFields = schema.map(f => f.name);
      const newFields = [];

      if (!existingFields.includes('outcome_recorded_at')) {
        newFields.push({ name: 'outcome_recorded_at', type: 'date' });
      }
      if (!existingFields.includes('outcome_notes')) {
        newFields.push({ name: 'outcome_notes', type: 'text' });
      }

      if (newFields.length > 0) {
        console.log(`   Adding fields: ${newFields.map(f => f.name).join(', ')}...`);
        await updateCollection(token, decisionsCol.id, {
          schema: [...schema, ...newFields],
        });
        console.log('   ✅ decisions collection updated');
      } else {
        console.log('   ℹ️  decisions already has required fields');
      }
    } else {
      console.log('   ⚠️  decisions collection not found');
    }

    // 3. Update embeddings collection - add 'workflow' to source_type
    console.log('\n📦 Checking embeddings collection...');
    const embeddingsCol = collectionMap['embeddings'];
    if (embeddingsCol) {
      const schema = embeddingsCol.schema || embeddingsCol.fields || [];
      const sourceTypeField = schema.find(f => f.name === 'source_type');
      const values = sourceTypeField?.options?.values || [];
      if (sourceTypeField && !values.includes('workflow')) {
        console.log('   Adding workflow to source_type...');
        const updatedSchema = schema.map(f => {
          if (f.name === 'source_type') {
            return {
              ...f,
              options: {
                ...f.options,
                values: [...(f.options?.values || []), 'workflow'],
              },
            };
          }
          return f;
        });
        await updateCollection(token, embeddingsCol.id, { schema: updatedSchema });
        console.log('   ✅ embeddings collection updated');
      } else {
        console.log('   ℹ️  embeddings already has workflow in source_type');
      }
    } else {
      console.log('   ⚠️  embeddings collection not found');
    }

    // 4. Update relationships collection - add 'workflow' to source_type and target_type
    console.log('\n📦 Checking relationships collection...');
    const relationshipsCol = collectionMap['relationships'];
    if (relationshipsCol) {
      const schema = relationshipsCol.schema || relationshipsCol.fields || [];
      let needsUpdate = false;
      const updatedSchema = schema.map(f => {
        const values = f.options?.values || [];
        if ((f.name === 'source_type' || f.name === 'target_type') && !values.includes('workflow')) {
          needsUpdate = true;
          return {
            ...f,
            options: {
              ...f.options,
              values: [...values, 'workflow'],
            },
          };
        }
        return f;
      });

      if (needsUpdate) {
        console.log('   Adding workflow to source_type and target_type...');
        await updateCollection(token, relationshipsCol.id, { schema: updatedSchema });
        console.log('   ✅ relationships collection updated');
      } else {
        console.log('   ℹ️  relationships already has workflow');
      }
    } else {
      console.log('   ⚠️  relationships collection not found');
    }

    console.log('\n🎉 Migration completed successfully!\n');
    console.log('New tools available:');
    console.log('  - record_decision_outcome: Track outcomes of past decisions');
    console.log('  - get_pending_outcomes: Find decisions needing outcome tracking');
    console.log('  - save_workflow: Save reusable workflows');
    console.log('  - find_workflow: Search workflows semantically');
    console.log('  - get_workflow: Get workflow details');
    console.log('  - record_workflow_execution: Track workflow usage');
    console.log('\nEnhanced semantic_search now supports:');
    console.log('  - recency_weight: Prioritize recent knowledge');
    console.log('  - importance_weight: Prioritize important knowledge');
    console.log('  - workflow collection in search');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
