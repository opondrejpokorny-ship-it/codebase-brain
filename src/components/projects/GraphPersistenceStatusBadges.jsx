// @ts-nocheck
import OptionalPersistenceStatusPanel from '@/components/projects/OptionalPersistenceStatusPanel';

export default function GraphPersistenceStatusBadges({ className = '' }) {
  return <OptionalPersistenceStatusPanel entityNames={["CodeRelation", "CodeSymbol"]} className={className} />;
}
