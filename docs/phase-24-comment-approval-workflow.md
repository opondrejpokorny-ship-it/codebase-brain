# Phase 24: Comment Approval Workflow

This phase adds an explicit approval step before any future GitHub posting capability.

## Implemented

### Editable draft approval

Analyzed PR Inbox items now expose `Comment approval` instead of a copy-only draft. The panel lets the user:

- edit the generated markdown comment
- regenerate from the internal analysis
- copy the current draft
- save the current draft as approved

Approved drafts are stored in local storage under `codebase_brain_pr_comment_approvals_v1`.

### Approval status

PR Inbox now shows:

- approved draft count in the summary cards
- an `Comment draft approved` badge on individual PR items with approved drafts
- last-approved timestamp inside the approval panel

## Safety boundaries

- No GitHub comments are posted.
- No GitHub reviews are submitted.
- No approvals or merges are performed.
- No workflow files are edited.
- Saving approval only stores local approval state and the edited markdown draft.

## Why this matters

This creates a clear separation between:

1. internal analysis
2. human-editable draft
3. explicit approval
4. any later optional GitHub posting step

The future posting step can require an approved draft plus a feature flag such as `GITHUB_PR_POSTING_ENABLED=true`.

## Next phase options

1. Add a disabled/guarded `Post to GitHub` preview state that explains missing prerequisites.
2. Add webhook-to-PR-Inbox wiring for linked repositories.
3. Add private import readiness screens for GitHub App installations.
4. Add MCP/local-agent bridge commands for PR Inbox and comment approval workflows.
