import { summarizeWorkspaceTarget } from '@/lib/workspaceTargetUtils';

function asAny(value) {
  return /** @type {any} */ (value || {});
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function line(value = '') {
  return `${value}\n`;
}

function tierCount(overview = {}, label) {
  const safeOverview = asAny(overview);
  const tiers = asAny(safeOverview.tiers);
  return tiers[label] || 0;
}

function formatProjectRow(item = {}) {
  const safeItem = asAny(item);
  const project = asAny(safeItem.project);
  const report = asAny(safeItem.report);
  const tier = asAny(report.tier);
  const priorities = asArray(report.priorities);
  const name = project.name || 'Unnamed project';
  const score = report.overall ?? 0;
  const tierLabel = tier.label || 'Unknown';
  const priority = asAny(priorities[0]).title || 'No priority';
  return `| ${name} | ${score}% | ${tierLabel} | ${priority} |`;
}

function formatSnapshotRow(snapshot = {}) {
  const safeSnapshot = asAny(snapshot);
  return `| ${safeSnapshot.created_at || ''} | ${safeSnapshot.average || 0}% | ${safeSnapshot.needs_attention || 0} | ${safeSnapshot.total || 0} |`;
}

export function buildWorkspaceQualityMarkdownReport(input = {}) {
  const safeInput = asAny(input);
  const overview = asAny(safeInput.overview);
  const snapshots = asArray(safeInput.snapshots);
  const options = asAny(safeInput.options);
  const needsAttention = asArray(overview.needsAttention);
  const strongest = asArray(overview.strongest);
  const createdAt = new Date().toISOString();
  const target = summarizeWorkspaceTarget(overview.average || 0, options.quality_target || 70);
  let markdown = '';
  markdown += line('# Codebase Brain Workspace Quality Report');
  markdown += line();
  markdown += line(`Generated: ${createdAt}`);
  markdown += line();
  markdown += line('## Summary');
  markdown += line();
  markdown += line(`- Workspace: ${options.workspace_name || 'Codebase Brain Workspace'}`);
  markdown += line(`- Workspace average: ${overview.average || 0}%`);
  markdown += line(`- Quality target: ${target.target}%`);
  markdown += line(`- Target status: ${target.met ? 'Met' : 'Below target'} (${target.label})`);
  markdown += line(`- Total projects: ${overview.total || 0}`);
  markdown += line(`- Projects needing attention: ${needsAttention.length || 0}`);
  markdown += line();
  markdown += line('## Tier distribution');
  markdown += line();
  markdown += line(`- Product-ready: ${tierCount(overview, 'Product-ready')}`);
  markdown += line(`- Strong beta: ${tierCount(overview, 'Strong beta')}`);
  markdown += line(`- MVP+: ${tierCount(overview, 'MVP+')}`);
  markdown += line(`- Needs hardening: ${tierCount(overview, 'Needs hardening')}`);
  markdown += line();
  markdown += line('## Projects needing attention');
  markdown += line();
  markdown += line('| Project | Score | Tier | Top priority |');
  markdown += line('| --- | ---: | --- | --- |');
  if (needsAttention.length) {
    needsAttention.forEach((item) => { markdown += line(formatProjectRow(item)); });
  } else {
    markdown += line('| None | — | — | No urgent quality gaps detected |');
  }
  markdown += line();
  markdown += line('## Strongest projects');
  markdown += line();
  markdown += line('| Project | Score | Tier | Top priority |');
  markdown += line('| --- | ---: | --- | --- |');
  if (strongest.length) {
    strongest.forEach((item) => { markdown += line(formatProjectRow(item)); });
  } else {
    markdown += line('| None | — | — | — |');
  }
  markdown += line();
  markdown += line('## Recent snapshots');
  markdown += line();
  markdown += line('| Snapshot time | Average | Needs attention | Total projects |');
  markdown += line('| --- | ---: | ---: | ---: |');
  if (snapshots.length) {
    snapshots.slice(0, 10).forEach((snapshot) => { markdown += line(formatSnapshotRow(snapshot)); });
  } else {
    markdown += line('| None | — | — | — |');
  }
  return markdown;
}

export async function copyWorkspaceQualityMarkdownReport(input = {}) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
  const markdown = buildWorkspaceQualityMarkdownReport(input);
  await navigator.clipboard.writeText(markdown);
  return true;
}

export function downloadWorkspaceQualityMarkdownReport(input = {}) {
  if (typeof document === 'undefined') return false;
  const markdown = buildWorkspaceQualityMarkdownReport(input);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `codebase-brain-workspace-quality-${stamp}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
