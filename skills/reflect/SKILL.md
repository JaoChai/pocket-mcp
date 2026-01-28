---
description: Generate retrospective and insights from work sessions
---

# Reflect - Generate Retrospective

Create retrospectives and review lessons learned from past sessions.

## Generate Retrospective
Use `generate_retrospective` with:
- **type**: One of `session`, `daily`, `weekly`, `monthly`
- **session_id**: Optional specific session ID
- **auto_analyze**: Set to `true` for AI-generated insights

This generates:
- What went well
- What could be improved
- Lessons learned
- Action items for next time

## Get Past Lessons
Use `get_lessons` with:
- **limit**: Number of lessons to retrieve (default 10)
- **project**: Optional project filter

## Session Management
- `create_session`: Start a new work session with a goal
- `end_session`: End session with outcome and summary
- `get_current_session`: Check active session status

---

When the user wants to reflect:
1. Check if there's an active session with `get_current_session`
2. If ending a session, use `end_session` first
3. Generate retrospective with `generate_retrospective`
4. Present insights in a clear format:
   - Achievements
   - Challenges faced
   - Key learnings
   - Suggestions for improvement
5. Optionally show related past lessons with `get_lessons`
