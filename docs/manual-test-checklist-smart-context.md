# Manual Test Checklist: Smart Context Routing

This checklist verifies the recent Codebase Brain smart-context features in the deployed Base44 app.

It is a manual checklist. It does not claim automated tests were run.

## Preconditions

1. Deploy the latest Base44 app/functions.
2. Open the app as an authenticated user.
3. Have at least one project with stored `CodeFile` rows.
4. Optional but recommended: create a project from a small public GitHub repo sample.

## 1. Add Repository still works

### Public repository

1. Open `/add`.
2. Paste a public GitHub repository URL.
3. Keep public import enabled.
4. Click **Create Project**.

Expected:

- project is created,
- files are stored,
- project opens at `/project/:id`,
- import metadata appears,
- no blocking error is shown.

### Private or inaccessible repository

1. Open `/add`.
2. Paste a private repository URL.
3. Keep public import enabled.
4. Click **Create Project**.

Expected:

- project is created as `url_only`,
- no files are imported,
- user sees explanation that private import is not available yet,
- no blocking 404 failure.

## 2. Project Detail smart-context actions

Open a project with stored files.

Expected on `/project/:id`:

- Context Efficiency Meter appears,
- Search Codebase action appears,
- Architecture action appears,
- old Project Detail content still appears,
- AI Chat still appears,
- Files list still appears,
- Code Graph Lite still appears.

## 3. Context Efficiency Meter

On `/project/:id` and `/project/:id/impact`:

Expected:

- Full repo estimate is shown,
- Selected context estimate is shown,
- Estimated saved tokens are shown,
- Savings percentage is shown,
- Selected files vs total files is shown,
- wording says estimated, not exact.

## 4. Search Codebase

Open:

```txt
/project/:id/search
```

Try queries:

```txt
auth
webhook
payment
route
component
```

Expected:

- results appear when matching stored files exist,
- each result has score,
- each result has reasons,
- snippets appear when content matches,
- no LLM call is required,
- empty/no-match state is friendly.

## 5. Architecture Overview

Open:

```txt
/project/:id/architecture
```

Expected sections:

- What this project is,
- Tech stack,
- Main folders,
- Frontend structure,
- Backend/API structure,
- Data/entities,
- Integrations,
- External packages,
- High-risk areas,
- Symbols,
- Unknowns / missing context.

Expected behavior:

- overview renders without sending the full repo to AI,
- missing/incomplete context is clearly stated,
- page does not crash for small or URL-only projects.

## 6. Impact Analysis still works

Open:

```txt
/project/:id/impact
```

Paste a small diff or changed-file list.

Expected:

- Context Efficiency Meter appears,
- manual diff flow still works,
- output includes Summary,
- Risk level,
- Recommended tests,
- Regression checklist,
- Missing context,
- Safe to merge,
- output does not claim tests were run.

## 7. Public PR URL fetch

If the UI exposes the PR URL flow, paste a public PR URL.

Expected:

- public PR metadata is fetched,
- changed files are detected,
- patch is limited/truncated when needed,
- binary files are skipped,
- friendly error for private/inaccessible PRs,
- no GitHub comments or write actions happen.

If the UI still uses the older `fetchPublicGithubPrDiff` flow, keep it as-is and test the backend function separately later.

## 8. Agent/MCP-lite functions

Call the following Base44 functions from a safe function test harness or backend console if available.

### searchCodebaseTool

Input:

```json
{
  "project_id": "PROJECT_ID",
  "query": "webhook",
  "limit": 5
}
```

Expected:

- returns `tool: search_codebase`,
- returns `results` array,
- each result has path, score, reasons, snippet, language.

### explainFileTool

Input:

```json
{
  "project_id": "PROJECT_ID",
  "path": "src/App.jsx"
}
```

Expected:

- returns `tool: explain_file`,
- imports array,
- imported_by array when CodeRelation exists,
- symbols array,
- risk hints array.

### suggestTestsTool

Input:

```json
{
  "project_id": "PROJECT_ID",
  "changed_files": ["src/api/refund.js"],
  "diff_text": "refund credit payment webhook"
}
```

Expected:

- returns manual_tests,
- automated_tests,
- edge_cases,
- missing_context,
- does not claim tests were run.

### impactAnalysisTool

Input:

```json
{
  "project_id": "PROJECT_ID",
  "changed_files": ["src/api/refund.js"],
  "diff_text": "diff --git a/src/api/refund.js b/src/api/refund.js"
}
```

Expected:

- returns risk_level,
- changed_files,
- related_files if CodeRelation exists,
- risk_signals,
- recommended_tests,
- missing_context.

## 9. Runtime diagnostics

Open:

```txt
/diagnostics
```

Expected:

- function runs without exposing secret values,
- GitHubWebhookDelivery readiness appears,
- GitHubInstallation readiness appears,
- GitHubRepositoryLink readiness appears,
- env values show presence/length/enabled only.

## 10. Known limitations to confirm in UI copy

The app should not claim:

- exact token accounting,
- full repository coverage when import limits were used,
- tests were run,
- private repository import is active,
- GitHub write actions are enabled,
- MCP server is fully implemented.

## Pass criteria

The batch passes manual smoke testing when:

- existing project creation still works,
- project detail still loads,
- search and architecture pages load,
- impact analysis still works,
- agent functions return structured JSON,
- missing context and estimated-token wording are visible,
- no user-facing flow claims unsupported capabilities.
