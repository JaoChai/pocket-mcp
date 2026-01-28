#!/usr/bin/env node
/**
 * Session Start Hook (Simplified)
 * - Injects recent knowledge context into Claude
 */

const {
  getRecords,
  readStdin,
  log,
  getProjectName,
} = require('./lib/pocketbase-client.cjs');

async function main() {
  try {
    const input = await readStdin();
    const projectName = getProjectName(input.cwd);

    log('SessionStart:', projectName);

    // Get recent observations
    let observations = { items: [] };
    try {
      observations = await getRecords('observations', {
        perPage: 5,
      });
    } catch (e) {
      log('Observations fetch failed:', e.message);
    }

    // Build context summary for Claude
    let context = `## Second Brain Context for ${projectName}\n\n`;

    if (observations.items?.length > 0) {
      context += '### Recent Knowledge\n';
      observations.items.forEach(o => {
        context += `- **${o.title || o.type}**: ${o.content?.substring(0, 100) || ''}...\n`;
      });
      context += '\n';
      context += '---\nUse `/recall` to search for more knowledge.\n';
    } else {
      context += 'No previous knowledge found. Use `/learn` to capture knowledge.\n';
    }

    // Output context to stdout (injected into Claude)
    console.log(context);
    process.exit(0);

  } catch (error) {
    log('Error:', error.message);
    // Don't block session on error
    console.log('## Second Brain\nReady to capture knowledge. Use `/learn` to save knowledge.');
    process.exit(0);
  }
}

main();
