import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, FileWarning, GitBranch, History, Loader2, ShieldAlert, TestTube2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import {
  buildRiskMemory,
  mergeAnalysisHistories,
  readLocalAnalysisHistory,
} from "@/lib/analysisHistoryUtils";

const riskStyles = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-slate-50 text-slate-600 border-slate-200",
};

function optionalEntity(entityName) {
  try {
    const entity = base44?.entities?.[entityName];
    return entity || null;
  } catch {
    return null;
  }
}

function CountList({ title, icon: Icon, items, emptyText }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        {title}
      </h2>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.name} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-mono text-slate-700 break-all">{item.name}</p>
              <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 flex-shrink-0">
                {item.count}×
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}

export default function RiskMemory() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historySource, setHistorySource] = useState("local fallback");

  useEffect(() => {
    let cancelled = false;

    async function loadRiskMemory() {
      setLoading(true);
      try {
        const [projects] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id }).catch(() => []),
        ]);

        const analysisEntity = optionalEntity("CodebaseAnalysis");
        const remoteAnalyses = analysisEntity?.filter
          ? await analysisEntity.filter({ project_id: id }, "created_date", 80).catch(() => [])
          : [];
        const localAnalyses = readLocalAnalysisHistory(id);
        const merged = mergeAnalysisHistories(remoteAnalyses || [], localAnalyses || []);

        if (!cancelled) {
          setProject(projects?.[0] || null);
          setAnalyses(merged);
          setHistorySource(remoteAnalyses?.length ? "Base44 + local fallback" : "local fallback");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRiskMemory();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const memory = useMemo(() => buildRiskMemory(analyses), [analyses]);

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
              <History className="w-5 h-5 text-slate-500" />
              Risk Memory
            </h1>
            {project?.name && (
              <p className="text-xs text-slate-400 mt-1">Project: {project.name}</p>
            )}
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Persistent memory from previous impact analyses. It highlights repeated risk areas, high-risk files, common testing recommendations, and recent reports.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Source: {historySource}. Base44 `CodebaseAnalysis` is optional; local history keeps the feature usable before schema setup.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link to={`/project/${id}/impact`}>
              <Button variant="outline" className="cursor-pointer gap-2 w-full sm:w-auto">
                <ShieldAlert className="w-4 h-4" />
                New impact analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {!analyses.length ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-heading font-semibold text-slate-900">No analysis history yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Run at least one impact analysis for this project. The report will be saved into local Risk Memory immediately.
          </p>
          <Link to={`/project/${id}/impact`}>
            <Button className="cursor-pointer">Run impact analysis</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Analyses</p>
              <p className="text-2xl font-bold text-slate-900">{memory.totalAnalyses}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4">
              <p className="text-xs text-red-400 mb-1">High risk</p>
              <p className="text-2xl font-bold text-red-700">{memory.riskCounts.high}</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-4">
              <p className="text-xs text-amber-500 mb-1">Medium risk</p>
              <p className="text-2xl font-bold text-amber-700">{memory.riskCounts.medium}</p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4">
              <p className="text-xs text-emerald-500 mb-1">Low risk</p>
              <p className="text-2xl font-bold text-emerald-700">{memory.riskCounts.low}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <CountList
              title="High-risk files"
              icon={FileWarning}
              items={memory.highRiskFiles}
              emptyText="No file has appeared in a high-risk analysis yet."
            />
            <CountList
              title="Frequently changed files"
              icon={GitBranch}
              items={memory.frequentlyChangedFiles}
              emptyText="No changed-file history yet."
            />
            <CountList
              title="Repeated risk signals"
              icon={BarChart3}
              items={memory.repeatedRiskSignals}
              emptyText="No repeated risk signals yet."
            />
            <CountList
              title="Common recommended tests"
              icon={TestTube2}
              items={memory.commonRecommendedTests}
              emptyText="No recommended tests have been captured yet."
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Recent analyses</h2>
            <div className="space-y-3">
              {analyses.slice(0, 12).map((analysis) => (
                <div key={analysis.id || analysis.created_date} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={riskStyles[analysis.risk_level] || riskStyles.unknown}>
                        {analysis.risk_level || "unknown"} risk
                      </Badge>
                      {analysis.storage_source && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                          {analysis.storage_source}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {analysis.created_date ? new Date(analysis.created_date).toLocaleString() : ""}
                    </span>
                  </div>
                  {analysis.changed_files?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {analysis.changed_files.slice(0, 5).map((file) => (
                        <span key={file} className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {file}
                        </span>
                      ))}
                      {analysis.changed_files.length > 5 && (
                        <span className="text-xs text-slate-400 px-2 py-1">+{analysis.changed_files.length - 5} more</span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-slate-500 line-clamp-3">
                    {(analysis.result || "").replace(/[#*_`]/g, "").slice(0, 260)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
