---
description: Search and retrieve knowledge from Second Brain
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

Based on the user's question:
1. Determine if it's a keyword search or conceptual search
2. Use the appropriate tool
3. Present results in a clear, organized format
4. Suggest related searches if results are limited
