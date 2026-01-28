#!/usr/bin/env node
/**
 * Stop Hook
 * - Ends the current session
 * - Saves session summary
 */

const {
  updateRecord,
  getRecords,
  readStdin,
  log,
  getProjectName,
} = require('./lib/pocketbase-client');

const fs = require('fs');
const path = require('path');
const SESSION_FILE = path.join(process.env.CLAUDE_PLUGIN_ROOT || __dirname, '.current-session');

function getCurrentSession() {
  try {
    return fs.readFileSync(SESSION_FILE, 'utf8').trim();
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    fs.unlinkSync(SESSION_FILE);
  } catch {}
}

async function main() {
  try {
    const input = await readStdin();
    const sessionId = getCurrentSession();
    const projectName = getProjectName(input.cwd);

    if (!sessionId) {
      log('No active session');
      process.exit(0);
    }

    log('Stop:', projectName, sessionId);

    // Get observations count for this session
    const observations = await getRecords('observations', {
      filter: `session="${sessionId}"`,
      perPage: 100,
    });

    const observationCount = observations.items?.length || 0;

    // Build summary
    const categories = {};
    (observations.items || []).forEach(o => {
      const cat = o.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    const summary = Object.entries(categories)
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ') || 'No observations';

    // End session
    await updateRecord('sessions', sessionId, {
      ended_at: new Date().toISOString(),
      status: 'completed',
      outcome: observationCount > 0 ? 'completed' : 'minimal',
      summary: `Auto-captured ${observationCount} observations. ${summary}`,
    });

    clearSession();

    log('Session ended:', observationCount, 'observations');
    process.exit(0);

  } catch (error) {
    log('Error:', error.message);
    clearSession();
    process.exit(0);
  }
}

main();
