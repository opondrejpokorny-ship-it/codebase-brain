function asAny(value) {
  return /** @type {any} */ (value || {});
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function latestDate(values = []) {
  return asArray(values).reduce((latest, value) => Math.max(latest, toTime(value)), 0);
}

function ageDays(timestamp, now = Date.now()) {
  if (!timestamp) return null;
  return Math.max(0, Math.floor((now - timestamp) / 86400000));
}

function pluralDays(days) {
  if (days === null || days === undefined) return 'unknown age';
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function pathGroup(path = '') {
  const first = String(path || '').split('/').filter(Boolean)[0];
  return first || 'root';
}

export function summarizeContextFreshness(project = {}, files = [], options = {}) {
  const safeProject = asAny(project);
  const safeFiles = asArray(files);
  const now = Number(options.now || Date.now());
  const warningDays = Number(options.warningDays || 14);
  const staleDays = Number(options.staleDays || 45);

  const projectUpdated = latestDate([
    safeProject.last_imported_at,
    safeProject.lastAnalyzedAt,
    safeProject.last_analyzed_at,
    safeProject.updated_date,
    safeProject.created_date,
  ]);

  const fileUpdated = latestDate(safeFiles.flatMap((file) => [
    file.updated_date,
    file.created_date,
    file.last_modified_at,
    file.lastIndexedAt,
    file.last_indexed_at,
  ]));

  const latest = Math.max(projectUpdated, fileUpdated);
  const days = ageDays(latest, now);
  const fileCount = safeFiles.length;
  const hasFiles = fileCount > 0;
  const updatedRecentlyCount = safeFiles.filter((file) => {
    const fileTime = latestDate([file.updated_date, file.last_modified_at, file.lastIndexedAt, file.last_indexed_at]);
    return fileTime && ageDays(fileTime, now) !== null && ageDays(fileTime, now) <= warningDays;
  }).length;

  const groups = safeFiles.reduce((acc, file) => {
    const group = pathGroup(file.path);
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  const topGroups = Object.entries(groups)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  let status = 'fresh';
  if (!hasFiles) status = 'empty';
  else if (!latest) status = 'unknown';
  else if (days >= staleDays) status = 'stale';
  else if (days >= warningDays) status = 'aging';

  const messages = [];
  if (!hasFiles) {
    messages.push('No stored code files are available yet. Import or paste code before trusting analysis results.');
  } else if (!latest) {
    messages.push('Stored files exist, but freshness timestamps are missing. Treat generated analysis as approximate.');
  } else if (status === 'stale') {
    messages.push(`Stored context looks stale: latest known update was ${pluralDays(days)}.`);
  } else if (status === 'aging') {
    messages.push(`Stored context is aging: latest known update was ${pluralDays(days)}.`);
  } else {
    messages.push(`Stored context looks fresh: latest known update was ${pluralDays(days)}.`);
  }

  if (hasFiles && updatedRecentlyCount === 0 && status !== 'empty') {
    messages.push(`No files show updates within the last ${warningDays} days.`);
  }

  return {
    status,
    fileCount,
    latestTimestamp: latest,
    ageDays: days,
    ageLabel: pluralDays(days),
    updatedRecentlyCount,
    warningDays,
    staleDays,
    topGroups,
    messages,
    shouldWarn: ['empty', 'unknown', 'aging', 'stale'].includes(status),
  };
}

export function freshnessTone(status = 'unknown') {
  const tones = {
    fresh: {
      badge: 'Fresh',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      badgeClassName: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    aging: {
      badge: 'Aging',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
      badgeClassName: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    stale: {
      badge: 'Stale',
      className: 'border-red-200 bg-red-50 text-red-900',
      badgeClassName: 'bg-red-100 text-red-700 border-red-200',
    },
    empty: {
      badge: 'No context',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
      badgeClassName: 'bg-slate-100 text-slate-600 border-slate-200',
    },
    unknown: {
      badge: 'Unknown freshness',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
      badgeClassName: 'bg-slate-100 text-slate-600 border-slate-200',
    },
  };
  return tones[status] || tones.unknown;
}
