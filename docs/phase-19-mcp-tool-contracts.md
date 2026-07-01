# Phase 19: MCP / Agent Tool Contracts

Phase 19 defines the first Codebase Brain MCP/API tool surface for Codex, Cursor, Claude Code, and other coding agents.

## Why this exists

The inspiration project, codebase-memory-mcp, shows the core product principle: the agent should query a structural backend instead of repeatedly reading files. Codebase Brain is not yet a local tree-sitter engine, but it can already expose a cloud-backed, deterministic context router.

## Contract source

```txt
src/lib/mcpToolContracts.js
```

## Initial tools

- `search_codebase(project_id, query, limit)`
- `explain_file(project_id, path)`
- `get_architecture(project_id)`
- `impact_analysis(project_id, diff_or_changed_files | pr_url, context_depth)`
- `resolve_missing_context(project_id, targets)`
- `suggest_tests(project_id, changed_files)`
- `get_project_rules(project_id)`
- `add_project_rule(project_id, title, description, category, severity)` as a later explicit user-approved write

## Safety rules

- The first MCP implementation should be read-only toward GitHub.
- `resolve_missing_context` may write only to Codebase Brain storage, not GitHub.
- `add_project_rule` must require explicit user approval because it changes project memory.
- Tools must state when tests were not run.
- Tools must return selected context paths and missing context warnings.

## Recommended next implementation

1. Add a backend function that dispatches these contracts by name.
2. Return JSON-first responses suitable for MCP clients.
3. Add a small local MCP bridge later, or expose an HTTP endpoint first.
4. Reuse existing frontend logic: code search, architecture facts, impact prompt builder, context pack builder, and missing context resolver.
