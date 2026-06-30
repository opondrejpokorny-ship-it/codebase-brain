# Codebase Brain

Lightweight Base44 MVP for an AI codebase memory tool.

The long-term product direction is inspired by modern codebase-memory tools: repository context, file summaries, structural understanding, PR impact analysis, and eventually MCP tools for coding agents. This repo starts much smaller so we can validate the core value without wasting credits.

## Phase 1 goal

A user can:

1. create a codebase project,
2. add a GitHub repository URL or paste a small code sample,
3. store parsed file records,
4. detect a rough technology stack,
5. generate a short project summary,
6. ask questions about the stored codebase context.

## What is included now

- Dashboard with project list
- Add Repository page
- Project Detail page
- File list
- Basic stack detection
- Pasted-code parser
- AI project summary through Base44 `Core.InvokeLLM`
- AI chat over stored context with a safe phase-1 fallback
- Documentation for next phases

## What is intentionally not included yet

- GitHub App
- automatic private repo import
- PR webhooks
- PR comments
- billing
- teams
- full code graph
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
- `docs/architecture.md`

## Next phases

1. Public GitHub repository import with strict limits.
2. Manual PR/diff impact analysis.
3. Code graph lite based on imports.
4. GitHub App + automated PR review.
5. MCP server for Codex/Cursor/Claude Code.

## Base44 docs

Documentation: https://docs.base44.com/Integrations/Using-GitHub

Base44 CLI command reference: https://docs.base44.com/developers/references/cli/commands/introduction
