export const PRODUCT_PACKAGES = [
  {
    key: 'free',
    name: 'Free',
    audience: 'individual evaluation',
    features: ['public project import', 'project chat', 'basic quality overview'],
    limits: ['limited files', 'local snapshots'],
  },
  {
    key: 'solo_pro',
    name: 'Solo Pro',
    audience: 'solo developer or consultant',
    features: ['refresh workflow', 'quality reports', 'graph preview', 'symbol preview'],
    limits: ['single workspace'],
  },
  {
    key: 'team',
    name: 'Team',
    audience: 'small engineering team',
    features: ['shared workspace', 'review packets', 'shared history', 'workspace targets'],
    limits: ['team-sized usage'],
  },
  {
    key: 'agency',
    name: 'Agency',
    audience: 'multi-client technical team',
    features: ['multi-project portfolio', 'exports', 'audit summaries', 'client-ready reports'],
    limits: ['custom onboarding'],
  },
];

export function buildPackagingSummary(packages = PRODUCT_PACKAGES) {
  return {
    count: packages.length,
    entry: packages[0]?.name || 'Free',
    recommended: packages.find((item) => item.key === 'team')?.name || 'Team',
    packages,
  };
}
