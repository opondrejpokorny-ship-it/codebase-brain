# Phase 13: Private Repository URL-only Fallback

This phase improves the Add Repository flow for private or inaccessible GitHub repositories.

The app still does not import private repository files. Instead, it now creates a URL-only project when public GitHub import fails with a likely access error.

## Why

Before this phase, a private repository could cause project creation to fail with a GitHub `404` or `403` error.

GitHub can return `404` for private repositories when the current request does not have access. For the MVP, this should not block creating the project record.

## Updated files

```txt
src/pages/AddRepository.jsx
src/pages/ProjectDetail.jsx
```

## New behavior

When public import fails because the repository is likely private, missing, rate-limited, or inaccessible:

1. the project is still created,
2. no files are imported,
3. project status is set to `url_only`,
4. import metadata stores the failure reason,
5. the user sees a toast explaining that private import requires GitHub App/private access,
6. Project Detail displays the repository and an empty file state.

## New import metadata source

```txt
private_or_inaccessible_repository_placeholder
```

## New access mode

```txt
url_only_until_github_app_or_token
```

## What still does not happen

- no private repository files are fetched,
- no GitHub App token is created,
- no personal access token is requested,
- no private code is sent to AI,
- no automatic PR analysis is run.

## How to test

1. Open Add Repository.
2. Paste a private repository URL.
3. Keep public import checked.
4. Click Create Project.
5. Expected result: project is created with status `url_only`, not a blocking red failure.

## Future upgrade

Private repository import should be implemented through GitHub App installation access tokens, not through browser-side tokens.
