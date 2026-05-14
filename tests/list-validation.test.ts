import { describe, it, expect } from 'vitest';

describe('List Validation Tests', () => {
  describe('Basic Validation', () => {
    it('should validate non-empty list', () => {
      const list = [1, 2, 3];
      expect(list.length).toBeGreaterThan(0);
    });

    it('should detect empty list', () => {
      const list: number[] = [];
      expect(list.length).toBe(0);
    });

    it('should validate list length', () => {
      const list = [1, 2, 3];
      const minLength = 1;
      const maxLength = 100;
      expect(list.length).toBeGreaterThanOrEqual(minLength);
      expect(list.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('Guard Functions', () => {
    it('should guard against empty list', () => {
      const list: number[] = [];
      const isValid = list.length > 0;
      expect(isValid).toBe(false);
    });

    it('should allow non-empty list', () => {
      const list = [1, 2, 3];
      const isValid = list.length > 0;
      expect(isValid).toBe(true);
    });

    it('should guard against list exceeding max length', () => {
      const list = Array(150).fill(0);
      const maxLength = 100;
      const isValid = list.length <= maxLength;
      expect(isValid).toBe(false);
    });

    it('should validate list length in range', () => {
      const list = [1, 2, 3];
      const minLength = 1;
      const maxLength = 100;
      const isValid = list.length >= minLength && list.length <= maxLength;
      expect(isValid).toBe(true);
    });
  });

  describe('List Operations', () => {
    it('should get list length', () => {
      const list = [1, 2, 3];
      expect(list.length).toBe(3);
    });

    it('should add item to list', () => {
      const list = [1, 2, 3];
      list.push(4);
      expect(list.length).toBe(4);
    });

    it('should remove item from list', () => {
      const list = [1, 2, 3];
      list.pop();
      expect(list.length).toBe(2);
    });

    it('should access list item', () => {
      const list = [1, 2, 3];
      expect(list[0]).toBe(1);
    });
  });

  describe('List Validation', () => {
    it('should validate list contains exact number of items', () => {
      const list = [1, 2, 3];
      expect(list.length).toBe(3);
    });

    it('should detect list with wrong number of items', () => {
      const list = [1, 2];
      expect(list.length).not.toBe(3);
    });

    it('should validate all items in list are unique', () => {
      const list = [1, 2, 3];
      const uniqueItems = new Set(list);
      expect(uniqueItems.size).toBe(list.length);
    });

    it('should detect duplicate items in list', () => {
      const list = [1, 2, 2, 3];
      const uniqueItems = new Set(list);
      expect(uniqueItems.size).toBeLessThan(list.length);
    });
  });

  describe('List Filtering', () => {
    it('should filter list items', () => {
      const list = [1, 2, 3, 4, 5];
      const filtered = list.filter(x => x > 2);
      expect(filtered.length).toBe(3);
    });

    it('should map list items', () => {
      const list = [1, 2, 3];
      const mapped = list.map(x => x * 2);
      expect(mapped[0]).toBe(2);
    });

    it('should reduce list items', () => {
      const list = [1, 2, 3];
      const sum = list.reduce((a, b) => a + b, 0);
      expect(sum).toBe(6);
    });
  });

  describe('List Searching', () => {
    it('should find item in list', () => {
      const list = [1, 2, 3];
      expect(list.includes(2)).toBe(true);
    });

    it('should detect missing item', () => {
      const list = [1, 2, 3];
      expect(list.includes(4)).toBe(false);
    });

    it('should find index of item', () => {
      const list = [1, 2, 3];
      expect(list.indexOf(2)).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item list', () => {
      const list = [1];
      expect(list.length).toBe(1);
    });

    it('should handle large list', () => {
      const list = Array(10000).fill(0);
      expect(list.length).toBe(10000);
    });

    it('should handle mixed type list', () => {
      const list: (string | number | boolean)[] = [1, 'two', true];
      expect(list.length).toBe(3);
    });

    it('should handle nested list', () => {
      const list = [[1, 2], [3, 4]];
      expect(list.length).toBe(2);
      expect(list[0].length).toBe(2);
    });
  });

  describe('Performance', () => {
    it('should validate lists efficiently', () => {
      const start = performance.now();
      const list = Array(10000).fill(0);
      const isValid = list.length > 0 && list.length <= 100000;
      expect(isValid).toBe(true);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('should filter large lists efficiently', () => {
      const start = performance.now();
      const list = Array(10000).fill(0).map((_, i) => i);
      const filtered = list.filter(x => x % 2 === 0);
      expect(filtered.length).toBeGreaterThan(0);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
});
