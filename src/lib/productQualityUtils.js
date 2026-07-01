function pct(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function importedFileCount(project = {}, files = []) {
  const metadata = project.import_metadata || {};
  return files.length || metadata.imported_files || metadata.importedFiles || metadata.file_count || metadata.fileCount || 0;
}

function totalCandidateCount(project = {}, files = []) {
  const metadata = project.import_metadata || {};
  return metadata.total_candidates || metadata.totalCandidates || metadata.tree_entries || metadata.treeEntries || Math.max(importedFileCount(project, files), 1);
}

function hasStoredContext(project = {}, files = []) {
  return importedFileCount(project, files) > 0;
}

function importScore(project = {}, files = []) {
  if (project.status === 'url_only') return 25;
  if (project.status === 'error') return 10;
  return Math.max(35, pct(importedFileCount(project, files), totalCandidateCount(project, files)));
}

function contextScore(project = {}, files = []) {
  const metadata = project.import_metadata || {};
  const queue = asArray(metadata.missingContextQueue || metadata.missing_context_queue);
  if (!hasStoredContext(project, files)) return 10;
  if (!queue.length) return 90;
  return Math.max(25, 90 - Math.min(55, queue.length * 8));
}

function reviewScore(analyses = []) {
  const prAnalyses = analyses.filter((item) => item?.type === 'public_github_pr_impact' || item?.pr_metadata);
  if (!prAnalyses.length) return 30;
  const highRisk = prAnalyses.filter((item) => item.risk_level === 'high').length;
  return Math.max(45, 85 - highRisk * 10);
}

function rulesScore(rules = []) {
  if (!rules.length) return 45;
  const active = rules.filter((rule) => rule?.is_active !== false).length;
  return Math.max(45, pct(active, rules.length));
}

function tierForScore(score) {
  if (score >= 85) return { label: 'Product-ready', tone: 'emerald' };
  if (score >= 70) return { label: 'Strong beta', tone: 'blue' };
  if (score >= 50) return { label: 'MVP+', tone: 'amber' };
  return { label: 'Needs hardening', tone: 'red' };
}

function priority(id, title, description, severity = 'medium') {
  return { id, title, description, severity };
}

export function buildProductQualityReport({ project = {}, files = [], analyses = [], rules = [] } = {}) {
  const metadata = project.import_metadata || {};
  const missingQueue = asArray(metadata.missingContextQueue || metadata.missing_context_queue);
  const storedContext = hasStoredContext(project, files);
  const scores = {
    importCoverage: importScore(project, files),
    contextCompleteness: contextScore(project, files),
    reviewReadiness: reviewScore(analyses),
    rulesMaturity: rulesScore(rules),
  };
  const overall = Math.round((scores.importCoverage * 0.3) + (scores.contextCompleteness * 0.3) + (scores.reviewReadiness * 0.25) + (scores.rulesMaturity * 0.15));
  const tier = tierForScore(overall);
  const priorities = [];

  if (project.status === 'url_only') priorities.push(priority('import_private', 'Import real source files', 'This project is still URL-only, so answers and reviews cannot be grounded enough.', 'high'));
  if (!storedContext) priorities.push(priority('no_files', 'Add code context', 'No CodeFile records or import metadata were found for this project.', 'high'));
  if (missingQueue.length) priorities.push(priority('resolve_missing_context', 'Resolve missing context queue', `${missingQueue.length} queued imports or unresolved references should be resolved.`, 'medium'));
  if (!rules.length) priorities.push(priority('add_project_rules', 'Add project rules', 'Rules and ADR memory help turn one-off analysis into repeatable product behavior.', 'medium'));
  if (!analyses.length) priorities.push(priority('run_impact_analysis', 'Run first impact analysis', 'Risk Memory improves after at least one stored analysis.', 'low'));
  if (!priorities.length) priorities.push(priority('next_product_layer', 'Move to deeper indexing', 'Project quality looks healthy; next step is stronger parsing and richer persistent graph data.', 'low'));

  return {
    overall,
    tier,
    scores,
    stats: {
      files: files.length || importedFileCount(project, files),
      importedFiles: importedFileCount(project, files),
      totalCandidates: totalCandidateCount(project, files),
      missingContextItems: missingQueue.length,
      analyses: analyses.length,
      rules: rules.length,
      detectedStack: asArray(project.detected_stack),
    },
    priorities,
  };
}

export function scoreToneClasses(tone = 'slate') {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return tones[tone] || tones.slate;
}
