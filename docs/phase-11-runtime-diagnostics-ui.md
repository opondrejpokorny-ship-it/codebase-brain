# Phase 11: Runtime Diagnostics UI

Phase 11 adds a frontend page for running the Base44 runtime diagnostics function from inside the app.

This avoids requiring curl/manual endpoint testing after deploy.

## New page

```txt
src/pages/RuntimeDiagnostics.jsx
```

## New route

```txt
/diagnostics
```

## Dashboard entrypoint

The dashboard now includes a **Diagnostics** button next to **Add Repository**.

The empty-state card also includes **Run Diagnostics** so setup can be verified before creating a project.

## What the page does

The page calls:

```txt
base44.functions.invoke("base44RuntimeDiagnostics", {})
```

And displays:

- runtime support for `Deno`, `crypto.subtle`, and `fetch`,
- whether `globalThis.base44` exists,
- whether `base44.entities` exists,
- which expected entity APIs are present,
- whether `GitHubWebhookDelivery` has `filter/create/update`,
- safe env presence flags,
- raw diagnostics JSON for debugging.

## Important signal

Webhook delivery persistence is considered ready only when this is true:

```txt
GitHubWebhookDelivery.present = true
GitHubWebhookDelivery.methods.filter = true
GitHubWebhookDelivery.methods.create = true
GitHubWebhookDelivery.methods.update = true
```

## Safety

The UI only displays what the diagnostics function returns.

The diagnostics function itself never returns secret values, only:

```txt
present
enabled
length
```

for environment variables.

## Next recommended phase

Run `/diagnostics` after deploying Base44 functions.

Then:

1. If entity access is present, create/configure `GitHubWebhookDelivery` and test duplicate webhook logging.
2. If entity access is missing, replace the webhook persistence adapter with the confirmed official Base44 server-side entity API.
3. Only after that, add installation metadata storage.
