import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clipboard, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DecisionMemoryStatusBadge from "@/components/projects/DecisionMemoryStatusBadge";
import { base44 } from "@/api/base44Client";
import {
  addDecisionMemory,
  decisionMemoryToAdrMarkdown,
  readDecisionMemory,
  writeDecisionMemory,
} from "@/lib/decisionMemoryUtils";
import { saveDecisionRecord } from "@/lib/decisionPersistenceUtils";

function splitList(value = "") {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function copyText(text = "") {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve(false);
}

const EMPTY_FORM = {
  title: "",
  decision: "",
  rationale: "",
  status: "accepted",
  files: "",
  tags: "",
};

export default function ProjectDecisions() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CodebaseProject.filter({ id }),
      base44.entities.CodeFile.filter({ project_id: id }),
    ])
      .then(([projects, storedFiles]) => {
        setProject(projects?.[0] || null);
        setFiles(storedFiles || []);
        setDecisions(readDecisionMemory(id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const knownPaths = useMemo(() => files.map((file) => file.path).filter(Boolean).slice(0, 12), [files]);

  const addDecision = () => {
    if (!form.title.trim() && !form.decision.trim()) return;
    const record = addDecisionMemory(id, {
      title: form.title.trim() || "Project decision",
      decision: form.decision.trim(),
      rationale: form.rationale.trim(),
      status: form.status,
      files: splitList(form.files),
      tags: splitList(form.tags),
      source: "manual",
    });
    saveDecisionRecord(id, record).catch(() => null);
    setDecisions((current) => [record, ...current]);
    setForm(EMPTY_FORM);
  };

  const removeDecision = (decisionId) => {
    const next = decisions.filter((decision) => decision.id !== decisionId);
    writeDecisionMemory(id, next);
    setDecisions(next);
  };

  const copyAdr = (decision) => {
    copyText(decisionMemoryToAdrMarkdown(decision)).then(() => {
      setCopiedId(decision.id);
      window.setTimeout(() => setCopiedId(null), 1800);
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
              <FileText className="w-5 h-5 text-slate-500" />
              Project Decisions / ADR
            </h1>
            <div className="mt-2">
              <DecisionMemoryStatusBadge />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Local-first decision memory for {project?.name || "this project"}. These records can later move to a Base44 DecisionMemory entity.
            </p>
          </div>
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{decisions.length} decisions</Badge>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Add decision</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title e.g. Keep private tokens backend-only" />
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
            <option value="accepted">accepted</option>
            <option value="proposed">proposed</option>
            <option value="deprecated">deprecated</option>
            <option value="superseded">superseded</option>
          </select>
        </div>
        <textarea value={form.decision} onChange={(event) => setForm({ ...form, decision: event.target.value })} placeholder="Decision" className="w-full min-h-24 rounded-md border border-slate-200 p-3 text-sm" />
        <textarea value={form.rationale} onChange={(event) => setForm({ ...form, rationale: event.target.value })} placeholder="Rationale / context" className="w-full min-h-24 rounded-md border border-slate-200 p-3 text-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <textarea value={form.files} onChange={(event) => setForm({ ...form, files: event.target.value })} placeholder="Linked files, comma or newline separated" className="w-full min-h-20 rounded-md border border-slate-200 p-3 text-sm" />
          <textarea value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="Tags, comma or newline separated" className="w-full min-h-20 rounded-md border border-slate-200 p-3 text-sm" />
        </div>
        {knownPaths.length > 0 && (
          <p className="text-xs text-slate-400">Known paths: {knownPaths.join(", ")}</p>
        )}
        <Button onClick={addDecision} className="gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          Save decision
        </Button>
      </div>

      {decisions.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          No decisions stored yet. Add the first ADR-style memory above.
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.map((decision) => (
            <div key={decision.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{decision.title}</h3>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{decision.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{decision.decision || "No decision text recorded."}</p>
                  {decision.rationale && <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{decision.rationale}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => copyAdr(decision)} className="gap-2 cursor-pointer">
                    <Clipboard className="w-4 h-4" />
                    {copiedId === decision.id ? "Copied" : "Copy ADR"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => removeDecision(decision.id)} className="gap-2 cursor-pointer text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
              </div>
              {(decision.files?.length > 0 || decision.tags?.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {(decision.files || []).map((file) => <span key={file} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-mono">{file}</span>)}
                  {(decision.tags || []).map((tag) => <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">#{tag}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
