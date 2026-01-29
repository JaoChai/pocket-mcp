# Usage Guide - 28 Tools Complete Reference

This guide explains when and how to use all 28 tools in the PocketBase Brain MCP.

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
| Created a repeatable process | `save_workflow`, `record_workflow_execution` |
| See connections | `link_entities`, `suggest_relations` |
| Finished work | `update_task(done)`, `generate_retrospective`, `end_session` |
| Review past decisions | `record_decision_outcome`, `get_pending_outcomes` |

---

## Complete Workflow

```
+-------------------------------------------------------------+
|  START OF DAY / START OF WORK                               |
+-------------------------------------------------------------+
|  get_pending_outcomes()  -> Review decisions waiting review |
|  get_lessons()           -> Refresh past learnings          |
|  get_project_context()   -> Load project context            |
|  get_preferences()       -> Load user preferences           |
|  create_session()        -> Start new session               |
|  get_tasks()             -> Check pending tasks             |
|  create_task()           -> Create new task (if needed)     |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  DURING WORK                                                |
+-------------------------------------------------------------+
|  update_task(in_progress) -> Start working on task          |
|  search_knowledge()       -> Find existing knowledge        |
|  semantic_search()        -> Search by meaning              |
|  find_workflow()          -> Find how to do something       |
|  get_workflow()           -> Get workflow steps             |
|                                                             |
|  CAPTURE EVENTS:                                            |
|  +-- Made a decision    -> capture_decision()               |
|  +-- Fixed a bug        -> capture_bug()                    |
|  +-- Learned something  -> capture_observation()            |
|  +-- Good code snippet  -> save_snippet()                   |
|  +-- New workflow       -> save_workflow()                  |
|  +-- Like/dislike       -> save_preference()                |
|                                                             |
|  LINK KNOWLEDGE:                                            |
|  +-- link_entities()      -> Connect bug -> decision        |
|  +-- get_relations()      -> View connections               |
|  +-- suggest_relations()  -> Get auto-suggestions           |
|                                                             |
|  record_workflow_execution() -> Record workflow usage       |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  END OF WORK / END OF DAY                                   |
+-------------------------------------------------------------+
|  update_task(done)           -> Mark task complete          |
|  record_decision_outcome()   -> Record decision results     |
|  generate_retrospective()    -> Summarize lessons learned   |
|  end_session()               -> End session                 |
|  get_project_progress()      -> View overall progress       |
|  delete_task()               -> Remove unwanted tasks       |
+-------------------------------------------------------------+
```

---

## Tools by Category

### 1. Session Management (3 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `create_session` | Starting new work | Start session "Implement Auth" |
| `get_current_session` | Check if session exists | Check active session |
| `end_session` | Finished working / taking break | End session with summary |

**Example Flow:**
```
1. create_session(project: "MyApp", goal: "Add user authentication")
2. ... do work ...
3. end_session(outcome: "success", summary: "Completed JWT auth with refresh tokens")
```

---

### 2. Task Management (5 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `create_task` | New work item needed | Create task "Add dark mode" |
| `update_task` | Change status/priority | Mark as done, set blocked |
| `get_tasks` | View task list | Show pending tasks |
| `get_project_progress` | View project overview | Check completion % |
| `delete_task` | Remove unwanted task | Cancel irrelevant task |

**Task Statuses:** `pending` -> `in_progress` -> `done` | `blocked` | `cancelled`

**Priorities:** `critical` > `high` > `medium` > `low`

**Example Flow:**
```
1. create_task(title: "Add password reset", priority: "high", feature: "Auth")
2. update_task(task_id: "xxx", status: "in_progress")
3. ... do work ...
4. update_task(task_id: "xxx", status: "done")
5. get_project_progress(project: "MyApp")
```

---

### 3. Knowledge Capture (4 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `capture_observation` | Learned something new | "React 19 has new feature X" |
| `capture_decision` | Made a choice | "Chose Tailwind over CSS modules" |
| `capture_bug` | Fixed a bug | "Fixed memory leak in useEffect" |
| `save_snippet` | Wrote reusable code | Custom debounce hook |

**Observation Types:** `discovery`, `pattern`, `insight`, `note`

**Bug Error Types:** `runtime`, `compile`, `logic`, `performance`, `security`, `other`

**Example:**
```
capture_bug(
  error_type: "runtime",
  error_message: "Cannot read property 'x' of undefined",
  solution: "Added optional chaining (?.) before accessing nested property",
  root_cause: "API sometimes returns null instead of empty object",
  prevention: "Always use optional chaining for API responses"
)
```

---

### 4. Decision Outcome Tracking (2 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `record_decision_outcome` | Know result of past decision | "Tailwind was a great choice" |
| `get_pending_outcomes` | Review decisions needing feedback | Decisions > 7 days old |

**Why Track Outcomes?**
- Learn from past decisions
- Build institutional knowledge
- Improve future decision-making

**Example:**
```
1. get_pending_outcomes(days_old: 14)  # Find decisions from 2 weeks ago
2. record_decision_outcome(
     decision_id: "xxx",
     outcome: "success",
     would_do_again: true,
     outcome_notes: "Tailwind reduced CSS complexity by 60%"
   )
```

---

### 5. Workflow Automation (4 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `save_workflow` | Create repeatable process | "How to deploy to production" |
| `find_workflow` | Find existing workflow | "How do I deploy?" |
| `get_workflow` | Get full workflow steps | View all steps |
| `record_workflow_execution` | Log workflow usage | Track usage & success |

**Example:**
```
save_workflow(
  name: "Deploy to Production",
  trigger: "Ready to release new version",
  steps: [
    { order: 1, action: "Run tests", command: "npm test" },
    { order: 2, action: "Build project", command: "npm run build" },
    { order: 3, action: "Deploy to staging", command: "npm run deploy:staging" },
    { order: 4, action: "Run smoke tests", check: "All critical paths work" },
    { order: 5, action: "Deploy to production", command: "npm run deploy:prod" }
  ],
  success_criteria: "All tests pass, no errors in logs"
)
```

---

### 6. Search (2 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `search_knowledge` | Search by keyword | Find "authentication" |
| `semantic_search` | Search by meaning | "How to handle user login" |

**Difference:**
- `search_knowledge`: Exact keyword matching (faster)
- `semantic_search`: AI-powered similarity search (smarter)

**Example:**
```
# Keyword search
search_knowledge(query: "JWT", collections: ["decisions", "bugs_and_fixes"])

# Semantic search
semantic_search(query: "how to securely store user credentials", threshold: 0.7)
```

---

### 7. Context (3 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `get_project_context` | Load project info | Tech stack, recent decisions |
| `get_preferences` | Load user preferences | Coding style, favorite tools |
| `save_preference` | Save new preference | "Prefer single quotes" |

**Preference Categories:** `coding_style`, `tools`, `workflow`, `communication`, `other`

**Example:**
```
save_preference(
  category: "coding_style",
  preference: "Use single quotes for strings",
  reason: "Consistent with team style guide",
  strength: 4
)
```

---

### 8. Relations / Knowledge Graph (3 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `link_entities` | Connect two things | Bug -> fixed_by -> Decision |
| `get_relations` | View connections | What's related to this bug? |
| `suggest_relations` | Auto-suggestions | Find potential connections |

**Relation Types:**
- `uses` - A uses B
- `caused` - A caused B
- `fixed_by` - A was fixed by B
- `led_to` - A led to B
- `related_to` - A is related to B
- `depends_on` - A depends on B
- `inspired_by` - A was inspired by B

**Example:**
```
link_entities(
  source_type: "bug",
  source_id: "bug_xxx",
  relation: "fixed_by",
  target_type: "decision",
  target_id: "decision_yyy",
  context: "Memory leak was fixed by switching to React Query"
)
```

---

### 9. Reflection / Retrospectives (2 tools)

| Tool | When to Use | Example |
|------|-------------|---------|
| `generate_retrospective` | Summarize learnings | End of session/day |
| `get_lessons` | View past lessons | Refresh learning |

**Retrospective Periods:** `session`, `daily`, `weekly`, `monthly`

**Example:**
```
generate_retrospective(
  project: "MyApp",
  period: "session",
  what_went_well: [
    "Successfully implemented JWT authentication",
    "Good test coverage"
  ],
  what_went_wrong: [
    "Spent too much time on token refresh logic"
  ],
  lessons_learned: [
    "Use existing auth libraries instead of building from scratch",
    "Token refresh should be handled at HTTP client level"
  ],
  action_items: [
    "Evaluate NextAuth.js for future projects",
    "Create standard auth boilerplate"
  ]
)
```

---

## Best Practices

### 1. Always Start with Session
```
create_session(project: "ProjectName", goal: "What you're working on")
```

### 2. Capture Knowledge Immediately
Don't wait - capture decisions, bugs, and observations as they happen.

### 3. Link Related Knowledge
Use `link_entities` to build connections between knowledge.

### 4. Review Pending Outcomes Weekly
```
get_pending_outcomes(days_old: 7)
```

### 5. Generate Retrospectives
End significant work sessions with a retrospective.

### 6. Use Semantic Search for Complex Queries
When keywords aren't enough, use `semantic_search`.

---

## Integration with CLAUDE.md

Add these rules to your `~/.claude/CLAUDE.md` for auto-triggering:

```markdown
## Auto MCP Rules

Every development task:
1. **Start**: create_session + create_task
2. **During**: capture every decision, bug, observation
3. **End**: update_task(done) + generate_retrospective + end_session

Never forget! Self-remind if you miss any.
```

---

## Troubleshooting

### "No active session"
Run `create_session()` first.

### Search returns nothing
- Wait a moment for indexing
- Try `semantic_search` instead of `search_knowledge`
- Check project name filter

### Task not updating
- Verify `task_id` is correct
- Check current status (some transitions are invalid)
