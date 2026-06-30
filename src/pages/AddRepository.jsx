import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, GitBranch, FileCode, DownloadCloud, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAddRepository } from "@/hooks/useAddRepository";
import { PUBLIC_GITHUB_IMPORT_LIMITS } from "@/lib/addRepositoryRuntime";

export default function AddRepository() {
  const form = useAddRepository();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      <div>
        <h1 className="font-heading text-xl font-bold text-slate-900">Add Repository</h1>
        <p className="text-sm text-slate-500 mt-1">Start small: import a limited public GitHub sample or paste a few files manually.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name</Label>
          <Input id="name" placeholder="e.g. my-api-server" value={form.projectName} onChange={(event) => form.setProjectName(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url" className="flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" />GitHub Repository URL</Label>
          <Input id="url" placeholder="https://github.com/user/repo" value={form.repoUrl} onChange={(event) => form.handleUrlChange(event.target.value)} />
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={form.importPublicRepo} onChange={(event) => form.setImportPublicRepo(event.target.checked)} disabled={form.saving} />
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
          <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or paste code directly</span></div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code" className="flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5" />Paste Code</Label>
          <Textarea
            id="code"
            placeholder={"--- package.json ---\n{\"dependencies\":{\"react\":\"latest\",\"vite\":\"latest\"}}\n\n--- src/App.jsx ---\nexport default function App() {\n  return <div>Hello</div>;\n}"}
            value={form.pastedCode}
            onChange={(event) => form.setPastedCode(event.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
          <p className="text-xs text-slate-400">
            Supported markers: <code className="bg-slate-100 px-1 rounded">--- src/App.jsx ---</code> or <code className="bg-slate-100 px-1 rounded">// file: src/App.jsx</code>
          </p>
        </div>

        {form.importStatus && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <DownloadCloud className="w-4 h-4" />
            {form.importStatus}
          </div>
        )}

        <Button onClick={form.handleCreate} disabled={form.saving} className="w-full cursor-pointer gap-2">
          {form.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {form.saving ? "Creating Project…" : "Create Project"}
        </Button>
      </div>
    </div>
  );
}
