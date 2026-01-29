# PocketBase Brain MCP Server

## Project Overview
MCP Server สำหรับ Claude Code ที่เชื่อมต่อกับ PocketBase เพื่อสร้าง "Second Brain" - ระบบจดจำและเรียนรู้ความรู้ข้ามโปรเจค

## Tech Stack
- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **MCP SDK**: @modelcontextprotocol/sdk v1.7+
- **Database**: PocketBase (hosted on Elest.io)
- **Embeddings**: OpenAI text-embedding-3-small

## Project Structure
```
src/
├── index.ts           # Entry point
├── config.ts          # Configuration & env validation
├── server.ts          # MCP Server with 14 tools
├── pocketbase/
│   ├── client.ts      # PocketBase connection
│   └── collections.ts # Collection schemas
├── tools/
│   ├── capture.ts     # capture_observation, capture_decision, capture_bug, save_snippet
│   ├── search.ts      # search_knowledge, semantic_search
│   ├── context.ts     # get_project_context, get_preferences, save_preference
│   ├── relate.ts      # link_entities, get_relations, suggest_relations
│   └── reflect.ts     # generate_retrospective, get_lessons
└── utils/
    ├── embeddings.ts  # OpenAI embeddings & cosine similarity
    └── logger.ts      # Logging to stderr (STDIO protocol)
```

## Commands
- `npm run build` - Build TypeScript
- `npm run dev` - Run with tsx (development)
- `npm run setup-collections` - Setup PocketBase collections
- `npm test` - Run tests

## Important Notes
- **STDIO Protocol**: Never use console.log (stdout) - always use console.error (stderr)
- **Error Handling**: Return `{ isError: true, content: [...] }` for tool errors
- **Zod Validation**: All tool inputs are validated with Zod schemas

## PocketBase Collections
13 collections: projects, sessions, areas, observations, decisions, bugs_and_fixes, patterns, code_snippets, retrospectives, resources, relationships, user_preferences, embeddings

## Environment Variables
- POCKETBASE_URL
- POCKETBASE_EMAIL
- POCKETBASE_PASSWORD
- OPENAI_API_KEY
- LOG_LEVEL