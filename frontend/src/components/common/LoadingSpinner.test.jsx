import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-8', 'w-8', 'animate-spin');
  });

  it('renders screen reader text', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('supports different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByRole('status')).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole('status')).toHaveClass('h-12', 'w-12');

    rerender(<LoadingSpinner size="xl" />);
    expect(screen.getByRole('status')).toHaveClass('h-16', 'w-16');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    expect(screen.getByRole('status').parentElement).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner.querySelector('.sr-only')).toBeInTheDocument();
  });

  it('has correct border styling', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-solid', 'border-blue-600', 'border-t-transparent');
  });
});