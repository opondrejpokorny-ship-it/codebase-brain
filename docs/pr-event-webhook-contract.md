# PR Event Webhook Contract

This contract describes a future read-only webhook endpoint for pull request events.

## Goal

Convert incoming pull request events into internal Codebase Brain queue records without changing GitHub state.

## Supported events

The first version should queue only these pull request actions:

- `opened`
- `reopened`
- `synchronize`
- `ready_for_review`

Other events should return a no-op result with `queued: false`.

## Input

The endpoint should receive the raw GitHub pull request webhook payload and optional routing metadata:

```json
{
  "project_id": "project-id",
  "event": { "action": "opened", "pull_request": {}, "repository": {} },
  "delivery_id": "github-delivery-id"
}
```

## Internal output

Use `shouldQueuePrEvent` and `buildPrEventQueueRecord` from `src/lib/prEventQueueUtils.js` to create a `CodebaseAnalysis`-compatible queue record.

The queue record must include:

- `project_id`
- `type: pr_event_queue_item`
- `risk_level: pending`
- `inbox_status`
- `changed_files`
- `repository_compatibility.source: pr_event`
- `pr_metadata.repositoryFullName`
- `pr_metadata.prNumber`
- `pr_metadata.eventAction`
- `pr_metadata.deliveryId`

## Storage

Persist the queue record only to internal storage:

1. Try optional `CodebaseAnalysis` persistence.
2. Keep a local/dev fallback when persistence is unavailable.
3. Never call GitHub comment, approve, request-changes, merge, close, label, or reviewer APIs from this endpoint.

## Response

Recommended response shape:

```json
{
  "queued": true,
  "reason": "queued",
  "record_id": "internal-record-id-or-null",
  "source": "persisted_storage-or-local_fallback"
}
```

For unsupported events:

```json
{
  "queued": false,
  "reason": "unsupported_event"
}
```

## Security constraints

- Verify GitHub webhook signatures server-side before trusting payloads.
- Store private tokens only server-side.
- Keep the first version internal/read-only.
- Do not post comments or mutate PR state automatically.
- Surface every queued item in PR Inbox for human review.
