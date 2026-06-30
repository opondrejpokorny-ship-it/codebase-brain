import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, GitBranch, FileCode } from "lucide-react";
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

function buildSummaryPrompt({ name, repoUrl, files, detectedStack, fallbackSummary }) {
  const filePreview = files
    .slice(0, 6)
    .map((file) => `--- ${file.path} ---\n${file.content.slice(0, 1200)}`)
    .join("\n\n");

  return `You are a concise code analyst. Create a short project summary for Codebase Brain.\n\nRules:\n- 2 to 4 sentences only.\n- Mention likely purpose, detected stack, and important architecture clues.\n- If context is incomplete, say that this is based only on the provided sample.\n\nProject name: ${name}\nRepository URL: ${repoUrl || "not provided"}\nDetected stack: ${detectedStack.join(", ") || "unknown"}\nFallback summary: ${fallbackSummary}\n\nFiles:\n${filePreview || "No pasted files were provided."}`;
}

export default function AddRepository() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [pastedCode, setPastedCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUrlChange = (val) => {
    setRepoUrl(val);
    if (!projectName) setProjectName(extractProjectName(val));
  };

  const handleCreate = async () => {
    const name = projectName.trim() || extractProjectName(repoUrl) || "Untitled Project";
    const files = parsePastedCode(pastedCode);

    if (!repoUrl.trim() && files.length === 0) {
      toast({ title: "Provide a GitHub URL or paste some code", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const detectedStack = detectStackFromFiles(files, repoUrl);
      const fallbackSummary = createFallbackSummary({
        name,
        repositoryUrl: repoUrl,
        files,
        detectedStack,
      });

      const project = await base44.entities.CodebaseProject.create({
        name,
        repository_url: repoUrl.trim() || null,
        status: "draft",
        detected_stack: detectedStack,
        summary: fallbackSummary,
        description: repoUrl.trim() ? `Repository: ${repoUrl.trim()}` : "Pasted code project",
      });

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
        const summary = await base44.integrations.Core.InvokeLLM({
          prompt: buildSummaryPrompt({ name, repoUrl, files, detectedStack, fallbackSummary }),
        });

        await base44.entities.CodebaseProject.update(project.id, {
          summary: summary || fallbackSummary,
          status: "indexed",
        });
      } catch {
        await base44.entities.CodebaseProject.update(project.id, {
          summary: fallbackSummary,
          status: "indexed",
        });
      }

      navigate(`/project/${project.id}`);
    } catch {
      toast({ title: "Failed to create project", variant: "destructive" });
    } finally {
      setSaving(false);
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
          Start small: save a GitHub URL or paste a few files. Full repository import comes later.
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
          <p className="text-xs text-slate-400">
            Phase 1 stores the URL only. Automatic public/private import is intentionally not implemented yet.
          </p>
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

        <Button onClick={handleCreate} disabled={saving} className="w-full cursor-pointer gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? "Creating Project…" : "Create Project"}
        </Button>
      </div>
    </div>
  );
}
