# Phase 8: GitHub App Planning

Phase 8 prepares the future GitHub App integration before any private repository access, PR comments, or automated review behavior is implemented.

This phase is documentation-only by design. It defines permissions, webhook events, data flow, safety rules, and non-goals so that the later implementation remains minimal and predictable.

## Why plan before implementation

Codebase Brain currently works with:

- pasted code,
- public repository import,
- public PR diff fetch,
- manual impact analysis.

The next big product jump is a GitHub App that can access private repositories and react to PR events. That requires careful permission choices and a clear safety contract.

## Core GitHub App principle

Use the minimum permissions required for each phase.

We should not request write permissions until there is a concrete user-facing feature that needs them. Early GitHub App versions should be read-only.

## Phase 8A: Read-only private repo import + PR analysis

### Repository permissions

Recommended initial permissions:

| Permission | Access | Why |
|---|---:|---|
| Metadata | Read | Basic repository metadata. Usually required/implicit for many app flows. |
| Contents | Read | Read repository files for private repo import and file context. |
| Pull requests | Read | Read PR metadata, changed files, and PR diff. |

Do not request yet:

| Permission | Access | Reason |
|---|---:|---|
| Pull requests | Write | Needed only when posting review comments later. |
| Checks | Write | Needed only if creating GitHub Checks later. |
| Commit statuses | Write | Needed only if publishing commit statuses later. |
| Issues | Write | Needed only for issue/PR conversation comments later. |
| Actions | Read | Needed only if/when we inspect CI workflow runs/logs. |
| Administration | Any | Too broad for MVP. Avoid. |
| Workflows | Any | Avoid unless editing `.github/workflows`, which is not in scope. |

### Webhook events

Subscribe initially only to:

```txt
installation
installation_repositories
pull_request
```

Optional later:

```txt
pull_request_review
pull_request_review_comment
issue_comment
workflow_run
workflow_job
check_suite
check_run
```

Do not subscribe to broad events such as `push` until we have a specific need.

## Pull request event actions to handle

Initial supported PR actions:

```txt
opened
reopened
synchronize
ready_for_review
```

Ignore initially:

```txt
closed
assigned
unassigned
labeled
unlabeled
milestoned
demilestoned
review_requested
review_request_removed
```

Why:

- `opened`: first analysis opportunity.
- `synchronize`: branch changed, rerun analysis.
- `reopened`: PR became relevant again.
- `ready_for_review`: draft PR is ready for real analysis.

## Data model draft

### GitHubInstallation

```txt
installation_id
account_login
account_type
repository_selection
created_date
updated_date
status
```

### GitHubRepositoryLink

```txt
installation_id
repository_id
repository_full_name
repository_url
private
project_id
status
created_date
updated_date
```

### PullRequestAnalysis

```txt
project_id
repository_full_name
pr_number
pr_url
head_sha
base_sha
action
status
risk_level
summary
changed_files
related_files
recommended_tests
missing_context
raw_result
created_date
updated_date
```

### GitHubWebhookDelivery

```txt
delivery_id
event
action
installation_id
repository_full_name
pr_number
status
error
received_at
processed_at
```

## Webhook endpoint draft

Future function:

```txt
base44/functions/githubWebhook/entry.ts
```

Expected request behavior:

1. Read raw request body.
2. Verify `X-Hub-Signature-256` using webhook secret.
3. Read `X-GitHub-Event` and `X-GitHub-Delivery`.
4. Deduplicate by delivery ID.
5. Parse event payload.
6. Ignore unsupported events/actions.
7. Queue or run lightweight analysis.
8. Save result.
9. Never write to GitHub unless a later feature explicitly enables it.

## Private repository import flow

```txt
GitHub App installed
  ↓
installation event stored
  ↓
user links installed repository to CodebaseProject
  ↓
backend creates installation access token
  ↓
backend imports limited text file sample
  ↓
CodeFile records saved
  ↓
Code Graph Lite computed client-side or persisted later
```

## Automated PR analysis flow

```txt
pull_request opened/synchronize/reopened/ready_for_review
  ↓
webhook verified
  ↓
repository matched to CodebaseProject
  ↓
changed files and diff fetched
  ↓
impact analysis generated
  ↓
result stored as PullRequestAnalysis
  ↓
UI shows analysis in project detail
```

## PR commenting should be a later opt-in feature

Do not comment automatically in early GitHub App versions.

Future safe behavior:

1. Generate analysis internally.
2. Show preview in Codebase Brain UI.
3. User clicks **Post to PR**.
4. Only then create a top-level PR comment or check summary.

## Safety rules

Codebase Brain must never automatically:

- merge PRs,
- close PRs,
- approve PRs,
- request changes,
- push commits,
- edit workflow files,
- edit repository settings,
- delete files,
- comment on PRs without explicit opt-in,
- expose private source code outside the configured AI provider flow.

## AI context rules

For private repositories:

- send only the smallest relevant code context,
- avoid sending entire repository contents,
- exclude secrets and environment files,
- keep file and diff limits,
- preserve missing-context warnings,
- log what file paths were used for analysis.

## MVP rollout plan

### Step 1: Register GitHub App manually

Use read-only permissions:

```txt
Contents: Read
Pull requests: Read
Metadata: Read
```

Webhook events:

```txt
installation
installation_repositories
pull_request
```

### Step 2: Webhook receiver only

Implement endpoint, signature verification, delivery logging, and ignored-event handling.

No analysis yet.

### Step 3: Repository linking

Allow user to link an installed GitHub repository to a CodebaseProject.

### Step 4: Private import

Reuse current import limits, but fetch through installation access token.

### Step 5: Automatic analysis storage

On PR events, fetch diff and save analysis to PullRequestAnalysis.

### Step 6: Optional PR posting

Only after UI preview and user confirmation.

## Non-goals for the first GitHub App version

- marketplace listing,
- billing,
- organization-wide dashboards,
- CI log inspection,
- inline comments,
- auto-fixes,
- commits pushed by the app,
- check runs/statuses,
- full repo clone,
- deep symbol graph.

## Source notes

This plan intentionally follows GitHub App least-permission and webhook verification principles. It should be rechecked against the current GitHub Docs before implementation.
