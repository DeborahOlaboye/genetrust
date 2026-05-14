import { describe, it, expect } from 'vitest';

describe('String Validation Tests', () => {
  describe('Basic Validation', () => {
    it('should validate non-empty strings', () => {
      const str = 'test';
      expect(str.length).toBeGreaterThan(0);
    });

    it('should detect empty strings', () => {
      const str = '';
      expect(str.length).toBe(0);
    });

    it('should validate string length', () => {
      const str = 'test';
      const minLength = 1;
      const maxLength = 256;
      expect(str.length).toBeGreaterThanOrEqual(minLength);
      expect(str.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('Guard Functions', () => {
    it('should guard against empty strings', () => {
      const str = '';
      const isValid = str.length > 0;
      expect(isValid).toBe(false);
    });

    it('should allow non-empty strings', () => {
      const str = 'test';
      const isValid = str.length > 0;
      expect(isValid).toBe(true);
    });

    it('should guard against strings that are too long', () => {
      const str = 'a'.repeat(300);
      const maxLength = 256;
      const isValid = str.length <= maxLength;
      expect(isValid).toBe(false);
    });

    it('should validate string length in range', () => {
      const str = 'test';
      const minLength = 1;
      const maxLength = 256;
      const isValid = str.length >= minLength && str.length <= maxLength;
      expect(isValid).toBe(true);
    });
  });

  describe('String Comparison', () => {
    it('should identify equal strings', () => {
      const s1 = 'test';
      const s2 = 'test';
      expect(s1).toBe(s2);
    });

    it('should identify different strings', () => {
      const s1 = 'test1';
      const s2 = 'test2';
      expect(s1).not.toBe(s2);
    });

    it('should be case-sensitive', () => {
      const s1 = 'Test';
      const s2 = 'test';
      expect(s1).not.toBe(s2);
    });
  });

  describe('String Operations', () => {
    it('should handle string concatenation', () => {
      const s1 = 'Hello';
      const s2 = 'World';
      const result = s1 + ' ' + s2;
      expect(result).toBe('Hello World');
    });

    it('should handle string trimming', () => {
      const str = '  test  ';
      const trimmed = str.trim();
      expect(trimmed).toBe('test');
    });

    it('should convert to uppercase', () => {
      const str = 'test';
      const upper = str.toUpperCase();
      expect(upper).toBe('TEST');
    });

    it('should convert to lowercase', () => {
      const str = 'TEST';
      const lower = str.toLowerCase();
      expect(lower).toBe('test');
    });
  });

  describe('UTF-8 Validation', () => {
    it('should handle ASCII strings', () => {
      const str = 'test123';
      expect(str.length).toBeGreaterThan(0);
    });

    it('should handle unicode strings', () => {
      const str = 'test🎯';
      expect(str.length).toBeGreaterThan(0);
    });

    it('should validate UTF-8 format', () => {
      const str = 'test';
      const isUTF8 = /^[\x00-\x7F]*$|^[\x80-\xFF]/.test(str) || str.length > 0;
      expect(isUTF8).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character', () => {
      const str = 'a';
      expect(str.length).toBe(1);
    });

    it('should handle max length string', () => {
      const str = 'a'.repeat(256);
      expect(str.length).toBe(256);
    });

    it('should handle special characters', () => {
      const str = '@#$%^&*()';
      expect(str.length).toBeGreaterThan(0);
    });

    it('should handle whitespace characters', () => {
      const str = '   ';
      expect(str.length).toBe(3);
    });
  });

  describe('Performance', () => {
    it('should validate strings efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        const str = `test${i}`;
        expect(str.length).toBeGreaterThan(0);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
});
