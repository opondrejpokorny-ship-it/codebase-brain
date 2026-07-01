// @ts-nocheck
import { useEffect, useState } from 'react';
import { safeFilterEntity } from '@/lib/optionalEntityRuntime';

export function useOptionalEntityRecords(entityName, filters = {}, sort = null, limit = null) {
  const [records, setRecords] = useState([]);
  const [source, setSource] = useState('loading');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
  }, [entityName, JSON.stringify(filters), sort, limit]);

  return { records, source, error, loading };
}
