---
description: Load project context from Second Brain (tech stack, decisions, bugs, patterns)
---

# Context - Load Project Context

Retrieve and display the current project's context from Second Brain.

## Get Project Context
Use `get_project_context` with:
- **project_name**: Name of the project (or current project)

This returns:
- Tech stack information
- Recent decisions
- Known bugs and fixes
- Discovered patterns
- Related resources

## Get User Preferences
Use `get_preferences` to retrieve:
- **category**: Optional filter (coding_style, tools, workflow, communication)

## Save Preferences
Use `save_preference` to store user preferences:
- **category**: Category of preference
- **preference**: The preference key
- **value**: The preference value
- **strength**: Importance level (1-5)

---

When the user asks for context:
1. Call `get_project_context` with the current project name
2. Summarize the key information:
   - What technologies are used
   - Important decisions made
   - Common bugs encountered
   - Patterns discovered
3. Highlight anything particularly relevant to the current task
