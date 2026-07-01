import { buildProductQualityReport } from '@/lib/productQualityUtils';

export const PROJECT_QUALITY_FILTERS = [
  { value: 'all', label: 'All quality tiers' },
  { value: 'needs_action', label: 'Needs action' },
  { value: 'product_ready', label: 'Product-ready' },
  { value: 'strong_beta', label: 'Strong beta' },
  { value: 'mvp_plus', label: 'MVP+' },
  { value: 'hardening', label: 'Needs hardening' },
];

export const PROJECT_QUALITY_SORTS = [
  { value: 'created_desc', label: 'Newest first' },
  { value: 'quality_asc', label: 'Lowest quality first' },
  { value: 'quality_desc', label: 'Highest quality first' },
  { value: 'name', label: 'Name A-Z' },
];

export function decorateProject(project = {}) {
  return { project, report: buildProductQualityReport({ project }) };
}

export function filterProjectQualityItems(items = [], filter = 'all') {
  if (filter === 'needs_action') return items.filter((item) => item.report.overall < 70 || item.report.priorities.some((priority) => priority.severity === 'high'));
  if (filter === 'product_ready') return items.filter((item) => item.report.tier.label === 'Product-ready');
  if (filter === 'strong_beta') return items.filter((item) => item.report.tier.label === 'Strong beta');
  if (filter === 'mvp_plus') return items.filter((item) => item.report.tier.label === 'MVP+');
  if (filter === 'hardening') return items.filter((item) => item.report.tier.label === 'Needs hardening');
  return items;
}

export function sortProjectQualityItems(items = [], sortMode = 'created_desc') {
  const copy = [...items];
  if (sortMode === 'quality_desc') return copy.sort((a, b) => b.report.overall - a.report.overall);
  if (sortMode === 'quality_asc') return copy.sort((a, b) => a.report.overall - b.report.overall);
  if (sortMode === 'name') return copy.sort((a, b) => String(a.project.name || '').localeCompare(String(b.project.name || '')));
  return copy.sort((a, b) => new Date(b.project.created_date || 0).getTime() - new Date(a.project.created_date || 0).getTime());
}

export function applyProjectQualityListControls(projects = [], { filter = 'all', sortMode = 'created_desc' } = {}) {
  const decorated = projects.map(decorateProject);
  return sortProjectQualityItems(filterProjectQualityItems(decorated, filter), sortMode).map((item) => item.project);
}
