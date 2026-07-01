import { buildProductQualityReport } from '@/lib/productQualityUtils';
import { primaryQualityAction } from '@/lib/productQualityActionUtils';

function toneRank(tone = 'slate') {
  const ranks = { red: 0, amber: 1, blue: 2, emerald: 3, slate: 1 };
  return ranks[tone] ?? 1;
}

function projectReport(project = {}) {
  const report = buildProductQualityReport({ project, files: [], analyses: [], rules: [] });
  return {
    project,
    report,
    action: primaryQualityAction(report.priorities, project.id),
  };
}

export function buildWorkspaceQualityOverview(projects = []) {
  const projectReports = projects.map(projectReport);
  const total = projectReports.length;
  const average = total
    ? Math.round(projectReports.reduce((sum, item) => sum + item.report.overall, 0) / total)
    : 0;
  const tiers = projectReports.reduce((acc, item) => {
    const label = item.report.tier.label;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const needsAttention = projectReports
    .filter((item) => item.report.overall < 70 || item.report.priorities.some((priority) => priority.severity === 'high'))
    .sort((a, b) => a.report.overall - b.report.overall)
    .slice(0, 5);
  const strongest = [...projectReports]
    .sort((a, b) => b.report.overall - a.report.overall)
    .slice(0, 3);
  const tierTone = average >= 85 ? 'emerald' : average >= 70 ? 'blue' : average >= 50 ? 'amber' : 'red';

  return {
    average,
    tierTone,
    total,
    tiers,
    projectReports: projectReports.sort((a, b) => {
      const tierDelta = toneRank(a.report.tier.tone) - toneRank(b.report.tier.tone);
      return tierDelta || a.report.overall - b.report.overall;
    }),
    needsAttention,
    strongest,
  };
}
