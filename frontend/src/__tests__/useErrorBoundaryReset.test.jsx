import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import useErrorBoundaryReset from '../hooks/useErrorBoundaryReset';

function ResetController({ children }) {
  const { resetKey, reset } = useErrorBoundaryReset();
  return (
    <div>
      <span data-testid="reset-key">{resetKey}</span>
      <button onClick={reset}>Reset</button>
      <div key={resetKey}>{children}</div>
    </div>
  );
}

describe('useErrorBoundaryReset', () => {
  it('starts with resetKey = 0', () => {
    render(<ResetController>content</ResetController>);
    expect(screen.getByTestId('reset-key').textContent).toBe('0');
  });

  it('increments resetKey after calling reset()', () => {
    render(<ResetController>content</ResetController>);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('reset-key').textContent).toBe('1');
  });

  it('increments resetKey on each subsequent reset call', () => {
    render(<ResetController>content</ResetController>);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('reset-key').textContent).toBe('2');
  });

  it('renders children normally', () => {
    render(<ResetController>my content</ResetController>);
    expect(screen.getByText('my content')).toBeInTheDocument();
  });
});
