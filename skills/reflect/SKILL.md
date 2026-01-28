---
description: สร้าง retrospective สรุปสิ่งที่เรียนรู้จาก session หรือช่วงเวลาที่กำหนด
model: haiku
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

## Processing Instructions

After retrieving retrospective data, analyze and synthesize insights:

1. **Identify Trends**: Look for recurring themes across sessions
2. **Extract Lessons**: Summarize key learnings that can be applied
3. **Prioritize Actions**: Suggest actionable improvements
4. **Connect Patterns**: Link related observations and bugs

## Output Format

Present retrospective in this format:

### 📊 Session Summary
- Duration: X hours
- Goal: [Original goal]
- Outcome: [Achieved/Partial/Not achieved]

### ✅ What Went Well
- Achievement 1
- Achievement 2

### ⚡ Challenges Faced
- Challenge 1: How it was handled
- Challenge 2: How it was handled

### 📚 Key Learnings
1. **Learning 1**: Description and how to apply
2. **Learning 2**: Description and how to apply

### 🎯 Action Items
- [ ] Action 1 (Priority: High/Medium/Low)
- [ ] Action 2 (Priority: High/Medium/Low)

### 🔗 Related Past Lessons
- Lesson from [date]: Brief summary
