import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Inbox, Loader2, Plus, RefreshCw, ShieldAlert, GitPullRequestArrow, FileDiff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { fetchPublicGithubPrDiffWithFallback, optionalEntity } from '@/lib/impactAnalysisRuntimeUtils';
import { formatPrDiffForImpactAnalysis } from '@/lib/githubPrUtils';
import { compareProjectAndPrRepository } from '@/lib/repositoryCompatibilityUtils';
import { mergePrInboxItems, readLocalPrInbox, writeLocalPrInboxItem } from '@/lib/prInboxStorage';

function prLabel(item = {}) {
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

function statusLabel(item = {}) {
  if (item.inbox_status) return item.inbox_status;
  if (item.risk_level === 'pending') return 'pending_review';
  return item.risk_level || 'unknown';
}

function normalizeInboxItem(item = {}) {
  return {
    ...item,
    inbox_status: item.inbox_status || (item.risk_level === 'pending' ? 'pending_review' : item.risk_level || 'unknown'),
  };
}

export default function PullRequestInbox() {
  const { id: projectId } = useParams();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [prUrl, setPrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);

  const pendingCount = useMemo(() => items.filter((item) => statusLabel(item).includes('pending') || statusLabel(item).includes('mismatch')).length, [items]);

  const loadInbox = async () => {
    setLoading(true);
    try {
      const [projects, remoteItems] = await Promise.all([
        base44.entities.CodebaseProject.filter({ id: projectId }).catch(() => []),
        optionalEntity('CodebaseAnalysis')?.filter
          ? optionalEntity('CodebaseAnalysis').filter({ project_id: projectId }, 'created_date', 80).catch(() => [])
          : Promise.resolve([]),
      ]);
      const relevantRemote = (remoteItems || [])
        .filter((item) => item.pr_metadata || item.type === 'pr_inbox_pending' || item.type === 'public_github_pr_impact')
        .map(normalizeInboxItem);
      setProject(projects?.[0] || null);
      setItems(mergePrInboxItems(relevantRemote, readLocalPrInbox(projectId)).map(normalizeInboxItem));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const queuePr = async () => {
    if (!prUrl.trim()) {
      toast({ title: 'Paste a public GitHub PR URL first', variant: 'destructive' });
      return;
    }
    setQueueing(true);
    try {
      const fetched = await fetchPublicGithubPrDiffWithFallback(prUrl.trim());
      const compatibility = compareProjectAndPrRepository(project, fetched);
      const record = {
        project_id: projectId,
        type: 'pr_inbox_pending',
        input: formatPrDiffForImpactAnalysis(fetched),
        result: '',
        risk_level: 'pending',
        inbox_status: compatibility.status === 'mismatch' ? 'repo_mismatch' : 'pending_review',
        changed_files: fetched.changedFiles || [],
        related_files: [],
        risk_signals: [],
        relevant_files: [],
        relevant_relations: [],
        repository_compatibility: compatibility,
        pr_metadata: {
          repositoryFullName: fetched.repositoryFullName,
          prNumber: fetched.prNumber,
          title: fetched.title,
          state: fetched.state,
          draft: fetched.draft,
          htmlUrl: fetched.htmlUrl,
          baseRef: fetched.baseRef,
          headRef: fetched.headRef,
          changedFilesCount: fetched.changedFilesCount || fetched.changedFiles?.length || 0,
          additions: fetched.additions,
          deletions: fetched.deletions,
          truncated: fetched.truncated,
          source: fetched.source,
        },
        context_depth: 'balanced',
        created_date: new Date().toISOString(),
      };
      const localSaved = writeLocalPrInboxItem(projectId, record);
      let saved = localSaved;
      const entity = optionalEntity('CodebaseAnalysis');
      if (entity?.create) {
        saved = await entity.create(record).catch(() => localSaved);
      }
      setItems((prev) => mergePrInboxItems([normalizeInboxItem(saved)], prev));
      setPrUrl('');
      toast({
        title: compatibility.status === 'mismatch' ? 'PR queued with repository warning' : 'PR queued for internal review',
        description: `${fetched.repositoryFullName}#${fetched.prNumber}`,
        variant: compatibility.status === 'mismatch' ? 'destructive' : undefined,
      });
    } catch (error) {
      toast({ title: 'Failed to queue PR', description: error?.message || 'The PR must be public and accessible.', variant: 'destructive' });
    } finally {
      setQueueing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-2">{project?.name || 'Project'} / PR Inbox</p>
          <h1 className="font-heading text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-6 h-6" /> Internal PR review queue
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Queue public GitHub pull requests for Codebase Brain analysis. This page stores internal review candidates only; it does not post comments, approve, merge, or change GitHub.
          </p>
        </div>
        <Link to={`/project/${projectId}/impact`}>
          <Button variant="outline" className="gap-2 cursor-pointer"><FileDiff className="w-4 h-4" /> Open Impact Analysis</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <GitPullRequestArrow className="w-4 h-4" /> Queue PR
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={prUrl}
            onChange={(event) => setPrUrl(event.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
          <Button onClick={queuePr} disabled={queueing} className="gap-2 cursor-pointer">
            {queueing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Queue
          </Button>
          <Button variant="outline" onClick={loadInbox} disabled={loading} className="gap-2 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{items.length}</div>
          <div className="text-sm text-slate-500">Total PR items</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{pendingCount}</div>
          <div className="text-sm text-slate-500">Pending / warning</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">0</div>
          <div className="text-sm text-slate-500">GitHub writes enabled</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-900">No queued PRs yet</h2>
          <p className="text-sm text-slate-500 mt-1">Paste a public PR URL above to create the first internal review item.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id || prLabel(item)} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">{prLabel(item)}</div>
                  <h2 className="font-semibold text-slate-900">{itemTitle(item)}</h2>
                  <div className="text-sm text-slate-500 mt-1">
                    {item.pr_metadata?.changedFilesCount || item.changed_files?.length || 0} files · +{item.pr_metadata?.additions || 0} / -{item.pr_metadata?.deletions || 0} · {statusLabel(item)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {itemUrl(item) && <a href={itemUrl(item)} target="_blank" rel="noreferrer"><Button variant="outline" size="sm">GitHub</Button></a>}
                  <Link to={`/project/${projectId}/impact`}><Button size="sm">Analyze</Button></Link>
                </div>
              </div>
              {item.repository_compatibility?.status === 'mismatch' && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  Repository mismatch: this PR may not belong to the selected Codebase Brain project.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
