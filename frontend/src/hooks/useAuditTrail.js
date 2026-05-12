import { useState, useEffect, useCallback } from 'react';
import { auditTrail } from '../utils/auditTrail';
import type { AuditEvent, AuditQuery } from '../types/audit';

export function useAuditTrail(initialQuery: AuditQuery = {}) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback((q: AuditQuery = {}) => {
    setLoading(true);
    const results = auditTrail.query({ ...initialQuery, ...q });
    setEvents(results);
    setLoading(false);
  }, [initialQuery]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => {
      fetchEvents();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return { events, loading, refetch: fetchEvents };
}

export function useAuditLog() {
  return {
    log: auditTrail.log.bind(auditTrail),
    clear: auditTrail.clear.bind(auditTrail),
    flush: auditTrail.flush.bind(auditTrail),
    getStats: auditTrail.getStats.bind(auditTrail),
  };
}