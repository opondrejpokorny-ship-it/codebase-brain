import { base44 } from "@/api/base44Client";
import {
  createFallbackSummary,
  detectStackFromFiles,
  extractProjectName,
  parsePastedCode,
} from "@/lib/codebaseUtils";
import { importPublicGithubRepository as importPublicGithubRepositoryClient, PUBLIC_GITHUB_IMPORT_LIMITS } from "@/lib/githubImport";

export { PUBLIC_GITHUB_IMPORT_LIMITS };

function buildSummaryPrompt({ name, repoUrl, files, detectedStack, fallbackSummary }) {
  const filePreview = files
    .slice(0, 6)
    .map((file) => `--- ${file.path} ---\n${file.content.slice(0, 1200)}`)
    .join("\n\n");

  return `You are a concise code analyst. Create a short project summary for Codebase Brain.\n\nRules:\n- 2 to 4 sentences only.\n- Mention likely purpose, detected stack, and important architecture clues.\n- If context is incomplete, say that this is based only on the provided sample.\n\nProject name: ${name}\nRepository URL: ${repoUrl || "not provided"}\nDetected stack: ${detectedStack.join(", ") || "unknown"}\nFallback summary: ${fallbackSummary}\n\nFiles:\n${filePreview || "No pasted files were provided."}`;
}

function dedupeFiles(files) {
  const byPath = new Map();
  for (const file of files) byPath.set(file.path, file);
  return [...byPath.values()];
}

function isLikelyPrivateOrInaccessibleError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return ["404", "403", "not found", "bad credentials", "requires authentication", "rate limit"].some((token) => message.includes(token));
}

function buildPrivateRepoImportMeta(repositoryUrl, error) {
  return {
    source: "private_or_inaccessible_repository_placeholder",
    repositoryFullName: extractProjectName(repositoryUrl) || null,
    defaultBranch: null,
    importedFiles: [],
    attemptedFiles: 0,
    skippedFiles: 0,
    truncatedTree: false,
    errors: [{ path: repositoryUrl, message: error?.message || "Repository is private, missing, rate-limited, or not accessible with current public import permissions." }],
    backendError: error?.message || String(error),
    accessMode: "url_only_until_github_app_or_token",
  };
}

function buildImportMetadata(importMeta, finalFiles) {
  if (!importMeta) return null;
  return {
    source: importMeta.source || "public_import",
    repositoryFullName: importMeta.repositoryFullName || null,
    defaultBranch: importMeta.defaultBranch || null,
    importedFilesCount: Array.isArray(importMeta.importedFiles) ? importMeta.importedFiles.length : 0,
    finalFilesCount: finalFiles.length,
    attemptedFiles: Number(importMeta.attemptedFiles || 0),
    skippedFiles: Number(importMeta.skippedFiles || 0),
    truncatedTree: Boolean(importMeta.truncatedTree),
    errors: Array.isArray(importMeta.errors) ? importMeta.errors.slice(0, 20) : [],
    backendError: importMeta.backendError || null,
    accessMode: importMeta.accessMode || null,
    limits: importMeta.limits || PUBLIC_GITHUB_IMPORT_LIMITS,
    importedAt: new Date().toISOString(),
  };
}

async function importPublicGithubRepository(repositoryUrl) {
  try {
    const res = await base44.functions.invoke("importPublicGithubRepository", { repository_url: repositoryUrl });
    const data = res?.data || res;
    if (data?.error) throw new Error(data.error);
    if (Array.isArray(data?.importedFiles)) return data;
    throw new Error("Backend import returned an unexpected response.");
  } catch (backendError) {
    try {
      const fallback = await importPublicGithubRepositoryClient(repositoryUrl);
      return { ...fallback, source: "client_fallback_after_backend_error", backendError: backendError?.message || String(backendError) };
    } catch (clientError) {
      if (isLikelyPrivateOrInaccessibleError(clientError) || isLikelyPrivateOrInaccessibleError(backendError)) return buildPrivateRepoImportMeta(repositoryUrl, clientError || backendError);
      throw clientError;
    }
  }
}

export async function createRepositoryProject({ repoUrl = "", pastedCode = "", projectName = "", importPublicRepo = true, setImportStatus = () => {}, onUrlOnlyImport = null }) {
  const trimmedRepoUrl = repoUrl.trim();
  const name = projectName.trim() || extractProjectName(trimmedRepoUrl) || "Untitled Project";
  const pastedFiles = parsePastedCode(pastedCode);

  if (!trimmedRepoUrl && pastedFiles.length === 0) {
    throw new Error("Provide a GitHub URL or paste some code");
  }

  let importedFiles = [];
  let importMeta = null;

  if (trimmedRepoUrl && importPublicRepo) {
    setImportStatus("Importing public GitHub files…");
    importMeta = await importPublicGithubRepository(trimmedRepoUrl);
    importedFiles = Array.isArray(importMeta.importedFiles) ? importMeta.importedFiles : [];
    if (importMeta.accessMode === "url_only_until_github_app_or_token") onUrlOnlyImport?.();
  }

  const files = dedupeFiles([...importedFiles, ...pastedFiles]);
  const detectedStack = detectStackFromFiles(files, trimmedRepoUrl);
  const fallbackSummary = createFallbackSummary({ name, repositoryUrl: trimmedRepoUrl, files, detectedStack });
  const importDescription = importMeta?.accessMode === "url_only_until_github_app_or_token"
    ? "Repository saved as URL-only. Public import could not access files, likely because the repository is private, missing, rate-limited, or requires authentication."
    : importMeta
      ? `Imported ${importMeta.importedFiles.length}/${importMeta.attemptedFiles} public GitHub files from ${importMeta.repositoryFullName}. Source: ${importMeta.source || "public import"}.`
      : trimmedRepoUrl ? `Repository: ${trimmedRepoUrl}` : "Pasted code project";

  const project = await base44.entities.CodebaseProject.create({
    name,
    repository_url: trimmedRepoUrl || null,
    status: files.length > 0 ? "draft" : "url_only",
    detected_stack: detectedStack,
    summary: fallbackSummary,
    description: importDescription,
    import_metadata: buildImportMetadata(importMeta, files),
  });

  setImportStatus(`Saving ${files.length} file${files.length === 1 ? "" : "s"}…`);
  for (const file of files) {
    await base44.entities.CodeFile.create({ project_id: project.id, path: file.path, language: file.language, content: file.content, size: file.size });
  }

  try {
    if (files.length > 0) {
      setImportStatus("Generating lightweight summary…");
      const summary = await base44.integrations.Core.InvokeLLM({ prompt: buildSummaryPrompt({ name, repoUrl: trimmedRepoUrl, files, detectedStack, fallbackSummary }) });
      await base44.entities.CodebaseProject.update(project.id, { summary: summary || fallbackSummary, status: "indexed" });
    } else {
      await base44.entities.CodebaseProject.update(project.id, { summary: fallbackSummary, status: "url_only" });
    }
  } catch {
    await base44.entities.CodebaseProject.update(project.id, { summary: fallbackSummary, status: files.length > 0 ? "indexed" : "url_only" });
  }

  return project;
}
