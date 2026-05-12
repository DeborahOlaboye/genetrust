import React from 'react';
import { render, screen } from '@testing-library/react';
import AuditTrail from '../components/AuditTrail';

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
});
