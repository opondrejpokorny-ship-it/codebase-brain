const ACTIONS = {
  import_private: {
    label: 'Open import queue',
    route: 'import-queue',
    impact: '+25 import coverage potential',
    effort: 'medium',
  },
  no_files: {
    label: 'Add repository context',
    route: 'import-queue',
    impact: '+40 grounding potential',
    effort: 'medium',
  },
  resolve_missing_context: {
    label: 'Resolve context',
    route: 'import-queue',
    impact: '+20 context completeness potential',
    effort: 'low',
  },
  add_project_rules: {
    label: 'Add rules',
    route: 'rules',
    impact: '+15 repeatability potential',
    effort: 'low',
  },
  run_impact_analysis: {
    label: 'Run analysis',
    route: 'impact',
    impact: '+20 review readiness potential',
    effort: 'low',
  },
  next_product_layer: {
    label: 'Inspect architecture',
    route: 'architecture',
    impact: 'Next maturity layer',
    effort: 'medium',
  },
};

export function actionForPriority(priority = {}, projectId = '') {
  const action = ACTIONS[priority.id] || {
    label: 'Open project',
    route: '',
    impact: 'Keeps product quality moving',
    effort: priority.severity === 'high' ? 'medium' : 'low',
  };
  const suffix = action.route ? `/${action.route}` : '';
  return {
    ...action,
    href: `/project/${projectId}${suffix}`,
  };
}

export function decorateQualityPriorities(priorities = [], projectId = '') {
  return priorities.map((priority, index) => ({
    ...priority,
    rank: index + 1,
    action: actionForPriority(priority, projectId),
  }));
}

export function primaryQualityAction(priorities = [], projectId = '') {
  return decorateQualityPriorities(priorities, projectId)[0] || null;
}
