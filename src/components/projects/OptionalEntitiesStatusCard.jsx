// @ts-nocheck
import { Database } from 'lucide-react';
import OptionalEntityStatusBadge from '@/components/projects/OptionalEntityStatusBadge';

const DEFAULT_ENTITIES = [
  'CodeRelation',
  'CodeSymbol',
  'DecisionMemory',
  'ContextPack',
  'CodebaseAnalysis',
];

export default function OptionalEntitiesStatusCard({ entities = DEFAULT_ENTITIES, title = 'Optional persistence' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start gap-2 mb-3">
        <Database className="w-4 h-4 text-slate-500 mt-0.5" />
        <div>
          <h3 className="font-heading font-semibold text-sm text-slate-900">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">Shows which optional Base44 entities are available and which features are using local fallback.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {entities.map((entityName) => (
          <OptionalEntityStatusBadge key={entityName} entityName={entityName} />
        ))}
      </div>
    </div>
  );
}
