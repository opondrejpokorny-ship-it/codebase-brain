// MCP-lite search_codebase tool for Codebase Brain.
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

function words(value = ""): string[] {
  return [...new Set(String(value || "").toLowerCase().match(/[a-z0-9_.$/-]{2,}/g) || [])].slice(0, 30);
}

function snippets(content = "", queryWords: string[] = []): string[] {
  const lines = String(content || "").split("\n");
  const result: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].toLowerCase();
    if (queryWords.some((word) => line.includes(word))) {
      result.push(lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join("\n").slice(0, 700));
    }
    if (result.length >= 2) break;
  }
  return result;
}

function scoreFile(file: JsonMap, queryWords: string[]): JsonMap {
  const path = String(file.path || "");
  const content = String(file.content || "");
  const normalizedPath = path.toLowerCase();
  const normalizedContent = content.slice(0, 20000).toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  for (const word of queryWords) {
    if (normalizedPath.includes(word)) {
      score += 40;
      reasons.push(`Path matches ${word}`);
    }
    if (normalizedContent.includes(word)) {
      score += 10;
      reasons.push(`Content contains ${word}`);
    }
  }

  if (/api|route|server|webhook|auth|payment|billing|schema|admin/i.test(path)) {
    score += 8;
    reasons.push("High-signal project file");
  }

  return {
    path,
    score,
    reasons: [...new Set(reasons)].slice(0, 5),
    snippet: snippets(content, queryWords)[0] || String(file.summary || "").slice(0, 700),
    language: file.language || "unknown",
  };
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await readBody(request);
  const projectId = body.project_id || body.projectId;
  const query = String(body.query || "").trim();
  const limit = Math.min(Number(body.limit || 10), 25);

  if (!projectId) return jsonResponse({ error: "project_id is required" }, 400);
  if (!query) return jsonResponse({ error: "query is required" }, 400);

  const codeFile = entity("CodeFile");
  if (!codeFile?.filter) {
    return jsonResponse({ error: "CodeFile entity API is not available in this function runtime", results: [] }, 200);
  }

  const files = await codeFile.filter({ project_id: projectId });
  const queryWords = words(query);
  const results = (files || [])
    .map((file: JsonMap) => scoreFile(file, queryWords))
    .filter((item: JsonMap) => item.score > 0)
    .sort((a: JsonMap, b: JsonMap) => b.score - a.score)
    .slice(0, limit);

  return jsonResponse({
    tool: "search_codebase",
    project_id: projectId,
    query,
    results,
    source: "base44_function_light_index",
  });
}

Deno.serve(handleRequest);
