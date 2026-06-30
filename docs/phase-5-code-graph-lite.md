# Phase 5: Code Graph Lite

Phase 5 adds a lightweight deterministic relationship layer between stored code files.

This is intentionally not a full knowledge graph. It does not use tree-sitter, LSP, embeddings, or a graph database. It only scans stored file contents for common import patterns and resolves local relative imports against the stored file list.

## What changed

### New utility

```txt
src/lib/codeGraphUtils.js
```

It provides:

- `buildCodeRelations(files)`
- `relatedPathsForChangedFiles(relations, changedFiles)`
- `summarizeCodeGraph(relations)`

### New project detail card

```txt
src/components/projects/CodeRelationsCard.jsx
```

It shows:

- total relations,
- internal resolved imports,
- external package imports,
- unresolved relative imports,
- touched files,
- a small list of internal relations,
- a small list of external packages.

### Impact analysis integration

Manual impact analysis now uses Code Graph Lite to:

- derive related files for changed files,
- show related files in the pre-scan panel,
- include relevant relationships in the AI prompt,
- store related files/relevant relations in optional `CodebaseAnalysis` history.

## Supported import patterns

Current heuristic patterns:

```txt
import x from "..."
import "..."
export x from "..."
require("...")
import("...")
@import "..."
```

## Resolution behavior

Relative imports are resolved against stored files:

```txt
./foo
../foo
./foo.js
./foo/index.js
```

External imports are preserved as package names, for example:

```txt
react
@/components/ui/button
lucide-react
```

Note: aliases like `@/` are currently treated as external/unresolved. They can be resolved in a future phase if we inspect `jsconfig.json`, `tsconfig.json`, or Vite/Next config.

## Why this matters

Impact analysis previously selected relevant files only by filename and keyword matching. Code Graph Lite adds structural signal:

- if changed file imports another stored file, include it,
- if another stored file imports the changed file, include it,
- warn when imports are unresolved because the sample is incomplete.

This improves usefulness without spending LLM credits or building a heavy parser.

## Current limits

- No persisted `CodeRelation` entity yet.
- Relations are computed in the browser from stored files.
- No tree-sitter or AST-level symbol extraction.
- No TypeScript path alias resolution.
- No Python package/module resolution beyond basic import strings.
- No visualization graph yet.

## Next recommended phase

Phase 6 should harden imports and analysis by adding one of these:

1. alias resolution from `jsconfig.json` / `tsconfig.json`, or
2. a simple `CodeRelation` entity to persist graph results, or
3. GitHub PR fetch for public PRs before full GitHub App.

Recommended next step: **public GitHub PR fetch by URL**. It would let the user paste a PR URL and automatically pull the diff, still without private GitHub App permissions.
