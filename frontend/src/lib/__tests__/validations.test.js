import { isStacksAddress } from '../validations';

describe('validation helpers', () => {
  it('validates valid Stacks addresses', () => {
    expect(isStacksAddress('SP1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5')).toBe(true);
    expect(isStacksAddress('st1pqhqkv0rjxz9vccsxm24vz4qr6x4ra24p462a5')).toBe(true);
  });

  it('rejects invalid Stacks addresses', () => {
    expect(isStacksAddress('')).toBe(false);
    expect(isStacksAddress('not-a-stacks-address')).toBe(false);
    expect(isStacksAddress('SP123')).toBe(false);
    expect(isStacksAddress('ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462')).toBe(false);
  });
});
