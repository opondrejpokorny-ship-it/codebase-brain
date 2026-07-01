import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clipboard, Inbox, Loader2, Lock, MessageSquare, Plus, RefreshCw, RotateCcw, Save, ShieldAlert, GitPullRequestArrow, FileDiff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PrInboxItemCard from '@/components/projects/pr-inbox/PrInboxItemCard';
import { usePrInboxItems } from '@/hooks/usePrInboxItems';
import { fetchPublicGithubPrDiffWithFallback, optionalEntity } from '@/lib/impactAnalysisRuntimeUtils';
import { formatPrDiffForImpactAnalysis } from '@/lib/githubPrUtils';
import { compareProjectAndPrRepository } from '@/lib/repositoryCompatibilityUtils';
import { mergePrInboxItems, writeLocalPrInboxItem } from '@/lib/prInboxStorage';
import { runPrInboxAnalysis } from '@/lib/prInboxAnalysisRunner';
import { buildPrCommentDraft, hasPrCommentDraft } from '@/lib/prCommentDraftUtils';
import { readLocalCommentApproval, summarizeCommentApprovals, writeLocalCommentApproval } from '@/lib/prCommentApprovalUtils';
import { buildReadinessRows, summarizeReadiness } from '@/lib/readinessPreviewUtils';

function prLabel(item = {}) {
  const meta = item.pr_metadata || {};
  const repo = meta.repositoryFullName || item.repository || 'unknown/repo';
  const number = meta.prNumber || item.pr_number || '?';
  return `${repo}#${number}`;
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

function canAnalyze(item = {}) {
  const status = statusLabel(item);
  return Boolean(item.input) && (status.includes('pending') || status.includes('mismatch') || status === 'unknown');
}

function rowsForItem(item = {}, approval = null) {
  const meta = item.pr_metadata || {};
  const compatibility = item.repository_compatibility || {};
  return buildReadinessRows({
    approved: approval?.status === 'approved' && Boolean(String(approval?.draft || '').trim()),
    identified: Boolean(meta.repositoryFullName && meta.prNumber),
    repositoryOk: compatibility.status !== 'mismatch',
    finalStepAvailable: false,
    label: meta.repositoryFullName && meta.prNumber ? `${meta.repositoryFullName}#${meta.prNumber}` : '',
  });
}

export default function PullRequestInbox() {
  const { id: projectId } = useParams();
  const { toast } = useToast();
  const { project, files, items, setItems, loading, loadInbox } = usePrInboxItems(projectId);
  const [prUrl, setPrUrl] = useState('');
  const [queueing, setQueueing] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [draftItemId, setDraftItemId] = useState(null);
  const [copyingDraftId, setCopyingDraftId] = useState(null);
  const [previewItemId, setPreviewItemId] = useState(null);
  const [draftEdits, setDraftEdits] = useState({});
  const [approvalRevision, setApprovalRevision] = useState(0);

  const pendingCount = useMemo(() => items.filter((item) => statusLabel(item).includes('pending') || statusLabel(item).includes('mismatch')).length, [items]);
  const analyzedCount = useMemo(() => items.filter((item) => statusLabel(item).includes('analyzed')).length, [items]);
  const approvalSummary = useMemo(() => summarizeCommentApprovals(projectId, items), [projectId, items, approvalRevision]);

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

  const analyzeItem = async (item) => {
    const itemId = item.id || prLabel(item);
    setAnalyzingId(itemId);
    try {
      const { saved, source, calibrated } = await runPrInboxAnalysis({ projectId, project, files, item, contextDepth: 'balanced' });
      setItems((prev) => mergePrInboxItems([normalizeInboxItem(saved)], prev).map(normalizeInboxItem));
      toast({
        title: 'Internal PR analysis completed',
        description: `${prLabel(item)} · ${calibrated.riskLevel || 'medium'} risk · ${source}`,
      });
    } catch (error) {
      toast({ title: 'PR analysis failed', description: error?.message || 'The AI request failed.', variant: 'destructive' });
    } finally {
      setAnalyzingId(null);
    }
  };

  const copyCommentDraft = async (item, draft) => {
    const itemId = item.id || prLabel(item);
    setCopyingDraftId(itemId);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API is not available in this browser.');
      await navigator.clipboard.writeText(draft || buildPrCommentDraft(item));
      toast({ title: 'Comment draft copied', description: 'Read-only workflow stayed unchanged.' });
    } catch (error) {
      toast({ title: 'Copy failed', description: error?.message || 'Select the draft text manually and copy it.', variant: 'destructive' });
    } finally {
      setCopyingDraftId(null);
    }
  };

  const updateDraftEdit = (itemId, value) => {
    setDraftEdits((prev) => ({ ...prev, [itemId]: value }));
  };

  const approveDraft = (item, draft) => {
    const saved = writeLocalCommentApproval(projectId, item, draft, 'approved');
    setApprovalRevision((value) => value + 1);
    toast({
      title: saved ? 'Comment draft approved' : 'Approval could not be saved',
      description: saved ? 'Saved locally.' : 'Local storage was unavailable.',
      variant: saved ? undefined : 'destructive',
    });
  };

  const regenerateDraft = (item, itemId) => {
    updateDraftEdit(itemId, buildPrCommentDraft(item));
    toast({ title: 'Draft regenerated', description: 'Review it before copying or approving.' });
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
            Queue and analyze public GitHub pull requests inside Codebase Brain. This page is a read-only review workspace for internal reports, local approvals, and readiness previews.
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

      <div className="grid md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{items.length}</div>
          <div className="text-sm text-slate-500">Total PR items</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{pendingCount}</div>
          <div className="text-sm text-slate-500">Pending / warning</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{analyzedCount}</div>
          <div className="text-sm text-slate-500">Analyzed internally</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{approvalSummary.approved}</div>
          <div className="text-sm text-slate-500">Approved drafts</div>
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
          {items.map((item) => {
            const itemId = item.id || prLabel(item);
            const isAnalyzing = analyzingId === itemId;
            const draftOpen = draftItemId === itemId;
            const previewOpen = previewItemId === itemId;
            const approval = readLocalCommentApproval(projectId, item);
            const generatedDraft = hasPrCommentDraft(item) ? buildPrCommentDraft(item) : '';
            const draftText = draftEdits[itemId] ?? approval?.draft ?? generatedDraft;
            const isCopying = copyingDraftId === itemId;
            const isApproved = approval?.status === 'approved';
            const checks = rowsForItem(item, approval);
            const readiness = summarizeReadiness(checks);
            return (
              <div key={itemId} className="space-y-3">
                <PrInboxItemCard
                  projectId={projectId}
                  item={item}
                  canAnalyze={canAnalyze(item)}
                  onAnalyze={analyzeItem}
                  analyzing={isAnalyzing || Boolean(analyzingId)}
                />
                {(isApproved || hasPrCommentDraft(item)) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center">
                    {isApproved && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Comment draft approved
                      </div>
                    )}
                    {hasPrCommentDraft(item) && (
                      <Button variant="outline" size="sm" onClick={() => setDraftItemId(draftOpen ? null : itemId)} className="gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Comment approval
                      </Button>
                    )}
                    {hasPrCommentDraft(item) && (
                      <Button variant="outline" size="sm" onClick={() => setPreviewItemId(previewOpen ? null : itemId)} className="gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Readiness preview
                      </Button>
                    )}
                    <Link to={`/project/${projectId}/impact`}><Button variant="outline" size="sm">Manual</Button></Link>
                  </div>
                )}
                {draftOpen && draftText && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-medium text-slate-800">Editable comment draft approval</h3>
                        <p className="text-xs text-slate-500">Edit and approve the draft for this read-only workflow.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => regenerateDraft(item, itemId)} className="gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyCommentDraft(item, draftText)} disabled={isCopying} className="gap-1.5">
                          {isCopying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clipboard className="w-3.5 h-3.5" />}
                          Copy
                        </Button>
                        <Button size="sm" onClick={() => approveDraft(item, draftText)} className="gap-1.5">
                          <Save className="w-3.5 h-3.5" /> Save approval
                        </Button>
                      </div>
                    </div>
                    <textarea
                      value={draftText}
                      onChange={(event) => updateDraftEdit(itemId, event.target.value)}
                      className="w-full min-h-72 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    {approval?.updated_date && (
                      <p className="text-xs text-slate-500">Last approved draft saved at {new Date(approval.updated_date).toLocaleString()}.</p>
                    )}
                  </div>
                )}
                {previewOpen && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Guarded readiness preview
                        </h3>
                        <p className="text-xs text-amber-800 mt-1">This panel only explains readiness. The final step is not available in this phase.</p>
                      </div>
                      <Button disabled variant="outline" size="sm" className="gap-1.5 opacity-60">
                        <Lock className="w-3.5 h-3.5" /> Preview only · {readiness.blockerCount} blocker{readiness.blockerCount === 1 ? '' : 's'}
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {checks.map((check) => (
                        <div key={check.id} className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            {check.ok ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
                            {check.label}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{check.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {item.result && (
                  <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">Show internal analysis</summary>
                    <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-700 leading-relaxed">{item.result}</pre>
                  </details>
                )}
                {item.repository_compatibility?.status === 'mismatch' && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                    Repository mismatch: this PR may not belong to the selected Codebase Brain project.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
