import { AuditEvent, AuditEventType, AuditSeverity, AuditTrailConfig, AuditQuery } from '../types/audit';

const DEFAULT_CONFIG: AuditTrailConfig = {
  enabled: true,
  maxEvents: 10000,
  storage: 'memory',
  autoFlush: false,
  flushIntervalMs: 30000,
};

class AuditTrail {
  private events: AuditEvent[] = [];
  private config: AuditTrailConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AuditTrailConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (this.config.autoFlush) {
      this.startAutoFlush();
    }
  }

  private startAutoFlush(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
  }

  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    if (!this.config.enabled) return { ...event, id: '', timestamp: 0 } as AuditEvent;

    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      timestamp: Date.now(),
    };

    this.events.push(auditEvent);
    if (this.events.length > this.config.maxEvents) {
      this.events.shift();
    }

    return auditEvent;
  }

  query(query: AuditQuery = {}): AuditEvent[] {
    let results = [...this.events];

    if (query.types && query.types.length > 0) {
      results = results.filter(e => query.types!.includes(e.type));
    }
    if (query.severity && query.severity.length > 0) {
      results = results.filter(e => query.severity!.includes(e.severity));
    }
    if (query.from) {
      results = results.filter(e => e.timestamp >= query.from!);
    }
    if (query.to) {
      results = results.filter(e => e.timestamp <= query.to!);
    }
    if (query.actor) {
      results = results.filter(e => e.actor === query.actor);
    }
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  clear(): void {
    this.events = [];
  }

  flush(): void {
    if (this.config.storage === 'localStorage') {
      try {
        localStorage.setItem('audit-trail', JSON.stringify(this.events));
      } catch (e) {
        console.warn('Failed to persist audit trail:', e);
      }
    }
  }

  load(): void {
    if (this.config.storage === 'localStorage') {
      try {
        const stored = localStorage.getItem('audit-trail');
        if (stored) {
          this.events = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Failed to load audit trail:', e);
      }
    }
  }

  getStats() {
    return {
      totalEvents: this.events.length,
      byType: this.events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const auditTrail = new AuditTrail();
export default AuditTrail;