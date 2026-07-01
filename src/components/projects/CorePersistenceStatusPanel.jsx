// @ts-nocheck
import OptionalPersistenceStatusPanel from '@/components/projects/OptionalPersistenceStatusPanel';
import { CORE_OPTIONAL_ENTITIES } from '@/lib/optionalEntityGroups';

export default function CorePersistenceStatusPanel({ className = '' }) {
  return <OptionalPersistenceStatusPanel entityNames={CORE_OPTIONAL_ENTITIES} className={className} />;
}
