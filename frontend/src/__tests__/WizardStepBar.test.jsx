import React from 'react';
import { render, screen } from '@testing-library/react';
import { WizardStepBar } from '../components/upload/WizardStepBar.jsx';
import { STEPS } from '../hooks/useDatasetUpload.js';

describe('WizardStepBar — structure', () => {
  it('renders a nav landmark with accessible label', () => {
    render(<WizardStepBar currentStep={STEPS.FILE_SELECT} />);
    expect(screen.getByRole('navigation', { name: /upload progress/i })).toBeInTheDocument();
  });

  it('renders the step list with role=list', () => {
    render(<WizardStepBar currentStep={STEPS.FILE_SELECT} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders five list items — one per step', () => {
    render(<WizardStepBar currentStep={STEPS.FILE_SELECT} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});
