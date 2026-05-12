import { auditTrail } from '../utils/auditTrail';

export function logDataAccess(datasetId: string, purpose: string, actor: string, fields?: string[]): void {
  auditTrail.log({
    type: 'data-access',
    severity: 'info',
    actor,
    target: datasetId,
    datasetId,
    purpose,
    fields,
  });
}

export function logDataModify(datasetId: string, changes: { field: string; oldValue: unknown; newValue: unknown }[], actor: string): void {
  auditTrail.log({
    type: 'data-modify',
    severity: 'warning',
    actor,
    target: datasetId,
    datasetId,
    changes,
  });
}

export function logDataDelete(datasetId: string, actor: string): void {
  auditTrail.log({
    type: 'data-delete',
    severity: 'warning',
    actor,
    target: datasetId,
  });
}

export function logConsentGrant(consentId: string, policy: string, actor: string): void {
  auditTrail.log({
    type: 'consent-grant',
    severity: 'info',
    actor,
    target: consentId,
    consentId,
    policy,
  });
}

export function logConsentRevoke(consentId: string, policy: string, actor: string): void {
  auditTrail.log({
    type: 'consent-revoke',
    severity: 'warning',
    actor,
    target: consentId,
    consentId,
    policy,
  });
}

export function logWalletConnect(address: string, actor: string): void {
  auditTrail.log({
    type: 'wallet-connect',
    severity: 'info',
    actor,
    target: address,
    metadata: { address },
  });
}

export function logWalletDisconnect(address: string, actor: string): void {
  auditTrail.log({
    type: 'wallet-disconnect',
    severity: 'info',
    actor,
    target: address,
    metadata: { address },
  });
}

export function logTransactionInit(txId: string, contract: string, fn: string, actor: string): void {
  auditTrail.log({
    type: 'transaction-init',
    severity: 'info',
    actor,
    txId,
    contract,
    function: fn,
  });
}

export function logTransactionSuccess(txId: string, actor: string, amount?: string, fee?: string): void {
  auditTrail.log({
    type: 'transaction-success',
    severity: 'info',
    actor,
    txId,
    amount,
    fee,
  });
}

export function logTransactionFailure(txId: string, actor: string, error: string): void {
  auditTrail.log({
    type: 'transaction-failure',
    severity: 'error',
    actor,
    txId,
    metadata: { error },
  });
}

export function logAuthLogin(userId: string, actor: string): void {
  auditTrail.log({
    type: 'auth-login',
    severity: 'info',
    actor: userId,
    target: userId,
  });
}

export function logAuthLogout(userId: string, actor: string): void {
  auditTrail.log({
    type: 'auth-logout',
    severity: 'info',
    actor: userId,
    target: userId,
  });
}