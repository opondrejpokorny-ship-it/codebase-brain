# Phase 17: Installation Access Token Helper Skeleton

Phase 17 adds a disabled-by-default helper function for future GitHub App installation access token work.

This phase is diagnostics/dry-run only. It does not create or return installation tokens, does not import private repository files, and does not call GitHub APIs.

## New function

```txt
base44/functions/githubInstallationTokenHelper/entry.ts
```

## Feature flags

```txt
GITHUB_APP_ENABLED=false
GITHUB_INSTALLATION_TOKEN_HELPER_ENABLED=false
GITHUB_INSTALLATION_TOKEN_DRY_RUN_ONLY=true
```

The helper requires both of these to be true before it can proceed to dry-run validation:

```txt
GITHUB_APP_ENABLED=true
GITHUB_INSTALLATION_TOKEN_HELPER_ENABLED=true
```

`GITHUB_INSTALLATION_TOKEN_DRY_RUN_ONLY` defaults to true.

## Required env

```txt
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
```

The helper reports only presence/length, never secret values.

## Request shape

```json
{
  "installation_id": 123456
}
```

## Response behavior

When disabled:

```json
{
  "status": "disabled",
  "token_returned": false,
  "github_writes_enabled": false,
  "private_import_started": false
}
```

When dry-run ready:

```json
{
  "status": "ready_for_dry_run",
  "dry_run_only": true,
  "can_request_installation_token_later": true,
  "token_returned": false
}
```

## Future non-dry-run flow

Later implementation should:

1. generate a GitHub App JWT using RS256,
2. call GitHub's installation token endpoint,
3. use the returned token only inside backend functions,
4. never expose token values to the frontend,
5. keep private import behind `GITHUB_PRIVATE_IMPORT_ENABLED`.

## Safety rules

The helper must never:

- return token values to UI,
- store token values in normal entities,
- log token values,
- import private code while dry-run is enabled,
- write to GitHub.

## Source basis

GitHub requires a GitHub App JWT to authenticate as the app or generate an installation access token. The JWT must be signed with RS256 and have a short expiration. The installation token should then be requested through GitHub's installation access token REST endpoint.

## Next recommended phase

Add a small UI/diagnostics control that can call `githubInstallationTokenHelper` in dry-run mode for a selected installation ID.

Only after this dry-run check succeeds should non-dry-run backend-only token creation be implemented.
