# Phase 10: Base44 Runtime Diagnostics

Phase 10 adds a safe diagnostics endpoint to verify what APIs are actually available inside the deployed Base44 function runtime.

This is needed because webhook delivery persistence depends on server-side entity access, and this repo does not yet prove the exact official Base44 runtime API for writing entities from functions.

## New function

```txt
base44/functions/base44RuntimeDiagnostics/entry.ts
```

## Purpose

The endpoint checks whether the function runtime exposes:

- `Deno`,
- `crypto.subtle`,
- `fetch`,
- `globalThis.base44`,
- `globalThis.base44.entities`,
- expected entity APIs such as `filter`, `create`, `update`, `delete`,
- selected environment variable presence.

## Safety

The endpoint never returns secret values.

For environment variables it returns only:

```json
{
  "present": true,
  "enabled": false,
  "length": 32
}
```

This allows us to verify configuration without exposing credentials.

## Expected entities checked

```txt
CodebaseProject
CodeFile
CodebaseChatMessage
CodebaseAnalysis
GitHubWebhookDelivery
GitHubInstallation
GitHubRepositoryLink
PullRequestAnalysis
```

## How to use

Deploy the Base44 app/functions, then call the diagnostics endpoint from a browser, curl, or Base44 function tester.

Expected good sign for webhook delivery persistence:

```json
{
  "base44": {
    "global_present": true,
    "entities": {
      "expected_entities": {
        "GitHubWebhookDelivery": {
          "present": true,
          "methods": {
            "filter": true,
            "create": true,
            "update": true
          }
        }
      }
    }
  }
}
```

If this is not present, Phase 9B remains safe but cannot actually persist deliveries until we replace the adapter with the correct official Base44 server-side entity API.

## What this phase does not do

- does not write entities,
- does not test webhook signatures,
- does not call GitHub,
- does not import repositories,
- does not run AI analysis,
- does not expose secret values.

## Next recommended phase

After diagnostics are run in the deployed environment:

1. If `globalThis.base44.entities` works, create/configure the `GitHubWebhookDelivery` entity and test duplicate delivery logging.
2. If not, update `githubWebhook` to use the confirmed official Base44 server-side entity API.
3. Then add GitHub installation metadata storage.
