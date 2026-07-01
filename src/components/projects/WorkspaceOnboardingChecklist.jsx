import { Link } from 'react-router-dom';
import { CheckCircle, Circle, Compass, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWorkspaceOnboardingChecklist } from '@/lib/workspaceOnboardingUtils';

export default function WorkspaceOnboardingChecklist({ projects = [] }) {
  const checklist = buildWorkspaceOnboardingChecklist(projects);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Compass className="w-4 h-4" /> Workspace setup
          </h2>
          <p className="text-sm text-slate-500 mt-1">Turn the workspace into a useful engineering cockpit.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <div className="text-xs uppercase tracking-wider text-slate-400">Progress</div>
          <div className="text-xl font-bold text-slate-900">{checklist.progress}%</div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${checklist.progress}%` }} />
      </div>

      <div className="space-y-2">
        {checklist.steps.map((step) => (
          <div key={step.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start gap-2">
              {step.done ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-slate-900">{step.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                {!step.done && (
                  <Link to={step.href} className="inline-flex mt-2">
                    <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
                      {step.cta}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {checklist.complete && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Workspace setup looks complete. Keep improving quality with deeper indexing and regular review workflows.
        </div>
      )}
    </div>
  );
}
