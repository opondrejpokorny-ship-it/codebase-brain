// MCP-lite suggest_tests tool for Codebase Brain.
// Deterministic, read-only, structured JSON.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Deno: any;
type JsonMap = Record<string, any>;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-requested-with",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: JsonMap, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function readBody(request: Request): Promise<JsonMap> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch (_) {
    return {};
  }
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 80);
  return [];
}

function inferDomains(changedFiles: string[] = [], diffText = ""): string[] {
  const text = `${changedFiles.join("\n")}\n${diffText}`.toLowerCase();
  const domains: string[] = [];
  if (/auth|login|session|permission|role|admin/.test(text)) domains.push("auth");
  if (/payment|checkout|refund|credit|billing|subscription/.test(text)) domains.push("payment");
  if (/webhook|api|route|server|function/.test(text)) domains.push("api");
  if (/schema|migration|database|entity|storage/.test(text)) domains.push("data");
  if (/component|page|jsx|tsx|css|scss/.test(text)) domains.push("ui");
  if (/test|spec|playwright|cypress|vitest|jest/.test(text)) domains.push("tests");
  return [...new Set(domains)];
}

function buildManualTests(domains: string[], changedFiles: string[]): string[] {
  const tests = ["Open the changed flow in the app and confirm the happy path still works."];
  if (domains.includes("auth")) tests.push("Test login/logout, role-restricted pages, and denied-access behavior.");
  if (domains.includes("payment")) tests.push("Test successful payment/credit flow and one failure/refund edge case using a safe test account.");
  if (domains.includes("api")) tests.push("Call the changed API/backend function with valid and invalid input.");
  if (domains.includes("data")) tests.push("Verify create/update/delete persistence and check existing records still load correctly.");
  if (domains.includes("ui")) tests.push("Check the changed screen on desktop and mobile widths.");
  if (changedFiles.length > 5) tests.push("Run a quick smoke test across the main navigation because multiple files changed.");
  return tests;
}

function buildAutomatedTests(domains: string[]): string[] {
  const tests = ["Run the existing unit/integration test suite for the affected package if available."];
  if (domains.includes("auth")) tests.push("Add or run tests for allowed role, denied role, and unauthenticated user.");
  if (domains.includes("payment")) tests.push("Add or run tests for success, provider error, duplicate request, and refund/credit accounting.");
  if (domains.includes("api")) tests.push("Add or run request-level tests for required fields, validation errors, and success response shape.");
  if (domains.includes("data")) tests.push("Add or run persistence tests around schema/entity compatibility.");
  if (domains.includes("ui")) tests.push("Add or run component/e2e test for the changed user path.");
  return tests;
}

function buildEdgeCases(domains: string[]): string[] {
  const cases = ["Empty or missing input", "Network/API failure", "User refreshes or repeats the action"];
  if (domains.includes("auth")) cases.push("Expired session", "User without required role");
  if (domains.includes("payment")) cases.push("Duplicate payment attempt", "Payment succeeds but local update fails", "Partial refund/credit mismatch");
  if (domains.includes("data")) cases.push("Existing older records with missing fields");
  return [...new Set(cases)];
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await readBody(request);
  const projectId = body.project_id || body.projectId || null;
  const changedFiles = normalizeList(body.changed_files || body.changedFiles);
  const diffText = String(body.diff_text || body.diffText || "");
  const domains = inferDomains(changedFiles, diffText);

  return jsonResponse({
    tool: "suggest_tests",
    project_id: projectId,
    changed_files: changedFiles,
    inferred_domains: domains,
    manual_tests: buildManualTests(domains, changedFiles),
    automated_tests: buildAutomatedTests(domains),
    edge_cases: buildEdgeCases(domains),
    missing_context: [
      "This tool does not run tests.",
      "It cannot know project-specific test commands unless they are present in stored files or provided by the caller.",
    ],
    source: "base44_function_light_index",
  });
}

Deno.serve(handleRequest);
