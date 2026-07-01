// @ts-nocheck
import CodeRelationStatusBadge from '@/components/projects/CodeRelationStatusBadge';
import CodeSymbolStatusBadge from '@/components/projects/CodeSymbolStatusBadge';

export default function GraphPersistenceStatusBadges({ className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <CodeRelationStatusBadge />
      <CodeSymbolStatusBadge />
    </div>
  );
}
