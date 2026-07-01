// @ts-nocheck

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function repositoryNameFromEvent(event = {}) {
  const repository = asObject(event.repository);
  const owner = asObject(repository.owner);
  return repository.full_name || [owner.login, repository.name].filter(Boolean).join('/') || '';
}

function changedFilesFromEvent(event = {}) {
  const files = event.changed_files || event.changedFiles || event.files || [];
  if (!Array.isArray(files)) return [];
  return files
    .map((file) => typeof file === 'string' ? file : file.filename || file.path || file.name)
    .filter(Boolean);
}

export function shouldQueuePrEvent(event = {}) {
  const action = String(event.action || '');
  const pr = event.pull_request || event.pr;
  return Boolean(pr) && ['opened', 'reopened', 'synchronize', 'ready_for_review'].includes(action);
}

export function prEventInboxStatus(event = {}) {
  const action = String(event.action || '');
  if (['opened', 'reopened', 'synchronize', 'ready_for_review'].includes(action)) return 'pending_review';
  if (action === 'closed') return 'closed';
  return 'event_received';
}

export function buildPrEventQueueRecord({ projectId = null, event = {}, receivedAt = new Date().toISOString() } = {}) {
  const pr = asObject(event.pull_request || event.pr);
  const repositoryFullName = repositoryNameFromEvent(event) || pr.base?.repo?.full_name || pr.head?.repo?.full_name || '';
  const changedFiles = changedFilesFromEvent(event);

  return {
    project_id: projectId,
    type: 'pr_event_queue_item',
    input: event.diff || event.patch || changedFiles.join('\n'),
    result: '',
    risk_level: 'pending',
    inbox_status: prEventInboxStatus(event),
    changed_files: changedFiles,
    related_files: [],
    risk_signals: [],
    relevant_files: [],
    relevant_relations: [],
    repository_compatibility: {
      status: 'unchecked',
      source: 'pr_event',
    },
    pr_metadata: {
      repositoryFullName,
      prNumber: pr.number || event.number || null,
      title: pr.title || event.title || '',
      state: pr.state || '',
      draft: Boolean(pr.draft),
      htmlUrl: pr.html_url || '',
      baseRef: pr.base?.ref || '',
      headRef: pr.head?.ref || '',
      changedFilesCount: pr.changed_files || changedFiles.length || 0,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      source: 'pr_event',
      eventAction: event.action || '',
      deliveryId: event.delivery_id || event.deliveryId || null,
    },
    context_depth: 'balanced',
    created_date: receivedAt,
  };
}

export function summarizePrEventQueueRecord(record = {}) {
  const meta = record.pr_metadata || {};
  const label = meta.repositoryFullName && meta.prNumber ? `${meta.repositoryFullName}#${meta.prNumber}` : 'unknown PR';
  return `${label} · ${record.inbox_status || 'unknown'} · ${record.changed_files?.length || 0} changed files`;
}
