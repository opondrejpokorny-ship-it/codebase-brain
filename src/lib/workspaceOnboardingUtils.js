import { buildWorkspaceQualityOverview } from '@/lib/workspaceQualityUtils';

function hasContext(project = {}) {
  const metadata = project.import_metadata || {};
  return project.status === 'indexed' || Boolean(metadata.imported_files || metadata.importedFiles || metadata.file_count || metadata.fileCount);
}

function firstProjectId(projects = []) {
  return projects[0]?.id || '';
}

export function buildWorkspaceOnboardingChecklist(projects = []) {
  const overview = buildWorkspaceQualityOverview(projects);
  const firstId = firstProjectId(projects);
  const hasProjects = projects.length > 0;
  const anyContext = projects.some(hasContext);
  const needsAction = overview.needsAttention.length > 0;
  const strongest = overview.strongest[0];
  const weakest = overview.needsAttention[0] || overview.projectReports[0];

  const steps = [
    {
      id: 'add_project',
      title: 'Add your first repository',
      description: 'Create at least one Codebase Brain project so the workspace has something to manage.',
      done: hasProjects,
      href: '/add',
      cta: hasProjects ? 'Done' : 'Add repository',
    },
    {
      id: 'index_context',
      title: 'Store usable code context',
      description: 'Import source context so answers, reviews, and quality scoring are grounded in real files.',
      done: anyContext,
      href: firstId ? `/project/${firstId}/import-queue` : '/add',
      cta: anyContext ? 'Done' : 'Open import queue',
    },
    {
      id: 'review_quality',
      title: 'Review workspace quality',
      description: 'Use quality scores to understand which projects are production-ready and which need hardening.',
      done: hasProjects && overview.average >= 50,
      href: weakest?.project?.id ? `/project/${weakest.project.id}/quality` : '/',
      cta: 'Open quality cockpit',
    },
    {
      id: 'act_on_weakest',
      title: 'Act on the weakest project',
      description: 'Resolve the top blocker so the workspace average improves instead of only showing diagnostics.',
      done: hasProjects && !needsAction,
      href: weakest?.action?.action?.href || (weakest?.project?.id ? `/project/${weakest.project.id}/quality` : '/'),
      cta: needsAction ? 'Open next action' : 'No blockers',
    },
    {
      id: 'run_review_workflow',
      title: 'Run an analysis workflow',
      description: 'Use Impact Analysis or PR Inbox to build risk memory and make the product useful in daily engineering work.',
      done: Boolean(strongest && overview.average >= 70),
      href: firstId ? `/project/${firstId}/impact` : '/impact',
      cta: 'Run analysis',
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  return {
    steps,
    completed,
    total: steps.length,
    progress: steps.length ? Math.round((completed / steps.length) * 100) : 0,
    complete: completed === steps.length,
  };
}
