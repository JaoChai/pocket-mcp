#!/usr/bin/env node
import 'dotenv/config';
import PocketBase from 'pocketbase';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const pb = new PocketBase(process.env.POCKETBASE_URL);

  await pb.collection('_superusers').authWithPassword(
    process.env.POCKETBASE_EMAIL,
    process.env.POCKETBASE_PASSWORD
  );
  console.log('✅ Authenticated');

  // Create query embedding
  const query = 'migration pocketbase mcp';
  console.log(`\n🔍 Query: "${query}"`);

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const queryEmbedding = response.data[0].embedding;
    console.log(`✅ Created query embedding (${queryEmbedding.length} dimensions)`);

    // Get embeddings from PocketBase
    const sourceTypes = ['observation', 'decision', 'bug', 'pattern', 'snippet'];
    const typeFilter = sourceTypes.map(t => `source_type="${t}"`).join(' || ');
    console.log(`\n📋 Filter: ${typeFilter}`);

    // Get all embeddings (filter in code to avoid PocketBase OR filter issues)
    const embeddings = await pb.collection('embeddings').getFullList();
    console.log(`✅ Found ${embeddings.length} embeddings`);

    // Calculate similarities
    const results = [];
    for (const emb of embeddings) {
      if (!emb.vector || !Array.isArray(emb.vector) || emb.vector.length === 0) {
        console.log(`⚠️  Skipping ${emb.id} - invalid vector`);
        continue;
      }

      const similarity = cosineSimilarity(queryEmbedding, emb.vector);
      results.push({
        id: emb.id,
        sourceType: emb.source_type,
        sourceId: emb.source_id,
        similarity,
      });
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    console.log('\n📊 Results (sorted by similarity):');
    for (const r of results) {
      console.log(`  ${r.similarity.toFixed(4)} | ${r.sourceType} | ${r.sourceId}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

main().catch(console.error);
