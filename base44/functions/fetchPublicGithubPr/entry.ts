// Public GitHub PR fetch function for Codebase Brain.
// Public PRs only. No GitHub App. No comments. No writes.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Deno: any;

const MAX_PATCH_CHARS = 90_000;
const MAX_FILES = 100;
const MAX_FILE_PATCH_CHARS = 12_000;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-requested-with",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function readBody(request: Request): Promise<any> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch (_) {
    return {};
  }
}

function parseGithubPullRequestUrl(url = ""): { owner: string; repo: string; prNumber: number } | null {
  const trimmed = String(url || "").trim();
  const match = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)\/pull\/(\d+)(?:[\s/#?].*)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/i, ""), prNumber: Number(match[3]) };
}

function optionalGithubToken(): string | null {
  try {
    return Deno?.env?.get?.("GITHUB_TOKEN") || Deno?.env?.get?.("CODEBASE_BRAIN_GITHUB_TOKEN") || null;
  } catch (_) {
    return null;
  }
}

function githubHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = optionalGithubToken();
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "codebase-brain-base44",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, { headers: githubHeaders() });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) throw new Error(body?.message || "GitHub rate limit or permission error.");
    if (response.status === 404) throw new Error("GitHub pull request not found or not publicly accessible.");
    throw new Error(body?.message ? `GitHub request failed: ${body.message}` : `GitHub request failed: ${response.status}`);
  }
  return body;
}

async function fetchText(url: string, accept: string): Promise<string> {
  const response = await fetch(url, { headers: githubHeaders({ Accept: accept }) });
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 403) throw new Error("GitHub rate limit or permission error while fetching PR patch.");
    if (response.status === 404) throw new Error("GitHub PR patch not found or not publicly accessible.");
    throw new Error(text ? `GitHub request failed: ${text.slice(0, 200)}` : `GitHub request failed: ${response.status}`);
  }
  return text;
}

function isBinaryFile(file: any): boolean {
  return !file?.patch && Number(file?.changes || 0) > 0;
}

async function fetchPublicGithubPr(prUrl: string): Promise<any> {
  const parsed = parseGithubPullRequestUrl(prUrl);
  if (!parsed) {
    throw new Error("Please enter a valid public GitHub pull request URL, for example https://github.com/owner/repo/pull/123.");
  }

  const { owner, repo, prNumber } = parsed;
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`;
  const warnings: string[] = [];

  const [prMeta, files, rawPatch] = await Promise.all([
    fetchJson(apiBase),
    fetchJson(`${apiBase}/files?per_page=${MAX_FILES}`),
    fetchText(apiBase, "application/vnd.github.v3.patch"),
  ]);

  const changedFilesRaw = Array.isArray(files) ? files.slice(0, MAX_FILES) : [];
  if (Number(prMeta.changed_files || changedFilesRaw.length) > MAX_FILES) warnings.push(`Only the first ${MAX_FILES} changed files were fetched.`);

  const filePatches = changedFilesRaw
    .filter((file) => !isBinaryFile(file))
    .map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: String(file.patch || "").slice(0, MAX_FILE_PATCH_CHARS),
      truncated: String(file.patch || "").length > MAX_FILE_PATCH_CHARS,
    }));

  const binarySkipped = changedFilesRaw.length - filePatches.length;
  if (binarySkipped > 0) warnings.push(`${binarySkipped} binary or patchless file(s) were skipped.`);

  const patchTruncated = rawPatch.length > MAX_PATCH_CHARS;
  if (patchTruncated) warnings.push(`Patch was truncated to ${MAX_PATCH_CHARS} characters.`);

  return {
    owner,
    repo,
    prNumber,
    title: prMeta.title || "",
    body: prMeta.body || "",
    baseBranch: prMeta.base?.ref || null,
    headBranch: prMeta.head?.ref || null,
    changedFiles: changedFilesRaw.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    })),
    patchText: rawPatch.slice(0, MAX_PATCH_CHARS),
    filePatches,
    warnings,
    source: "base44_backend_function",
    limits: {
      maxFiles: MAX_FILES,
      maxPatchChars: MAX_PATCH_CHARS,
      maxFilePatchChars: MAX_FILE_PATCH_CHARS,
    },
  };
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await readBody(request);
    const prUrl = body.prUrl || body.pr_url || body.url;
    const result = await fetchPublicGithubPr(prUrl);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
      source: "base44_backend_function",
    }, 400);
  }
}

Deno.serve(handleRequest);
