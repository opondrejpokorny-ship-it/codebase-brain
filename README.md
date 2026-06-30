# Codebase Brain

Lightweight Base44 MVP for an AI codebase memory tool.

The long-term product direction is inspired by modern codebase-memory tools: repository context, file summaries, structural understanding, PR impact analysis, and eventually MCP tools for coding agents. This repo starts much smaller so we can validate the core value without wasting credits.

## Current goal

A user can:

1. create a codebase project,
2. add a public GitHub repository URL and import a small safe sample,
3. or save a private/inaccessible repository URL as URL-only until GitHub App access is enabled,
4. or paste a small code sample manually,
5. store parsed file records,
6. detect a rough technology stack,
7. generate a short project summary,
8. view import metadata and warnings,
9. view lightweight import/require relationships,
10. ask questions about the stored codebase context,
11. paste a public GitHub PR URL, diff, or changed file list for impact analysis,
12. see whether the PR repository matches the imported project repository,
13. follow documented GitHub App permissions, webhook, and safety plans before private repo access is implemented,
14. deploy a disabled GitHub webhook receiver skeleton with no side effects,
15. optionally log webhook deliveries and dedupe them if the Base44 entity API is available in the function runtime,
16. optionally store GitHub installation metadata if the Base44 entity API is available,
17. run a safe Base44 runtime diagnostics endpoint that reports capability presence without exposing secrets,
18. run diagnostics from the app UI at `/diagnostics`.

## What is included now

- Dashboard with project list
- Add Repository page
- Project Detail page
- File list
- Basic stack detection
- Pasted-code parser
- Lightweight public GitHub import with strict limits
- Private/inaccessible repository URL-only fallback
- Backend-first public import with browser fallback
- Import metadata card on project detail
- Code Graph Lite import/require relations
- Manual PR / diff impact analysis enhanced with graph relations
- Public GitHub PR diff fetch with backend-first flow and browser fallback
- Project/PR repository compatibility warning
- GitHub App planning docs
- GitHub App review safety contract
- GitHub webhook contract
- Disabled GitHub webhook receiver skeleton
- Optional webhook delivery logging adapter
- Optional GitHub installation metadata adapter
- Base44 runtime diagnostics function
- Runtime Diagnostics UI
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

## Private repository fallback

Private or inaccessible repositories are saved as URL-only projects instead of failing project creation.

When public import returns a likely access error such as `404`, `403`, `not found`, or authentication/rate-limit failure:

- the project is still created,
- no files are imported,
- project status is set to `url_only`,
- import metadata stores the failure reason,
- the user can paste code manually,
- full private import remains reserved for GitHub App/private access.

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

## Repository compatibility warning

When a public PR is fetched, the app compares:

- the repository stored on the current project,
- the repository from the fetched PR.

It shows:

- `match` when they are the same,
- `mismatch` when they differ,
- `unknown` when comparison cannot be verified.

Mismatched PRs are warned but not blocked.

## GitHub App plan

The first GitHub App version is planned as read-only:

```txt
Metadata: Read
Contents: Read
Pull requests: Read
```

Initial webhook events:

```txt
installation
installation_repositories
pull_request
```

The safety contract explicitly prevents automatic merges, approvals, commits, workflow edits, repository setting changes, and PR comments without a later explicit opt-in flow.

## Webhook receiver skeleton

A disabled-by-default Base44 function now exists:

```txt
base44/functions/githubWebhook/entry.ts
```

By default it returns `200 ignored` while these flags are false:

```txt
GITHUB_APP_ENABLED=false
GITHUB_WEBHOOK_PROCESSING_ENABLED=false
```

When enabled, it verifies `X-Hub-Signature-256`, classifies supported events, and still performs no GitHub writes or PR analysis until later phases.

## Webhook delivery logging

Optional delivery logging is guarded by:

```txt
GITHUB_WEBHOOK_DELIVERY_LOGGING_ENABLED=false
```

When enabled together with webhook processing, the function attempts to use:

```txt
globalThis.base44.entities.GitHubWebhookDelivery
```

If available, it persists delivery snapshots and ignores duplicates by `delivery_id`. If unavailable, it returns `persisted:false` instead of crashing.

## GitHub installation metadata logging

Optional installation logging is guarded by:

```txt
GITHUB_INSTALLATION_LOGGING_ENABLED=false
```

When enabled together with webhook processing, the webhook attempts to use:

```txt
globalThis.base44.entities.GitHubInstallation
```

It stores installation/account metadata from `installation` and `installation_repositories` events only. It does not create installation access tokens, import private code, or call GitHub APIs.

## Base44 runtime diagnostics

A safe diagnostics endpoint exists:

```txt
base44/functions/base44RuntimeDiagnostics/entry.ts
```

It reports only capability presence, such as whether `globalThis.base44.entities.GitHubWebhookDelivery` exists and which methods are available. It never returns secret values, only presence/length/enabled booleans.

A frontend diagnostics page also exists:

```txt
/diagnostics
```

Use it after deploying Base44 functions to verify `GitHubWebhookDelivery` and `GitHubInstallation` before enabling webhook/installation logging.

## Public GitHub PR fetch limits

- public PRs only,
- max 90,000 diff characters,
- max 100 changed files from the GitHub files API,
- backend function is tried first,
- browser fallback keeps the feature usable before backend deployment.

## What is intentionally not included yet

- private repository file import
- confirmed Base44 backend entity binding in deployed runtime
- installation access token creation
- repository link metadata persistence
- automatic PR analysis from webhooks
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
- `docs/phase-7-repository-compatibility.md`
- `docs/phase-8-github-app-plan.md`
- `docs/phase-9-webhook-skeleton.md`
- `docs/phase-9b-webhook-delivery-logging.md`
- `docs/phase-10-base44-runtime-diagnostics.md`
- `docs/phase-11-runtime-diagnostics-ui.md`
- `docs/phase-12-installation-metadata-skeleton.md`
- `docs/phase-13-private-repo-url-only-fallback.md`
- `docs/github-app-review-safety-contract.md`
- `docs/github-webhook-contract.md`
- `docs/architecture.md`

## Next phases

1. Run diagnostics in deployed Base44 runtime and confirm the entity API.
2. If needed, replace the webhook persistence adapter with the official server-side Base44 entity API.
3. Add repository link metadata skeleton for `installation_repositories` events.
4. GitHub App + private repo import + automated internal PR analysis.
5. MCP server for Codex/Cursor/Claude Code.

## Base44 docs

Documentation: https://docs.base44.com/Integrations/Using-GitHub

Base44 CLI command reference: https://docs.base44.com/developers/references/cli/commands/introduction
