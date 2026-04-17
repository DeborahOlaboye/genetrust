import {
  getContrastRatio,
  checkContrastCompliance,
  isFocusable,
  getFocusableElements,
  validateFormAccessibility,
  accessibleColors
} from './accessibility';

describe('Accessibility Utilities', () => {
  describe('getContrastRatio', () => {
    it('calculates correct contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('calculates correct contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('handles hex colors without #', () => {
      const ratio = getContrastRatio('000000', 'ffffff');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('returns 0 for invalid colors', () => {
      const ratio = getContrastRatio('invalid', '#ffffff');
      expect(ratio).toBe(0);
    });
  });

  describe('checkContrastCompliance', () => {
    it('passes AA normal text requirement', () => {
      const result = checkContrastCompliance('#000000', '#ffffff', 'AA', 'normal');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeCloseTo(21, 1);
      expect(result.required).toBe(4.5);
    });

    it('fails AA normal text requirement for low contrast', () => {
      const result = checkContrastCompliance('#666666', '#777777', 'AA', 'normal');
      expect(result.passes).toBe(false);
      expect(result.ratio).toBeLessThan(4.5);
    });

    it('passes AA large text requirement', () => {
      const result = checkContrastCompliance('#666666', '#777777', 'AA', 'large');
      expect(result.passes).toBe(true);
      expect(result.required).toBe(3);
    });

    it('passes AAA requirements', () => {
      const result = checkContrastCompliance('#000000', '#ffffff', 'AAA', 'normal');
      expect(result.passes).toBe(true);
      expect(result.required).toBe(7);
    });
  });

  describe('isFocusable', () => {
    it('returns true for focusable elements', () => {
      const button = document.createElement('button');
      expect(isFocusable(button)).toBe(true);

      const link = document.createElement('a');
      link.href = '#';
      expect(isFocusable(link)).toBe(true);

      const input = document.createElement('input');
      expect(isFocusable(input)).toBe(true);
    });

    it('returns false for disabled elements', () => {
      const button = document.createElement('button');
      button.disabled = true;
      expect(isFocusable(button)).toBe(false);
    });

    it('returns false for non-focusable elements', () => {
      const div = document.createElement('div');
      expect(isFocusable(div)).toBe(false);
    });

    it('returns true for elements with tabindex', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '0');
      expect(isFocusable(div)).toBe(true);
    });

    it('returns false for elements with tabindex -1', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '-1');
      expect(isFocusable(div)).toBe(false);
    });
  });

  describe('getFocusableElements', () => {
    it('returns all focusable elements in container', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button 1</button>
        <button disabled>Button 2</button>
        <a href="#">Link</a>
        <input type="text" />
        <div tabindex="0">Focusable Div</div>
        <div tabindex="-1">Not Focusable</div>
        <span>Span</span>
      `;

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(4); // button, link, input, div with tabindex 0
    });

    it('excludes hidden elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button style="display: none">Hidden</button>
        <button>Visible</button>
      `;

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(1);
    });
  });

  describe('validateFormAccessibility', () => {
    it('validates form with proper labels', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <label for="name">Name</label>
        <input id="name" type="text" />
        <label for="email">Email</label>
        <input id="email" type="email" />
      `;

      const result = validateFormAccessibility(form);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('detects missing labels', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" />
        <input type="email" aria-label="Email" />
      `;

      const result = validateFormAccessibility(form);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing-label');
    });

    it('detects missing error descriptions for invalid inputs', () => {
      const form = document.createElement('form');
      form.innerHTML = `
        <label for="name">Name</label>
        <input id="name" type="text" aria-invalid="true" />
      `;

      const result = validateFormAccessibility(form);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing-error-description');
    });
  });

  describe('accessibleColors', () => {
    it('provides predefined accessible color combinations', () => {
      expect(accessibleColors.primary.blue).toBe('#1e40af');
      expect(accessibleColors.secondary.lightBlue).toBe('#dbeafe');
      expect(accessibleColors.neutral.white).toBe('#ffffff');
    });

    it('has colors that meet contrast requirements', () => {
      // Test that primary colors have good contrast with white
      const blueContrast = getContrastRatio(accessibleColors.primary.blue, '#ffffff');
      expect(blueContrast).toBeGreaterThan(4.5);

      // Test that secondary colors have good contrast with dark text
      const lightBlueContrast = getContrastRatio(accessibleColors.secondary.lightBlue, '#000000');
      expect(lightBlueContrast).toBeGreaterThan(4.5);
    });
  });
});