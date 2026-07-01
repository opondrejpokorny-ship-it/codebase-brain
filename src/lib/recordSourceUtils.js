// @ts-nocheck

export function countRecords(records = []) {
  return Array.isArray(records) ? records.length : 0;
}

export function buildRecordSourceSummary({ remoteRecords = [], localRecords = [], remoteError = null } = {}) {
  const remoteCount = countRecords(remoteRecords);
  const localCount = countRecords(localRecords);
  const totalCount = remoteCount + localCount;

  let label = 'no stored records';
  if (remoteCount > 0 && localCount > 0) label = 'persisted + local fallback';
  else if (remoteCount > 0) label = 'persisted storage';
  else if (localCount > 0) label = 'local fallback';

  return {
    label,
    remoteCount,
    localCount,
    totalCount,
    hasRemote: remoteCount > 0,
    hasLocal: localCount > 0,
    hasError: Boolean(remoteError),
    error: remoteError || null,
  };
}

export function formatRecordSourceSummary(summary = {}) {
  const label = summary.label || 'no stored records';
  const details = [];
  if (summary.remoteCount) details.push(`${summary.remoteCount} persisted`);
  if (summary.localCount) details.push(`${summary.localCount} local`);
  if (summary.hasError) details.push('remote read warning');
  return details.length ? `${label} (${details.join(', ')})` : label;
}
