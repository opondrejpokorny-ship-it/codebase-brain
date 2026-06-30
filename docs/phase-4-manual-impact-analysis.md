# Phase 4: Manual PR / Diff Impact Analysis

Phase 4 adds the first developer-value feature beyond basic codebase chat.

The user can open a project, paste a git diff, PR patch, or changed file list, and receive an AI-generated impact analysis grounded in the stored imported codebase sample.

## What changed

### New route

```txt
/project/:id/impact
```

### New page

```txt
src/pages/ImpactAnalysis.jsx
```

### New utilities

```txt
src/lib/impactAnalysisUtils.js
```

### Optional new entity

```txt
CodebaseAnalysis
```

Recommended fields:

```txt
project_id
type
input
result
risk_level
changed_files
risk_signals
relevant_files
created_date
```

The UI still works if this entity is not available yet; it just skips persistent analysis history.

## User flow

1. User opens a project.
2. User clicks **Impact Analysis**.
3. User pastes a diff, PR patch, or changed file list.
4. The page performs a deterministic pre-scan:
   - changed files,
   - heuristic risk level,
   - risk signals.
5. The app selects relevant stored files from the imported codebase sample.
6. The app sends a compact prompt to Base44 `Core.InvokeLLM`.
7. AI returns Markdown with:
   - Summary,
   - Risk level,
   - Affected files / flows,
   - Main risks,
   - Recommended tests,
   - Questions before merge,
   - Missing context.
8. If `CodebaseAnalysis` exists, the result is saved to recent analyses.

## Why this phase matters

This gives clear value before building a full GitHub App:

- users can test the idea immediately,
- no GitHub permissions are needed,
- no webhooks are needed,
- no real PR comments are posted,
- no automated changes are made,
- LLM context remains bounded.

## Current limits

- It does not fetch real PRs from GitHub.
- It does not run tests.
- It does not inspect CI logs.
- It only uses the stored code sample.
- It can miss impact if the imported sample did not include relevant files.
- It does not yet build a dependency graph.

## Prompt grounding rules

The impact analysis prompt instructs the AI to:

- answer only from provided project context,
- admit missing context,
- mention file paths where possible,
- not claim it ran tests,
- produce practical sections.

## Next recommended phase

Phase 5 should be **Code Graph Lite**:

- detect imports between stored files,
- store simple relations,
- show related files on Project Detail,
- use relations to improve impact analysis context selection.

This will improve PR impact analysis before we build GitHub App automation.
