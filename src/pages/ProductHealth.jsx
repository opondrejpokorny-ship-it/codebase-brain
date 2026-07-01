import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, CheckCircle, Clock3, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRODUCT_HEALTH_SECTIONS, healthToneClasses, summarizeProductHealth } from '@/lib/productHealthUtils';

const iconByStatus = {
  ready: CheckCircle,
  'local-first': Clock3,
  guarded: ShieldCheck,
  next: Wrench,
  'not-enabled': Wrench,
};

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default function ProductHealth() {
  const summary = summarizeProductHealth();

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="font-heading text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-6 h-6" /> Product Health
        </h1>
        <p className="text-slate-500 mt-1 max-w-2xl">A current-state checklist for what is stable, local-first, guarded, and next to harden.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total checks" value={summary.total} />
        <MetricCard label="Ready" value={summary.ready} />
        <MetricCard label="Local-first" value={summary.localFirst} />
        <MetricCard label="Next targets" value={summary.next} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {PRODUCT_HEALTH_SECTIONS.map((section) => (
          <div key={section.title} className={`rounded-xl border p-5 ${healthToneClasses(section.tone)}`}>
            <h2 className="font-semibold mb-3">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = iconByStatus[item.status] || Wrench;
                return (
                  <div key={item.label} className="flex items-start gap-2 rounded-lg bg-white/70 border border-white/60 px-3 py-2">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Recommended next step</h2>
          <p className="text-sm text-slate-500 mt-1">Move from UI polish to deeper import, graph, and review intelligence.</p>
        </div>
        <Link to="/workspace/quality">
          <Button variant="outline" className="cursor-pointer">Open Workspace Quality</Button>
        </Link>
      </div>
    </div>
  );
}
