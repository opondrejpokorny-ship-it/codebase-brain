// @ts-nocheck
import { Database, DatabaseZap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { canReadEntity, canWriteEntity } from '@/lib/optionalEntityRuntime';

export default function OptionalEntityStatusBadge({ entityName, className = '' }) {
  const canRead = canReadEntity(entityName);
  const canWrite = canWriteEntity(entityName);
  const ready = canRead || canWrite;
  const Icon = ready ? Database : DatabaseZap;
  const label = ready
    ? `${entityName}: ${canWrite ? 'read/write' : 'read-only'}`
    : `${entityName}: local fallback`;

  return (
    <Badge
      variant="outline"
      className={`${ready ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'} ${className}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}
