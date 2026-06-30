# Phase 12: GitHub Installation Metadata Skeleton

Phase 12 adds optional GitHub installation metadata persistence to the webhook receiver.

This remains a safe logging-only phase. It does not create installation access tokens, does not import private code, does not run PR analysis, and does not write to GitHub.

## Updated function

```txt
base44/functions/githubWebhook/entry.ts
```

## New feature flag

```txt
GITHUB_INSTALLATION_LOGGING_ENABLED=false
```

Installation logging requires all of these to be enabled:

```txt
GITHUB_APP_ENABLED=true
GITHUB_WEBHOOK_PROCESSING_ENABLED=true
GITHUB_INSTALLATION_LOGGING_ENABLED=true
```

## Entity expected by the adapter

```txt
GitHubInstallation
```

Recommended fields:

```txt
installation_id
account_login
account_type
account_id
repository_selection
app_id
app_slug
permissions
events
status
last_action
created_date
updated_date
```

## Supported events

The skeleton handles installation metadata from:

```txt
installation
installation_repositories
```

Supported installation actions:

```txt
created
deleted
suspend
unsuspend
```

Supported installation_repositories actions:

```txt
added
removed
```

## Persistence behavior

When enabled and signature verification passes:

1. build an installation snapshot from the webhook payload,
2. attempt to access `globalThis.base44.entities.GitHubInstallation`,
3. if unavailable, return `persisted:false`,
4. if available, `filter({ installation_id })`,
5. update existing installation record or create a new one.

## Response shape

Webhook responses now include:

```json
{
  "installation_persistence": {
    "persisted": false,
    "reason": "GITHUB_INSTALLATION_LOGGING_ENABLED is disabled"
  }
}
```

When enabled and successful, it returns:

```json
{
  "installation_persistence": {
    "persisted": true,
    "record_id": "...",
    "repositories_added": 1,
    "repositories_removed": 0
  }
}
```

## Diagnostics update

`base44RuntimeDiagnostics` now reports readiness for:

```txt
webhook_delivery_logging_ready
installation_logging_ready
repository_link_logging_ready
pull_request_analysis_ready
```

## What remains disabled

- installation access token creation,
- private repository import,
- repository linking,
- private PR diff fetch,
- automatic AI analysis,
- PR comments/checks/statuses.

## Next recommended phase

Phase 13 should add repository link metadata skeleton:

- read `repositories_added` and `repositories_removed`,
- optionally store `GitHubRepositoryLink`,
- still do not import private code,
- still do not create installation tokens.
