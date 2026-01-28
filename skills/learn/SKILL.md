---
description: บันทึกสิ่งที่เรียนรู้, decisions, bugs, patterns เข้า Second Brain
model: haiku
---

# Learn - Capture Knowledge

Use the appropriate MCP tool to capture what was just learned or discovered.

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

## Processing Instructions

Before saving knowledge, validate and enhance:

1. **Determine Type**: Analyze input to select the most appropriate tool
2. **Suggest Tags**: Recommend relevant tags for better searchability
3. **Check Duplicates**: Search for similar existing entries
4. **Enrich Content**: Add context if the user's input is brief
5. **Confirm Before Save**: Show preview of what will be saved

## Validation Checklist

- [ ] Title is descriptive and searchable
- [ ] Content has enough detail to be useful later
- [ ] Type/category is appropriate
- [ ] Tags are relevant and consistent with existing tags
- [ ] No duplicate entries exist

## Output Format

After saving, confirm with:

### ✅ Saved to Second Brain

**Type**: [observation/decision/bug/snippet]
**Title**: [title]
**Tags**: [tag1, tag2, tag3]

**Preview**:
[Brief summary of what was saved]

**Related Items** (if found):
- [Similar item 1]
- [Similar item 2]
