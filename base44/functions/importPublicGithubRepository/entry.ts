// Lightweight public GitHub import function for Codebase Brain.
// Self-contained on purpose: Base44 deploys functions in isolation.
// No private repo access yet. No GitHub App yet. No entity writes here.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Deno: any;

type ImportFile = {
  path: string;
  language: string;
  content: string;
  size: number;
};

type GitHubTreeEntry = {
  path?: string;
  type?: string;
  size?: number;
};

const IMPORT_LIMITS = {
  maxFiles: 40,
  maxFileBytes: 35_000,
  maxTreeEntries: 3_000,
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-requested-with",
  "Access-Control-Max-Age": "86400",
};

const SKIP_PATH_PARTS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "vendor",
  "tmp",
  "temp",
  "__pycache__",
]);

const SKIP_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "composer.lock",
  "poetry.lock",
  "Cargo.lock",
]);

const TEXT_EXTENSIONS = new Set([
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "php",
  "css",
  "scss",
  "html",
  "json",
  "md",
  "mdx",
  "txt",
  "yml",
  "yaml",
  "toml",
  "ini",
  "env",
  "example",
  "sql",
  "prisma",
  "sh",
  "dockerfile",
]);

const PRIORITY_PATH_PATTERNS = [
  /^readme(\.|$)/i,
  /^package\.json$/i,
  /^base44\//i,
  /^src\//i,
  /^app\//i,
  /^pages\//i,
  /^components\//i,
  /^api\//i,
  /^functions\//i,
  /^server\//i,
  /^lib\//i,
  /^prisma\//i,
  /^docs\//i,
  /config/i,
];

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  php: "PHP",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  json: "JSON",
  md: "Markdown",
  mdx: "Markdown",
  yml: "YAML",
  yaml: "YAML",
  sql: "SQL",
  prisma: "Prisma",
  sh: "Shell",
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

function parseGitHubRepoUrl(url = ""): { owner: string; repo: string } | null {
  const trimmed = String(url || "").trim();
  const match = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[\s/#?].*)?$/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ""),
  };
}

function detectLanguageFromPath(path = ""): string {
  const filename = path.split("/").pop() || "";
  if (filename === "Dockerfile") return "Docker";
  if (filename === "package.json") return "JSON";
  if (filename === "schema.prisma") return "Prisma";
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "txt";
  return LANGUAGE_BY_EXTENSION[ext] || ext.toUpperCase();
}

function isSafeEnvExample(lowerFilename: string): boolean {
  if (!lowerFilename.startsWith(".env")) return true;
  return lowerFilename.includes("example") || lowerFilename.includes("sample") || lowerFilename.includes("template");
}

function isLikelyTextFile(path = ""): boolean {
  const filename = path.split("/").pop() || "";
  const lower = filename.toLowerCase();

  if (SKIP_FILENAMES.has(lower)) return false;
  if (!isSafeEnvExample(lower)) return false;
  if (lower === "dockerfile") return true;
  if (lower.startsWith("readme")) return true;
  if (!filename.includes(".")) return false;

  const ext = filename.split(".").pop()!.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function shouldSkipPath(path = ""): boolean {
  const parts = path.toLowerCase().split("/");
  return parts.some((part) => SKIP_PATH_PARTS.has(part));
}

function priorityScore(path = ""): number {
  const normalized = path.toLowerCase();
  const patternIndex = PRIORITY_PATH_PATTERNS.findIndex((pattern) => pattern.test(normalized));
  const patternScore = patternIndex === -1 ? 100 : patternIndex;
  const depthPenalty = normalized.split("/").length;
  const lengthPenalty = Math.min(normalized.length / 100, 5);
  return patternScore + depthPenalty + lengthPenalty;
}

function selectImportCandidates(tree: GitHubTreeEntry[]): GitHubTreeEntry[] {
  return tree
    .filter((entry) => entry.type === "blob")
    .filter((entry) => entry.path && !shouldSkipPath(entry.path))
    .filter((entry) => isLikelyTextFile(entry.path || ""))
    .filter((entry) => !entry.size || entry.size <= IMPORT_LIMITS.maxFileBytes)
    .sort((a, b) => priorityScore(a.path || "") - priorityScore(b.path || ""))
    .slice(0, IMPORT_LIMITS.maxFiles);
}

function optionalGithubToken(): string | null {
  try {
    const token = Deno?.env?.get?.("GITHUB_TOKEN") || Deno?.env?.get?.("CODEBASE_BRAIN_GITHUB_TOKEN");
    return token || null;
  } catch (_) {
    return null;
  }
}

async function fetchJson(url: string): Promise<any> {
  const token = optionalGithubToken();
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message ? `GitHub request failed: ${body.message}` : `GitHub request failed: ${response.status}`);
  }
  return body;
}

async function fetchRawFile(params: { owner: string; repo: string; branch: string; path: string }): Promise<string> {
  const { owner, repo, branch, path } = params;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Raw file request failed for ${path}: ${response.status}`);
  }

  const text = await response.text();
  return text.slice(0, IMPORT_LIMITS.maxFileBytes);
}

async function importPublicGithubRepository(repositoryUrl: string): Promise<any> {
  const parsed = parseGitHubRepoUrl(repositoryUrl);
  if (!parsed) {
    throw new Error("Please enter a valid public GitHub repository URL.");
  }

  const { owner, repo } = parsed;
  const repoMeta = await fetchJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  const defaultBranch = repoMeta.default_branch || "main";

  const treeResult = await fetchJson(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
  );

  if (!Array.isArray(treeResult.tree)) {
    throw new Error("GitHub did not return a repository tree.");
  }

  const limitedTree = treeResult.tree.slice(0, IMPORT_LIMITS.maxTreeEntries);
  const candidates = selectImportCandidates(limitedTree);
  const files: ImportFile[] = [];
  const errors: any[] = [];

  for (const candidate of candidates) {
    if (!candidate.path) continue;
    try {
      const content = await fetchRawFile({ owner, repo, branch: defaultBranch, path: candidate.path });
      files.push({
        path: candidate.path,
        language: detectLanguageFromPath(candidate.path),
        content,
        size: content.length,
      });
    } catch (error) {
      errors.push({ path: candidate.path, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    owner,
    repo,
    defaultBranch,
    repositoryFullName: `${owner}/${repo}`,
    importedFiles: files,
    skippedFiles: Math.max(0, limitedTree.length - candidates.length),
    attemptedFiles: candidates.length,
    errors,
    truncatedTree: Boolean(treeResult.truncated),
    limits: IMPORT_LIMITS,
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
    const repositoryUrl = body.repository_url || body.repositoryUrl || body.url;
    const result = await importPublicGithubRepository(repositoryUrl);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
      source: "base44_backend_function",
    }, 400);
  }
}

Deno.serve(handleRequest);
