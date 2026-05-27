import { renderHook, act } from '@testing-library/react';
import { useDatasetUpload, STEPS } from '../hooks/useDatasetUpload.js';

const MOCK_CONTRACT = {
  createVaultDataset: jest.fn().mockResolvedValue({ txId: 'tx-mock-001' }),
};

function setup() {
  return renderHook(() =>
    useDatasetUpload({ contractService: MOCK_CONTRACT, walletService: {}, onComplete: jest.fn() })
  );
}

describe('useDatasetUpload — initial fieldErrors state', () => {
  it('starts with all fieldErrors null', () => {
    const { result } = setup();
    expect(result.current.fieldErrors).toEqual({ price: null, description: null, storageUrl: null });
  });

  it('starts with hasAttemptedSubmit false', () => {
    const { result } = setup();
    expect(result.current.state.hasAttemptedSubmit).toBe(false);
  });
});

describe('useDatasetUpload — fieldErrors populated on failed submit', () => {
  it('sets fieldErrors.price when price is empty at submit', async () => {
    const { result } = setup();
    // Navigate to metadata step first
    act(() => {
      const file = new File(['data'], 'test.vcf', { type: 'text/plain' });
      result.current.selectFile(file);
    });
    act(() => result.current.setField('price', ''));
    act(() => result.current.setField('description', 'A short desc that is long enough'));

    await act(() => result.current.submitRegistration());
    expect(result.current.fieldErrors.price).toBeTruthy();
  });

  it('sets fieldErrors.description when description is too short at submit', async () => {
    const { result } = setup();
    act(() => {
      const file = new File(['data'], 'test.vcf', { type: 'text/plain' });
      result.current.selectFile(file);
    });
    act(() => result.current.setField('description', 'Hi'));

    await act(() => result.current.submitRegistration());
    expect(result.current.fieldErrors.description).toBeTruthy();
  });

  it('sets hasAttemptedSubmit to true after first failed submit', async () => {
    const { result } = setup();
    act(() => {
      const file = new File(['data'], 'test.vcf', { type: 'text/plain' });
      result.current.selectFile(file);
    });
    act(() => result.current.setField('price', ''));
    await act(() => result.current.submitRegistration());
    expect(result.current.state.hasAttemptedSubmit).toBe(true);
  });
});

describe('useDatasetUpload — field errors cleared on setField', () => {
  it('clears fieldErrors.price when price field is updated', async () => {
    const { result } = setup();
    act(() => {
      const file = new File(['data'], 'test.vcf', { type: 'text/plain' });
      result.current.selectFile(file);
    });
    act(() => result.current.setField('price', ''));
    await act(() => result.current.submitRegistration());

    expect(result.current.fieldErrors.price).toBeTruthy();

    act(() => result.current.setField('price', '50'));
    expect(result.current.fieldErrors.price).toBeNull();
  });

  it('clears fieldErrors.description when description field is updated', async () => {
    const { result } = setup();
    act(() => {
      const file = new File(['data'], 'test.vcf', { type: 'text/plain' });
      result.current.selectFile(file);
    });
    act(() => result.current.setField('description', ''));
    await act(() => result.current.submitRegistration());

    expect(result.current.fieldErrors.description).toBeTruthy();

    act(() => result.current.setField('description', 'Now a much longer description'));
    expect(result.current.fieldErrors.description).toBeNull();
  });
});

describe('useDatasetUpload — reset clears fieldErrors', () => {
  it('resets fieldErrors and hasAttemptedSubmit on RESET action', async () => {
    const { result } = setup();
    act(() => {
      const file = new File(['data'], 'test.vcf', { type: 'text/plain' });
      result.current.selectFile(file);
    });
    act(() => result.current.setField('price', ''));
    await act(() => result.current.submitRegistration());

    expect(result.current.state.hasAttemptedSubmit).toBe(true);
    act(() => result.current.reset());

    expect(result.current.fieldErrors).toEqual({ price: null, description: null, storageUrl: null });
    expect(result.current.state.hasAttemptedSubmit).toBe(false);
    expect(result.current.state.step).toBe(STEPS.FILE_SELECT);
  });
});
