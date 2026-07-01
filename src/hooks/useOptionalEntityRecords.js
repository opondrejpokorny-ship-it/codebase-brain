// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { safeFilterEntity } from '@/lib/optionalEntityRuntime';
import { stableObjectKey } from '@/lib/stableKeyUtils';

export function useOptionalEntityRecords(entityName, filters = {}, sort = null, limit = null) {
  const [records, setRecords] = useState([]);
  const [source, setSource] = useState('loading');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const filtersKey = useMemo(() => stableObjectKey(filters), [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    safeFilterEntity(entityName, filters, sort, limit).then((result) => {
      if (cancelled) return;
      setRecords(result.records || []);
      setSource(result.source || 'unknown');
      setError(result.error || null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [entityName, filtersKey, sort, limit]);

  return { records, source, error, loading };
}
