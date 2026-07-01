import { AlertTriangle, Clock, Files } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { freshnessTone, summarizeContextFreshness } from '@/lib/contextFreshnessUtils';

export default function ContextFreshnessBanner({ project, files }) {
  const summary = summarizeContextFreshness(project, files);
  const tone = freshnessTone(summary.status);

  return (
    <div className={`rounded-xl border p-4 ${tone.className}`}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex items-start gap-3">
          {summary.shouldWarn ? <AlertTriangle className="w-5 h-5 mt-0.5" /> : <Clock className="w-5 h-5 mt-0.5" />}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold">Context freshness</h2>
              <Badge variant="outline" className={tone.badgeClassName}>{tone.badge}</Badge>
            </div>
            <div className="text-sm mt-1 space-y-1">
              {summary.messages.map((message) => <p key={message}>{message}</p>)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 min-w-52">
          <div className="rounded-lg border border-current/10 bg-white/60 px-3 py-2">
            <div className="text-lg font-semibold">{summary.fileCount}</div>
            <div className="text-xs opacity-75">stored files</div>
          </div>
          <div className="rounded-lg border border-current/10 bg-white/60 px-3 py-2">
            <div className="text-lg font-semibold">{summary.ageLabel}</div>
            <div className="text-xs opacity-75">latest update</div>
          </div>
        </div>
      </div>

      {summary.topGroups.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
          <Files className="w-3.5 h-3.5" />
          <span className="opacity-75">Top context areas:</span>
          {summary.topGroups.map((group) => (
            <span key={group.name} className="rounded-full bg-white/60 border border-current/10 px-2 py-1">
              {group.name} · {group.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
