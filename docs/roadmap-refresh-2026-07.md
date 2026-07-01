# Roadmap refresh — July 2026

This refresh captures the current Codebase Brain direction after the v2 foundation work and the optional persistence UI helpers.

## Current product position

Codebase Brain is becoming the web/product cockpit above codebase memory engines. It should not compete only as a parser. It should own the workflow around codebase context, PR review, risk memory, architecture visibility, decisions, exports, and future MCP access.

## What is already in place

- Repository/project surfaces: project detail, code search, architecture, graph lens, impact analysis, PR inbox, risk memory, project rules, decisions, MCP setup, diagnostics, and GitHub repository screens.
- Context pack builder with deterministic file scoring, token budget, changed-file awareness, relation evidence, warnings, and export support.
- Graph snapshot dry-run with relation and symbol record preparation, JSON/Markdown export, and optional persistence status visibility.
- PR analysis overlay helpers with stored PR analysis selection, Graph Lens deep links, and SAFE / REVIEW / BLOCK verdict normalization.
- Risk Memory with repeated risk summaries, recent analyses, verdict counts, Markdown export, and optional CodebaseAnalysis read path.
- Decision Memory / ADR local-first UI with optional persistence status wiring.
- MCP Lite contract for future read-only codebase tools.
- Optional entity runtime helpers, hooks, status badges, grouped entity constants, and status panels for optional persisted entities.

## Current gaps

- Optional entities are detectable but not yet the durable source of truth across all surfaces.
- Graph persistence is still mainly a dry-run/export workflow, not a normal saved snapshot workflow.
- PR Inbox still needs a small hook/card refactor before adding more behavior safely.
- Webhook PR queue is not yet active.
- MCP Lite is still a product contract, not a running MCP server.
- Local Tree-sitter / LSP / code graph engine integration is still deferred.
- Roadmap and product docs must stay aligned with the fast sequence of small PRs.

## Next implementation sequence

1. Refresh roadmap docs and competitive positioning.
2. Add a capability matrix for optional persistence status.
3. Surface core persistence status on Project Detail.
4. Add guarded manual graph persistence from Graph Snapshot.
5. Show persisted result summaries with saved relation/symbol counts and errors.
6. Extract PR Inbox loading into a hook.
7. Extract PR Inbox item card.
8. Add verdict badges to PR Inbox cards.
9. Add webhook queue normalizer for incoming PR events.
10. Add read-only MCP server or bridge after persistence and PR Inbox are stable.

## Product priority

The strongest near-term product is PR Review Cockpit:

- receive a PR or pasted diff,
- build the smallest useful context pack,
- show changed and related files in Graph Lens,
- identify missing context,
- return a SAFE / REVIEW / BLOCK verdict,
- suggest tests,
- remember risks and decisions,
- export or expose the same context to coding agents.

## Safety rules

- No automatic merge, approval, closing, committing, or GitHub commenting by default.
- Private repository tokens stay backend-only.
- Every AI or review report must show used files, used relations, and missing context.
- Local deterministic retrieval should happen before LLM calls.
- Human review remains the default workflow.
