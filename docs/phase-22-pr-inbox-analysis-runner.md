# Phase 22: PR Inbox Analysis Runner

This phase turns PR Inbox from a passive queue into an internal review workflow.

## Implemented

### Analyze now

Queued PR Inbox items now expose an `Analyze now` action. The action runs the same impact-analysis pipeline used by manual Impact Analysis:

- load stored `CodeFile` records for the project
- build Code Graph Lite relations
- detect changed files and symbols
- load Risk Memory from `CodebaseAnalysis` plus local fallback
- apply Project Rules / ADR memory
- build a compact context pack
- call Base44 `Core.InvokeLLM`
- calibrate risk level
- save the report as `public_github_pr_impact`

### Inbox result display

Analyzed items can show their internal analysis inline in a collapsible panel.

### Dedupe by PR identity

PR Inbox now deduplicates by `repositoryFullName#prNumber` when PR metadata is available, so a completed analysis replaces the pending queue row instead of appearing as a duplicate.

## Safety boundaries

- No GitHub comments are posted.
- No reviews are submitted.
- No approvals or merges are performed.
- No workflow files are edited.
- The analysis is internal Codebase Brain memory only.
- Suggested tests are recommendations only; the app still does not run tests.

## Next phase options

1. Add a user-approved GitHub comment draft screen.
2. Add webhook-to-PR-Inbox wiring for linked repositories.
3. Add private GitHub App import behind feature flags.
4. Add a local MCP bridge that calls `codebaseAgentTool` and PR Inbox endpoints.
