// @ts-nocheck
import OptionalEntityStatusBadge from '@/components/projects/OptionalEntityStatusBadge';

export default function OptionalPersistenceStatusPanel({ entityNames = [], className = '' }) {
  if (!entityNames.length) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {entityNames.map((entityName) => (
        <OptionalEntityStatusBadge key={entityName} entityName={entityName} />
      ))}
    </div>
  );
}
