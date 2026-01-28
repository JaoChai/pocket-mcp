---
description: โหลด context ของโปรเจคปัจจุบันจาก Second Brain
model: haiku
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

## Processing Instructions

After retrieving project context, process and summarize as follows:

1. **Tech Stack Summary**: List key technologies with versions
2. **Important Decisions**: Highlight recent decisions that affect current work
3. **Known Issues**: List bugs/gotchas relevant to the current task
4. **Patterns to Follow**: Identify patterns that should be applied
5. **Quick Tips**: Extract actionable tips from the context

## Output Format

Present context in this format:

### 🛠️ Tech Stack
- Language/Framework (version)
- Key dependencies

### 📋 Recent Decisions
- Decision 1: Brief summary
- Decision 2: Brief summary

### ⚠️ Known Issues
- Issue 1: Description and workaround
- Issue 2: Description and workaround

### 📐 Patterns
- Pattern 1: When to use
- Pattern 2: When to use

### 💡 Quick Tips
- Tip relevant to current context
