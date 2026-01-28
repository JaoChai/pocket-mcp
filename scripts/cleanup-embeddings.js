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

  // Delete embeddings with null/empty vectors
  const toDelete = embeddings.filter(e => !e.vector || e.vector.length === 0);

  console.log(`Found ${toDelete.length} embeddings with null/empty vectors`);

  for (const e of toDelete) {
    await pb.collection('embeddings').delete(e.id);
    console.log(`Deleted: ${e.id}`);
  }

  console.log('Cleanup completed!');
}

main().catch(console.error);
