# PR event sample payloads

These examples are intentionally small and safe. They can be pasted into `buildPrEventWebhookResult` or future webhook tests without hitting GitHub write APIs.

## Queueable opened event

```json
{
  "projectId": "project-123",
  "deliveryId": "delivery-opened-1",
  "event": {
    "action": "opened",
    "repository": {
      "full_name": "owner/example-repo",
      "name": "example-repo",
      "owner": { "login": "owner" }
    },
    "pull_request": {
      "number": 42,
      "title": "Add safer context pack export",
      "state": "open",
      "draft": false,
      "html_url": "https://github.com/owner/example-repo/pull/42",
      "base": { "ref": "main", "repo": { "full_name": "owner/example-repo" } },
      "head": { "ref": "feature/context-pack-export", "repo": { "full_name": "owner/example-repo" } },
      "changed_files": 2,
      "additions": 48,
      "deletions": 12
    },
    "changed_files": ["src/lib/contextPack.js", "src/pages/ImpactAnalysis.jsx"]
  }
}
```

Expected result: `queued: true`, `reason: queued`, `record.type: pr_event_queue_item`.

## Unsupported closed event

```json
{
  "projectId": "project-123",
  "deliveryId": "delivery-closed-1",
  "event": {
    "action": "closed",
    "repository": { "full_name": "owner/example-repo" },
    "pull_request": { "number": 42, "state": "closed" }
  }
}
```

Expected result: `queued: false`, `reason: unsupported_event`.
