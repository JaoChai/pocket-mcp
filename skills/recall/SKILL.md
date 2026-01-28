---
description: ค้นหาความรู้จาก Second Brain - bugs, patterns, decisions ที่เคยบันทึก
model: haiku
---

# Recall - Search Knowledge

Search the Second Brain for relevant information using MCP tools.

## Quick Search (Full-text)
Use `search_knowledge` for fast keyword-based search:
- **query**: Search terms
- **collections**: Optional filter (observations, decisions, bugs_and_fixes, code_snippets, patterns)
- **limit**: Number of results (default 10)

## Semantic Search (AI-powered)
Use `semantic_search` for meaning-based search:
- **query**: Natural language question or description
- **collection**: Which collection to search
- **limit**: Number of results

## When to use which:
- **search_knowledge**: When you know exact keywords or terms
- **semantic_search**: When looking for concepts or similar ideas

---

## Processing Instructions

After retrieving search results, process them as follows:

1. **Rank by Relevance**: Order results by how closely they match the user's query
2. **Highlight Key Points**: Extract the most important information from each result
3. **Summarize**: Provide a concise summary of findings
4. **Suggest Related**: If results are limited, suggest related searches

## Output Format

Present results in this format:

### Found [N] relevant items:

**[Most Relevant]**
- Title/Type
- Key insight
- Why it's relevant

**[Other Results]**
- Brief summary of each

### Related Searches
- Suggested query 1
- Suggested query 2
