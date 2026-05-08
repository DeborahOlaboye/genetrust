import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SectionErrorBoundary from '../components/common/SectionErrorBoundary';
import FormSubmitOverlay from '../components/common/FormSubmitOverlay';
import DatasetTableSkeleton from '../components/common/DatasetTableSkeleton';

/**
 * Integration: a section that (a) shows skeleton while loading, (b) can throw
 * and show the SectionErrorBoundary fallback, and (c) resets back to content.
 */
function DatasetSection({ simulateError = false, isLoading = false }) {
  if (isLoading) return <DatasetTableSkeleton rows={2} />;
  if (simulateError) throw new Error('Dataset fetch failed');
  return <ul><li>Dataset #1</li><li>Dataset #2</li></ul>;
}

function Controller() {
  const [isLoading, setIsLoading] = useState(true);
  const [simulateError, setSimulateError] = useState(false);

  return (
    <div>
      <button onClick={() => setIsLoading(false)}>Finish Loading</button>
      <button onClick={() => setSimulateError(true)}>Trigger Error</button>
      <SectionErrorBoundary sectionName="Datasets">
        <DatasetSection simulateError={simulateError} isLoading={isLoading} />
      </SectionErrorBoundary>
    </div>
  );
}

describe('Error boundary + loading state integration', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows skeleton while loading, then shows content', () => {
    render(<Controller />);
    expect(screen.getByRole('status', { name: /loading datasets/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish Loading' }));

    expect(screen.getByText('Dataset #1')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /loading datasets/i })).not.toBeInTheDocument();
  });

  it('shows error boundary fallback when section throws', () => {
    render(<Controller />);
    fireEvent.click(screen.getByRole('button', { name: 'Finish Loading' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Error' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Datasets failed to load/i)).toBeInTheDocument();
  });

  it('FormSubmitOverlay hides children behind overlay when submitting', () => {
    render(
      <FormSubmitOverlay isLoading message="Saving…">
        <button>Save</button>
      </FormSubmitOverlay>,
    );
    expect(screen.getByRole('status', { name: 'Saving…' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
