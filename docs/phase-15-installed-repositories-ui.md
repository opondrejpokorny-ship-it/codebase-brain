# Phase 15: Installed Repository Links UI

Phase 15 adds a frontend UI for viewing and manually linking GitHub App repository metadata records.

This is still metadata-only. It does not create installation access tokens, import private files, run PR analysis, or write to GitHub.

## New page

```txt
src/pages/InstalledRepositories.jsx
```

## New route

```txt
/github/repositories
```

## Dashboard entrypoint

The dashboard now has a **GitHub Repos** button next to **Diagnostics** and **Add Repository**.

## Entity expected

```txt
GitHubRepositoryLink
```

The page reads repository link metadata from this entity and expects fields such as:

```txt
installation_id
repository_id
repository_full_name
repository_name
repository_url
private
status
project_id
linked_status
linked_at
updated_date
```

## What the page shows

- active repositories count,
- private repositories count,
- linked repositories count,
- repository full name,
- public/private badge,
- active/removed status,
- installation ID,
- repository ID,
- GitHub URL,
- linked Codebase Project selector.

## Manual linking

The page allows a user to link a repository metadata record to an existing `CodebaseProject` by setting:

```txt
project_id
linked_status
linked_at
updated_date
```

Unlinking clears `project_id` and sets `linked_status = unlinked`.

## Safety

This UI only updates local Codebase Brain metadata.

It does not:

- fetch repository files,
- call GitHub,
- create installation tokens,
- run AI analysis,
- post comments/checks/statuses.

## Error behavior

If `GitHubRepositoryLink` or `CodebaseProject` entity access is unavailable, the page shows a warning and links to `/diagnostics`.

## Next recommended phase

Add a private import readiness card on project detail:

- if project is `url_only`,
- and there is an active `GitHubRepositoryLink` linked to the project,
- show that private import can be enabled only after installation token support is implemented.

Actual private file import should still wait for safe installation access token creation.
