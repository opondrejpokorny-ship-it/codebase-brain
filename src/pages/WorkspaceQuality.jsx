import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, CheckCircle, Loader2, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { buildWorkspaceQualityOverview } from '@/lib/workspaceQualityUtils';
import { scoreToneClasses } from '@/lib/productQualityUtils';
import { applyWorkspaceQualityControls, WORKSPACE_QUALITY_FILTERS, WORKSPACE_QUALITY_SORTS } from '@/lib/workspaceQualityListUtils';

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

export default function WorkspaceQuality() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qualityFilter, setQualityFilter] = useState('all');
  const [qualitySort, setQualitySort] = useState('quality_asc');

  useEffect(() => {
    base44.entities.CodebaseProject.list('-created_date', 100)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  const overview = useMemo(() => buildWorkspaceQualityOverview(projects), [projects]);
  const visibleReports = useMemo(
    () => applyWorkspaceQualityControls(overview.projectReports, { filter: qualityFilter, sort: qualitySort }),
    [overview.projectReports, qualityFilter, qualitySort]
  );

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
        </div>
        <div className={`rounded-xl border px-4 py-3 min-w-48 ${scoreToneClasses(overview.tierTone)}`}>
          <div className="text-xs uppercase tracking-wider opacity-80">Workspace average</div>
          <div className="text-3xl font-bold mt-1">{overview.average}%</div>
          <div className="text-sm font-medium">{overview.total} projects</div>
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
