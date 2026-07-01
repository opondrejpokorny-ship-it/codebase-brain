// @ts-nocheck
import { Badge } from '@/components/ui/badge';
import { verdictFromPrAnalysis } from '@/lib/prAnalysisOverlayUtils';

const verdictStyles = {
  SAFE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  BLOCK: 'bg-red-50 text-red-700 border-red-200',
};

const verdictLabels = {
  SAFE: 'SAFE',
  REVIEW: 'REVIEW',
  BLOCK: 'BLOCK',
};

export function reviewVerdictStyle(verdict = 'REVIEW') {
  return verdictStyles[verdict] || verdictStyles.REVIEW;
}

export default function ReviewVerdictBadge({ item, verdict, suffix = 'verdict' }) {
  const value = verdict || verdictFromPrAnalysis(item || {});
  return (
    <Badge variant="outline" className={reviewVerdictStyle(value)}>
      {verdictLabels[value] || 'REVIEW'} {suffix}
    </Badge>
  );
}
