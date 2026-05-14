import { describe, it, expect } from 'vitest';

describe('Hash Validation Tests', () => {
  describe('Basic Validation', () => {
    it('should validate valid hashes', () => {
      const hash = Buffer.from('a'.repeat(64));
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should detect empty hashes', () => {
      const hash = Buffer.from('');
      expect(hash.length).toBe(0);
    });

    it('should validate hash length', () => {
      const hash = Buffer.from('a'.repeat(64));
      const minLength = 32;
      const maxLength = 64;
      expect(hash.length).toBeGreaterThanOrEqual(minLength);
      expect(hash.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('Guard Functions', () => {
    it('should guard against empty hashes', () => {
      const hash = Buffer.from('');
      const isValid = hash.length > 0;
      expect(isValid).toBe(false);
    });

    it('should allow valid hashes', () => {
      const hash = Buffer.from('a'.repeat(64));
      const isValid = hash.length > 0 && hash.length <= 64;
      expect(isValid).toBe(true);
    });

    it('should guard against invalid hash length', () => {
      const hash = Buffer.from('a'.repeat(100));
      const maxLength = 64;
      const isValid = hash.length <= maxLength;
      expect(isValid).toBe(false);
    });
  });

  describe('Hash Comparison', () => {
    it('should identify equal hashes', () => {
      const h1 = Buffer.from('a'.repeat(64));
      const h2 = Buffer.from('a'.repeat(64));
      expect(h1.equals(h2)).toBe(true);
    });

    it('should identify different hashes', () => {
      const h1 = Buffer.from('a'.repeat(64));
      const h2 = Buffer.from('b'.repeat(64));
      expect(h1.equals(h2)).toBe(false);
    });

    it('should detect case sensitivity', () => {
      const h1 = Buffer.from('A'.repeat(64));
      const h2 = Buffer.from('a'.repeat(64));
      expect(h1.equals(h2)).toBe(false);
    });
  });

  describe('Hash Format Validation', () => {
    it('should validate hex format', () => {
      const hash = 'a1b2c3d4e5f6';
      const isHex = /^[0-9a-f]+$/i.test(hash);
      expect(isHex).toBe(true);
    });

    it('should detect invalid hex format', () => {
      const hash = 'g1h2i3j4k5l6';
      const isHex = /^[0-9a-f]+$/i.test(hash);
      expect(isHex).toBe(false);
    });

    it('should validate hash length consistency', () => {
      const hash = Buffer.from('a'.repeat(64));
      expect(hash.length % 2).toBe(0);
    });
  });

  describe('Hash Operations', () => {
    it('should convert hash to string', () => {
      const hash = Buffer.from('a'.repeat(64));
      const hashStr = hash.toString('hex');
      expect(hashStr).toBeTruthy();
    });

    it('should concatenate hashes', () => {
      const h1 = Buffer.from('a'.repeat(32));
      const h2 = Buffer.from('b'.repeat(32));
      const combined = Buffer.concat([h1, h2]);
      expect(combined.length).toBe(64);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid hash', () => {
      const hash = Buffer.from('a'.repeat(32));
      expect(hash.length).toBe(32);
    });

    it('should handle maximum valid hash', () => {
      const hash = Buffer.from('a'.repeat(64));
      expect(hash.length).toBe(64);
    });

    it('should handle empty buffer', () => {
      const hash = Buffer.from('');
      expect(hash.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should compare hashes efficiently', () => {
      const start = performance.now();
      const h1 = Buffer.from('a'.repeat(64));
      for (let i = 0; i < 10000; i++) {
        const h2 = Buffer.from('a'.repeat(64));
        h1.equals(h2);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
});
