# Codebase Brain

Lightweight Base44 MVP for an AI codebase memory tool.

The long-term product direction is inspired by modern codebase-memory tools: repository context, file summaries, structural understanding, PR impact analysis, and eventually MCP tools for coding agents. This repo starts much smaller so we can validate the core value without wasting credits.

## Current goal

A user can:

1. create a codebase project,
2. add a public GitHub repository URL and import a small safe sample,
3. or paste a small code sample manually,
4. store parsed file records,
5. detect a rough technology stack,
6. generate a short project summary,
7. view import metadata and warnings,
8. view lightweight import/require relationships,
9. ask questions about the stored codebase context,
10. paste a public GitHub PR URL, diff, or changed file list for impact analysis.

## What is included now

- Dashboard with project list
- Add Repository page
- Project Detail page
- File list
- Basic stack detection
- Pasted-code parser
- Lightweight public GitHub import with strict limits
- Backend-first public import with browser fallback
- Import metadata card on project detail
- Code Graph Lite import/require relations
- Manual PR / diff impact analysis enhanced with graph relations
- Public GitHub PR diff fetch with backend-first flow and browser fallback
- AI project summary through Base44 `Core.InvokeLLM`
- AI chat over stored context with a safe phase-1 fallback
- Documentation for next phases

## Public GitHub import limits

The current import is intentionally small and backend-first:

- public repositories only,
- max 40 text files,
- max 35 KB per file,
- max 3,000 tree entries inspected,
- skips `node_modules`, `dist`, `build`, generated folders, lock files, binaries, media, and real `.env` files.

This is enough to test product value without building a GitHub App or backend queue yet.

## Code Graph Lite

Project Detail now shows lightweight relationships detected from stored files:

- internal resolved imports,
- external package imports,
- unresolved relative imports,
- touched files.

This is deterministic and cheap. It does not use tree-sitter, LSP, embeddings, or a graph database yet.

## Impact analysis

Open a project and click **Impact Analysis**. Paste a public GitHub PR URL, git diff, PR patch, or changed file list. The app performs a deterministic pre-scan, uses Code Graph Lite to find related files, selects relevant stored files, and asks AI for:

- summary,
- risk level,
- affected files / flows,
- main risks,
- recommended tests,
- questions before merge,
- missing context.

Public PR fetch is still read-only and lightweight. It does not run tests, inspect CI logs, or comment on GitHub yet.

## Public GitHub PR fetch limits

- public PRs only,
- max 90,000 diff characters,
- max 100 changed files from the GitHub files API,
- backend function is tried first,
- browser fallback keeps the feature usable before backend deployment.

## What is intentionally not included yet

- private repository import
- GitHub App installation
- PR webhooks
- PR comments
- CI/check inspection
- billing
- teams
- full persisted graph database
- MCP server
- tree-sitter/LSP indexing
- vector database

## Pasted code format

Preferred:

```txt
--- package.json ---
{"dependencies":{"react":"latest","vite":"latest"}}

--- src/App.jsx ---
export default function App() {
  return <div>Hello</div>;
}
```

Also supported:

```js
// file: src/App.jsx
export default function App() {
  return <div>Hello</div>;
}
```

## Local development

### Prerequisites

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Install the Base44 CLI if needed:

```bash
npm install -g base44@latest
```

### Run full Base44 local environment

```bash
base44 dev
```

### Run only the frontend

```bash
npm run dev
```

Open the local URL printed by Vite.

For frontend-only development against a hosted Base44 backend, create `.env.local`:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

## Documentation

- `docs/phase-1-scope.md`
- `docs/phase-2-public-github-import.md`
- `docs/phase-3-import-observability.md`
- `docs/phase-4-manual-impact-analysis.md`
- `docs/phase-5-code-graph-lite.md`
- `docs/phase-6-public-pr-fetch.md`
- `docs/architecture.md`

## Next phases

1. Project/PR repository compatibility warning.
2. GitHub App + private repo import + automated PR review.
3. MCP server for Codex/Cursor/Claude Code.

## Base44 docs

Documentation: https://docs.base44.com/Integrations/Using-GitHub

Base44 CLI command reference: https://docs.base44.com/developers/references/cli/commands/introduction
