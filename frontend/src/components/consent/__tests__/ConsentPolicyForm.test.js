import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentPolicyForm } from '../ConsentPolicyForm.jsx';
import { DEFAULT_DURATION_BLOCKS } from '../../hooks/useConsentPolicy.js';

describe('ConsentPolicyForm', () => {
  it('pre-populates duration and submits existing policy values', async () => {
    const futureExpiry = Date.now() + 10 * 600000; // 10 blocks
    const existing = {
      researchConsent: true,
      commercialConsent: false,
      clinicalConsent: true,
      jurisdiction: 2,
      consentExpiresAt: futureExpiry,
    };

    const onSubmit = vi.fn();
    render(<ConsentPolicyForm existing={existing} onSubmit={onSubmit} saving={false} error={null} />);

    expect(screen.getByRole('switch', { name: /Research Use consent/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /Clinical Use consent/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /EU \(GDPR\)/i })).toBeTruthy();

    const durationInput = screen.getByLabelText(/Consent Duration \(blocks\)/i);
    expect(Number(durationInput.value)).toBeGreaterThanOrEqual(10);

    await userEvent.click(screen.getByRole('button', { name: /Update Consent Policy/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      research: true,
      commercial: false,
      clinical: true,
      jurisdiction: 2,
      durationBlocks: Number(durationInput.value),
    });
  });

  it('disables submit and shows a validation message when duration is below minimum', async () => {
    const existing = {
      researchConsent: true,
      commercialConsent: true,
      clinicalConsent: false,
      jurisdiction: 1,
      consentExpiresAt: Date.now() + 5000,
    };

    const onSubmit = vi.fn();
    render(<ConsentPolicyForm existing={existing} onSubmit={onSubmit} saving={false} error={null} />);

    const durationInput = screen.getByLabelText(/Consent Duration \(blocks\)/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '100');

    expect(durationInput).toHaveValue(100);
    expect(screen.getByText(/Minimum consent duration is 144 blocks/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Consent Policy/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Update Consent Policy/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders with an accessible form role and associates inputs with help text', () => {
    const onSubmit = vi.fn();
    render(<ConsentPolicyForm existing={null} onSubmit={onSubmit} saving={false} error={null} />);

    expect(screen.getByRole('form', { name: /Consent policy form/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Consent Duration \(blocks\)/i)).toHaveAttribute('aria-describedby', expect.stringContaining('consent-duration-help'));
  });

  it('resets form fields when existing consent data is removed', async () => {
    const existing = {
      researchConsent: true,
      commercialConsent: false,
      clinicalConsent: true,
      jurisdiction: 2,
      consentExpiresAt: Date.now() + 600000,
    };

    const onSubmit = vi.fn();
    const { rerender } = render(<ConsentPolicyForm existing={existing} onSubmit={onSubmit} saving={false} error={null} />);

    const durationInput = screen.getByLabelText(/Consent Duration \(blocks\)/i);
    expect(durationInput).toHaveValue(getDurationBlocksFromExpiry(existing.consentExpiresAt));

    rerender(<ConsentPolicyForm existing={null} onSubmit={onSubmit} saving={false} error={null} />);

    expect(screen.getByRole('switch', { name: /Research Use consent/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText(/Consent Duration \(blocks\)/i)).toHaveValue(DEFAULT_DURATION_BLOCKS);
  });
});
