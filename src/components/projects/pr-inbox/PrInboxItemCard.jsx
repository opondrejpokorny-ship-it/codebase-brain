// @ts-nocheck
import { Link } from 'react-router-dom';
import { Network, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReviewVerdictBadge from '@/components/projects/ReviewVerdictBadge';
import {
  prInboxChangedFileCount,
  prInboxGraphLensUrl,
  prInboxItemLabel,
  prInboxItemStatus,
  prInboxItemTitle,
  prInboxItemUrl,
} from '@/lib/prInboxDisplayUtils';
import { queueStatusLabel } from '@/lib/queueStatusUtils';

export default function PrInboxItemCard({ projectId, item = {}, canAnalyze = false, onAnalyze = null, analyzing = false, extraActions = null }) {
  const status = prInboxItemStatus(item);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">{prInboxItemLabel(item)}</div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{prInboxItemTitle(item)}</h2>
            <ReviewVerdictBadge item={item} />
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {prInboxChangedFileCount(item)} files · +{item.pr_metadata?.additions || 0} / -{item.pr_metadata?.deletions || 0} · {queueStatusLabel(status)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {prInboxItemUrl(item) && <a href={prInboxItemUrl(item)} target="_blank" rel="noreferrer"><Button variant="outline" size="sm">GitHub</Button></a>}
          <Link to={prInboxGraphLensUrl(projectId, item)}><Button variant="outline" size="sm" className="gap-1.5"><Network className="w-3.5 h-3.5" /> Graph Lens</Button></Link>
          {canAnalyze && (
            <Button size="sm" onClick={() => onAnalyze?.(item)} disabled={analyzing} className="gap-1.5">
              <PlayCircle className="w-3.5 h-3.5" /> Analyze now
            </Button>
          )}
          {extraActions}
        </div>
      </div>
    </div>
  );
}
