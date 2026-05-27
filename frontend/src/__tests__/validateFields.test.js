import { validateFields, DESC_MIN_LENGTH } from '../hooks/useDatasetUpload.js';

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

describe('validateFields — description validation', () => {
  const valid = { price: '100', storageUrl: '' };

  it('returns no error for a description meeting the minimum length', () => {
    const desc = 'A'.repeat(DESC_MIN_LENGTH);
    const { description } = validateFields({ ...valid, description: desc });
    expect(description).toBeNull();
  });

  it('returns error when description is empty', () => {
    const { description } = validateFields({ ...valid, description: '' });
    expect(description).toBeTruthy();
  });

  it('returns error when trimmed description is shorter than DESC_MIN_LENGTH', () => {
    const { description } = validateFields({ ...valid, description: 'Hi' });
    expect(description).toMatch(/at least/i);
  });

  it('returns error when description exceeds 200 characters', () => {
    const { description } = validateFields({ ...valid, description: 'A'.repeat(201) });
    expect(description).toMatch(/200/);
  });

  it('returns error when description is only whitespace', () => {
    const { description } = validateFields({ ...valid, description: '   ' });
    expect(description).toBeTruthy();
  });

  it('trims before checking minimum length', () => {
    const padded = ' ' + 'A'.repeat(DESC_MIN_LENGTH - 2) + ' ';
    const { description } = validateFields({ ...valid, description: padded });
    expect(description).toMatch(/at least/i);
  });
});
