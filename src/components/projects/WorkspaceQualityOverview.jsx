import { Link } from 'react-router-dom';
import { ArrowRight, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWorkspaceQualityOverview } from '@/lib/workspaceQualityUtils';
import { scoreToneClasses } from '@/lib/productQualityUtils';

function TierPill({ label, count }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{count}</span>
    </div>
  );
}

function ProjectRow({ item }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/project/${item.project.id}/quality`} className="font-medium text-slate-900 hover:underline truncate block">
            {item.project.name}
          </Link>
          <div className="text-xs text-slate-500 mt-1">{item.report.tier.label} · {item.report.overall}% quality</div>
          {item.action && <div className="text-xs text-slate-500 mt-1">Next: {item.action.title}</div>}
        </div>
        <Link to={item.action?.action?.href || `/project/${item.project.id}/quality`}>
          <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
            {item.action?.action?.label || 'Open'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function WorkspaceQualityOverview({ projects = [] }) {
  const overview = buildWorkspaceQualityOverview(projects);

  if (!projects.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Workspace quality
          </h2>
          <p className="text-sm text-slate-500 mt-1">Product readiness across all indexed projects.</p>
        </div>
        <div className={`rounded-lg border px-3 py-2 text-right ${scoreToneClasses(overview.tierTone)}`}>
          <div className="text-xs uppercase tracking-wider opacity-80">Average</div>
          <div className="text-2xl font-bold">{overview.average}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TierPill label="Product-ready" count={overview.tiers['Product-ready'] || 0} />
        <TierPill label="Strong beta" count={overview.tiers['Strong beta'] || 0} />
        <TierPill label="MVP+" count={overview.tiers['MVP+'] || 0} />
        <TierPill label="Needs hardening" count={overview.tiers['Needs hardening'] || 0} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          {overview.needsAttention.length ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
          <h3 className="text-sm font-medium text-slate-700">Projects needing action</h3>
        </div>
        {overview.needsAttention.length ? (
          <div className="space-y-2">
            {overview.needsAttention.map((item) => <ProjectRow key={item.project.id} item={item} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            No urgent product quality gaps detected.
          </div>
        )}
      </div>

      <Link to="/workspace/quality" className="block">
        <Button variant="outline" className="w-full gap-1.5 cursor-pointer">
          Open workspace quality
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}
