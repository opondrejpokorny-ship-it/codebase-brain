// GitHub App webhook receiver skeleton for Codebase Brain.
// Safe default: all processing is disabled unless feature flags are enabled.
// No GitHub writes. No PR comments. No private code import yet.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Deno: any;

type JsonMap = Record<string, any>;

type DeliveryPersistenceResult = {
  persisted: boolean;
  duplicate: boolean;
  reason?: string;
  record_id?: string | null;
};

type InstallationPersistenceResult = {
  persisted: boolean;
  reason?: string;
  record_id?: string | null;
  repositories_added?: number;
  repositories_removed?: number;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-github-event, x-github-delivery, x-hub-signature-256, x-hub-signature",
  "Access-Control-Max-Age": "86400",
};

const SUPPORTED_EVENTS = new Set(["ping", "installation", "installation_repositories", "pull_request"]);
const SUPPORTED_PR_ACTIONS = new Set(["opened", "reopened", "synchronize", "ready_for_review"]);
const SUPPORTED_INSTALLATION_ACTIONS = new Set(["created", "deleted", "suspend", "unsuspend"]);
const SUPPORTED_INSTALLATION_REPOSITORIES_ACTIONS = new Set(["added", "removed"]);

function jsonResponse(body: JsonMap, status = 200): Response {
  return new Response(JSON.stringify(body), {
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

function processingEnabled(): boolean {
  return envFlag("GITHUB_APP_ENABLED") && envFlag("GITHUB_WEBHOOK_PROCESSING_ENABLED");
}

function deliveryLoggingEnabled(): boolean {
  return processingEnabled() && envFlag("GITHUB_WEBHOOK_DELIVERY_LOGGING_ENABLED");
}

function installationLoggingEnabled(): boolean {
  return processingEnabled() && envFlag("GITHUB_INSTALLATION_LOGGING_ENABLED");
}

function header(request: Request, name: string): string {
  return request.headers.get(name) || request.headers.get(name.toLowerCase()) || "";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
}

async function verifyGithubSignature(request: Request, rawBody: string): Promise<{ ok: boolean; reason?: string }> {
  const secret = env("GITHUB_WEBHOOK_SECRET");
  if (!secret) return { ok: false, reason: "GITHUB_WEBHOOK_SECRET is missing" };

  const signatureHeader = header(request, "X-Hub-Signature-256");
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return { ok: false, reason: "X-Hub-Signature-256 is missing or invalid" };
  }

  const expected = `sha256=${await hmacSha256Hex(secret, rawBody)}`;
  return {
    ok: timingSafeEqual(expected, signatureHeader),
    reason: "signature mismatch",
  };
}

function safeRepositoryFullName(payload: JsonMap): string | null {
  return payload?.repository?.full_name || payload?.repositories?.[0]?.full_name || null;
}

function safePullRequestNumber(payload: JsonMap): number | null {
  const number = payload?.pull_request?.number || payload?.number;
  return Number.isFinite(Number(number)) ? Number(number) : null;
}

function classifyEvent(event: string, action: string | null): { status: string; reason: string } {
  if (!SUPPORTED_EVENTS.has(event)) {
    return { status: "ignored", reason: `unsupported event: ${event || "unknown"}` };
  }

  if (event === "ping") {
    return { status: "processed", reason: "ping acknowledged" };
  }

  if (event === "installation" && !SUPPORTED_INSTALLATION_ACTIONS.has(action || "")) {
    return { status: "ignored", reason: `unsupported installation action: ${action || "unknown"}` };
  }

  if (event === "installation_repositories" && !SUPPORTED_INSTALLATION_REPOSITORIES_ACTIONS.has(action || "")) {
    return { status: "ignored", reason: `unsupported installation_repositories action: ${action || "unknown"}` };
  }

  if (event === "pull_request" && !SUPPORTED_PR_ACTIONS.has(action || "")) {
    return { status: "ignored", reason: `unsupported pull_request action: ${action || "unknown"}` };
  }

  return { status: "received", reason: "supported but processing is not implemented beyond safe logging" };
}

function buildDeliverySnapshot(request: Request, payload: JsonMap, status: string, reason: string): JsonMap {
  const event = header(request, "X-GitHub-Event") || "unknown";
  const deliveryId = header(request, "X-GitHub-Delivery") || null;
  const action = payload?.action || null;
  const installationId = payload?.installation?.id || null;
  const repositoryFullName = safeRepositoryFullName(payload);
  const prNumber = safePullRequestNumber(payload);

  return {
    delivery_id: deliveryId,
    event,
    action,
    installation_id: installationId,
    repository_full_name: repositoryFullName,
    pr_number: prNumber,
    status,
    reason,
    received_at: new Date().toISOString(),
  };
}

function buildInstallationSnapshot(payload: JsonMap): JsonMap | null {
  const installation = payload?.installation;
  if (!installation?.id) return null;

  return {
    installation_id: installation.id,
    account_login: installation.account?.login || null,
    account_type: installation.account?.type || null,
    account_id: installation.account?.id || null,
    repository_selection: installation.repository_selection || null,
    app_id: installation.app_id || null,
    app_slug: installation.app_slug || null,
    permissions: installation.permissions || {},
    events: installation.events || [],
    status: payload?.action === "deleted" || payload?.action === "suspend" ? "inactive" : "active",
    last_action: payload?.action || null,
    updated_date: new Date().toISOString(),
  };
}

async function parsePayload(rawBody: string): Promise<{ payload: JsonMap | null; error?: string }> {
  try {
    return { payload: JSON.parse(rawBody || "{}") };
  } catch (error) {
    return { payload: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function entityApi(entityName: string): any | null {
  try {
    const candidate = (globalThis as any)?.base44?.entities?.[entityName];
    if (candidate?.filter && candidate?.create && candidate?.update) return candidate;
    return null;
  } catch (_) {
    return null;
  }
}

function deliveryEntityApi(): any | null {
  return entityApi("GitHubWebhookDelivery");
}

function installationEntityApi(): any | null {
  return entityApi("GitHubInstallation");
}

async function persistDeliverySnapshot(delivery: JsonMap): Promise<DeliveryPersistenceResult> {
  if (!deliveryLoggingEnabled()) {
    return {
      persisted: false,
      duplicate: false,
      reason: "GITHUB_WEBHOOK_DELIVERY_LOGGING_ENABLED is disabled",
    };
  }

  if (!delivery.delivery_id) {
    return {
      persisted: false,
      duplicate: false,
      reason: "missing X-GitHub-Delivery header",
    };
  }

  const entity = deliveryEntityApi();
  if (!entity) {
    return {
      persisted: false,
      duplicate: false,
      reason: "Base44 GitHubWebhookDelivery entity API is not available in this function runtime",
    };
  }

  try {
    const existing = await entity.filter({ delivery_id: delivery.delivery_id });
    if (Array.isArray(existing) && existing.length > 0) {
      const record = existing[0];
      return {
        persisted: true,
        duplicate: true,
        record_id: record?.id || null,
        reason: "duplicate delivery ignored",
      };
    }

    const created = await entity.create({
      ...delivery,
      processed_at: new Date().toISOString(),
    });

    return {
      persisted: true,
      duplicate: false,
      record_id: created?.id || null,
    };
  } catch (error) {
    return {
      persisted: false,
      duplicate: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function persistInstallationSnapshot(payload: JsonMap): Promise<InstallationPersistenceResult> {
  const event = payload?.zen ? "ping" : null;
  const action = payload?.action || null;
  const isInstallationEvent = Boolean(payload?.installation?.id && (payload?.repositories_added || payload?.repositories_removed || action));

  if (!installationLoggingEnabled()) {
    return {
      persisted: false,
      reason: "GITHUB_INSTALLATION_LOGGING_ENABLED is disabled",
    };
  }

  if (event === "ping" || !isInstallationEvent) {
    return {
      persisted: false,
      reason: "not an installation metadata event",
    };
  }

  const snapshot = buildInstallationSnapshot(payload);
  if (!snapshot) {
    return {
      persisted: false,
      reason: "missing installation.id",
    };
  }

  const entity = installationEntityApi();
  if (!entity) {
    return {
      persisted: false,
      reason: "Base44 GitHubInstallation entity API is not available in this function runtime",
    };
  }

  try {
    const existing = await entity.filter({ installation_id: snapshot.installation_id });
    if (Array.isArray(existing) && existing.length > 0) {
      const record = existing[0];
      const updated = await entity.update(record.id, snapshot);
      return {
        persisted: true,
        record_id: updated?.id || record?.id || null,
        repositories_added: Array.isArray(payload?.repositories_added) ? payload.repositories_added.length : 0,
        repositories_removed: Array.isArray(payload?.repositories_removed) ? payload.repositories_removed.length : 0,
      };
    }

    const created = await entity.create({
      ...snapshot,
      created_date: new Date().toISOString(),
    });

    return {
      persisted: true,
      record_id: created?.id || null,
      repositories_added: Array.isArray(payload?.repositories_added) ? payload.repositories_added.length : 0,
      repositories_removed: Array.isArray(payload?.repositories_removed) ? payload.repositories_removed.length : 0,
    };
  } catch (error) {
    return {
      persisted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const event = header(request, "X-GitHub-Event") || "unknown";
  const deliveryId = header(request, "X-GitHub-Delivery") || null;

  // Safe default: acknowledge but do not process while feature flags are disabled.
  // This lets the endpoint be deployed without causing GitHub retries or side effects.
  if (!processingEnabled()) {
    return jsonResponse({
      status: "ignored",
      reason: "GitHub webhook processing is disabled by feature flags",
      event,
      delivery_id: deliveryId,
      persistence: {
        persisted: false,
        duplicate: false,
        reason: "processing disabled",
      },
      installation_persistence: {
        persisted: false,
        reason: "processing disabled",
      },
      feature_flags: {
        GITHUB_APP_ENABLED: envFlag("GITHUB_APP_ENABLED"),
        GITHUB_WEBHOOK_PROCESSING_ENABLED: envFlag("GITHUB_WEBHOOK_PROCESSING_ENABLED"),
        GITHUB_WEBHOOK_DELIVERY_LOGGING_ENABLED: envFlag("GITHUB_WEBHOOK_DELIVERY_LOGGING_ENABLED"),
        GITHUB_INSTALLATION_LOGGING_ENABLED: envFlag("GITHUB_INSTALLATION_LOGGING_ENABLED"),
        GITHUB_PRIVATE_IMPORT_ENABLED: envFlag("GITHUB_PRIVATE_IMPORT_ENABLED"),
        GITHUB_AUTO_ANALYZE_PRS: envFlag("GITHUB_AUTO_ANALYZE_PRS"),
        GITHUB_PR_POSTING_ENABLED: envFlag("GITHUB_PR_POSTING_ENABLED"),
      },
    });
  }

  const rawBody = await request.text();
  const signature = await verifyGithubSignature(request, rawBody);
  if (!signature.ok) {
    return jsonResponse({ error: "Invalid GitHub webhook signature", reason: signature.reason }, 401);
  }

  const parsed = await parsePayload(rawBody);
  if (!parsed.payload) {
    return jsonResponse({ error: "Malformed JSON payload", reason: parsed.error }, 400);
  }

  const payload = parsed.payload;
  const action = payload?.action || null;
  const classification = classifyEvent(event, action);
  const delivery = buildDeliverySnapshot(request, payload, classification.status, classification.reason);
  const persistence = await persistDeliverySnapshot(delivery);
  const installationPersistence = await persistInstallationSnapshot(payload);

  if (persistence.duplicate) {
    return jsonResponse({
      status: "duplicate",
      reason: "duplicate delivery ignored",
      delivery,
      persistence,
      installation_persistence: installationPersistence,
      writes_enabled: false,
      analysis_started: false,
    });
  }

  // TODO Phase 13:
  // - provide a confirmed Base44 entity API binding if the runtime does not expose globalThis.base44
  // - store GitHubRepositoryLink metadata from installation_repositories events
  // - for pull_request events, enqueue internal analysis only when GITHUB_AUTO_ANALYZE_PRS=true
  // - never write to GitHub unless GITHUB_PR_POSTING_ENABLED=true and a user-approved posting flow exists

  return jsonResponse({
    status: classification.status,
    reason: classification.reason,
    delivery,
    persistence,
    installation_persistence: installationPersistence,
    writes_enabled: false,
    analysis_started: false,
  });
}

Deno.serve(handleRequest);
