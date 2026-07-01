import { verdictFromPrAnalysis } from '@/lib/prAnalysisOverlayUtils';

function formatDate(value) {
  if (!value) return 'unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function listCounts(items = [], fallback = '- None') {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item.name}: ${item.count}x`).join('\n');
}

function listLines(items = [], fallback = '- None') {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item}`).join('\n');
}

function countVerdicts(analyses = []) {
  return analyses.reduce((acc, analysis) => {
    const verdict = verdictFromPrAnalysis(analysis);
    acc[verdict] = (acc[verdict] || 0) + 1;
    return acc;
  }, { SAFE: 0, REVIEW: 0, BLOCK: 0 });
}

function recentAnalysisSummary(analysis = {}) {
  const verdict = verdictFromPrAnalysis(analysis);
  const changedFiles = Array.isArray(analysis.changed_files) ? analysis.changed_files : [];
  const tests = Array.isArray(analysis.recommended_tests) ? analysis.recommended_tests : [];
  const pr = analysis.pr_metadata?.repositoryFullName && analysis.pr_metadata?.prNumber
    ? `${analysis.pr_metadata.repositoryFullName}#${analysis.pr_metadata.prNumber}`
    : null;

  return `### ${formatDate(analysis.created_date)}${pr ? ` · ${pr}` : ''}

- Risk: ${analysis.risk_level || 'unknown'}
- Verdict: ${verdict}
- Context depth: ${analysis.context_depth_preset || analysis.context_depth || 'unknown'}
- Changed files: ${changedFiles.length}

Changed files:
${listLines(changedFiles.slice(0, 10))}

Recommended tests:
${listLines(tests.slice(0, 8))}`;
}

export function formatRiskReportMarkdown({ project = {}, analyses = [], memory = {}, historySource = 'unknown' }) {
  const verdictCounts = countVerdicts(analyses);
  const riskCounts = memory.riskCounts || {};
  const generatedAt = new Date().toISOString();

  return `# Risk report: ${project?.name || 'Project'}

Generated: ${generatedAt}
Source: ${historySource}
Repository: ${project?.repository_url || 'not provided'}

## Summary

- Total analyses: ${memory.totalAnalyses || analyses.length || 0}
- Current calibration version: ${memory.currentCalibrationVersion || 'unknown'}
- Calibrated analyses: ${memory.calibratedAnalyses || 0}
- Legacy analyses: ${memory.legacyAnalyses || 0}

## Risk distribution

- High: ${riskCounts.high || 0}
- Medium: ${riskCounts.medium || 0}
- Low: ${riskCounts.low || 0}
- Unknown: ${riskCounts.unknown || 0}

## Review verdict distribution

- SAFE: ${verdictCounts.SAFE || 0}
- REVIEW: ${verdictCounts.REVIEW || 0}
- BLOCK: ${verdictCounts.BLOCK || 0}

## High-risk files

${listCounts(memory.highRiskFiles || [])}

## Frequently changed files

${listCounts(memory.frequentlyChangedFiles || [])}

## Frequently changed symbols

${listCounts(memory.frequentlyChangedSymbols || [])}

## Repeated risk signals

${listCounts(memory.repeatedRiskSignals || [])}

## Common recommended tests

${listCounts(memory.commonRecommendedTests || [])}

## Recent analyses

${analyses.length ? analyses.slice(0, 12).map(recentAnalysisSummary).join('\n\n') : 'No analyses available.'}

## Notes

- This report is generated from stored Codebase Brain analysis history.
- It does not run tests.
- It does not prove runtime safety.
- Treat older calibration records as lower confidence.
`;
}
