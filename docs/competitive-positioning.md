# Competitive positioning

Codebase Brain should be positioned as the product cockpit above codebase memory engines.

## The market layers

### 1. Engine layer

Examples: local codebase-memory engines, Tree-sitter/LSP indexers, code property graphs, embedding indexes, and source-code search engines.

Primary value:

- parse repositories,
- build symbol graphs,
- resolve references,
- discover call paths,
- reduce token usage,
- expose low-level retrieval tools.

### 2. Protocol layer

Examples: MCP servers, local bridge processes, remote tool APIs, and editor integrations.

Primary value:

- expose codebase facts to agents,
- standardize tool calls,
- run safely near the repository,
- let Codex/Cursor/Claude-like clients reuse the same backend.

### 3. Product cockpit layer

This is the Codebase Brain opportunity.

Primary value:

- show what context is complete or missing,
- build and export context packs,
- review PRs and diffs against known context,
- visualize impact radius,
- remember decisions and repeated risks,
- keep humans in review control,
- provide auditability for AI coding workflows.

## Positioning statement

Codebase Brain is not trying to be only a parser. It is the review and memory cockpit for AI-assisted software teams.

It can use a local engine later, but its product moat is the workflow layer:

- PR Inbox,
- Graph Lens,
- Risk Memory,
- Decision Memory,
- Context Packs,
- Architecture reports,
- MCP-ready read surfaces,
- explicit SAFE / REVIEW / BLOCK verdicts,
- missing-context and freshness warnings.

## Competitive implications

### Against local MCP memory engines

Do not compete first on parser depth. Compete on workflow, UI, review state, persistence, and exports. Add a bridge to local engines after the product layer is stable.

### Against code search platforms

Do not compete only on search. Compete on AI-context packaging and PR-review explainability.

### Against generic AI coding agents

Do not compete on code generation. Make agents better by giving them smaller, safer, auditable context.

## Near-term wedge

The best wedge is PR Review Cockpit:

1. Import or sync repository context.
2. Receive PR diff or webhook event.
3. Build deterministic context pack.
4. Show changed and related files in Graph Lens.
5. Flag missing context and stale context.
6. Return SAFE / REVIEW / BLOCK verdict.
7. Suggest tests.
8. Store the analysis in Risk Memory.
9. Export the same context to agents.

## Long-term moat

- Persistent project memory.
- Review history and repeated-risk learning.
- Context packs that are explainable and reproducible.
- Human-readable architecture/risk reports.
- Local engine adapters without locking the product to one parser implementation.
