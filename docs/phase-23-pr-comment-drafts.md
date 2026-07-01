# Phase 23: PR Comment Drafts

This phase adds a safe bridge between internal PR analysis and a future user-approved GitHub posting flow.

## Implemented

### Copyable comment draft

Analyzed PR Inbox items now expose a `Comment draft` action. It opens a markdown textarea containing a concise GitHub-ready review summary generated from the stored internal analysis.

The draft includes:

- risk level
- PR repository and number
- PR title when available
- summary
- main risks
- recommended tests
- changed files
- context files reviewed
- safe-to-merge section
- a clear note that no tests were run and no GitHub write action was performed

### Copy only

The UI can copy the draft to the clipboard. It does not submit the comment to GitHub.

## Safety boundaries

- No GitHub comments are posted.
- No reviews are submitted.
- No approvals or merges are performed.
- No workflow files are edited.
- The user remains responsible for reviewing and posting any copied comment.

## Next phase options

1. Add a user-approved `Post comment` flow behind `GITHUB_PR_POSTING_ENABLED=true`.
2. Add a dedicated comment approval screen with editable draft and diff context.
3. Add webhook-to-PR-Inbox wiring for linked GitHub repositories.
4. Add private GitHub App import behind feature flags.
