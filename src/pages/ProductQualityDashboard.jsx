import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, CheckCircle, FileText, GitPullRequestArrow, Loader2, ShieldCheck, SlidersHorizontal, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { optionalEntity } from '@/lib/impactAnalysisRuntimeUtils';
import { buildProductQualityReport, scoreToneClasses } from '@/lib/productQualityUtils';
import { decorateQualityPriorities, primaryQualityAction } from '@/lib/productQualityActionUtils';
import { getProjectRulesForRuntime } from '@/lib/projectRulesUtils';

function ScoreCard({ title, value, description, icon: Icon }) {
  const tone = value >= 85 ? 'emerald' : value >= 70 ? 'blue' : value >= 50 ? 'amber' : 'red';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <div className="text-3xl font-bold text-slate-900 mt-1">{value}%</div>
        </div>
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${scoreToneClasses(tone)}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3">{description}</p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function severityClass(severity) {
  if (severity === 'high') return 'bg-red-50 text-red-700 border-red-200';
  if (severity === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function effortClass(effort) {
  if (effort === 'high') return 'bg-red-50 text-red-700 border-red-200';
  if (effort === 'medium') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

export default function ProductQualityDashboard() {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const analysisEntity = optionalEntity('CodebaseAnalysis');
        const [projects, storedFiles, remoteAnalyses] = await Promise.all([
          base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
          base44.entities.CodeFile.filter({ project_id: projectId }, 'path', 1000).catch(() => []),
          analysisEntity?.filter ? analysisEntity.filter({ project_id: projectId }, 'created_date', 100).catch(() => []) : Promise.resolve([]),
        ]);
        if (!alive) return;
        setProject(projects?.[0] || null);
        setFiles(storedFiles || []);
        setAnalyses(remoteAnalyses || []);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [projectId]);

  const rules = useMemo(() => getProjectRulesForRuntime(projectId), [projectId]);
  const report = useMemo(() => buildProductQualityReport({ project, files, analyses, rules }), [project, files, analyses, rules]);
  const priorities = useMemo(() => decorateQualityPriorities(report.priorities, projectId), [report.priorities, projectId]);
  const primaryAction = useMemo(() => primaryQualityAction(report.priorities, projectId), [report.priorities, projectId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (!project) return <div className="text-center py-20"><p className="text-slate-500">Project not found.</p><Link to="/" className="text-sm text-slate-900 underline mt-2 inline-block">Back to Dashboard</Link></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Link to={`/project/${projectId}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> Project</Link>
          <h1 className="font-heading text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6" /> Product Quality Dashboard
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">A product-grade control panel for import coverage, context quality, review readiness, and repeatable project rules.</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 min-w-48 ${scoreToneClasses(report.tier.tone)}`}>
          <div className="text-xs uppercase tracking-wider opacity-80">Overall score</div>
          <div className="text-3xl font-bold mt-1">{report.overall}%</div>
          <div className="text-sm font-medium">{report.tier.label}</div>
        </div>
      </div>

      {primaryAction && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400">Next best action</div>
              <h2 className="font-semibold text-slate-900 mt-1">{primaryAction.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{primaryAction.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`text-xs font-medium rounded-full border px-2.5 py-1 ${severityClass(primaryAction.severity)}`}>{primaryAction.severity} priority</span>
                <span className={`text-xs font-medium rounded-full border px-2.5 py-1 ${effortClass(primaryAction.action.effort)}`}>{primaryAction.action.effort} effort</span>
                <span className="text-xs font-medium rounded-full border px-2.5 py-1 bg-slate-50 text-slate-600 border-slate-200">{primaryAction.action.impact}</span>
              </div>
            </div>
          </div>
          <Link to={primaryAction.action.href}>
            <Button className="gap-1.5 cursor-pointer">{primaryAction.action.label}<ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-3">
        <ScoreCard title="Import coverage" value={report.scores.importCoverage} description="How much usable source context is stored." icon={FileText} />
        <ScoreCard title="Context completeness" value={report.scores.contextCompleteness} description="Missing imports and queued context still affect grounding." icon={Target} />
        <ScoreCard title="Review readiness" value={report.scores.reviewReadiness} description="Stored analyses and risk history for PR review workflows." icon={GitPullRequestArrow} />
        <ScoreCard title="Rules maturity" value={report.scores.rulesMaturity} description="Project rules and ADR memory make analysis repeatable." icon={ShieldCheck} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Actionable productization priorities</h2>
          </div>
          <div className="space-y-3">
            {priorities.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400">Step {item.rank}</div>
                    <h3 className="font-medium text-slate-900 mt-1">{item.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`text-xs font-medium rounded-full border px-2.5 py-1 ${severityClass(item.severity)}`}>{item.severity}</span>
                      <span className={`text-xs font-medium rounded-full border px-2.5 py-1 ${effortClass(item.action.effort)}`}>{item.action.effort} effort</span>
                      <span className="text-xs font-medium rounded-full border px-2.5 py-1 bg-slate-50 text-slate-600 border-slate-200">{item.action.impact}</span>
                    </div>
                  </div>
                  <Link to={item.action.href}>
                    <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">{item.action.label}<ArrowRight className="w-3.5 h-3.5" /></Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Project facts</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Files" value={report.stats.files} />
            <StatCard label="Imported" value={report.stats.importedFiles} />
            <StatCard label="Candidates" value={report.stats.totalCandidates} />
            <StatCard label="Missing context" value={report.stats.missingContextItems} />
            <StatCard label="Analyses" value={report.stats.analyses} />
            <StatCard label="Rules" value={report.stats.rules} />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Detected stack</div>
            <div className="flex flex-wrap gap-1.5">
              {report.stats.detectedStack.length ? report.stats.detectedStack.map((tech) => <span key={tech} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">{tech}</span>) : <span className="text-sm text-slate-500">Unknown</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Link to={`/project/${projectId}/import-queue`}><Button variant="outline" className="w-full">Resolve context</Button></Link>
        <Link to={`/project/${projectId}/pr-inbox`}><Button variant="outline" className="w-full">PR Inbox</Button></Link>
        <Link to={`/project/${projectId}/rules`}><Button variant="outline" className="w-full">Project rules</Button></Link>
        <Link to={`/project/${projectId}/architecture`}><Button variant="outline" className="w-full">Architecture</Button></Link>
      </div>
    </div>
  );
}
