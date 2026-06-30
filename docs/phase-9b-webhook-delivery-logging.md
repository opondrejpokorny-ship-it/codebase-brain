# Phase 9B: Webhook Delivery Logging + Deduplication

Phase 9B adds an optional persistence adapter to the GitHub webhook receiver.

This phase is still intentionally safe:

- no private code import,
- no PR analysis,
- no PR comments,
- no GitHub writes,
- no installation token creation.

The goal is only to log webhook deliveries and ignore duplicates when the Base44 entity API is available in the function runtime.

## Updated function

```txt
base44/functions/githubWebhook/entry.ts
```

## New feature flag

```txt
GITHUB_WEBHOOK_DELIVERY_LOGGING_ENABLED=false
```

Delivery logging requires all of these to be enabled:

```txt
GITHUB_APP_ENABLED=true
GITHUB_WEBHOOK_PROCESSING_ENABLED=true
GITHUB_WEBHOOK_DELIVERY_LOGGING_ENABLED=true
```

## Entity expected by the adapter

```txt
GitHubWebhookDelivery
```

Recommended fields:

```txt
delivery_id
event
action
installation_id
repository_full_name
pr_number
status
reason
received_at
processed_at
```

## Persistence behavior

When processing is enabled and signature verification passes:

1. classify event/action,
2. build delivery snapshot,
3. attempt to access `globalThis.base44.entities.GitHubWebhookDelivery`,
4. if unavailable, return `persisted:false`,
5. if available, `filter({ delivery_id })`,
6. if delivery exists, return duplicate response,
7. if not, create record.

## Duplicate behavior

Duplicate response:

```json
{
  "status": "duplicate",
  "reason": "duplicate delivery ignored",
  "writes_enabled": false,
  "analysis_started": false
}
```

## Runtime uncertainty

The current repo does not prove that Base44 functions expose entity access as `globalThis.base44.entities`. The adapter is therefore defensive:

- if the entity API exists, it persists,
- if it does not exist, the webhook still returns a safe JSON response,
- no unsupported runtime assumption should crash webhook delivery handling.

## What remains disabled

Even with delivery logging enabled, the webhook does not:

- create installation access tokens,
- store installation metadata,
- import repository files,
- fetch private PR diffs,
- run AI analysis,
- post comments/checks/statuses to GitHub.

## Next recommended phase

Phase 10 should confirm and harden Base44 backend entity access:

1. test whether `globalThis.base44.entities` exists in deployed functions,
2. if not, replace the adapter with the official Base44 server-side entity API,
3. then add installation metadata storage only.
