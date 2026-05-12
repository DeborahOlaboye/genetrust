import React from 'react';
import { render, screen } from '@testing-library/react';
import AuditTrail from '../components/AuditTrail';
import { formatAuditTimestamp } from '../utils/auditTrailTimestampFormatter';

describe('AuditTrail component', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date('2026-05-12T12:00:00.000Z') });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders a timestamp based on entry timestamp instead of block height', () => {
    render(
      <AuditTrail
        dataId="test-dataset"
        auditEntries={[
          {
            blockHeight: 12345,
            timestamp: Date.now() - 5 * 60000,
            action: 'access',
            user: 'user12345',
            purpose: 'Audit review',
            accessLevel: 2,
            txId: 'tx-abc',
            approvedBy: 'admin',
          },
        ]}
        loading={false}
        onFetchAuditTrail={jest.fn()}
        onExportAuditTrail={jest.fn()}
      />
    );

    expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
  });

  it('shows unknown time when timestamp is missing', () => {
    render(
      <AuditTrail
        dataId="test-dataset"
        auditEntries={[
          {
            blockHeight: 12345,
            action: 'grant',
            user: 'user12345',
            purpose: 'Access granted',
            accessLevel: 1,
            txId: 'tx-def',
            approvedBy: 'admin',
          },
        ]}
        loading={false}
        onFetchAuditTrail={jest.fn()}
        onExportAuditTrail={jest.fn()}
      />
    );

    expect(screen.getByText(/Unknown time/i)).toBeInTheDocument();
  });

  describe('formatAuditTimestamp helper', () => {
    it('returns just now for current timestamp', () => {
      expect(formatAuditTimestamp(Date.now())).toBe('just now');
    });

it('returns just now for 30 seconds ago', () => {
  expect(formatAuditTimestamp(Date.now() - 30 * 1000)).toBe('just now');
});


it('returns 1m ago for 61 seconds ago', () => {
  expect(formatAuditTimestamp(Date.now() - 61 * 1000)).toBe('1m ago');
});


it('returns 5m ago for 5 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 5 * 60 * 1000)).toBe('5m ago');
});


it('returns 59m ago for 59 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 59 * 60 * 1000)).toBe('59m ago');
});


it('returns 1h 0m ago for one hour ago', () => {
  expect(formatAuditTimestamp(Date.now() - 60 * 60 * 1000)).toBe('1h 0m ago');
});


it('returns 1h 15m ago for 75 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 75 * 60 * 1000)).toBe('1h 15m ago');
});


it('returns 12h 30m ago for 12.5 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 12.5 * 60 * 60 * 1000)).toBe('12h 30m ago');
});


it('returns 23h 59m ago for 23 hours 59 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - ((23 * 60) + 59) * 60 * 1000)).toBe('23h 59m ago');
});


it('returns 1d 0h ago for 24 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 24 * 60 * 60 * 1000)).toBe('1d 0h ago');
});


it('returns 2d 5h ago for 53 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - ((2 * 24) + 5) * 60 * 60 * 1000)).toBe('2d 5h ago');
});


it('parses numeric timestamp strings', () => {
  expect(formatAuditTimestamp(String(Date.now() - 10 * 60 * 1000))).toBe('10m ago');
});


it('returns unknown time for invalid numeric string', () => {
  expect(formatAuditTimestamp('not-a-timestamp')).toBe('Unknown time');
});

  });
});
