// GitHub installation access token helper skeleton for Codebase Brain.
// Safe default: dry-run only, no token value is returned, no private repo import.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Deno: any;

type JsonMap = Record<string, any>;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-requested-with",
  "Access-Control-Max-Age": "86400",
};

const REQUIRED_ENV_KEYS = [
  "GITHUB_APP_ID",
  "GITHUB_APP_PRIVATE_KEY",
];

function jsonResponse(body: JsonMap, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function env(name: string): string | null {
  try {
    return Deno?.env?.get?.(name) || null;
  } catch (_) {
    return null;
  }
}

function envFlag(name: string): boolean {
  const value = String(env(name) || "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function envPresence(name: string): JsonMap {
  const value = env(name);
  return {
    present: Boolean(value),
    length: value ? String(value).length : 0,
  };
}

function helperEnabled(): boolean {
  return envFlag("GITHUB_APP_ENABLED") && envFlag("GITHUB_INSTALLATION_TOKEN_HELPER_ENABLED");
}

function dryRunOnly(): boolean {
  const raw = env("GITHUB_INSTALLATION_TOKEN_DRY_RUN_ONLY");
  if (raw == null || raw === "") return true;
  return envFlag("GITHUB_INSTALLATION_TOKEN_DRY_RUN_ONLY");
}

async function readBody(request: Request): Promise<JsonMap> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch (_) {
    return {};
  }
}

function validateInstallationId(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function diagnostics(installationId: number | null): JsonMap {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !env(key));
  return {
    status: helperEnabled() ? "ready_for_dry_run" : "disabled",
    helper_enabled: helperEnabled(),
    dry_run_only: dryRunOnly(),
    installation_id_present: Boolean(installationId),
    installation_id: installationId,
    required_env: Object.fromEntries(REQUIRED_ENV_KEYS.map((key) => [key, envPresence(key)])),
    missing_env: missing,
    can_request_installation_token_later: Boolean(helperEnabled() && installationId && missing.length === 0),
    token_returned: false,
    github_writes_enabled: false,
    private_import_started: false,
    notes: [
      "This helper is intentionally dry-run only in this phase.",
      "It validates configuration for a future GitHub App installation token request without returning token values.",
      "Token creation should remain backend-only and must never expose installation tokens to the frontend.",
    ],
  };
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await readBody(request);
  const installationId = validateInstallationId(body.installation_id || body.installationId);

  if (!helperEnabled()) {
    return jsonResponse({
      ...diagnostics(installationId),
      reason: "GITHUB_APP_ENABLED and GITHUB_INSTALLATION_TOKEN_HELPER_ENABLED must both be true before this helper can proceed.",
    });
  }

  if (!installationId) {
    return jsonResponse({
      ...diagnostics(null),
      error: "Missing or invalid installation_id",
    }, 400);
  }

  if (dryRunOnly()) {
    return jsonResponse({
      ...diagnostics(installationId),
      reason: "Dry-run mode is enabled. No JWT or installation token was created.",
    });
  }

  // Future phase:
  // 1. Generate a GitHub App JWT using RS256 with GITHUB_APP_PRIVATE_KEY.
  // 2. POST /app/installations/{installation_id}/access_tokens with Authorization: Bearer <JWT>.
  // 3. Use the returned token only inside backend functions.
  // 4. Never return the token value to the frontend.
  // 5. Keep private import behind GITHUB_PRIVATE_IMPORT_ENABLED.

  return jsonResponse({
    ...diagnostics(installationId),
    status: "not_implemented",
    reason: "Non-dry-run token creation is intentionally not implemented in this skeleton phase.",
  });
}

Deno.serve(handleRequest);
