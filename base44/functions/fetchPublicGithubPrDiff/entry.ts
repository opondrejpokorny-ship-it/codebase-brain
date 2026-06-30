// Lightweight public GitHub PR diff fetch function for Codebase Brain.
// Public PRs only. No GitHub App. No comments. No writes.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Deno: any;

const MAX_DIFF_CHARS = 90_000;
const MAX_CHANGED_FILES = 100;

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

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ""),
    prNumber: Number(match[3]),
  };
}

function optionalGithubToken(): string | null {
  try {
    const token = Deno?.env?.get?.("GITHUB_TOKEN") || Deno?.env?.get?.("CODEBASE_BRAIN_GITHUB_TOKEN");
    return token || null;
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
    throw new Error(body?.message ? `GitHub request failed: ${body.message}` : `GitHub request failed: ${response.status}`);
  }
  return body;
}

async function fetchText(url: string, accept: string): Promise<string> {
  const response = await fetch(url, { headers: githubHeaders({ Accept: accept }) });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text ? `GitHub request failed: ${text.slice(0, 200)}` : `GitHub request failed: ${response.status}`);
  }
  return text;
}

async function fetchChangedFiles(owner: string, repo: string, prNumber: number): Promise<any[]> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/files?per_page=${MAX_CHANGED_FILES}`;
  const files = await fetchJson(url);
  if (!Array.isArray(files)) return [];
  return files.slice(0, MAX_CHANGED_FILES).map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
  }));
}

async function fetchPublicGithubPrDiff(prUrl: string): Promise<any> {
  const parsed = parseGithubPullRequestUrl(prUrl);
  if (!parsed) {
    throw new Error("Please enter a valid public GitHub pull request URL, for example https://github.com/owner/repo/pull/123.");
  }

  const { owner, repo, prNumber } = parsed;
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`;

  const [prMeta, changedFiles, rawDiff] = await Promise.all([
    fetchJson(apiBase),
    fetchChangedFiles(owner, repo, prNumber),
    fetchText(apiBase, "application/vnd.github.v3.diff"),
  ]);

  const truncated = rawDiff.length > MAX_DIFF_CHARS;
  const diff = rawDiff.slice(0, MAX_DIFF_CHARS);

  return {
    owner,
    repo,
    repositoryFullName: `${owner}/${repo}`,
    prNumber,
    title: prMeta.title || "",
    state: prMeta.state || "unknown",
    draft: Boolean(prMeta.draft),
    htmlUrl: prMeta.html_url || prUrl,
    baseRef: prMeta.base?.ref || null,
    headRef: prMeta.head?.ref || null,
    author: prMeta.user?.login || null,
    changedFiles,
    changedFilesCount: Number(prMeta.changed_files || changedFiles.length || 0),
    additions: Number(prMeta.additions || 0),
    deletions: Number(prMeta.deletions || 0),
    diff,
    diffChars: diff.length,
    truncated,
    limits: {
      maxDiffChars: MAX_DIFF_CHARS,
      maxChangedFiles: MAX_CHANGED_FILES,
    },
    source: "base44_backend_function",
  };
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await readBody(request);
    const prUrl = body.pr_url || body.prUrl || body.url;
    const result = await fetchPublicGithubPrDiff(prUrl);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
      source: "base44_backend_function",
    }, 400);
  }
}

Deno.serve(handleRequest);
