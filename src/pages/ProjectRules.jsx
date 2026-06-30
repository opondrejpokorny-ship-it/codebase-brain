import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpenCheck, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import {
  addLocalProjectRule,
  deleteLocalProjectRule,
  readLocalProjectRules,
  seedDefaultProjectRules,
  summarizeProjectRules,
  updateLocalProjectRule,
} from "@/lib/projectRulesUtils";

const severityStyles = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const emptyForm = {
  title: "",
  category: "general",
  severity: "medium",
  description: "",
};

export default function ProjectRules() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      setLoading(true);
      try {
        const projects = await base44.entities.CodebaseProject.filter({ id }).catch(() => []);
        const localRules = readLocalProjectRules(id);
        if (!cancelled) {
          setProject(projects?.[0] || null);
          setRules(localRules);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRules();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const summary = useMemo(() => summarizeProjectRules(rules), [rules]);

  const handleSeedDefaults = () => {
    setRules(seedDefaultProjectRules(id));
  };

  const handleAddRule = () => {
    if (!form.title.trim()) return;
    const next = addLocalProjectRule(id, form);
    setRules(next);
    setForm(emptyForm);
  };

  const handleToggleRule = (rule) => {
    setRules(updateLocalProjectRule(id, rule.id, { is_active: rule.is_active === false }));
  };

  const handleDeleteRule = (ruleId) => {
    setRules(deleteLocalProjectRule(id, ruleId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5 text-slate-500" />
              Project Rules / ADR Memory
            </h1>
            {project?.name && (
              <p className="text-xs text-slate-400 mt-1">Project: {project.name}</p>
            )}
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Store product rules, architecture decisions, and safety constraints. Impact Analysis will use active rules as project memory when reviewing changes.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Source: local fallback. A future Base44 `ProjectRule` entity can make this shared across devices and team members.
            </p>
          </div>
          <Button variant="outline" onClick={handleSeedDefaults} className="cursor-pointer gap-2">
            <BookOpenCheck className="w-4 h-4" />
            Seed recommended rules
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Rules</p>
          <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Active</p>
          <p className="text-2xl font-bold text-slate-900">{summary.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs text-red-400 mb-1">High severity</p>
          <p className="text-2xl font-bold text-red-700">{summary.severityCounts.high}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs text-amber-500 mb-1">Medium severity</p>
          <p className="text-2xl font-bold text-amber-700">{summary.severityCounts.medium}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit space-y-4">
          <h2 className="font-heading font-semibold text-sm text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-slate-500" />
            Add rule
          </h2>
          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Rule title"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="category"
              />
              <select
                value={form.severity}
                onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <Textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Describe the project decision, rule, or constraint…"
              rows={6}
            />
            <Button onClick={handleAddRule} disabled={!form.title.trim()} className="cursor-pointer gap-2 w-full">
              <Save className="w-4 h-4" />
              Save rule
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-heading font-semibold text-sm text-slate-900 mb-4">Rules</h2>
          {!rules.length ? (
            <div className="text-center py-12">
              <BookOpenCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-heading font-semibold text-slate-900">No rules yet</h3>
              <p className="text-sm text-slate-500 mt-1 mb-5">
                Seed recommended rules or add your own architecture decisions and safety constraints.
              </p>
              <Button variant="outline" onClick={handleSeedDefaults} className="cursor-pointer">
                Seed recommended rules
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className={`border rounded-xl p-4 ${rule.is_active === false ? "border-slate-100 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className={severityStyles[rule.severity] || severityStyles.medium}>
                          {rule.severity || "medium"}
                        </Badge>
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                          {rule.category || "general"}
                        </Badge>
                        {rule.is_active === false && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200">
                            inactive
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-heading font-semibold text-slate-900">{rule.title}</h3>
                      <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{rule.description}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleToggleRule(rule)} className="cursor-pointer">
                        {rule.is_active === false ? "Enable" : "Disable"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteRule(rule.id)} className="cursor-pointer text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
