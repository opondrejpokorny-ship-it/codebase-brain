export function buildFocusedResolveRecord({ branch = "", createdFiles = [], misses = [], queuedCount = 0 } = {}) {
  return {
    type: "focused_missing_context_resolve",
    source: "public_github_focused_resolve",
    branch: branch || null,
    importedFilesCount: createdFiles.length,
    missingTargetsCount: misses.length,
    queuedTargetsCount: queuedCount,
    importedPaths: createdFiles.map((file) => file.path).filter(Boolean),
    missingTargets: misses.map((miss) => miss.target).filter(Boolean),
    resolvedAt: new Date().toISOString(),
  };
}

export function appendFocusedResolveMetadata(currentMetadata, record) {
  const base = currentMetadata && typeof currentMetadata === "object" && !Array.isArray(currentMetadata)
    ? currentMetadata
    : {};

  const history = Array.isArray(base.focusedResolveHistory) ? base.focusedResolveHistory : [];
  const nextHistory = [record, ...history].slice(0, 10);

  return {
    ...base,
    lastFocusedResolve: record,
    focusedResolveHistory: nextHistory,
    focusedResolveCount: Number(base.focusedResolveCount || 0) + 1,
    lastFocusedResolveAt: record.resolvedAt,
  };
}
