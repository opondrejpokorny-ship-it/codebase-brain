import { detectLanguageFromPath } from "@/lib/codebaseUtils";

export const PUBLIC_GITHUB_IMPORT_LIMITS = {
  maxFiles: 40,
  maxFileBytes: 35_000,
  maxTreeEntries: 3_000,
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

export function parseGitHubRepoUrl(url = "") {
  const trimmed = url.trim();
  const match = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[\s/#?].*)?$/i);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ""),
  };
}

function isSafeEnvExample(lowerFilename) {
  if (!lowerFilename.startsWith(".env")) return true;
  return lowerFilename.includes("example") || lowerFilename.includes("sample") || lowerFilename.includes("template");
}

function isLikelyTextFile(path = "") {
  const filename = path.split("/").pop() || "";
  const lower = filename.toLowerCase();

  if (SKIP_FILENAMES.has(lower)) return false;
  if (!isSafeEnvExample(lower)) return false;
  if (lower === "dockerfile") return true;
  if (lower.startsWith("readme")) return true;
  if (!filename.includes(".")) return false;

  const ext = filename.split(".").pop().toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function shouldSkipPath(path = "") {
  const parts = path.toLowerCase().split("/");
  return parts.some((part) => SKIP_PATH_PARTS.has(part));
}

function priorityScore(path = "") {
  const normalized = path.toLowerCase();
  const patternIndex = PRIORITY_PATH_PATTERNS.findIndex((pattern) => pattern.test(normalized));
  const patternScore = patternIndex === -1 ? 100 : patternIndex;
  const depthPenalty = normalized.split("/").length;
  const lengthPenalty = Math.min(normalized.length / 100, 5);
  return patternScore + depthPenalty + lengthPenalty;
}

function selectImportCandidates(tree = []) {
  return tree
    .filter((entry) => entry.type === "blob")
    .filter((entry) => entry.path && !shouldSkipPath(entry.path))
    .filter((entry) => isLikelyTextFile(entry.path))
    .filter((entry) => !entry.size || entry.size <= PUBLIC_GITHUB_IMPORT_LIMITS.maxFileBytes)
    .sort((a, b) => priorityScore(a.path) - priorityScore(b.path))
    .slice(0, PUBLIC_GITHUB_IMPORT_LIMITS.maxFiles);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchRawFile({ owner, repo, branch, path }) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Raw file request failed for ${path}: ${response.status}`);
  }

  const text = await response.text();
  return text.slice(0, PUBLIC_GITHUB_IMPORT_LIMITS.maxFileBytes);
}

export async function importPublicGithubRepository(repositoryUrl) {
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

  const limitedTree = treeResult.tree.slice(0, PUBLIC_GITHUB_IMPORT_LIMITS.maxTreeEntries);
  const candidates = selectImportCandidates(limitedTree);
  const files = [];
  const errors = [];

  for (const candidate of candidates) {
    try {
      const content = await fetchRawFile({ owner, repo, branch: defaultBranch, path: candidate.path });
      files.push({
        path: candidate.path,
        language: detectLanguageFromPath(candidate.path),
        content,
        size: content.length,
      });
    } catch (error) {
      errors.push({ path: candidate.path, message: error.message });
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
    limits: PUBLIC_GITHUB_IMPORT_LIMITS,
  };
}
