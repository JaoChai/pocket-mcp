#!/usr/bin/env node
import 'dotenv/config';
import PocketBase from 'pocketbase';

async function main() {
  const pb = new PocketBase(process.env.POCKETBASE_URL);

  await pb.collection('_superusers').authWithPassword(
    process.env.POCKETBASE_EMAIL,
    process.env.POCKETBASE_PASSWORD
  );

  const embeddings = await pb.collection('embeddings').getFullList();

  console.log('Total embeddings:', embeddings.length);
  console.log('\nEmbeddings:');
  embeddings.forEach(e => {
    console.log(`  ${e.id} | ${e.source_type} | ${e.source_id} | has_vector: ${!!e.vector && e.vector.length > 0}`);
  });

  // Check for null vectors
  const nullVectors = embeddings.filter(e => !e.vector || e.vector.length === 0);
  if (nullVectors.length > 0) {
    console.log('\nEmbeddings with null/empty vectors:', nullVectors.length);
    nullVectors.forEach(e => console.log(`  ${e.id}`));
  }
}

main().catch(console.error);
