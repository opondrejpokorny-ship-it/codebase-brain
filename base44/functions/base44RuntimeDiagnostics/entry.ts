// Base44 runtime diagnostics for Codebase Brain.
// Safe-by-default: reports capability presence only, never secret values.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Deno: any;

type JsonMap = Record<string, any>;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-requested-with",
  "Access-Control-Max-Age": "86400",
};

const ENV_KEYS = [
  "GITHUB_APP_ENABLED",
  "GITHUB_WEBHOOK_PROCESSING_ENABLED",
  "GITHUB_WEBHOOK_DELIVERY_LOGGING_ENABLED",
  "GITHUB_INSTALLATION_LOGGING_ENABLED",
  "GITHUB_REPOSITORY_LINK_LOGGING_ENABLED",
  "GITHUB_INSTALLATION_TOKEN_HELPER_ENABLED",
  "GITHUB_INSTALLATION_TOKEN_DRY_RUN_ONLY",
  "GITHUB_PRIVATE_IMPORT_ENABLED",
  "GITHUB_AUTO_ANALYZE_PRS",
  "GITHUB_PR_POSTING_ENABLED",
  "GITHUB_WEBHOOK_SECRET",
  "GITHUB_APP_ID",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_TOKEN",
  "CODEBASE_BRAIN_GITHUB_TOKEN",
  "OPENAI_API_KEY",
];

const ENTITY_NAMES = [
  "CodebaseProject",
  "CodeFile",
  "CodebaseChatMessage",
  "CodebaseAnalysis",
  "GitHubWebhookDelivery",
  "GitHubInstallation",
  "GitHubRepositoryLink",
  "PullRequestAnalysis",
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

function maskEnvPresence(name: string): JsonMap {
  const value = env(name);
  return {
    present: Boolean(value),
    enabled: envFlag(name),
    length: value ? String(value).length : 0,
  };
}

function getBase44Candidate(): any | null {
  try {
    return (globalThis as any)?.base44 || null;
  } catch (_) {
    return null;
  }
}

function methodPresence(entity: any): JsonMap {
  return {
    filter: typeof entity?.filter === "function",
    create: typeof entity?.create === "function",
    update: typeof entity?.update === "function",
    delete: typeof entity?.delete === "function",
    get: typeof entity?.get === "function",
    list: typeof entity?.list === "function",
  };
}

function inspectEntityApis(base44: any): JsonMap {
  const entities = base44?.entities || null;
  const result: JsonMap = {
    entities_present: Boolean(entities),
    available_entity_names: entities && typeof entities === "object" ? Object.keys(entities).slice(0, 50) : [],
    expected_entities: {},
  };

  for (const entityName of ENTITY_NAMES) {
    const entity = entities?.[entityName];
    result.expected_entities[entityName] = {
      present: Boolean(entity),
      methods: methodPresence(entity),
    };
  }

  return result;
}

function readyForEntityWrites(entityInfo: JsonMap | undefined): boolean {
  return Boolean(entityInfo?.present && entityInfo?.methods?.filter && entityInfo?.methods?.create && entityInfo?.methods?.update);
}

function inspectRuntime(): JsonMap {
  const base44 = getBase44Candidate();
  const entityInspection = inspectEntityApis(base44);
  const expected = entityInspection.expected_entities || {};
  const appIdPresent = Boolean(env("GITHUB_APP_ID"));
  const privateKeyPresent = Boolean(env("GITHUB_APP_PRIVATE_KEY"));

  return {
    timestamp: new Date().toISOString(),
    runtime: {
      deno_present: typeof Deno !== "undefined",
      crypto_subtle_present: Boolean(globalThis.crypto?.subtle),
      fetch_present: typeof fetch === "function",
    },
    env_presence: Object.fromEntries(ENV_KEYS.map((key) => [key, maskEnvPresence(key)])),
    readiness: {
      webhook_delivery_logging_ready: readyForEntityWrites(expected.GitHubWebhookDelivery),
      installation_logging_ready: readyForEntityWrites(expected.GitHubInstallation),
      repository_link_logging_ready: readyForEntityWrites(expected.GitHubRepositoryLink),
      installation_token_helper_dry_run_ready: Boolean(envFlag("GITHUB_APP_ENABLED") && envFlag("GITHUB_INSTALLATION_TOKEN_HELPER_ENABLED") && appIdPresent && privateKeyPresent),
      pull_request_analysis_ready: readyForEntityWrites(expected.PullRequestAnalysis),
    },
    base44: {
      global_present: Boolean(base44),
      keys: base44 && typeof base44 === "object" ? Object.keys(base44).slice(0, 50) : [],
      functions_present: Boolean(base44?.functions),
      integrations_present: Boolean(base44?.integrations),
      entities: entityInspection,
    },
    notes: [
      "This endpoint reports capability presence only and never returns secret values.",
      "If globalThis.base44.entities.GitHubWebhookDelivery is not present, webhook delivery persistence must use a different official Base44 server-side entity API.",
      "If GitHubInstallation is not present, installation metadata persistence remains disabled even when the feature flag is enabled.",
      "If GitHubRepositoryLink is not present, repository link metadata persistence remains disabled even when the feature flag is enabled.",
      "Installation token helper readiness only confirms env/config presence. Token generation remains dry-run-only until a later phase.",
    ],
  };
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  return jsonResponse(inspectRuntime());
}

Deno.serve(handleRequest);
