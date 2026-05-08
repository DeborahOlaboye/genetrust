import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DashboardStatsSkeleton from '../components/common/DashboardStatsSkeleton';
import DatasetTableSkeleton from '../components/common/DatasetTableSkeleton';
import ListingsTableSkeleton from '../components/common/ListingsTableSkeleton';
import MarketplaceListingSkeleton from '../components/common/MarketplaceListingSkeleton';

describe('DashboardStatsSkeleton', () => {
  it('renders with accessible loading label', () => {
    render(<DashboardStatsSkeleton />);
    expect(screen.getByRole('status', { name: /loading dashboard statistics/i })).toBeInTheDocument();
  });

  it('renders the default 4 skeleton cards', () => {
    const { container } = render(<DashboardStatsSkeleton />);
    const cards = container.querySelectorAll('[aria-hidden="true"]');
    expect(cards.length).toBe(4);
  });

  it('renders a custom count of skeleton cards', () => {
    const { container } = render(<DashboardStatsSkeleton count={2} />);
    const cards = container.querySelectorAll('[aria-hidden="true"]');
    expect(cards.length).toBe(2);
  });
});

describe('DatasetTableSkeleton', () => {
  it('renders with accessible loading label', () => {
    render(<DatasetTableSkeleton />);
    expect(screen.getByRole('status', { name: /loading datasets/i })).toBeInTheDocument();
  });

  it('renders the default 3 skeleton rows', () => {
    const { container } = render(<DatasetTableSkeleton />);
    const rows = container.querySelectorAll('[aria-hidden="true"]');
    expect(rows.length).toBe(3);
  });

  it('renders a custom row count', () => {
    const { container } = render(<DatasetTableSkeleton rows={5} />);
    const rows = container.querySelectorAll('[aria-hidden="true"]');
    expect(rows.length).toBe(5);
  });
});

describe('ListingsTableSkeleton', () => {
  it('renders with accessible loading label', () => {
    render(<ListingsTableSkeleton />);
    expect(screen.getByRole('status', { name: /loading listings/i })).toBeInTheDocument();
  });

  it('renders 3 rows by default', () => {
    const { container } = render(<ListingsTableSkeleton />);
    const rows = container.querySelectorAll('[aria-hidden="true"]');
    expect(rows.length).toBe(3);
  });
});

describe('MarketplaceListingSkeleton', () => {
  it('renders with accessible loading label', () => {
    render(<MarketplaceListingSkeleton />);
    expect(screen.getByRole('status', { name: /loading marketplace listings/i })).toBeInTheDocument();
  });

  it('renders 6 skeleton cards by default', () => {
    const { container } = render(<MarketplaceListingSkeleton />);
    const cards = container.querySelectorAll('[aria-hidden="true"]');
    expect(cards.length).toBe(6);
  });

  it('renders a custom count of skeleton cards', () => {
    const { container } = render(<MarketplaceListingSkeleton count={3} />);
    const cards = container.querySelectorAll('[aria-hidden="true"]');
    expect(cards.length).toBe(3);
  });
});
