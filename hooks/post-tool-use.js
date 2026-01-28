#!/usr/bin/env node
/**
 * Post Tool Use Hook
 * - Auto-captures observations from Edit, Write, Bash
 * - Detects bug fixes and error patterns
 */

const {
  createRecord,
  readStdin,
  log,
  getProjectName,
} = require('./lib/pocketbase-client');

const fs = require('fs');
const path = require('path');
const SESSION_FILE = path.join(process.env.CLAUDE_PLUGIN_ROOT || __dirname, '.current-session');

// Track recent errors for bug detection
const ERROR_FILE = path.join(process.env.CLAUDE_PLUGIN_ROOT || __dirname, '.recent-error');

function getCurrentSession() {
  try {
    return fs.readFileSync(SESSION_FILE, 'utf8').trim();
  } catch {
    return null;
  }
}

function getRecentError() {
  try {
    const data = fs.readFileSync(ERROR_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveRecentError(error) {
  fs.writeFileSync(ERROR_FILE, JSON.stringify(error));
}

function clearRecentError() {
  try {
    fs.unlinkSync(ERROR_FILE);
  } catch {}
}

async function handleEdit(input, sessionId, projectName) {
  const { file_path, old_string, new_string } = input.tool_input || {};

  if (!file_path) return;

  // Skip non-significant changes
  if (old_string === new_string) return;
  if (!old_string && !new_string) return;

  const fileName = path.basename(file_path);
  const ext = path.extname(file_path);

  // Create observation
  await createRecord('observations', {
    project: projectName,
    session: sessionId,
    type: 'note',
    category: 'code_change',
    title: `Edit: ${fileName}`,
    content: `Changed ${fileName}\n\nFile: ${file_path}\nOld: ${old_string?.substring(0, 100) || '(new content)'}...\nNew: ${new_string?.substring(0, 100) || '(removed)'}...`,
    files: [file_path],
    tags: ['auto-captured', 'edit', ext.replace('.', '')],
    importance: 3,
  });

  log('Captured edit:', fileName);
}

async function handleWrite(input, sessionId, projectName) {
  const { file_path, content } = input.tool_input || {};

  if (!file_path) return;

  const fileName = path.basename(file_path);
  const ext = path.extname(file_path);

  await createRecord('observations', {
    project: projectName,
    session: sessionId,
    type: 'note',
    category: 'file_created',
    title: `Created: ${fileName}`,
    content: `Created new file: ${file_path}\n\nContent preview:\n${content?.substring(0, 200) || ''}...`,
    files: [file_path],
    tags: ['auto-captured', 'write', ext.replace('.', '')],
    importance: 3,
  });

  log('Captured write:', fileName);
}

async function handleBash(input, sessionId, projectName) {
  const { command, description } = input.tool_input || {};
  const response = input.tool_response || {};

  if (!command) return;

  // Check for errors
  const isError = response.error || response.exitCode !== 0;
  const output = response.output || response.stdout || '';
  const errorOutput = response.stderr || '';

  // Detect common error patterns
  const errorPatterns = [
    /error/i,
    /failed/i,
    /exception/i,
    /not found/i,
    /cannot/i,
    /undefined/i,
    /null/i,
  ];

  const hasError = isError || errorPatterns.some(p =>
    p.test(output) || p.test(errorOutput)
  );

  if (hasError) {
    // Save error for potential bug fix detection
    saveRecentError({
      command,
      error: errorOutput || output,
      timestamp: Date.now(),
    });

    await createRecord('observations', {
      project: projectName,
      session: sessionId,
      type: 'note',
      category: 'error',
      title: `Error: ${command.substring(0, 50)}`,
      content: `Command: ${command}\n\nError:\n${(errorOutput || output).substring(0, 500)}`,
      tags: ['auto-captured', 'error', 'bash'],
      importance: 4,
    });

    log('Captured error:', command.substring(0, 30));
    return;
  }

  // Check if this is a fix for recent error
  const recentError = getRecentError();
  if (recentError && Date.now() - recentError.timestamp < 300000) { // 5 minutes
    // Successful command after error = potential fix
    const isTestOrBuild = /test|build|run|start|npm|yarn|pnpm/i.test(command);

    if (isTestOrBuild) {
      await createRecord('bugs_and_fixes', {
        project: projectName,
        session: sessionId,
        error_type: 'runtime_error',
        error_message: recentError.error.substring(0, 500),
        root_cause: 'Auto-detected from command sequence',
        solution: `Fixed by: ${command}`,
        prevention: 'Check error patterns before running',
        tags: ['auto-captured'],
      });

      log('Captured bug fix');
      clearRecentError();
      return;
    }
  }

  // Skip non-interesting commands
  const skipPatterns = [
    /^ls/,
    /^cd/,
    /^pwd/,
    /^cat/,
    /^echo/,
    /^head/,
    /^tail/,
    /^git status/,
    /^git diff/,
  ];

  if (skipPatterns.some(p => p.test(command))) {
    return;
  }

  // Capture interesting commands
  const interestingPatterns = [
    { pattern: /npm install|yarn add|pnpm add/i, category: 'dependency' },
    { pattern: /git commit|git push/i, category: 'git' },
    { pattern: /npm run|yarn |pnpm /i, category: 'script' },
    { pattern: /docker|kubectl/i, category: 'devops' },
  ];

  for (const { pattern, category } of interestingPatterns) {
    if (pattern.test(command)) {
      await createRecord('observations', {
        project: projectName,
        session: sessionId,
        type: 'note',
        category,
        title: `${category}: ${command.substring(0, 50)}`,
        content: `Command: ${command}\n\nOutput:\n${output.substring(0, 300)}`,
        tags: ['auto-captured', category, 'bash'],
        importance: 2,
      });

      log('Captured command:', category);
      return;
    }
  }
}

async function main() {
  try {
    const input = await readStdin();
    const toolName = input.tool_name;
    const projectName = getProjectName(input.cwd);
    const sessionId = getCurrentSession();

    if (!toolName) {
      process.exit(0);
    }

    log('PostToolUse:', toolName);

    switch (toolName) {
      case 'Edit':
        await handleEdit(input, sessionId, projectName);
        break;
      case 'Write':
        await handleWrite(input, sessionId, projectName);
        break;
      case 'Bash':
        await handleBash(input, sessionId, projectName);
        break;
      // Read is included in matcher but we don't capture it
    }

    process.exit(0);

  } catch (error) {
    log('Error:', error.message);
    process.exit(0); // Don't block on error
  }
}

main();
