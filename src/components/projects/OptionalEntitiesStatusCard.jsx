// @ts-nocheck
import { Database } from 'lucide-react';
import CorePersistenceStatusPanel from '@/components/projects/CorePersistenceStatusPanel';
import OptionalPersistenceStatusPanel from '@/components/projects/OptionalPersistenceStatusPanel';
import { CORE_OPTIONAL_ENTITIES } from '@/lib/optionalEntityGroups';

export default function OptionalEntitiesStatusCard({ entities = CORE_OPTIONAL_ENTITIES, title = 'Optional persistence' }) {
  const usesCoreEntities = entities === CORE_OPTIONAL_ENTITIES || JSON.stringify(entities) === JSON.stringify(CORE_OPTIONAL_ENTITIES);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start gap-2 mb-3">
        <Database className="w-4 h-4 text-slate-500 mt-0.5" />
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">Shows which optional Base44 entities are available and which features are using local fallback.</p>
        </div>
      </div>
      {usesCoreEntities ? <CorePersistenceStatusPanel /> : <OptionalPersistenceStatusPanel entityNames={entities} />}
    </div>
  );
}
