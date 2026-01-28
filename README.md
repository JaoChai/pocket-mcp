# Pocket MCP

A Model Context Protocol (MCP) server that turns [PocketBase](https://pocketbase.io/) into a "Second Brain" for [Claude Code](https://claude.ai/claude-code). Capture knowledge, decisions, bugs, patterns, and more - then recall them with semantic search.

## Features

- **Session Management** - Track work sessions with goals and outcomes
- **Knowledge Capture** - Save observations, decisions, bugs, code snippets
- **Semantic Search** - AI-powered search using OpenAI embeddings
- **Project Context** - Quick access to project tech stack, decisions, patterns
- **Knowledge Graph** - Link related entities together
- **Retrospectives** - Generate insights from past sessions

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

## Available Tools (14 tools)

### Session Tools
| Tool | Description |
|------|-------------|
| `create_session` | Start a new work session |
| `end_session` | End session with outcome and summary |
| `get_current_session` | Get active session info |

### Capture Tools
| Tool | Description |
|------|-------------|
| `capture_observation` | Save discoveries, patterns, insights |
| `capture_decision` | Log decisions with context and rationale |
| `capture_bug` | Record bugs with solution and prevention |
| `save_snippet` | Store reusable code snippets |

### Search Tools
| Tool | Description |
|------|-------------|
| `search_knowledge` | Full-text search across collections |
| `semantic_search` | AI-powered semantic search |

### Context Tools
| Tool | Description |
|------|-------------|
| `get_project_context` | Get project tech stack, decisions, bugs |
| `get_preferences` | Retrieve user preferences |
| `save_preference` | Save user preferences |

### Relation Tools
| Tool | Description |
|------|-------------|
| `link_entities` | Create relationships between entities |
| `get_relations` | Get entity relationships |
| `suggest_relations` | Auto-suggest relationships |

### Reflection Tools
| Tool | Description |
|------|-------------|
| `generate_retrospective` | Create retrospective with analysis |
| `get_lessons` | Get lessons from past retrospectives |

## PocketBase Collections

The setup script creates 13 collections:

| Collection | Description |
|------------|-------------|
| `projects` | Project information |
| `sessions` | Work session tracking |
| `areas` | PARA method areas |
| `observations` | Discoveries, patterns, insights |
| `decisions` | Decision logs with rationale |
| `bugs_and_fixes` | Error tracking and solutions |
| `patterns` | Design/architecture patterns |
| `code_snippets` | Reusable code |
| `retrospectives` | Session reviews |
| `resources` | Reference materials |
| `relationships` | Knowledge graph edges |
| `user_preferences` | User preferences |
| `embeddings` | Vector embeddings for semantic search |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POCKETBASE_URL` | Yes | PocketBase instance URL |
| `POCKETBASE_EMAIL` | Yes | Admin email for authentication |
| `POCKETBASE_PASSWORD` | Yes | Admin password |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings |
| `LOG_LEVEL` | No | Log level (default: `info`) |

## Usage Examples

### Start a Session
```
Claude, start a new session for working on the authentication feature
```

### Capture Knowledge
```
Claude, save this observation: "React Query handles cache invalidation automatically when using mutation's onSuccess callback"
```

### Search Knowledge
```
Claude, search my knowledge base for "authentication patterns"
```

### Get Project Context
```
Claude, what do you know about this project?
```

### Generate Retrospective
```
Claude, generate a retrospective for today's session
```

## Built-in Skills (Slash Commands)

When installed as a plugin, these skills are available automatically:

| Skill | Description |
|-------|-------------|
| `/pocket-mcp:learn` | Capture knowledge (observations, decisions, bugs, snippets) |
| `/pocket-mcp:recall` | Search and retrieve knowledge |
| `/pocket-mcp:context` | Load project context |
| `/pocket-mcp:reflect` | Generate retrospective and insights |

## Development

```bash
npm install     # Install dependencies
npm run build   # Build TypeScript
npm run dev     # Development mode
npm test        # Run tests
```

## Architecture

```
pocket-mcp/
├── src/
│   ├── index.ts          # Entry point (bin)
│   ├── server.ts         # MCP server registration
│   ├── config.ts         # Config validation (Zod)
│   ├── pocketbase/       # PocketBase client & schemas
│   ├── tools/            # Tool implementations
│   └── utils/            # Embeddings & logger
├── scripts/
│   └── setup-collections.ts
└── dist/                 # Compiled output
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Credits

Built with:
- [Model Context Protocol SDK](https://github.com/anthropics/model-context-protocol)
- [PocketBase](https://pocketbase.io/)
- [OpenAI API](https://platform.openai.com/)
