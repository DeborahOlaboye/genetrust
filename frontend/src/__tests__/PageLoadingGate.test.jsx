import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PageLoadingGate from '../components/common/PageLoadingGate';

describe('PageLoadingGate', () => {
  it('renders loading indicator when isLoading is true', () => {
    render(
      <PageLoadingGate isLoading>
        <div>Page content</div>
      </PageLoadingGate>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Page content')).not.toBeInTheDocument();
  });

  it('renders children when isLoading is false', () => {
    render(
      <PageLoadingGate isLoading={false}>
        <div>Page content</div>
      </PageLoadingGate>,
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the default loading message', () => {
    render(
      <PageLoadingGate isLoading>
        <div>content</div>
      </PageLoadingGate>,
    );
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows a custom loading message', () => {
    render(
      <PageLoadingGate isLoading message="Fetching blockchain data…">
        <div>content</div>
      </PageLoadingGate>,
    );
    expect(screen.getByText('Fetching blockchain data…')).toBeInTheDocument();
  });

  it('transitions from loading to content when isLoading changes', () => {
    const { rerender } = render(
      <PageLoadingGate isLoading>
        <div>Ready</div>
      </PageLoadingGate>,
    );
    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    rerender(
      <PageLoadingGate isLoading={false}>
        <div>Ready</div>
      </PageLoadingGate>,
    );
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });
});
