// @ts-nocheck
import { useMemo } from 'react';
import { buildRecordSourceSummary, formatRecordSourceSummary } from '@/lib/recordSourceUtils';

export function useRecordSourceSummary({ remoteRecords = [], localRecords = [], remoteError = null } = {}) {
  return useMemo(() => {
    const summary = buildRecordSourceSummary({ remoteRecords, localRecords, remoteError });
    return {
      ...summary,
      text: formatRecordSourceSummary(summary),
    };
  }, [remoteRecords, localRecords, remoteError]);
}
