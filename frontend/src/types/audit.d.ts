export type AuditEventType = 
  | 'data-access'
  | 'data-modify'
  | 'data-delete'
  | 'consent-grant'
  | 'consent-revoke'
  | 'wallet-connect'
  | 'wallet-disconnect'
  | 'transaction-init'
  | 'transaction-success'
  | 'transaction-failure'
  | 'auth-login'
  | 'auth-logout';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEventBase {
  id: string;
  timestamp: number;
  type: AuditEventType;
  severity: AuditSeverity;
  actor: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface DataAccessEvent extends AuditEventBase {
  type: 'data-access';
  target: string;
  datasetId: string;
  purpose: string;
  fields?: string[];
}

export interface DataModifyEvent extends AuditEventBase {
  type: 'data-modify';
  target: string;
  datasetId: string;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}

export interface ConsentEvent extends AuditEventBase {
  type: 'consent-grant' | 'consent-revoke';
  target: string;
  consentId: string;
  policy: string;
}

export interface TransactionEvent extends AuditEventBase {
  type: 'transaction-init' | 'transaction-success' | 'transaction-failure';
  txId?: string;
  contract?: string;
  function?: string;
  amount?: string;
  fee?: string;
}

export type AuditEvent = DataAccessEvent | DataModifyEvent | ConsentEvent | TransactionEvent | AuditEventBase;

export interface AuditTrailConfig {
  enabled: boolean;
  maxEvents: number;
  storage: 'memory' | 'localStorage' | 'indexedDB';
  autoFlush: boolean;
  flushIntervalMs: number;
}

export interface AuditQuery {
  types?: AuditEventType[];
  severity?: AuditSeverity[];
  from?: number;
  to?: number;
  actor?: string;
  limit?: number;
  offset?: number;
}