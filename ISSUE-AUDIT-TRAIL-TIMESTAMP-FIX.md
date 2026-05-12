# Audit Trail Timestamp Display Bug

## Summary
The `AuditTrail` component displayed time information based on `blockHeight` instead of the audit event `timestamp` field.

## Impact
- Audit trail rows showed inaccurate "time ago" values.
- Users could be misled about when actions occurred.
- The audit timeline did not reflect actual event timestamps.

## Fix
- Added a reusable `formatAuditTimestamp` helper.
- Updated `AuditTrail` to render `entry.timestamp` instead of `entry.blockHeight`.
- Expanded prop types to accept string or numeric dataset IDs and timestamps.
- Added component tests verifying the timestamp behavior.
