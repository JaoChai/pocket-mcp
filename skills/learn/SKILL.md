---
description: Capture and save knowledge to Second Brain (observations, decisions, bugs, snippets)
---

# Learn - Capture Knowledge

Use the appropriate MCP tool to capture what was just learned or discovered:

## For Observations/Discoveries/Patterns
Use `capture_observation` with:
- **title**: Brief descriptive title
- **content**: Detailed explanation
- **type**: One of `discovery`, `pattern`, `insight`, `note`
- **tags**: Relevant tags for categorization

## For Decisions
Use `capture_decision` with:
- **title**: Decision title
- **context**: Why this decision was needed
- **options_considered**: What alternatives were evaluated
- **chosen_option**: The selected approach
- **rationale**: Why this option was chosen

## For Bug Fixes
Use `capture_bug` with:
- **error_type**: Type of error (e.g., TypeError, SyntaxError)
- **error_message**: The actual error message
- **root_cause**: What caused the bug
- **solution**: How it was fixed
- **prevention**: How to avoid this in the future

## For Code Snippets
Use `save_snippet` with:
- **title**: Snippet name
- **language**: Programming language
- **code**: The actual code
- **description**: What it does
- **use_cases**: When to use it

---

Analyze what the user wants to save and use the most appropriate tool. Always confirm what was saved.
