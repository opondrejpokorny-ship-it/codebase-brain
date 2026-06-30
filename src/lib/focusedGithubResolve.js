import { detectLanguageFromPath } from "@/lib/codebaseUtils";
import { parseGitHubRepoUrl } from "@/lib/githubImport";

export const FOCUSED_RESOLVE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
export const FOCUSED_RESOLVE_MAX_FILE_BYTES = 35_000;

export function candidatePathsForTarget(target = "") {
  const clean = String(target || "").replace(/^\/+/, "");
  if (!clean) return [];

  const candidates = new Set([clean]);
  for (const ext of FOCUSED_RESOLVE_EXTENSIONS) {
    candidates.add(`${clean}${ext}`);
    candidates.add(`${clean}/index${ext}`);
  }
  return [...candidates];
}

export function resolveQueuedTarget(item, storedPathSet) {
  const candidates = candidatePathsForTarget(item?.target || "");
  const matchedPath = candidates.find((path) => storedPathSet.has(path));
  return {
    ...item,
    candidates,
    matchedPath,
    status: matchedPath ? "indexed" : "missing",
  };
}

export function queueItemForStorage(item) {
  return {
    target: item.target,
    source_file: item.source_file,
    import_path: item.import_path,
    relation_type: item.relation_type,
    added_at: item.added_at,
  };
}

async function fetchGitHubJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status}`);
  return response.json();
}

async function fetchRawGitHubFile({ owner, repo, branch, path }) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Raw file request failed for ${path}: ${response.status}`);
  const text = await response.text();
  return text.slice(0, FOCUSED_RESOLVE_MAX_FILE_BYTES);
}

export async function resolveQueuedFilesFromPublicGitHub({ repositoryUrl, projectId, resolvedQueue, storedPathSet }) {
  const parsed = parseGitHubRepoUrl(repositoryUrl || "");
  if (!parsed) throw new Error("Project does not have a valid public GitHub repository URL.");

  const { owner, repo } = parsed;
  const repoMeta = await fetchGitHubJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  const branch = repoMeta.default_branch || "main";
  const treeResult = await fetchGitHubJson(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );

  const treePaths = new Set((treeResult.tree || []).filter((entry) => entry.type === "blob").map((entry) => entry.path));
  const filesToCreate = [];
  const misses = [];

  for (const item of resolvedQueue) {
    if (item.status === "indexed") continue;
    const exactPath = item.candidates.find((candidate) => treePaths.has(candidate) && !storedPathSet.has(candidate));
    if (!exactPath) {
      misses.push({ target: item.target, reason: "No matching repository file found." });
      continue;
    }

    const content = await fetchRawGitHubFile({ owner, repo, branch, path: exactPath });
    filesToCreate.push({
      project_id: projectId,
      path: exactPath,
      language: detectLanguageFromPath(exactPath),
      content,
      size: content.length,
    });
  }

  return {
    filesToCreate,
    misses,
    branch,
  };
}
