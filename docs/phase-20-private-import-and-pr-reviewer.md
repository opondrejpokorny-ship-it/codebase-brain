# Phase 20: Private Import and PR Reviewer Path

Phase 20 documents the safest path from the current public-MVP state to private repository import and automated internal PR review.

## Current safety baseline

- Public import is limited and read-only.
- Private repositories can be saved as URL-only projects.
- GitHub webhook processing is disabled by default.
- Webhook delivery, installation, and repository link persistence are metadata-only.
- PR analysis is internal only and does not comment on GitHub.

## Private import sequence

1. Confirm Base44 runtime diagnostics for these entities:
   - `GitHubWebhookDelivery`
   - `GitHubInstallation`
   - `GitHubRepositoryLink`
   - `CodeRelation`
   - `CodebaseAnalysis`
   - `ProjectRule`
2. Use `githubInstallationTokenHelper` in dry-run mode for selected installations.
3. Only after dry-run is confirmed, enable server-side token request diagnostics.
4. Implement backend-only private import behind `GITHUB_PRIVATE_IMPORT_ENABLED=true`.
5. Start with targeted private import for missing context targets.
6. Add limited full private import later with the same safe-file filters and file-size limits as public import.

## PR reviewer sequence

1. Webhook receives `pull_request` events.
2. Delivery is deduped by `X-GitHub-Delivery`.
3. Repository link metadata maps the PR repo to a `CodebaseProject`.
4. The system fetches PR metadata and diff using backend-only credentials.
5. Codebase Brain builds a compact context pack.
6. The analysis is saved to `CodebaseAnalysis`.
7. UI shows a PR Inbox / review queue.
8. User may approve a GitHub comment.
9. Only then may `GITHUB_PR_POSTING_ENABLED=true` allow a comment write.

## Explicit non-goals for this phase

- No automatic merge.
- No automatic approval.
- No automatic repository setting changes.
- No workflow file edits.
- No GitHub comments without a user-approved posting flow.

## Product direction

The first sellable product should be an internal PR reviewer and smart context router, not a full clone of codebase-memory-mcp. The long-term engine can evolve toward persistent graph intelligence, but the near-term win is safe private repo access, compact context selection, missing-context resolution, and repeatable PR impact analysis.
