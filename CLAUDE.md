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
├── server.ts          # MCP Server with 28 tools
├── pocketbase/
│   ├── client.ts      # PocketBase connection
│   └── collections.ts # Collection schemas (14 collections)
├── tools/
│   ├── session.ts     # create_session, end_session, get_current_session
│   ├── tasks.ts       # create_task, update_task, get_tasks, get_project_progress, delete_task
│   ├── capture.ts     # capture_observation, capture_decision, capture_bug, save_snippet, record_decision_outcome, get_pending_outcomes
│   ├── workflow.ts    # save_workflow, find_workflow, get_workflow, record_workflow_execution
│   ├── search.ts      # search_knowledge, semantic_search
│   ├── context.ts     # get_project_context, get_preferences, save_preference
│   ├── relate.ts      # link_entities, get_relations, suggest_relations
│   └── reflect.ts     # generate_retrospective, get_lessons
└── utils/
    ├── embeddings.ts  # OpenAI embeddings & cosine similarity
    └── logger.ts      # Logging to stderr (STDIO protocol)
```

## Tools by Category (28 total)
| Category | Count | Tools |
|----------|-------|-------|
| Session | 3 | create_session, end_session, get_current_session |
| Task | 5 | create_task, update_task, get_tasks, get_project_progress, delete_task |
| Capture | 4 | capture_observation, capture_decision, capture_bug, save_snippet |
| Outcome | 2 | record_decision_outcome, get_pending_outcomes |
| Workflow | 4 | save_workflow, find_workflow, get_workflow, record_workflow_execution |
| Search | 2 | search_knowledge, semantic_search |
| Context | 3 | get_project_context, get_preferences, save_preference |
| Relation | 3 | link_entities, get_relations, suggest_relations |
| Reflection | 2 | generate_retrospective, get_lessons |

## Commands
- `npm run build` - Build TypeScript
- `npm run dev` - Run with tsx (development)
- `npm run setup-collections` - Setup PocketBase collections
- `npm test` - Run tests

## Important Notes
- **STDIO Protocol**: Never use console.log (stdout) - always use console.error (stderr)
- **Error Handling**: Return `{ isError: true, content: [...] }` for tool errors
- **Zod Validation**: All tool inputs are validated with Zod schemas
- **Thai Timezone**: All timestamps are converted to Asia/Bangkok timezone

## PocketBase Collections (14)
projects, sessions, tasks, areas, observations, decisions, bugs_and_fixes, patterns, code_snippets, workflows, retrospectives, resources, relationships, user_preferences, embeddings

## Environment Variables
- POCKETBASE_URL
- POCKETBASE_EMAIL
- POCKETBASE_PASSWORD
- OPENAI_API_KEY
- LOG_LEVEL
