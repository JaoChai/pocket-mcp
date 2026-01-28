#!/usr/bin/env node
/**
 * Session Start Hook
 * - Creates a new session in PocketBase
 * - Injects project context into Claude
 */

const {
  createRecord,
  getRecords,
  readStdin,
  log,
  getProjectName,
} = require('./lib/pocketbase-client');

// Store session ID for other hooks
const fs = require('fs');
const path = require('path');
const SESSION_FILE = path.join(process.env.CLAUDE_PLUGIN_ROOT || __dirname, '.current-session');

async function main() {
  try {
    const input = await readStdin();
    const projectName = getProjectName(input.cwd);

    log('SessionStart:', projectName);

    // Create new session
    const session = await createRecord('sessions', {
      project: projectName,
      started_at: new Date().toISOString(),
      goal: `Session in ${projectName}`,
      status: 'active',
    });

    // Save session ID for other hooks
    fs.writeFileSync(SESSION_FILE, session.id);

    // Get recent context for this project
    const [observations, decisions, bugs] = await Promise.all([
      getRecords('observations', {
        filter: `project="${projectName}"`,
        sort: '-created',
        perPage: 5,
      }),
      getRecords('decisions', {
        filter: `project="${projectName}"`,
        sort: '-created',
        perPage: 3,
      }),
      getRecords('bugs_and_fixes', {
        filter: `project="${projectName}"`,
        sort: '-created',
        perPage: 3,
      }),
    ]);

    // Build context summary for Claude
    let context = `## Second Brain Context for ${projectName}\n\n`;

    if (observations.items?.length > 0) {
      context += '### Recent Observations\n';
      observations.items.forEach(o => {
        context += `- **${o.title || o.type}**: ${o.content?.substring(0, 100) || ''}...\n`;
      });
      context += '\n';
    }

    if (decisions.items?.length > 0) {
      context += '### Recent Decisions\n';
      decisions.items.forEach(d => {
        context += `- **${d.title}**: ${d.chosen_option || ''}\n`;
      });
      context += '\n';
    }

    if (bugs.items?.length > 0) {
      context += '### Known Bugs/Fixes\n';
      bugs.items.forEach(b => {
        context += `- **${b.error_type}**: ${b.solution?.substring(0, 80) || ''}...\n`;
      });
      context += '\n';
    }

    if (context.includes('###')) {
      context += '\n---\nUse `/recall` to search for more knowledge.\n';
    } else {
      context = `## Second Brain: New project "${projectName}"\nNo previous knowledge found. Use \`/learn\` to capture knowledge.\n`;
    }

    // Output context to stdout (injected into Claude)
    console.log(context);
    process.exit(0);

  } catch (error) {
    log('Error:', error.message);
    // Don't block session on error
    process.exit(0);
  }
}

main();
