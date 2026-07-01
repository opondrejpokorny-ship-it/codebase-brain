export const WORKSPACE_QUALITY_FILTERS = [
  { value: 'all', label: 'All projects' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'product_ready', label: 'Product-ready' },
  { value: 'strong_beta', label: 'Strong beta' },
  { value: 'mvp_plus', label: 'MVP+' },
  { value: 'needs_hardening', label: 'Needs hardening' },
];

export const WORKSPACE_QUALITY_SORTS = [
  { value: 'quality_asc', label: 'Lowest quality first' },
  { value: 'quality_desc', label: 'Highest quality first' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
];

function tierKey(label = '') {
  if (label === 'MVP+') return 'mvp_plus';
  if (label === 'Needs hardening') return 'needs_hardening';
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function needsAttention(item = {}) {
  return item.report?.overall < 70 || item.report?.priorities?.some((priority) => priority.severity === 'high');
}

export function filterWorkspaceQualityReports(items = [], filter = 'all') {
  if (filter === 'all') return items;
  if (filter === 'needs_attention') return items.filter(needsAttention);
  return items.filter((item) => tierKey(item.report?.tier?.label) === filter);
}

export function sortWorkspaceQualityReports(items = [], sort = 'quality_asc') {
  const sorted = [...items];
  if (sort === 'quality_desc') return sorted.sort((a, b) => b.report.overall - a.report.overall);
  if (sort === 'name_asc') return sorted.sort((a, b) => String(a.project.name || '').localeCompare(String(b.project.name || '')));
  if (sort === 'name_desc') return sorted.sort((a, b) => String(b.project.name || '').localeCompare(String(a.project.name || '')));
  return sorted.sort((a, b) => a.report.overall - b.report.overall);
}

export function applyWorkspaceQualityControls(items = [], { filter = 'all', sort = 'quality_asc' } = {}) {
  return sortWorkspaceQualityReports(filterWorkspaceQualityReports(items, filter), sort);
}
