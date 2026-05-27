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

describe('WizardStepBar — aria-current', () => {
  it('marks the Select File step as aria-current=step when on file-select', () => {
    render(<WizardStepBar currentStep={STEPS.FILE_SELECT} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('aria-current', 'step');
  });

  it('marks only one item as aria-current at a time', () => {
    render(<WizardStepBar currentStep={STEPS.METADATA} />);
    const items = screen.getAllByRole('listitem');
    const current = items.filter(i => i.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
  });

  it('marks the Metadata step as aria-current=step when on metadata', () => {
    render(<WizardStepBar currentStep={STEPS.METADATA} />);
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });

  it('marks the Hashing step as aria-current=step when on hashing', () => {
    render(<WizardStepBar currentStep={STEPS.HASHING} />);
    const items = screen.getAllByRole('listitem');
    expect(items[2]).toHaveAttribute('aria-current', 'step');
  });

  it('marks no item as aria-current when on the done step', () => {
    render(<WizardStepBar currentStep={STEPS.DONE} />);
    const items = screen.getAllByRole('listitem');
    const current = items.filter(i => i.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
  });
});

describe('WizardStepBar — circle aria-labels', () => {
  it('includes step-of-total in the circle aria-label for the active step', () => {
    render(<WizardStepBar currentStep={STEPS.METADATA} />);
    expect(screen.getByLabelText(/step 2 of 5.*details.*current/i)).toBeInTheDocument();
  });

  it('labels a completed step as completed in the circle aria-label', () => {
    render(<WizardStepBar currentStep={STEPS.METADATA} />);
    expect(screen.getByLabelText(/step 1 of 5.*select file.*completed/i)).toBeInTheDocument();
  });

  it('labels an upcoming step as upcoming in the circle aria-label', () => {
    render(<WizardStepBar currentStep={STEPS.FILE_SELECT} />);
    expect(screen.getByLabelText(/step 2 of 5.*details.*upcoming/i)).toBeInTheDocument();
  });
});
