# Phase 21: Agent Dispatcher and PR Inbox

This phase continues after the first roadmap batch was merged.

## Implemented

### Read-only agent dispatcher

`base44/functions/codebaseAgentTool/entry.ts` adds a small backend dispatcher for future MCP/API usage.

Supported tools in this phase:

- `search_codebase`
- `explain_file`
- `get_architecture`
- `suggest_tests`

The dispatcher reads Codebase Brain entities and returns JSON-first output for agents. It does not write to GitHub.

### Internal PR Inbox

`src/pages/PullRequestInbox.jsx` adds a project-level PR queue at:

```txt
/project/:id/pr-inbox
```

The page can queue a public GitHub PR URL as an internal review item. It stores the item in `CodebaseAnalysis` when available and falls back to local storage. It links back to Impact Analysis for deeper review.

## Safety boundaries

- No automatic GitHub comments.
- No PR approvals.
- No merges.
- No workflow edits.
- No write-back to GitHub.
- Tests are explicitly marked as not run when suggested.

## Later phases

1. Add an internal PR analysis runner that converts pending PR Inbox items into full `public_github_pr_impact` reports.
2. Add webhook-to-inbox automation when GitHub App installation links are confirmed.
3. Add a user-approved GitHub comment draft flow.
4. Add a local MCP bridge after the HTTP dispatcher contracts are stable.
5. Replace regex-only symbol/import extraction with stronger per-language parsers incrementally.
