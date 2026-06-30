# Phase 14: Repository Link Metadata Skeleton

Phase 14 adds optional repository link metadata persistence for GitHub App installation webhooks.

This phase still does not create installation access tokens, import private code, run PR analysis, or write to GitHub.

## Updated function

```txt
base44/functions/githubWebhook/entry.ts
```

## New feature flag

```txt
GITHUB_REPOSITORY_LINK_LOGGING_ENABLED=false
```

Repository link logging requires all of these to be enabled:

```txt
GITHUB_APP_ENABLED=true
GITHUB_WEBHOOK_PROCESSING_ENABLED=true
GITHUB_REPOSITORY_LINK_LOGGING_ENABLED=true
```

## Entity expected by the adapter

```txt
GitHubRepositoryLink
```

Recommended fields:

```txt
installation_id
repository_id
repository_full_name
repository_name
repository_url
private
status
created_date
updated_date
```

## Supported payload sources

The webhook extracts repository metadata from:

```txt
repositories_added
repositories_removed
repositories
repository
```

This covers:

- `installation` events,
- `installation_repositories` events,
- repository-scoped events that include `repository`.

## Status behavior

Repositories from `repositories_added`, `repositories`, or `repository` are stored as:

```txt
status = active
```

Repositories from `repositories_removed`, or installation events with `deleted` / `suspend`, are stored as:

```txt
status = removed
```

Records are upserted by:

```txt
installation_id + repository_id
```

## Dedupe improvement

Webhook delivery deduplication now happens before installation/repository metadata updates.

If a delivery is duplicate, the webhook returns:

```json
{
  "status": "duplicate",
  "installation_persistence": {
    "persisted": false,
    "reason": "duplicate delivery ignored before metadata updates"
  },
  "repository_link_persistence": {
    "persisted": false,
    "reason": "duplicate delivery ignored before metadata updates"
  }
}
```

## Diagnostics update

`base44RuntimeDiagnostics` and `/diagnostics` now show readiness for:

```txt
GitHubWebhookDelivery
GitHubInstallation
GitHubRepositoryLink
```

The required methods are:

```txt
filter
create
update
```

## What remains disabled

- installation access token creation,
- private repository file import,
- private PR diff fetch,
- automatic AI analysis,
- PR comments/checks/statuses,
- repository/project linking UI.

## Next recommended phase

Add a small UI page/card for installed GitHub repositories once diagnostics confirms `GitHubRepositoryLink` is available.

That UI should show:

- repository full name,
- private/public status,
- active/removed status,
- installation ID,
- whether it is linked to a CodebaseProject.

Private file import should still wait until installation access token creation is implemented safely.
