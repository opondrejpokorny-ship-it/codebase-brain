// @ts-nocheck
import OptionalPersistenceStatusPanel from '@/components/projects/OptionalPersistenceStatusPanel';
import { GRAPH_PERSISTENCE_ENTITIES } from '@/lib/optionalEntityGroups';

export default function GraphPersistenceStatusBadges({ className = '' }) {
  return <OptionalPersistenceStatusPanel entityNames={GRAPH_PERSISTENCE_ENTITIES} className={className} />;
}
