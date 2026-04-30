import React from 'react';
import { render, screen } from '@testing-library/react';
import SkeletonLoader from './SkeletonLoader';

describe('SkeletonLoader Component', () => {
  it('renders a single skeleton by default', () => {
    render(<SkeletonLoader />);
    expect(screen.getAllByRole('presentation')).toHaveLength(1);
  });

  it('renders multiple skeletons when count is provided', () => {
    render(<SkeletonLoader count={3} />);
    expect(screen.getAllByRole('presentation')).toHaveLength(3);
  });

  it('uses custom width and height values', () => {
    render(<SkeletonLoader width="120px" height="24px" />);
    const skeleton = screen.getAllByRole('presentation')[0];
    expect(skeleton).toHaveStyle({ width: '120px', height: '24px' });
  });

  it('applies circle styles when circle prop is true', () => {
    render(<SkeletonLoader width="32px" circle />);
    const skeleton = screen.getAllByRole('presentation')[0];
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('applies the custom rounded class from props', () => {
    render(<SkeletonLoader rounded="lg" />);
    const skeleton = screen.getAllByRole('presentation')[0];
    expect(skeleton).toHaveClass('rounded-lg');
  });
});