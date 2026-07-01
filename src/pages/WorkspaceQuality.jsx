import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, CheckCircle, Download, Loader2, ShieldAlert, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { buildWorkspaceQualityOverview } from '@/lib/workspaceQualityUtils';
import { scoreToneClasses } from '@/lib/productQualityUtils';
import { applyWorkspaceQualityControls, WORKSPACE_QUALITY_FILTERS, WORKSPACE_QUALITY_SORTS } from '@/lib/workspaceQualityListUtils';
import { readWorkspaceQualityPreference, writeWorkspaceQualityPreference } from '@/lib/workspaceQualityPreferenceUtils';
import { downloadWorkspaceQualityMarkdownReport } from '@/lib/workspaceQualityReportUtils';
import { formatSnapshotDate, listWorkspaceQualitySnapshots, saveWorkspaceQualitySnapshot, summarizeWorkspaceQualityTrend } from '@/lib/workspaceQualityTrendUtils';
import { readWorkspaceOptions } from '@/lib/workspaceOptionsUtils';
import { summarizeWorkspaceTarget } from '@/lib/workspaceTargetUtils';

function TierCard({ label, count }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-2xl font-bold text-slate-900">{count}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function ProjectQualityRow({ item }) {
  const actionHref = item.action?.action?.href || `/project/${item.project.id}/quality`;
  const actionLabel = item.action?.action?.label || 'Open quality';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/project/${item.project.id}/quality`} className="font-semibold text-slate-900 hover:underline truncate block">
            {item.project.name}
          </Link>
          <div className="text-sm text-slate-500 mt-1">{item.report.tier.label} · {item.report.overall}% quality</div>
          {item.report.priorities?.[0] && <div className="text-xs text-slate-500 mt-1">Top priority: {item.report.priorities[0].title}</div>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreToneClasses(item.report.tier.tone)}`}>{item.report.overall}%</span>
          <Link to={actionHref}>
            <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
              {actionLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function TrendBadge({ trend }) {
  if (trend.direction === 'up') return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><TrendingUp className="w-3.5 h-3.5" />{trend.label}</span>;
  if (trend.direction === 'down') return <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"><TrendingDown className="w-3.5 h-3.5" />{trend.label}</span>;
  return <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{trend.label}</span>;
}

function TargetBadge({ target }) {
  const className = target.met
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{target.label}</span>;
}

export default function WorkspaceQuality() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qualityFilter, setQualityFilter] = useState(() => readWorkspaceQualityPreference('qualityFilter', 'all'));
  const [qualitySort, setQualitySort] = useState(() => readWorkspaceQualityPreference('qualitySort', 'quality_asc'));
  const [snapshots, setSnapshots] = useState(() => listWorkspaceQualitySnapshots());
  const [workspaceOptions] = useState(() => readWorkspaceOptions());

  useEffect(() => {
    base44.entities.CodebaseProject.list('-created_date', 100)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    writeWorkspaceQualityPreference('qualityFilter', qualityFilter);
  }, [qualityFilter]);

  useEffect(() => {
    writeWorkspaceQualityPreference('qualitySort', qualitySort);
  }, [qualitySort]);

  const overview = useMemo(() => buildWorkspaceQualityOverview(projects), [projects]);
  const target = useMemo(() => summarizeWorkspaceTarget(overview.average, workspaceOptions.quality_target), [overview.average, workspaceOptions.quality_target]);
  const trend = useMemo(() => summarizeWorkspaceQualityTrend(overview, snapshots), [overview, snapshots]);
  const visibleReports = useMemo(
    () => applyWorkspaceQualityControls(overview.projectReports, { filter: qualityFilter, sort: qualitySort }),
    [overview.projectReports, qualityFilter, qualitySort]
  );

  function handleSaveSnapshot() {
    saveWorkspaceQualitySnapshot(overview);
    setSnapshots(listWorkspaceQualitySnapshots());
  }

  function handleDownloadReport() {
    downloadWorkspaceQualityMarkdownReport({ overview, snapshots, options: workspaceOptions });
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> Dashboard</Link>
          <h1 className="font-heading text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6" /> Workspace Quality
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">Portfolio-level product readiness across all Codebase Brain projects.</p>
          <Link to="/workspace/settings" className="inline-flex mt-3">
            <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Workspace options
            </Button>
          </Link>
        </div>
        <div className={`rounded-xl border px-4 py-3 min-w-48 ${scoreToneClasses(overview.tierTone)}`}>
          <div className="text-xs uppercase tracking-wider opacity-80">Workspace average</div>
          <div className="text-3xl font-bold mt-1">{overview.average}%</div>
          <div className="text-sm font-medium">Target {target.target}%</div>
          <div className="mt-2"><TargetBadge target={target} /></div>
        </div>
      </div>

      {!projects.length ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-900">No projects yet</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">Add a repository to start tracking workspace quality.</p>
          <Link to="/add"><Button className="cursor-pointer">Add repository</Button></Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Quality trend</h2>
                <p className="text-sm text-slate-500 mt-1">Save local snapshots to track whether workspace quality is improving.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleDownloadReport} className="gap-1.5 cursor-pointer"><Download className="w-4 h-4" /> Download report</Button>
                <Button onClick={handleSaveSnapshot} className="cursor-pointer">Save snapshot</Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TrendBadge trend={trend} />
              <TargetBadge target={target} />
              {trend.previous && <span className="text-xs text-slate-500">Last saved: {formatSnapshotDate(trend.previous.created_at)} · {trend.previous.average}% average</span>}
            </div>
            {snapshots.length > 0 && (
              <div className="grid md:grid-cols-3 gap-2">
                {snapshots.slice(0, 3).map((snapshot) => (
                  <div key={snapshot.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-sm font-semibold text-slate-900">{snapshot.average}% average</div>
                    <div className="text-xs text-slate-500">{formatSnapshotDate(snapshot.created_at)}</div>
                    <div className="text-xs text-slate-500 mt-1">{snapshot.needs_attention} projects need attention</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <TierCard label="Product-ready" count={overview.tiers['Product-ready'] || 0} />
            <TierCard label="Strong beta" count={overview.tiers['Strong beta'] || 0} />
            <TierCard label="MVP+" count={overview.tiers['MVP+'] || 0} />
            <TierCard label="Needs hardening" count={overview.tiers['Needs hardening'] || 0} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h2 className="font-semibold text-slate-900">Needs attention</h2>
              </div>
              {overview.needsAttention.length ? overview.needsAttention.map((item) => <ProjectQualityRow key={item.project.id} item={item} />) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">No urgent quality gaps detected.</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-slate-900">Strongest projects</h2>
              </div>
              {overview.strongest.map((item) => <ProjectQualityRow key={item.project.id} item={item} />)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> All projects
                </h2>
                <p className="text-sm text-slate-500 mt-1">Showing {visibleReports.length} of {overview.projectReports.length} projects.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="sr-only" htmlFor="workspace-quality-filter">Quality filter</label>
                <select
                  id="workspace-quality-filter"
                  value={qualityFilter}
                  onChange={(event) => setQualityFilter(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {WORKSPACE_QUALITY_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <label className="sr-only" htmlFor="workspace-quality-sort">Sort projects</label>
                <select
                  id="workspace-quality-sort"
                  value={qualitySort}
                  onChange={(event) => setQualitySort(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {WORKSPACE_QUALITY_SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>

            {visibleReports.length ? (
              <div className="space-y-2">
                {visibleReports.map((item) => <ProjectQualityRow key={item.project.id} item={item} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <h3 className="font-semibold text-slate-900">No projects match this filter</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">Try a broader quality filter.</p>
                <Button variant="outline" onClick={() => setQualityFilter('all')} className="cursor-pointer">Show all projects</Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
