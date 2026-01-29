# Pocket MCP

A Model Context Protocol (MCP) server that turns [PocketBase](https://pocketbase.io/) into a "Second Brain" for [Claude Code](https://claude.ai/claude-code). Capture knowledge, decisions, bugs, patterns, and more - then recall them with semantic search.

## Features

- **Session Management** - Track work sessions with goals and outcomes
- **Task Tracking** - Manage project tasks with priorities, features, and progress stats
- **Knowledge Capture** - Save observations, decisions, bugs, code snippets
- **Workflow Automation** - Save and reuse repeatable procedures
- **Semantic Search** - AI-powered search using OpenAI embeddings
- **Project Context** - Quick access to project tech stack, decisions, patterns
- **Knowledge Graph** - Link related entities together
- **Retrospectives** - Generate insights from past sessions

> **New to the tools?** Check out the [Complete Usage Guide](docs/USAGE_GUIDE.md) for detailed workflows and best practices.

---

## Quick Start

### Option 1: Claude Code Plugin (Recommended)

```bash
# 1. Add marketplace
/plugin marketplace add JaoChai/pocket-mcp

# 2. Install plugin
/plugin install pocket-mcp@jaochai-plugins

# 3. Configure (will prompt for credentials)
```

### Option 2: Manual MCP Setup

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "pocket-mcp": {
      "command": "npx",
      "args": ["-y", "github:JaoChai/pocket-mcp"],
      "env": {
        "POCKETBASE_URL": "https://your-pocketbase-instance.com",
        "POCKETBASE_EMAIL": "admin@example.com",
        "POCKETBASE_PASSWORD": "your-password",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

Then enable in `.claude/settings.local.json`:

```json
{
  "enableAllProjectMcpServers": true
}
```

### Setup PocketBase

Deploy PocketBase (self-host or use [PocketHost](https://pockethost.io/), [Elestio](https://elest.io/), etc.)

Then run the setup script to create collections:

```bash
git clone https://github.com/JaoChai/pocket-mcp.git
cd pocket-mcp
npm install

# Set environment variables
export POCKETBASE_URL="https://your-instance.com"
export POCKETBASE_EMAIL="admin@example.com"
export POCKETBASE_PASSWORD="your-password"

# Run setup
npm run setup-collections
```

---

## Quick Reference: When to Use Which Tool

| Event | Tools to Use |
|-------|-------------|
| Start your day | `get_pending_outcomes`, `get_lessons`, `get_project_context` |
| Start new work | `create_session`, `create_task`, `update_task(in_progress)` |
| Need to find info | `search_knowledge`, `semantic_search`, `find_workflow` |
| Made a decision | `capture_decision` |
| Fixed a bug | `capture_bug` |
| Learned something new | `capture_observation` |
| Wrote reusable code | `save_snippet` |
| Finished work | `update_task(done)`, `generate_retrospective`, `end_session` |

> See [Complete Usage Guide](docs/USAGE_GUIDE.md) for detailed workflows.

---

## Available Tools (28 tools)

### Session Tools (3)
Manage work sessions for tracking activities.

| Tool | Description |
|------|-------------|
| `create_session` | Start a new work session with project and goal |
| `end_session` | End session with outcome (success/partial/failed) and summary |
| `get_current_session` | Get active session info |

### Task Tools (5)
Track project tasks with priorities and progress.

| Tool | Description |
|------|-------------|
| `create_task` | Create a new task with title, description, feature, priority |
| `update_task` | Update task status, priority, or details |
| `get_tasks` | List tasks with filters (project, status, feature, priority) |
| `get_project_progress` | Get completion stats, tasks by feature, next-up items |
| `delete_task` | Delete or cancel a task (soft delete by default) |

**Task Statuses:** `pending`, `in_progress`, `done`, `blocked`, `cancelled`

**Priorities:** `critical`, `high`, `medium`, `low`

### Capture Tools (4)
Save knowledge and learnings.

| Tool | Description |
|------|-------------|
| `capture_observation` | Save discoveries, patterns, insights, notes |
| `capture_decision` | Log decisions with context, options, and rationale |
| `capture_bug` | Record bugs with error message, solution, prevention |
| `save_snippet` | Store reusable code snippets with language and use cases |

### Outcome Tracking Tools (2)
Track decision outcomes for learning.

| Tool | Description |
|------|-------------|
| `record_decision_outcome` | Record what happened after a decision was made |
| `get_pending_outcomes` | Find decisions older than N days that need outcome review |

### Workflow Tools (4)
Save and reuse repeatable procedures.

| Tool | Description |
|------|-------------|
| `save_workflow` | Save a workflow with trigger, steps, and success criteria |
| `find_workflow` | Find workflow by describing what you want to do |
| `get_workflow` | Get full details including all steps |
| `record_workflow_execution` | Record that a workflow was executed |

### Search Tools (2)
Find knowledge in your Second Brain.

| Tool | Description |
|------|-------------|
| `search_knowledge` | Full-text search across all collections |
| `semantic_search` | AI-powered similarity search using embeddings |

### Context Tools (3)
Quick access to project and user context.

| Tool | Description |
|------|-------------|
| `get_project_context` | Get tech stack, recent decisions, bugs, patterns |
| `get_preferences` | Get user preferences (coding style, tools, workflow) |
| `save_preference` | Save a user preference with strength level |

### Relation Tools (3)
Build a knowledge graph.

| Tool | Description |
|------|-------------|
| `link_entities` | Create relationship between two entities |
| `get_relations` | Get all relationships for an entity |
| `suggest_relations` | Auto-suggest relations based on shared tags |

**Relation Types:** `uses`, `caused`, `fixed_by`, `led_to`, `related_to`, `depends_on`, `inspired_by`

### Reflection Tools (2)
Learn from past experiences.

| Tool | Description |
|------|-------------|
| `generate_retrospective` | Create retrospective with lessons and action items |
| `get_lessons` | Get lessons from past retrospectives |

---

## PocketBase Collections (14)

The setup script creates these collections:

| Collection | Description |
|------------|-------------|
| `projects` | Project information and tech stack |
| `sessions` | Work session tracking |
| `tasks` | Task tracking with priorities and features |
| `areas` | PARA method areas of responsibility |
| `observations` | Discoveries, patterns, insights, notes |
| `decisions` | Decision logs with rationale and outcomes |
| `bugs_and_fixes` | Error tracking and solutions |
| `patterns` | Design and architecture patterns |
| `code_snippets` | Reusable code snippets |
| `workflows` | Saved procedures and workflows |
| `retrospectives` | Session reviews and lessons |
| `resources` | Reference materials |
| `relationships` | Knowledge graph edges |
| `user_preferences` | User preferences |
| `embeddings` | Vector embeddings for semantic search |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POCKETBASE_URL` | Yes | PocketBase instance URL |
| `POCKETBASE_EMAIL` | Yes | Admin email for authentication |
| `POCKETBASE_PASSWORD` | Yes | Admin password |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings |
| `LOG_LEVEL` | No | Log level (default: `info`) |

---

## Usage Examples

### Session Management

```
# Start a session
Claude, start a session for "implementing user authentication"

# End with summary
Claude, end the session - we completed JWT auth and refresh tokens
```

### Task Tracking

```
# Create tasks
Claude, create a task "Add password reset flow" with high priority

# Check progress
Claude, show me the project progress

# Update status
Claude, mark the authentication task as done
```

### Knowledge Capture

```
# Capture observation
Claude, save this: "React Query handles cache invalidation automatically in mutation's onSuccess"

# Capture decision
Claude, record that we chose JWT over sessions because of scalability needs

# Capture bug fix
Claude, save this bug: TypeError on undefined - fixed by adding optional chaining
```

### Workflow Automation

```
# Save a workflow
Claude, save this deployment workflow:
1. Run tests
2. Build the project
3. Deploy to staging
4. Run smoke tests

# Find a workflow
Claude, how do I deploy to production?

# Record execution
Claude, I just ran the deployment workflow successfully
```

### Search Knowledge

```
# Full-text search
Claude, search for "authentication patterns"

# Semantic search
Claude, find knowledge related to "handling API errors gracefully"
```

### Project Context

```
# Get project context
Claude, what do you know about this project?

# Get preferences
Claude, what are my coding preferences?
```

### Retrospectives

```
# Generate retrospective
Claude, generate a retrospective for today's session

# Get lessons
Claude, show me lessons from past sessions
```

---

## Installation Options

### Option 1: Plugin (Easiest)

```bash
/plugin marketplace add JaoChai/pocket-mcp
/plugin install pocket-mcp@jaochai-plugins
```

### Option 2: npx from GitHub

```json
{
  "mcpServers": {
    "pocket-mcp": {
      "command": "npx",
      "args": ["-y", "github:JaoChai/pocket-mcp"],
      "env": { ... }
    }
  }
}
```

### Option 3: From Source

```bash
git clone https://github.com/JaoChai/pocket-mcp.git
cd pocket-mcp
npm install
npm run build
```

---

## Development

```bash
npm install           # Install dependencies
npm run build         # Build TypeScript
npm run dev           # Development mode with tsx
npm run setup-collections  # Setup PocketBase collections
npm test              # Run tests
```

---

## Architecture

```
pocket-mcp/
├── src/
│   ├── index.ts          # Entry point (bin)
│   ├── server.ts         # MCP server with 28 tools
│   ├── config.ts         # Config validation (Zod)
│   ├── pocketbase/
│   │   ├── client.ts     # PocketBase client
│   │   └── collections.ts # Collection schemas
│   ├── tools/
│   │   ├── session.ts    # Session management
│   │   ├── tasks.ts      # Task tracking
│   │   ├── capture.ts    # Knowledge capture
│   │   ├── workflow.ts   # Workflow automation
│   │   ├── search.ts     # Full-text & semantic search
│   │   ├── context.ts    # Project context & preferences
│   │   ├── relate.ts     # Knowledge graph relations
│   │   └── reflect.ts    # Retrospectives & lessons
│   └── utils/
│       ├── embeddings.ts # OpenAI embeddings
│       └── logger.ts     # Logging (stderr for MCP)
├── scripts/
│   └── setup-collections.ts
└── dist/                 # Compiled output
```

---

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Credits

Built with:
- [Model Context Protocol SDK](https://github.com/anthropics/model-context-protocol)
- [PocketBase](https://pocketbase.io/)
- [OpenAI API](https://platform.openai.com/)
