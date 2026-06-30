export const PUBLIC_GITHUB_PR_LIMITS = {
  maxDiffChars: 90_000,
  maxChangedFiles: 100,
};

export function parseGithubPullRequestUrl(url = "") {
  const trimmed = String(url || "").trim();
  const match = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)\/pull\/(\d+)(?:[\s/#?].*)?$/i);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ""),
    prNumber: Number(match[3]),
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message ? `GitHub request failed: ${body.message}` : `GitHub request failed: ${response.status}`);
  }
  return body;
}

async function fetchText(url, accept) {
  const response = await fetch(url, {
    headers: { Accept: accept },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text ? `GitHub request failed: ${text.slice(0, 200)}` : `GitHub request failed: ${response.status}`);
  }
  return text;
}

async function fetchChangedFiles(owner, repo, prNumber) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/files?per_page=${PUBLIC_GITHUB_PR_LIMITS.maxChangedFiles}`;
  const files = await fetchJson(url);
  if (!Array.isArray(files)) return [];
  return files.slice(0, PUBLIC_GITHUB_PR_LIMITS.maxChangedFiles).map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
  }));
}

export async function fetchPublicGithubPrDiffClient(prUrl) {
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

  const truncated = rawDiff.length > PUBLIC_GITHUB_PR_LIMITS.maxDiffChars;
  const diff = rawDiff.slice(0, PUBLIC_GITHUB_PR_LIMITS.maxDiffChars);

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
    limits: PUBLIC_GITHUB_PR_LIMITS,
    source: "client_fallback",
  };
}

export function formatPrDiffForImpactAnalysis(prResult) {
  const changedFileList = Array.isArray(prResult.changedFiles)
    ? prResult.changedFiles.map((file) => file.filename).filter(Boolean)
    : [];

  const header = [
    `# GitHub PR: ${prResult.repositoryFullName}#${prResult.prNumber}`,
    prResult.title ? `# Title: ${prResult.title}` : null,
    prResult.htmlUrl ? `# URL: ${prResult.htmlUrl}` : null,
    prResult.baseRef || prResult.headRef ? `# Branches: ${prResult.baseRef || "?"} <- ${prResult.headRef || "?"}` : null,
    `# State: ${prResult.state || "unknown"}${prResult.draft ? " / draft" : ""}`,
    `# Stats: +${prResult.additions || 0} -${prResult.deletions || 0}, ${prResult.changedFilesCount || changedFileList.length} changed files`,
    prResult.truncated ? `# WARNING: Diff truncated to ${prResult.limits?.maxDiffChars || PUBLIC_GITHUB_PR_LIMITS.maxDiffChars} characters.` : null,
    changedFileList.length ? `# Changed files:\n${changedFileList.map((file) => file).join("\n")}` : null,
    "",
  ].filter(Boolean).join("\n");

  return `${header}\n${prResult.diff || ""}`.trim();
}
