# Phase 19: Agent Tools and Index Provider

This phase adds the first MCP-lite style tool contracts and a small index provider abstraction.

## New UI helper

```txt
src/components/projects/SmartContextActions.jsx
```

Project Detail now links to:

```txt
/project/:id/search
/project/:id/architecture
```

## New agent-style functions

```txt
base44/functions/searchCodebaseTool/entry.ts
base44/functions/explainFileTool/entry.ts
base44/functions/suggestTestsTool/entry.ts
base44/functions/impactAnalysisTool/entry.ts
```

These functions are read-only and return structured JSON.

### search_codebase

Input:

```json
{
  "project_id": "...",
  "query": "...",
  "limit": 10
}
```

Returns scored files, reasons, snippets, and language.

### explain_file

Input:

```json
{
  "project_id": "...",
  "path": "src/..."
}
```

Returns summary, imports, imported_by, symbols, and risk hints.

### suggest_tests

Input:

```json
{
  "project_id": "...",
  "changed_files": [],
  "diff_text": "..."
}
```

Returns manual tests, automated tests, and edge cases.

### impact_analysis

Input:

```json
{
  "project_id": "...",
  "diff_text": "...",
  "changed_files": []
}
```

Returns deterministic risk level, summary, changed files, related files, risk signals, tests, and missing context.

## Index provider abstraction

```txt
src/lib/indexProvider.js
```

Current provider:

```txt
base44_light_index
```

Reserved future providers:

```txt
local_engine_later
github_app_index_later
```

The interface exposes:

```txt
getProjectIndex
searchIndex
getRelatedFiles
getImpact
getArchitecture
```

This keeps the current Base44 SaaS direction while leaving room for a later local engine or GitHub App-backed index.

## Safety

This phase does not run tests, does not post to GitHub, and does not require private repository access.
