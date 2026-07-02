// @ts-nocheck
import { Link } from 'react-router-dom';
import { Network, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReviewVerdictBadge from '@/components/projects/ReviewVerdictBadge';
import { prAnalysisKey } from '@/lib/prAnalysisOverlayUtils';
import { queueStatusLabel } from '@/lib/queueStatusUtils';

function itemLabel(item = {}) {
  const meta = item.pr_metadata || {};
  const repo = meta.repositoryFullName || item.repository || 'unknown/repo';
  const number = meta.prNumber || item.pr_number || '?';
  return `${repo}#${number}`;
}

function itemTitle(item = {}) {
  return item.pr_metadata?.title || item.title || 'Untitled pull request';
}

function itemUrl(item = {}) {
  return item.pr_metadata?.htmlUrl || item.html_url || '';
}

function itemStatus(item = {}) {
  if (item.inbox_status) return item.inbox_status;
  if (item.risk_level === 'pending') return 'pending_review';
  return item.risk_level || 'unknown';
}

function graphLensUrl(projectId, item = {}) {
  return `/project/${projectId}/graph?pr=${encodeURIComponent(prAnalysisKey(item))}`;
}

export default function PrInboxItemCard({ projectId, item = {}, canAnalyze = false, onAnalyze = null, analyzing = false, extraActions = null }) {
  const status = itemStatus(item);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">{itemLabel(item)}</div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{itemTitle(item)}</h2>
            <ReviewVerdictBadge item={item} />
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {item.pr_metadata?.changedFilesCount || item.changed_files?.length || 0} files · +{item.pr_metadata?.additions || 0} / -{item.pr_metadata?.deletions || 0} · {queueStatusLabel(status)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {itemUrl(item) && <a href={itemUrl(item)} target="_blank" rel="noreferrer"><Button variant="outline" size="sm">GitHub</Button></a>}
          <Link to={graphLensUrl(projectId, item)}><Button variant="outline" size="sm" className="gap-1.5"><Network className="w-3.5 h-3.5" /> Graph Lens</Button></Link>
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
