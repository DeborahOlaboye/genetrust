import React from 'react';
import { render, screen } from '@testing-library/react';
import { HashProgress } from '../components/upload/HashProgress.jsx';
import { STEPS } from '../hooks/useDatasetUpload.js';

describe('HashProgress — progressbar accessibility', () => {
  it('renders a progressbar role while hashing', () => {
    render(<HashProgress step={STEPS.HASHING} hashProgress={42} hexHash="" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to the current hash progress', () => {
    render(<HashProgress step={STEPS.HASHING} hashProgress={67} hexHash="" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
  });

  it('sets aria-valuemin to 0', () => {
    render(<HashProgress step={STEPS.HASHING} hashProgress={0} hexHash="" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0');
  });

  it('sets aria-valuemax to 100', () => {
    render(<HashProgress step={STEPS.HASHING} hashProgress={50} hexHash="" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100');
  });

  it('sets aria-valuetext with human-readable progress description', () => {
    render(<HashProgress step={STEPS.HASHING} hashProgress={80} hexHash="" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '80% complete');
  });

  it('does not render a progressbar during submission step', () => {
    render(<HashProgress step={STEPS.SUBMITTING} hashProgress={100} hexHash="abc123" />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

describe('HashProgress — stage checklist accessibility', () => {
  it('renders the stages as a list with accessible label', () => {
    render(<HashProgress step={STEPS.HASHING} hashProgress={30} hexHash="" />);
    expect(screen.getByRole('list', { name: /processing stages/i })).toBeInTheDocument();
  });

  it('renders four stage items', () => {
    render(<HashProgress step={STEPS.HASHING} hashProgress={30} hexHash="" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
