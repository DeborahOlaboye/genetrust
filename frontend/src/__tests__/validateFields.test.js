import { validateFields } from '../hooks/useDatasetUpload.js';

describe('validateFields — price validation', () => {
  it('returns no error for a valid positive integer price', () => {
    const { price } = validateFields({ price: '100', description: 'Valid description here', storageUrl: '' });
    expect(price).toBeNull();
  });

  it('returns error when price is empty string', () => {
    const { price } = validateFields({ price: '', description: 'Valid description here', storageUrl: '' });
    expect(price).toBeTruthy();
  });

  it('returns error when price is zero', () => {
    const { price } = validateFields({ price: '0', description: 'Valid description here', storageUrl: '' });
    expect(price).toBeTruthy();
  });

  it('returns error when price is negative', () => {
    const { price } = validateFields({ price: '-10', description: 'Valid description here', storageUrl: '' });
    expect(price).toBeTruthy();
  });

  it('returns error when price is a decimal', () => {
    const { price } = validateFields({ price: '9.5', description: 'Valid description here', storageUrl: '' });
    expect(price).toMatch(/whole number/i);
  });

  it('returns error when price is non-numeric', () => {
    const { price } = validateFields({ price: 'abc', description: 'Valid description here', storageUrl: '' });
    expect(price).toBeTruthy();
  });
});
