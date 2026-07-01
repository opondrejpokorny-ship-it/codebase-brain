# Phase 38-50: Codebase Brain v2 roadmap

This document turns the competitive research into an implementation roadmap. The goal is not to clone local MCP engines such as codebase-memory-mcp, CodeGraph, Gortex, Octocode, Qartez, Reporecall, or Graphify. The product direction is to make Codebase Brain the web/product layer above codebase memory: PR review, context packs, project decisions, risk memory, architecture lens, graph lens, and eventually MCP access.

## Product position

Codebase Brain should be useful even before a full local parser exists:

- import a repository or pasted code sample,
- build deterministic file, relation, symbol, product-area, graph, and risk facts,
- show what context is complete or missing,
- visualize the codebase shape and direct impact radius,
- review diffs and PRs against that context,
- remember decisions and prior risks,
- export the context for coding agents,
- later expose the same surfaces through MCP.

## Implemented / scaffolded in this branch

### 1. Persistent CodeRelation v2

Added `src/lib/graphPersistenceUtils.js` as the persistence boundary for graph snapshots. It prepares relation records with stable IDs, relation versioning, symbol records, coverage summaries, and JSON export helpers. The file is intentionally adapter-friendly so Base44 `CodeRelation` and `CodeSymbol` entities can be added without changing the UI-level graph logic.

### 2. Symbol Extraction Lite

The current `src/lib/symbolExtractionUtils.js` already extracts JS/TS/Python/PHP/Go symbols. The roadmap keeps this as the lightweight parser before any tree-sitter/LSP phase.

### 3. Context Pack Builder v2

The existing context pack already records selected files, relation evidence, selection reasons, token estimates, and warnings. The next upgrade is to persist exported context packs as first-class analysis artifacts.

### 4. Impact Analysis v2 verdicts

The impact analysis prompt and calibrator now support an explicit review verdict model: `SAFE`, `REVIEW`, or `BLOCK`. This is separate from risk level so the UI can later treat verdicts as workflow state.

### 5. Architecture Overview / Lens

The architecture lens now has a product-context utility available through `src/lib/productContextUtils.js`. This lets the architecture page talk in product areas, not only folders and files.

### 5b. Graph Lens v1

Added `src/lib/graphLensUtils.js` and `src/pages/GraphLens.jsx`, exposed at `/project/:id/graph`. This is a practical 2D SVG graph lens before the heavier 3D/WebGL phase. It shows folders, files, internal import relations, external packages, node type colors, node size by fanout/symbol density, filters, search, clickable node detail, symbol chips, relation evidence, and a first direct-impact-radius highlight.

### 5c. Graph Lens v2 PR impact overlay

Graph Lens now has a PR overlay panel. Users can paste changed file paths or unified diff snippets, choose a `SAFE`, `REVIEW`, or `BLOCK` verdict, and see changed files highlighted in orange, directly related files highlighted in blue, and missing changed files listed as missing context. The overlay is deterministic and uses the current Code Graph Lite relations without posting GitHub comments or changing repository state.

### 6. GitHub App private import

The repo already has the safe GitHub App skeleton, private import readiness, repository link metadata, and dry-run installation token helper. The next production step remains backend-only non-dry-run installation token creation behind feature flags.

### 7. PR inbox + webhook internal analysis

The repo already has a PR Inbox route and webhook skeleton. The next step is internal queued analysis from webhook events, still without GitHub comments.

### 8. Semantic Search Lite

The repo already has deterministic search. The roadmap keeps embeddings optional; exact path, symbol, import, and keyword scoring should stay the default because they are cheap and explainable.

### 9. Decision Memory / ADR

Added `src/lib/decisionMemoryUtils.js` for local-first decision memory, ADR-style markdown export, and prompt formatting. Added `src/pages/ProjectDecisions.jsx` and the `/project/:id/decisions` route so users can create, view, delete, and copy ADR markdown records from the app.

### 10. MCP Lite

Added `src/lib/mcpLiteTools.js` with a tool manifest and config-snippet generator for Codex, Cursor, Claude Desktop, and generic MCP clients. Added `src/pages/McpSetup.jsx` and the `/project/:id/mcp` route so users can inspect the future MCP contract, copy setup snippets, and review the safety checklist. This is not a running MCP server yet; it is the product contract for the future server.

## Current implementation status

- Product surfaces added: Search Codebase, Architecture, Graph Lens, Decisions, MCP Setup, Risk Memory, Project Rules.
- Foundations added: graph persistence helpers, graph lens data builder, graph PR overlay, product-context helpers, decision memory helpers, freshness helpers, MCP Lite manifest, verdict calibration.
- Still intentionally deferred: running MCP server, backend-only private import token creation, queued webhook PR analysis, persisted Base44 entities for graph/decisions/context packs, local tree-sitter/LSP engine, and 3D/WebGL graph mode.

## Remaining implementation order

1. Add optional Base44 entities: `CodeRelation`, `CodeSymbol`, `DecisionMemory`, `ContextPack`, `CodebaseAnalysis`.
2. Wire `graphPersistenceUtils.persistGraphSnapshot()` into repository import and manual rebuild flows.
3. Add context freshness banners using `freshnessUtils`.
4. Connect Graph Lens PR overlay to saved PR Inbox analyses instead of only pasted paths.
5. Add queued PR analysis from webhook deliveries without posting GitHub comments.
6. Add read-only private repo import behind `GITHUB_PRIVATE_IMPORT_ENABLED`.
7. Promote verdicts into the PR Inbox and Risk Memory views.
8. Add architecture/report exports: `architecture-report.md`, `context-pack.json`, `risk-report.md`.
9. Add Graph Lens v3 3D View after persistent graph storage is stable.
10. Only after the product layer is stable, evaluate a bridge to a local engine or tree-sitter worker.

## Safety principles

- No automatic merge, approval, commit, workflow edit, or GitHub comment by default.
- Private repo tokens must stay backend-only.
- AI reports must mention missing context and never claim tests were run.
- Local deterministic retrieval should run before any LLM call.
- The UI should always show which files and relations were used.
