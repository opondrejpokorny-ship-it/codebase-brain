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

function extractProjectName(url) {
  if (!url) return "";
  const parts = url.replace(/\.git$/, "").split("/");
  return parts[parts.length - 1] || "";
}

function detectStackFromCode(code) {
  const stack = [];
  if (/import\s+.*react|from\s+['"]react/i.test(code)) stack.push("React");
  if (/from\s+['"]next/i.test(code) || /next\.config/i.test(code)) stack.push("Next.js");
  if (/from\s+['"]vue/i.test(code)) stack.push("Vue");
  if (/from\s+['"]express/i.test(code)) stack.push("Express");
  if (/import\s+.*django|from\s+django/i.test(code)) stack.push("Django");
  if (/package\.json/i.test(code)) stack.push("Node.js");
  if (/\.py\b/i.test(code) || /def\s+\w+\s*\(|import\s+\w+/m.test(code)) stack.push("Python");
  if (/\.tsx?\b/i.test(code) || /: string|: number|interface\s+/i.test(code)) stack.push("TypeScript");
  if (/tailwind/i.test(code)) stack.push("Tailwind CSS");
  if (/prisma/i.test(code)) stack.push("Prisma");
  if (/docker/i.test(code)) stack.push("Docker");
  return [...new Set(stack)];
}

function parseFileSections(code) {
  const fileRegex = /^(?:\/\/|#|\/\*)\s*(?:file|path|filename):\s*(.+?)(?:\s*\*\/)?$/gim;
  const files = [];
  let match;
  const matches = [];

  while ((match = fileRegex.exec(code)) !== null) {
    matches.push({ path: match[1].trim(), index: match.index });
  }

  if (matches.length === 0) {
    return [{ path: "main.txt", content: code, language: "text" }];
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + code.substring(matches[i].index).indexOf("\n") + 1;
    const end = i + 1 < matches.length ? matches[i + 1].index : code.length;
    const content = code.substring(start, end).trim();
    const ext = matches[i].path.split(".").pop() || "txt";
    const langMap = { js: "JavaScript", jsx: "JavaScript", ts: "TypeScript", tsx: "TypeScript", py: "Python", rb: "Ruby", go: "Go", rs: "Rust", java: "Java", css: "CSS", html: "HTML", json: "JSON", md: "Markdown" };
    files.push({ path: matches[i].path, content, language: langMap[ext] || ext });
  }

  return files;
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
    if (!repoUrl && !pastedCode.trim()) {
      toast({ title: "Provide a GitHub URL or paste some code", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const detectedStack = detectStackFromCode(pastedCode || repoUrl);

      const project = await base44.entities.CodebaseProject.create({
        name,
        repository_url: repoUrl || null,
        status: "draft",
        detected_stack: detectedStack,
        description: repoUrl ? `Repository: ${repoUrl}` : "Pasted code project",
      });

      // Parse and store files if code was pasted
      if (pastedCode.trim()) {
        const files = parseFileSections(pastedCode);
        for (const f of files) {
          await base44.entities.CodeFile.create({
            project_id: project.id,
            path: f.path,
            language: f.language,
            content: f.content,
            size: f.content.length,
          });
        }
      }

      // Generate a lightweight summary
      try {
        const summaryContext = pastedCode.trim()
          ? pastedCode.substring(0, 3000)
          : `GitHub repository: ${repoUrl}`;

        const summary = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a code analyst. Given the following codebase information, write a brief 2-3 sentence project summary describing what this project likely does, its main technologies, and architecture pattern. Be concise.\n\nCodebase info:\n${summaryContext}`,
        });

        await base44.entities.CodebaseProject.update(project.id, {
          summary: summary,
          status: "indexed",
        });
      } catch {
        await base44.entities.CodebaseProject.update(project.id, { status: "indexed" });
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
        <p className="text-sm text-slate-500 mt-1">Provide a GitHub URL or paste code to index.</p>
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
          <p className="text-xs text-slate-400">Public repositories only for now. Private repo import coming soon.</p>
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
            placeholder={"// file: src/index.js\nconst express = require('express');\n...\n\n// file: src/routes.js\nmodule.exports = ..."}
            value={pastedCode}
            onChange={(e) => setPastedCode(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-xs text-slate-400">
            Tip: Use <code className="bg-slate-100 px-1 rounded">// file: path/to/file.js</code> comments to separate multiple files.
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