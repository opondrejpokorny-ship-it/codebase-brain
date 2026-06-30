# GitHub Webhook Contract

This document describes the future `githubWebhook` Base44 function contract.

The endpoint does not exist yet. This contract should be implemented before any GitHub App automation is enabled.

## Future endpoint

```txt
base44/functions/githubWebhook/entry.ts
```

Expected public URL will be configured as the GitHub App webhook URL.

## Required request headers

Read and validate:

```txt
X-GitHub-Event
X-GitHub-Delivery
X-Hub-Signature-256
User-Agent
Content-Type
```

Optional legacy support:

```txt
X-Hub-Signature
```

Use `X-Hub-Signature-256` as the primary signature header.

## Required secrets

```txt
GITHUB_WEBHOOK_SECRET
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
```

Later optional:

```txt
GITHUB_APP_CLIENT_ID
GITHUB_APP_CLIENT_SECRET
```

## Verification flow

```txt
receive request
  ↓
read raw body bytes
  ↓
read X-Hub-Signature-256
  ↓
compute HMAC SHA-256 with GITHUB_WEBHOOK_SECRET
  ↓
constant-time compare
  ↓
reject with 401 if invalid
  ↓
parse JSON body
```

## Dedupe flow

Use `X-GitHub-Delivery` as an idempotency key.

```txt
if delivery_id exists and status is processed:
  return 200 duplicate ignored
else:
  create GitHubWebhookDelivery record
```

## Supported events in first implementation

```txt
ping
installation
installation_repositories
pull_request
```

### ping

Purpose:

- verify webhook endpoint is connected.

Action:

- store delivery,
- return 200.

### installation

Actions to handle:

```txt
created
deleted
suspend
unsuspend
```

Purpose:

- store installation ID,
- track account login/type,
- mark installation active/inactive.

### installation_repositories

Actions to handle:

```txt
added
removed
```

Purpose:

- update repository availability for an installation.

### pull_request

Actions to handle:

```txt
opened
reopened
synchronize
ready_for_review
```

Purpose:

- fetch PR metadata/diff using installation token,
- match repository to CodebaseProject,
- generate internal PullRequestAnalysis,
- do not post to GitHub in the first implementation.

## Ignored events

Any unsupported event/action should return 200 and be logged as ignored.

Do not return 500 for unsupported events. GitHub will retry failed deliveries, so unsupported-but-valid events should be acknowledged.

## Response behavior

```txt
200 ok: processed, ignored, or duplicate
400 bad request: malformed payload
401 unauthorized: invalid signature
500 internal error: unexpected failure that should be retried
```

## Delivery record

Recommended entity:

```txt
GitHubWebhookDelivery
```

Fields:

```txt
delivery_id
event
action
installation_id
repository_full_name
pr_number
status: received / ignored / processed / failed / duplicate
error
received_at
processed_at
```

## Pull request processing record

Recommended entity:

```txt
PullRequestAnalysis
```

Fields:

```txt
project_id
repository_full_name
pr_number
pr_url
head_sha
base_sha
action
status: queued / analyzing / completed / failed
risk_level
summary
changed_files
related_files
relevant_files
recommended_tests
missing_context
raw_result
created_date
updated_date
```

## Installation access token flow

Future backend helper:

```txt
createInstallationAccessToken(installation_id)
```

Flow:

```txt
create GitHub App JWT with private key
  ↓
POST /app/installations/{installation_id}/access_tokens
  ↓
use installation token for repository/PR API calls
```

## Security rules

- Verify signature before parsing or processing.
- Deduplicate before analysis work.
- Do not log secrets or full private code contents.
- Do not post to GitHub in the first implementation.
- Never process webhook writes without explicit feature flags.
- Treat webhook payload as untrusted input.
- Keep repository/file limits even for private repositories.

## Feature flags

Recommended flags:

```txt
GITHUB_APP_ENABLED=false
GITHUB_WEBHOOK_PROCESSING_ENABLED=false
GITHUB_PRIVATE_IMPORT_ENABLED=false
GITHUB_AUTO_ANALYZE_PRS=false
GITHUB_PR_POSTING_ENABLED=false
```

Default all to false until explicitly enabled.

## First implementation acceptance criteria

- `ping` event returns 200.
- invalid signature returns 401.
- duplicate delivery returns 200 without reprocessing.
- unsupported event returns 200 ignored.
- installation event stores installation metadata.
- pull_request event can be logged without running analysis.
- no writes to GitHub are possible.
