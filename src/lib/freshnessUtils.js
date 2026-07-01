function normalizeSha(value = "") {
  return String(value || "").trim().slice(0, 40);
}

function metadataValue(project = {}, keys = []) {
  const sources = [project, project?.import_metadata, project?.github_metadata, project?.repository_metadata].filter(Boolean);
  for (const source of sources) {
    for (const key of keys) {
      if (source?.[key]) return source[key];
    }
  }
  return null;
}

export function getIndexedCommitSha(project = {}) {
  return normalizeSha(metadataValue(project, ["indexed_commit_sha", "import_commit_sha", "default_branch_sha", "commit_sha", "head_sha"]));
}

export function getPrHeadSha(prMeta = {}) {
  return normalizeSha(metadataValue(prMeta, ["headSha", "head_sha", "headCommitSha", "commit_sha"]));
}

export function buildFreshnessStatus({ project = null, prMeta = null, files = [], analysisCreatedAt = null } = {}) {
  const indexedSha = getIndexedCommitSha(project || {});
  const prHeadSha = getPrHeadSha(prMeta || {});
  const fileCount = files.length;
  const importedAt = metadataValue(project || {}, ["imported_at", "importedAt", "updated_date", "created_date"]);
  const status = {
    level: "unknown",
    indexedSha,
    prHeadSha,
    fileCount,
    importedAt,
    analysisCreatedAt,
    warnings: [],
  };

  if (!fileCount) {
    status.level = "missing_context";
    status.warnings.push("No stored files are available for this project.");
    return status;
  }

  if (project?.status === "url_only") {
    status.level = "url_only";
    status.warnings.push("This project is URL-only; private import has not populated file context yet.");
    return status;
  }

  if (indexedSha && prHeadSha && indexedSha !== prHeadSha) {
    status.level = "stale";
    status.warnings.push(`Stored context was indexed at ${indexedSha.slice(0, 8)}, but the PR head is ${prHeadSha.slice(0, 8)}.`);
    return status;
  }

  if (!indexedSha && prHeadSha) {
    status.level = "unverified";
    status.warnings.push("PR head SHA is known, but the stored project context has no indexed commit SHA to compare.");
    return status;
  }

  if (indexedSha && !prHeadSha) {
    status.level = "current_for_import";
    status.warnings.push("Stored context has an indexed commit SHA, but no PR head SHA was provided for comparison.");
    return status;
  }

  status.level = "sample_only";
  status.warnings.push("Freshness cannot be verified from commit SHAs; treat this as a stored sample, not full live repository context.");
  return status;
}

export function formatFreshnessWarning(status = {}) {
  if (!status?.warnings?.length) return "Context freshness looks acceptable from available metadata.";
  return status.warnings.map((warning) => `- ${warning}`).join("\n");
}

export function shouldBlockAutomatedReview(status = {}) {
  return ["missing_context", "url_only", "stale"].includes(status.level);
}
