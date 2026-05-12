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


it('returns unknown time for null timestamp', () => {
  expect(formatAuditTimestamp(null)).toBe('Unknown time');
});


it('returns unknown time for undefined timestamp', () => {
  expect(formatAuditTimestamp(undefined)).toBe('Unknown time');
});


it('returns unknown time for zero timestamp', () => {
  expect(formatAuditTimestamp(0)).toBe('Unknown time');
});


it('returns unknown time for negative timestamp', () => {
  expect(formatAuditTimestamp(-100000)).toBe('Unknown time');
});


it('returns just now for future timestamp', () => {
  expect(formatAuditTimestamp(Date.now() + 60 * 1000)).toBe('just now');
});


it('returns just now for Date object input now', () => {
  expect(formatAuditTimestamp(new Date(Date.now()))).toBe('just now');
});


it('returns 1m ago for Date object one minute ago', () => {
  expect(formatAuditTimestamp(new Date(Date.now() - 60 * 1000))).toBe('1m ago');
});


it('returns 2h 30m ago for Date object 2.5 hours ago', () => {
  expect(formatAuditTimestamp(new Date(Date.now() - 2.5 * 60 * 60 * 1000))).toBe('2h 30m ago');
});


it('returns 3d 4h ago for 76 hours ago', () => {
  expect(formatAuditTimestamp(new Date(Date.now() - 76 * 60 * 60 * 1000))).toBe('3d 4h ago');
});


it('returns unknown time for invalid Date object', () => {
  expect(formatAuditTimestamp(new Date("invalid"))).toBe('Unknown time');
});


it('handles string timestamp with milliseconds precision', () => {
  expect(formatAuditTimestamp(String(Date.now() - 5 * 60 * 1000 - 123))).toBe('5m ago');
});


it('returns just now for 59 seconds ago', () => {
  expect(formatAuditTimestamp(Date.now() - 59 * 1000)).toBe('just now');
});


it('returns 1m ago at exactly 60 seconds ago', () => {
  expect(formatAuditTimestamp(Date.now() - 60 * 1000)).toBe('1m ago');
});


it('returns 1h 59m ago for 119 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 119 * 60 * 1000)).toBe('1h 59m ago');
});


it('returns 23h 0m ago for 23 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 23 * 60 * 60 * 1000)).toBe('23h 0m ago');
});


it('returns 1d 12h ago for 36 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 36 * 60 * 60 * 1000)).toBe('1d 12h ago');
});


it('returns 7d 0h ago for 7 days ago', () => {
  expect(formatAuditTimestamp(Date.now() - 7 * 24 * 60 * 60 * 1000)).toBe('7d 0h ago');
});


it('returns 10d 3h ago for 243 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 243 * 60 * 60 * 1000)).toBe('10d 3h ago');
});


it('returns unknown time for NaN timestamp', () => {
  expect(formatAuditTimestamp(NaN)).toBe('Unknown time');
});


it('returns unknown time for string 0 timestamp', () => {
  expect(formatAuditTimestamp('0')).toBe('Unknown time');
});


it('returns unknown time for negative timestamp string', () => {
  expect(formatAuditTimestamp('-10000')).toBe('Unknown time');
});


it('returns 10m ago for 10 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 10 * 60 * 1000)).toBe('10m ago');
});


it('returns 47h 0m ago for 47 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 47 * 60 * 60 * 1000)).toBe('1d 23h ago');
});


it('returns 5d 0h ago for 120 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 120 * 60 * 60 * 1000)).toBe('5d 0h ago');
});


it('returns 9d 3h ago for 219 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 219 * 60 * 60 * 1000)).toBe('9d 3h ago');
});


it('returns 2d 0h ago for 48 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 48 * 60 * 60 * 1000)).toBe('2d 0h ago');
});


it('returns 1h 30m ago for 90 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 90 * 60 * 1000)).toBe('1h 30m ago');
});


it('returns 2h 45m ago for 165 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 165 * 60 * 1000)).toBe('2h 45m ago');
});


it('returns 5h 15m ago for 315 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 315 * 60 * 1000)).toBe('5h 15m ago');
});


it('returns 11h 59m ago for 719 minutes ago', () => {
  expect(formatAuditTimestamp(Date.now() - 719 * 60 * 1000)).toBe('11h 59m ago');
});


it('returns 20h 0m ago for 20 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 20 * 60 * 60 * 1000)).toBe('20h 0m ago');
});


it('returns 3d 23h ago for 95 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 95 * 60 * 60 * 1000)).toBe('3d 23h ago');
});


it('returns 5d 12h ago for 132 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 132 * 60 * 60 * 1000)).toBe('5d 12h ago');
});


it('returns 60d 0h ago for 1440 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 1440 * 60 * 60 * 1000)).toBe('60d 0h ago');
});


it('returns 4d 6h ago for 102 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 102 * 60 * 60 * 1000)).toBe('4d 6h ago');
});


it('returns 30d 0h ago for 720 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 720 * 60 * 60 * 1000)).toBe('30d 0h ago');
});


it('returns 1d 1h ago for 25 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 25 * 60 * 60 * 1000)).toBe('1d 1h ago');
});


it('returns 8d 0h ago for 192 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 192 * 60 * 60 * 1000)).toBe('8d 0h ago');
});


it('returns 15d 0h ago for 360 hours ago', () => {
  expect(formatAuditTimestamp(Date.now() - 360 * 60 * 60 * 1000)).toBe('15d 0h ago');
});

  });
});
