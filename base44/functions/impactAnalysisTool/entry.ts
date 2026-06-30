// MCP-lite impact_analysis tool for Codebase Brain.
// Deterministic, read-only, structured JSON. Does not call an LLM.

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

function entity(name: string): any | null {
  try {
    return (globalThis as any)?.base44?.entities?.[name] || null;
  } catch (_) {
    return null;
  }
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 80);
  return [];
}

function extractChangedFiles(diffText = ""): string[] {
  const files: string[] = [];
  for (const line of String(diffText || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    const diffGit = trimmed.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diffGit) files.push(diffGit[1], diffGit[2]);
    const plusFile = trimmed.match(/^\+\+\+ b\/(.+)$/);
    if (plusFile && plusFile[1] !== "/dev/null") files.push(plusFile[1]);
  }
  return [...new Set(files)].slice(0, 80);
}

function riskSignals(diffText = "", changedFiles: string[] = []): string[] {
  const text = `${changedFiles.join("\n")}\n${diffText}`.toLowerCase();
  const signals: string[] = [];
  if (/auth|login|session|permission|role|admin/.test(text)) signals.push("Authentication or authorization");
  if (/payment|checkout|refund|credit|billing|subscription/.test(text)) signals.push("Payment or billing flow");
  if (/schema|migration|database|entity|storage/.test(text)) signals.push("Data persistence");
  if (/webhook|api|route|server|function/.test(text)) signals.push("API or backend flow");
  if (/delete|remove|destroy|drop|truncate/.test(text)) signals.push("Destructive operation");
  if (/validate|validation|required|guard|permission|role/.test(text)) signals.push("Validation or guard logic");
  return [...new Set(signals)];
}

function riskLevel(signals: string[], changedFiles: string[]): string {
  const high = signals.filter((signal) => /Payment|Authentication|Data|Destructive/.test(signal)).length;
  if (high >= 2 || changedFiles.length >= 15) return "high";
  if (high === 1 || signals.length >= 3 || changedFiles.length >= 6) return "medium";
  return "low";
}

function recommendedTests(signals: string[]): string[] {
  const tests = ["Run the project test suite or the affected package tests if available."];
  if (signals.some((s) => /Authentication/.test(s))) tests.push("Test allowed user, denied user, and signed-out user behavior.");
  if (signals.some((s) => /Payment/.test(s))) tests.push("Test payment/credit success, provider failure, duplicate request, and refund edge case.");
  if (signals.some((s) => /Data/.test(s))) tests.push("Test existing records and new records against the changed persistence path.");
  if (signals.some((s) => /API/.test(s))) tests.push("Test backend/API success response and validation error response.");
  if (signals.some((s) => /Destructive/.test(s))) tests.push("Confirm destructive action has confirmation, permission check, and rollback/recovery path.");
  return tests;
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await readBody(request);
  const projectId = body.project_id || body.projectId;
  const diffText = String(body.diff_text || body.diffText || "");
  const changedFiles = [...new Set([...normalizeList(body.changed_files || body.changedFiles), ...extractChangedFiles(diffText)])];

  if (!projectId) return jsonResponse({ error: "project_id is required" }, 400);

  const relationEntity = entity("CodeRelation");
  const relations = relationEntity?.filter ? await relationEntity.filter({ project_id: projectId }).catch(() => []) : [];
  const relatedFiles = (relations || [])
    .filter((relation: JsonMap) => changedFiles.includes(relation.from_file) || changedFiles.includes(relation.to_file))
    .flatMap((relation: JsonMap) => [relation.from_file, relation.to_file])
    .filter(Boolean)
    .filter((path: string) => !changedFiles.includes(path));

  const signals = riskSignals(diffText, changedFiles);
  const level = riskLevel(signals, changedFiles);

  return jsonResponse({
    tool: "impact_analysis",
    project_id: projectId,
    risk_level: level,
    summary: changedFiles.length
      ? `Detected ${changedFiles.length} changed file(s) with ${signals.length} risk signal(s).`
      : "No changed files were detected from the provided input.",
    changed_files: changedFiles,
    related_files: [...new Set(relatedFiles)].slice(0, 50),
    risk_signals: signals,
    recommended_tests: recommendedTests(signals),
    missing_context: [
      relations?.length ? null : "Persisted CodeRelation records were not available, so graph proximity may be incomplete.",
      "This tool does not run tests or inspect CI results.",
      "Use the UI impact analysis for LLM-assisted reasoning over selected stored files.",
    ].filter(Boolean),
    source: "base44_function_light_index",
  });
}

Deno.serve(handleRequest);
