// MCP-lite explain_file tool for Codebase Brain.
// Read-only. Returns structured JSON. No GitHub writes.

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

function extractImports(content = ""): string[] {
  const imports: string[] = [];
  const patterns = [
    /import\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /export\s+[^'";]+?\s+from\s+["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) imports.push(match[1]);
  }
  return [...new Set(imports)].slice(0, 80);
}

function extractSymbols(content = ""): JsonMap[] {
  const symbols: JsonMap[] = [];
  const patterns = [
    { kind: "function", pattern: /function\s+([A-Za-z0-9_$]+)\s*\(/g },
    { kind: "class", pattern: /class\s+([A-Za-z0-9_$]+)/g },
    { kind: "constant", pattern: /export\s+const\s+([A-Za-z0-9_$]+)\s*=/g },
    { kind: "python_function", pattern: /def\s+([A-Za-z0-9_]+)\s*\(/g },
  ];
  for (const { kind, pattern } of patterns) {
    let match;
    while ((match = pattern.exec(content))) symbols.push({ name: match[1], kind });
  }
  return symbols.slice(0, 80);
}

function riskHints(path = "", content = ""): string[] {
  const text = `${path}\n${content.slice(0, 12000)}`.toLowerCase();
  const hints: string[] = [];
  if (/auth|login|session|permission|role|admin/.test(text)) hints.push("Auth or permission related");
  if (/payment|checkout|refund|credit|billing|subscription/.test(text)) hints.push("Payment or billing related");
  if (/webhook|api|route|server|function/.test(text)) hints.push("API/backend flow related");
  if (/schema|migration|database|entity|storage/.test(text)) hints.push("Data persistence related");
  return hints;
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await readBody(request);
  const projectId = body.project_id || body.projectId;
  const path = String(body.path || "").trim();

  if (!projectId) return jsonResponse({ error: "project_id is required" }, 400);
  if (!path) return jsonResponse({ error: "path is required" }, 400);

  const codeFile = entity("CodeFile");
  const relationEntity = entity("CodeRelation");
  if (!codeFile?.filter) {
    return jsonResponse({ error: "CodeFile entity API is not available in this function runtime" }, 200);
  }

  const matches = await codeFile.filter({ project_id: projectId, path });
  const file = matches?.[0];
  if (!file) return jsonResponse({ error: "File not found in stored project sample", path }, 404);

  const content = String(file.content || "");
  const persistedRelations = relationEntity?.filter ? await relationEntity.filter({ project_id: projectId }).catch(() => []) : [];
  const imports = extractImports(content);
  const importedBy = (persistedRelations || []).filter((relation: JsonMap) => relation.to_file === path).map((relation: JsonMap) => relation.from_file).slice(0, 50);

  return jsonResponse({
    tool: "explain_file",
    project_id: projectId,
    path,
    summary: file.summary || `Stored ${file.language || "unknown"} file with ${content.length} characters.`,
    imports,
    imported_by: [...new Set(importedBy)],
    symbols: extractSymbols(content),
    risks: riskHints(path, content),
    source: "base44_function_light_index",
  });
}

Deno.serve(handleRequest);
