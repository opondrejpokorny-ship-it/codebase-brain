export const WORKSPACE_ROUTES = {
  home: '/',
  add: '/add',
  impact: '/impact',
  diagnostics: '/diagnostics',
  repositories: '/github/repositories',
  workspaceQuality: '/workspace/quality',
  workspaceSettings: '/workspace/settings',
  workspaceHealth: '/workspace/health',
};

export const PROJECT_ROUTE_SUFFIXES = {
  detail: '',
  quality: 'quality',
  search: 'search',
  architecture: 'architecture',
  impact: 'impact',
  prInbox: 'pr-inbox',
  importQueue: 'import-queue',
  riskMemory: 'risk-memory',
  rules: 'rules',
};

export function projectRoute(projectId, key = 'detail') {
  if (!projectId) return WORKSPACE_ROUTES.home;
  const suffix = PROJECT_ROUTE_SUFFIXES[key] || '';
  return suffix ? `/project/${projectId}/${suffix}` : `/project/${projectId}`;
}

export function workspaceRoute(key = 'home') {
  return WORKSPACE_ROUTES[key] || WORKSPACE_ROUTES.home;
}

export function navigationAuditRows() {
  return [
    ...Object.entries(WORKSPACE_ROUTES).map(([key, href]) => ({ key, scope: 'workspace', href })),
    ...Object.keys(PROJECT_ROUTE_SUFFIXES).map((key) => ({ key, scope: 'project', href: projectRoute(':id', key) })),
  ];
}
