import { summarizeWorkspaceTarget } from '@/lib/workspaceTargetUtils';

function line(value = '') {
  return `${value}\n`;
}

function tierCount(overview = {}, label) {
  return overview.tiers?.[label] || 0;
}

function formatProjectRow(item = {}) {
  const name = item.project?.name || 'Unnamed project';
  const score = item.report?.overall ?? 0;
  const tier = item.report?.tier?.label || 'Unknown';
  const priority = item.report?.priorities?.[0]?.title || 'No priority';
  return `| ${name} | ${score}% | ${tier} | ${priority} |`;
}

function formatSnapshotRow(snapshot = {}) {
  return `| ${snapshot.created_at || ''} | ${snapshot.average || 0}% | ${snapshot.needs_attention || 0} | ${snapshot.total || 0} |`;
}

export function buildWorkspaceQualityMarkdownReport({ overview = {}, snapshots = [], options = {} } = {}) {
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
  markdown += line(`- Projects needing attention: ${overview.needsAttention?.length || 0}`);
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
  if (overview.needsAttention?.length) {
    overview.needsAttention.forEach((item) => { markdown += line(formatProjectRow(item)); });
  } else {
    markdown += line('| None | — | — | No urgent quality gaps detected |');
  }
  markdown += line();
  markdown += line('## Strongest projects');
  markdown += line();
  markdown += line('| Project | Score | Tier | Top priority |');
  markdown += line('| --- | ---: | --- | --- |');
  if (overview.strongest?.length) {
    overview.strongest.forEach((item) => { markdown += line(formatProjectRow(item)); });
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

export function downloadWorkspaceQualityMarkdownReport({ overview = {}, snapshots = [], options = {} } = {}) {
  if (typeof document === 'undefined') return false;
  const markdown = buildWorkspaceQualityMarkdownReport({ overview, snapshots, options });
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
