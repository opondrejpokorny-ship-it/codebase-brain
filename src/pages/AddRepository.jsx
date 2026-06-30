import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, GitBranch, FileCode, DownloadCloud, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import {
  createFallbackSummary,
  detectStackFromFiles,
  extractProjectName,
  parsePastedCode,
} from "@/lib/codebaseUtils";
import { importPublicGithubRepository as importPublicGithubRepositoryClient, PUBLIC_GITHUB_IMPORT_LIMITS } from "@/lib/githubImport";

function buildSummaryPrompt({ name, repoUrl, files, detectedStack, fallbackSummary }) {
  const filePreview = files
    .slice(0, 6)
    .map((file) => `--- ${file.path} ---\n${file.content.slice(0, 1200)}`)
    .join("\n\n");

  return `You are a concise code analyst. Create a short project summary for Codebase Brain.\n\nRules:\n- 2 to 4 sentences only.\n- Mention likely purpose, detected stack, and important architecture clues.\n- If context is incomplete, say that this is based only on the provided sample.\n\nProject name: ${name}\nRepository URL: ${repoUrl || "not provided"}\nDetected stack: ${detectedStack.join(", ") || "unknown"}\nFallback summary: ${fallbackSummary}\n\nFiles:\n${filePreview || "No pasted files were provided."}`;
}

function dedupeFiles(files) {
  const byPath = new Map();
  for (const file of files) {
    byPath.set(file.path, file);
  }
  return [...byPath.values()];
}

function isLikelyPrivateOrInaccessibleError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("404") ||
    message.includes("403") ||
    message.includes("not found") ||
    message.includes("bad credentials") ||
    message.includes("requires authentication") ||
    message.includes("rate limit")
  );
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
    errors: [
      {
        path: repositoryUrl,
        message: error?.message || "Repository is private, missing, rate-limited, or not accessible with current public import permissions.",
      },
    ],
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
    const res = await base44.functions.invoke("importPublicGithubRepository", {
      repository_url: repositoryUrl,
    });
    const data = res?.data || res;
    if (data?.error) throw new Error(data.error);
    if (Array.isArray(data?.importedFiles)) return data;
    throw new Error("Backend import returned an unexpected response.");
  } catch (backendError) {
    try {
      // Backend function may not be deployed yet in early Base44 previews.
      // Keep a browser fallback so the MVP remains usable immediately.
      const fallback = await importPublicGithubRepositoryClient(repositoryUrl);
      return {
        ...fallback,
        source: "client_fallback_after_backend_error",
        backendError: backendError?.message || String(backendError),
      };
    } catch (clientError) {
      if (isLikelyPrivateOrInaccessibleError(clientError) || isLikelyPrivateOrInaccessibleError(backendError)) {
        return buildPrivateRepoImportMeta(repositoryUrl, clientError || backendError);
      }
      throw clientError;
    }
  }
}

export default function AddRepository() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [pastedCode, setPastedCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [importPublicRepo, setImportPublicRepo] = useState(true);
  const [importStatus, setImportStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUrlChange = (val) => {
    setRepoUrl(val);
    if (!projectName) setProjectName(extractProjectName(val));
  };

  const handleCreate = async () => {
    const trimmedRepoUrl = repoUrl.trim();
    const name = projectName.trim() || extractProjectName(trimmedRepoUrl) || "Untitled Project";
    const pastedFiles = parsePastedCode(pastedCode);

    if (!trimmedRepoUrl && pastedFiles.length === 0) {
      toast({ title: "Provide a GitHub URL or paste some code", variant: "destructive" });
      return;
    }

    setSaving(true);
    setImportStatus("");

    try {
      let importedFiles = [];
      let importMeta = null;

      if (trimmedRepoUrl && importPublicRepo) {
        setImportStatus("Importing public GitHub files…");
        importMeta = await importPublicGithubRepository(trimmedRepoUrl);
        importedFiles = Array.isArray(importMeta.importedFiles) ? importMeta.importedFiles : [];

        if (importMeta.accessMode === "url_only_until_github_app_or_token") {
          toast({
            title: "Repository saved without file import",
            description: "This repository is private or inaccessible through public GitHub import. The project was created as URL-only until GitHub App/private access is enabled.",
          });
        }
      }

      const files = dedupeFiles([...importedFiles, ...pastedFiles]);
      const detectedStack = detectStackFromFiles(files, trimmedRepoUrl);
      const fallbackSummary = createFallbackSummary({
        name,
        repositoryUrl: trimmedRepoUrl,
        files,
        detectedStack,
      });

      const importDescription = importMeta?.accessMode === "url_only_until_github_app_or_token"
        ? `Repository saved as URL-only. Public import could not access files, likely because the repository is private, missing, rate-limited, or requires authentication.`
        : importMeta
          ? `Imported ${importMeta.importedFiles.length}/${importMeta.attemptedFiles} public GitHub files from ${importMeta.repositoryFullName}. Source: ${importMeta.source || "public import"}.`
          : trimmedRepoUrl
            ? `Repository: ${trimmedRepoUrl}`
            : "Pasted code project";

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
        await base44.entities.CodeFile.create({
          project_id: project.id,
          path: file.path,
          language: file.language,
          content: file.content,
          size: file.size,
        });
      }

      try {
        if (files.length > 0) {
          setImportStatus("Generating lightweight summary…");
          const summary = await base44.integrations.Core.InvokeLLM({
            prompt: buildSummaryPrompt({ name, repoUrl: trimmedRepoUrl, files, detectedStack, fallbackSummary }),
          });

          await base44.entities.CodebaseProject.update(project.id, {
            summary: summary || fallbackSummary,
            status: "indexed",
          });
        } else {
          await base44.entities.CodebaseProject.update(project.id, {
            summary: fallbackSummary,
            status: "url_only",
          });
        }
      } catch {
        await base44.entities.CodebaseProject.update(project.id, {
          summary: fallbackSummary,
          status: files.length > 0 ? "indexed" : "url_only",
        });
      }

      navigate(`/project/${project.id}`);
    } catch (error) {
      toast({
        title: "Failed to create project",
        description: error?.message || "Public GitHub import failed. You can uncheck import and store the URL only.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setImportStatus("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="font-heading text-xl font-bold text-slate-900">Add Repository</h1>
        <p className="text-sm text-slate-500 mt-1">
          Start small: import a limited public GitHub sample or paste a few files manually.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name</Label>
          <Input
            id="name"
            placeholder="e.g. my-api-server"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url" className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            GitHub Repository URL
          </Label>
          <Input
            id="url"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={importPublicRepo}
                onChange={(e) => setImportPublicRepo(e.target.checked)}
                disabled={saving}
              />
              <span>
                Import a small public GitHub sample now. Limit: {PUBLIC_GITHUB_IMPORT_LIMITS.maxFiles} text files, max {Math.round(PUBLIC_GITHUB_IMPORT_LIMITS.maxFileBytes / 1000)} KB per file. Private repositories are saved URL-only until GitHub App/private access is enabled.
              </span>
            </label>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2">
            <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Private repo support is planned through GitHub App integration. For now, private repositories can be saved as a project, but files cannot be imported unless you paste code manually.</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400">or paste code directly</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code" className="flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" />
            Paste Code
          </Label>
          <Textarea
            id="code"
            placeholder={"--- package.json ---\n{\"dependencies\":{\"react\":\"latest\",\"vite\":\"latest\"}}\n\n--- src/App.jsx ---\nexport default function App() {\n  return <div>Hello</div>;\n}"}
            value={pastedCode}
            onChange={(e) => setPastedCode(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
          <p className="text-xs text-slate-400">
            Supported markers: <code className="bg-slate-100 px-1 rounded">--- src/App.jsx ---</code> or <code className="bg-slate-100 px-1 rounded">// file: src/App.jsx</code>
          </p>
        </div>

        {importStatus && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <DownloadCloud className="w-4 h-4" />
            {importStatus}
          </div>
        )}

        <Button onClick={handleCreate} disabled={saving} className="w-full cursor-pointer gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? "Creating Project…" : "Create Project"}
        </Button>
      </div>
    </div>
  );
}
