import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, SlidersHorizontal, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readWorkspaceOptions } from '@/lib/workspaceOptionsUtils';

const cadenceLabels = {
  daily: 'Daily review',
  weekly: 'Weekly review',
  biweekly: 'Biweekly review',
  monthly: 'Monthly review',
};

export default function WorkspaceOptionsSummary() {
  const options = readWorkspaceOptions();
  const cadence = cadenceLabels[options.review_cadence] || options.review_cadence || 'Weekly review';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Workspace options
          </h2>
          <p className="text-sm text-slate-500 mt-1 truncate">{options.workspace_name || 'Codebase Brain Workspace'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Target</div>
          <div className="text-sm font-semibold text-slate-900 mt-1">{Number(options.quality_target || 70)}%</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Cadence</div>
          <div className="text-sm font-semibold text-slate-900 mt-1">{cadence}</div>
        </div>
      </div>

      {options.team_notes && <p className="text-xs text-slate-500 line-clamp-2">{options.team_notes}</p>}

      <Link to="/workspace/settings" className="block">
        <Button variant="outline" className="w-full gap-1.5 cursor-pointer">
          Edit workspace options
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}
