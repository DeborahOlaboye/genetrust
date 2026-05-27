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

describe('validateFields — storageUrl validation', () => {
  const valid = { price: '100', description: 'Valid description here' };

  it('returns no error when storageUrl is empty (optional field)', () => {
    const { storageUrl } = validateFields({ ...valid, storageUrl: '' });
    expect(storageUrl).toBeNull();
  });

  it('returns no error for a valid ipfs:// URL', () => {
    const { storageUrl } = validateFields({ ...valid, storageUrl: 'ipfs://QmHash123' });
    expect(storageUrl).toBeNull();
  });

  it('returns no error for a valid https:// URL', () => {
    const { storageUrl } = validateFields({ ...valid, storageUrl: 'https://example.com/data' });
    expect(storageUrl).toBeNull();
  });

  it('returns no error for a valid http:// URL', () => {
    const { storageUrl } = validateFields({ ...valid, storageUrl: 'http://localhost/data' });
    expect(storageUrl).toBeNull();
  });

  it('returns error for a URL without a valid scheme', () => {
    const { storageUrl } = validateFields({ ...valid, storageUrl: 'ftp://invalid.com' });
    expect(storageUrl).toMatch(/ipfs:\/\//i);
  });

  it('returns error for a plain string without a scheme', () => {
    const { storageUrl } = validateFields({ ...valid, storageUrl: 'example.com/data' });
    expect(storageUrl).toBeTruthy();
  });

  it('trims whitespace before validating storageUrl', () => {
    const { storageUrl } = validateFields({ ...valid, storageUrl: '   ' });
    expect(storageUrl).toBeNull();
  });
});

describe('validateFields — collects all errors without early exit', () => {
  it('returns errors for all three fields simultaneously when all are invalid', () => {
    const errors = validateFields({ price: '', description: '', storageUrl: 'ftp://bad' });
    expect(errors.price).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.storageUrl).toBeTruthy();
  });

  it('returns null for all fields when input is fully valid', () => {
    const errors = validateFields({
      price: '250',
      description: 'Genome dataset from European cohort 2024',
      storageUrl: 'ipfs://QmValidHash',
    });
    expect(errors.price).toBeNull();
    expect(errors.description).toBeNull();
    expect(errors.storageUrl).toBeNull();
  });
});
