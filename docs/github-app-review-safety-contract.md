# GitHub App Review Safety Contract

This document defines what Codebase Brain is allowed to do when GitHub App integration is added.

The contract exists to prevent accidental over-automation. Codebase Brain should help developers understand risk, not take irreversible actions without explicit user approval.

## Default mode: read-only analysis

The first GitHub App version must be read-only.

Allowed:

- read repository metadata,
- read selected repository files,
- read pull request metadata,
- read pull request diffs and changed files,
- generate internal impact analysis,
- store analysis results in Codebase Brain.

Not allowed:

- posting comments,
- creating reviews,
- approving PRs,
- requesting changes,
- changing labels,
- editing files,
- pushing commits,
- changing branch protection,
- modifying workflows,
- merging or closing PRs.

## Later mode: explicit user-approved posting

If PR posting is added later, it must follow this flow:

1. Generate analysis internally.
2. Show a preview in Codebase Brain.
3. Show the exact Markdown that will be posted.
4. User clicks a clear **Post to GitHub** button.
5. Store who posted it and when.
6. Post only one top-level PR comment unless the user explicitly chooses inline comments.

## No silent writes

The app must never write to GitHub in response to a webhook without a user action that clearly authorizes that class of write.

Examples:

- A webhook may trigger an internal analysis.
- A webhook may not trigger an automatic PR comment in the initial version.
- A webhook may not approve, request changes, merge, close, or push commits.

## Generated analysis wording

Analysis should be framed as advisory:

```txt
Codebase Brain analysis
Risk level: medium
This analysis is based on the stored codebase sample and PR diff. It did not run tests.
```

Avoid language that sounds authoritative when context is incomplete:

```txt
This definitely breaks payments.
```

Prefer:

```txt
This may affect the payment flow because the diff touches src/api/payments.js and the stored sample shows that Checkout imports that path. Missing context: payment webhook tests were not available.
```

## Required disclaimers in PR-visible output

If/when posting to GitHub is enabled, every PR-visible analysis should include:

- that tests were not run unless they truly were,
- that analysis used stored/imported context,
- that missing context may limit accuracy,
- that a human reviewer should verify the recommendations.

## Sensitive file handling

The app must not intentionally import or send these files to AI:

```txt
.env
.env.local
.env.production
*.pem
*.key
id_rsa
id_ed25519
secrets.*
credentials.*
```

Safe examples are allowed:

```txt
.env.example
.env.sample
.env.template
```

## AI context minimization

For each analysis, store metadata describing:

```txt
project_id
repository_full_name
pr_number
changed_files
relevant_files_used
related_files_used
risk_signals
missing_context
model_used
created_date
```

Do not store full prompts permanently unless needed for debugging and explicitly enabled.

## Error handling

If analysis fails:

- store a failed status internally,
- do not post to GitHub,
- show a retry option in Codebase Brain,
- preserve the webhook delivery ID for debugging.

## User-facing controls before write features

Before any write permission is requested, the UI should include:

- organization/repository install visibility,
- list of connected repositories,
- setting: enable/disable automatic internal analysis,
- setting: enable/disable PR posting,
- setting: require approval before posting,
- audit log of posted comments.

## Future write permissions checklist

Before requesting write permissions, confirm:

- Which exact GitHub API endpoint will be used?
- Which permission is required?
- Can the feature work as read-only instead?
- Is there a UI preview?
- Is there an audit log?
- Can the user undo or delete the result?
- Is the permission explained clearly on the app install page?

## Absolute non-goals

Codebase Brain should not become an autonomous merge bot in early versions.

Do not implement:

- auto-merge,
- auto-close,
- auto-approve,
- auto-request-changes,
- autonomous push commits,
- workflow file editing,
- repository settings editing,
- branch protection editing.
