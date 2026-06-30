export function normalizeRepositoryFullName(value = "") {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/pull\/\d+.*$/i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export function repositoryFullNameFromUrl(url = "") {
  const normalized = normalizeRepositoryFullName(url);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
}

export function projectRepositoryFullName(project) {
  if (!project) return null;

  const metadata = project.import_metadata || project.importMetadata || null;
  if (metadata?.repositoryFullName) return normalizeRepositoryFullName(metadata.repositoryFullName);

  if (project.repository_url) return repositoryFullNameFromUrl(project.repository_url);
  return null;
}

export function compareProjectAndPrRepository(project, prMeta) {
  const projectRepo = projectRepositoryFullName(project);
  const prRepo = normalizeRepositoryFullName(prMeta?.repositoryFullName || "");

  if (!projectRepo || !prRepo) {
    return {
      status: "unknown",
      projectRepo,
      prRepo,
      message: "Could not verify whether the PR belongs to the same repository as this project.",
    };
  }

  if (projectRepo === prRepo) {
    return {
      status: "match",
      projectRepo,
      prRepo,
      message: "PR repository matches the imported project repository.",
    };
  }

  return {
    status: "mismatch",
    projectRepo,
    prRepo,
    message: `This PR belongs to ${prRepo}, but this project was imported from ${projectRepo}. Analysis may be misleading unless the repositories intentionally share code.`,
  };
}
