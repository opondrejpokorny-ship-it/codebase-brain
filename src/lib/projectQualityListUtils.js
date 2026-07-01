import { buildProductQualityReport } from '@/lib/productQualityUtils';

export const QUALITY_FILTERS = [
  { value: 'all', label: 'All projects' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'product_ready', label: 'Product-ready' },
  { value: 'strong_beta', label: 'Strong beta' },
  { value: 'mvp_plus', label: 'MVP+' },
];

export const QUALITY_SORTS = [
  { value: 'created_desc', label: 'Newest first' },
  { value: 'quality_asc', label: 'Lowest quality first' },
  { value: 'quality_desc', label: 'Highest quality first' },
  { value: 'name_asc', label: 'Name A-Z' },
];

function tierKey(label = '') {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function createdTime(project = {}) {
  return new Date(project.created_date || project.updated_date || 0).getTime() || 0;
}

export function decorateProjectWithQuality(project = {}) {
  const report = buildProductQualityReport({ project });
  const hasHighPriority = report.priorities.some((priority) => priority.severity === 'high');
  return {
    project,
    report,
    tierKey: tierKey(report.tier.label),
    needsAttention: report.overall < 70 || hasHighPriority,
  };
}

export function filterProjectQualityItems(items = [], filter = 'all') {
  if (filter === 'all') return items;
  if (filter === 'needs_attention') return items.filter((item) => item.needsAttention);
  return items.filter((item) => item.tierKey === filter);
}

export function sortProjectQualityItems(items = [], sort = 'created_desc') {
  const sorted = [...items];
  if (sort === 'quality_asc') return sorted.sort((a, b) => a.report.overall - b.report.overall);
  if (sort === 'quality_desc') return sorted.sort((a, b) => b.report.overall - a.report.overall);
  if (sort === 'name_asc') return sorted.sort((a, b) => String(a.project.name || '').localeCompare(String(b.project.name || '')));
  return sorted.sort((a, b) => createdTime(b.project) - createdTime(a.project));
}

export function applyProjectQualityListControls(projects = [], { filter = 'all', sort = 'created_desc' } = {}) {
  const decorated = projects.map(decorateProjectWithQuality);
  return sortProjectQualityItems(filterProjectQualityItems(decorated, filter), sort);
}
