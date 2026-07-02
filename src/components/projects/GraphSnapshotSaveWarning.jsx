// @ts-nocheck
import { AlertTriangle } from 'lucide-react';

export default function GraphSnapshotSaveWarning({ className = '' }) {
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2 ${className}`}>
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <p>Repeated snapshot saves may create additional relation or symbol records until stable update support is enabled.</p>
    </div>
  );
}
