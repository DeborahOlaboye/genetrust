import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SectionErrorBoundary from '../components/common/SectionErrorBoundary';

const ThrowingChild = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Section render error');
  return <div>Section content</div>;
};

describe('SectionErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <SectionErrorBoundary sectionName="Stats">
        <ThrowingChild shouldThrow={false} />
      </SectionErrorBoundary>,
    );
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('renders inline error fallback when an error is thrown', () => {
    render(
      <SectionErrorBoundary sectionName="Stats">
        <ThrowingChild shouldThrow />
      </SectionErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Stats failed to load/i)).toBeInTheDocument();
  });

  it('shows sectionName in the fallback message', () => {
    render(
      <SectionErrorBoundary sectionName="Your Datasets">
        <ThrowingChild shouldThrow />
      </SectionErrorBoundary>,
    );
    expect(screen.getByText(/Your Datasets failed to load/i)).toBeInTheDocument();
  });

  it('renders a Retry button in the fallback', () => {
    render(
      <SectionErrorBoundary sectionName="Stats">
        <ThrowingChild shouldThrow />
      </SectionErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('resets error state after Retry click', () => {
    const { rerender } = render(
      <SectionErrorBoundary sectionName="Stats">
        <ThrowingChild shouldThrow />
      </SectionErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    rerender(
      <SectionErrorBoundary sectionName="Stats">
        <ThrowingChild shouldThrow={false} />
      </SectionErrorBoundary>,
    );
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    const onError = vi.fn();
    render(
      <SectionErrorBoundary sectionName="Stats" onError={onError}>
        <ThrowingChild shouldThrow />
      </SectionErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('calls onReset when Retry button is clicked', () => {
    const onReset = vi.fn();
    render(
      <SectionErrorBoundary sectionName="Stats" onReset={onReset}>
        <ThrowingChild shouldThrow />
      </SectionErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('does not render fallback for children that do not throw', () => {
    render(
      <SectionErrorBoundary sectionName="Quiet Section">
        <div>Safe content</div>
      </SectionErrorBoundary>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });
});
