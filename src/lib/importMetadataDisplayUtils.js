export function normalizeImportMetadata(project) {
  const metadata = project?.import_metadata || project?.importMetadata || null;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata;

  if (project?.description && /Imported \d+\/\d+ public GitHub files/i.test(project.description)) {
    return { source: "legacy_description", note: project.description };
  }

  return null;
}

export function sourceLabel(source) {
  if (source === "base44_backend_function") return "Backend function";
  if (source === "client_fallback_after_backend_error") return "Client fallback";
  if (source === "client_fallback") return "Client fallback";
  if (source === "public_github_focused_resolve") return "Focused GitHub resolve";
  if (source === "legacy_description") return "Legacy import";
  return source || "Unknown";
}

export function metadataWarnings(metadata, errors = []) {
  const hasFocusedResolveWarnings = Number(metadata?.lastFocusedResolve?.missingTargetsCount || 0) > 0;
  const hasPersistentQueueWarnings = Array.isArray(metadata?.missingContextQueue) && metadata.missingContextQueue.length > 0;
  return Boolean(errors.length > 0 || metadata?.truncatedTree || hasFocusedResolveWarnings || hasPersistentQueueWarnings);
}
