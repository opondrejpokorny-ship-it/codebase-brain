import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Clipboard, Loader2, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import {
  buildAgentSetupChecklist,
  buildMcpConfigSnippet,
  formatMcpLiteToolsMarkdown,
  getMcpLiteToolManifest,
} from "@/lib/mcpLiteTools";

function copyText(text = "") {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve(false);
}

export default function McpSetup() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState("codex");
  const [baseUrl, setBaseUrl] = useState("https://your-app.base44.app");
  const [command, setCommand] = useState("codebase-brain-mcp");
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    base44.entities.CodebaseProject.filter({ id })
      .then((projects) => setProject(projects?.[0] || null))
      .finally(() => setLoading(false));
  }, [id]);

  const manifest = useMemo(() => getMcpLiteToolManifest(), []);
  const snippet = useMemo(() => buildMcpConfigSnippet({ command, projectId: id, baseUrl, target }), [command, id, baseUrl, target]);
  const toolsMarkdown = useMemo(() => formatMcpLiteToolsMarkdown(manifest.tools), [manifest]);
  const checklist = useMemo(() => buildAgentSetupChecklist(), []);

  const copy = (label, text) => {
    copyText(text).then(() => {
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1800);
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <ServerCog className="w-5 h-5 text-slate-500" />
              MCP Lite Setup
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Product contract for future Codex/Cursor/Claude Code access to {project?.name || "this project"}. This page does not start a server yet.
            </p>
          </div>
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{manifest.tools.length} tools</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Bot className="w-4 h-4" />Config snippet</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-sm text-slate-600 space-y-1">
              <span>Target</span>
              <select value={target} onChange={(event) => setTarget(event.target.value)} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
                <option value="codex">Codex</option>
                <option value="cursor">Cursor / Claude Desktop</option>
                <option value="generic">Generic MCP JSON</option>
              </select>
            </label>
            <label className="text-sm text-slate-600 space-y-1 md:col-span-2">
              <span>Command</span>
              <input value={command} onChange={(event) => setCommand(event.target.value)} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm" />
            </label>
          </div>
          <label className="text-sm text-slate-600 space-y-1 block">
            <span>Base URL</span>
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm" />
          </label>
          <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs overflow-auto max-h-80">{snippet}</pre>
          <Button variant="outline" onClick={() => copy("snippet", snippet)} className="gap-2 cursor-pointer">
            <Clipboard className="w-4 h-4" />
            {copied === "snippet" ? "Copied" : "Copy snippet"}
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Safety checklist</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {checklist.map((item) => <li key={item} className="flex gap-2"><span className="text-slate-300">•</span><span>{item}</span></li>)}
          </ul>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            MCP Lite is intentionally a contract only. The first running version should expose read-only tools and keep private repository credentials backend-only.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Tool manifest</h2>
          <Button variant="outline" size="sm" onClick={() => copy("manifest", JSON.stringify(manifest, null, 2))} className="gap-2 cursor-pointer">
            <Clipboard className="w-4 h-4" />
            {copied === "manifest" ? "Copied" : "Copy JSON"}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {manifest.tools.map((tool) => (
            <div key={tool.name} className="rounded-lg border border-slate-200 p-4">
              <p className="font-mono text-sm font-semibold text-slate-900">{tool.name}</p>
              <p className="text-sm text-slate-500 mt-2">{tool.description}</p>
            </div>
          ))}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600">Markdown contract</summary>
          <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs overflow-auto mt-3 max-h-96">{toolsMarkdown}</pre>
        </details>
      </div>
    </div>
  );
}
