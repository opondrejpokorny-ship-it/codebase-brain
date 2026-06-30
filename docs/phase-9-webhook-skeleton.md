# Phase 9: Disabled GitHub Webhook Receiver Skeleton

Phase 9 adds the future GitHub App webhook endpoint, but keeps all real processing disabled by default.

This gives us a safe deployment target before enabling private repo import or automated PR analysis.

## New function

```txt
base44/functions/githubWebhook/entry.ts
```

## Safe default behavior

The function checks these flags:

```txt
GITHUB_APP_ENABLED
GITHUB_WEBHOOK_PROCESSING_ENABLED
```

If either is not enabled, it returns `200` with:

```json
{
  "status": "ignored",
  "reason": "GitHub webhook processing is disabled by feature flags"
}
```

It does not parse the payload, does not write to storage, does not run analysis, and does not call GitHub.

## When enabled

When processing is enabled, the skeleton:

1. reads the raw request body,
2. verifies `X-Hub-Signature-256` using `GITHUB_WEBHOOK_SECRET`,
3. rejects invalid signatures with `401`,
4. parses JSON payload,
5. classifies supported event/action pairs,
6. returns a delivery snapshot,
7. still performs no GitHub writes and starts no analysis.

## Supported events

```txt
ping
installation
installation_repositories
pull_request
```

## Supported pull_request actions

```txt
opened
reopened
synchronize
ready_for_review
```

## Supported installation actions

```txt
created
deleted
suspend
unsuspend
```

## Supported installation_repositories actions

```txt
added
removed
```

## Explicit non-actions

The skeleton does not:

- persist webhook deliveries,
- deduplicate deliveries yet,
- create installation tokens,
- import private code,
- fetch PR diffs,
- generate analysis,
- post PR comments,
- write GitHub checks,
- modify repositories.

## Why return 200 when disabled

Returning `200 ignored` prevents GitHub from repeatedly retrying deliveries while the endpoint is deployed but intentionally inactive.

## Next implementation step

Phase 9B should add persistence only:

- create or configure `GitHubWebhookDelivery`,
- store delivery metadata,
- deduplicate by `X-GitHub-Delivery`,
- keep all analysis/write behavior disabled.

Only after persistence works should we add installation metadata storage.
