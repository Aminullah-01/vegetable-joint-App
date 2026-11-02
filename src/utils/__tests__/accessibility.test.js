import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  getRelativeLuminance,
  calculateContrastRatio,
  isContrastCompliant,
  BRAND_ACCESSIBILITY_PALETTE,
  auditPaletteContrast,
  validateImageAccessibility,
  validateFormInputAccessibility,
} from '../accessibility.js';

describe('accessibility utilities (WCAG 2.1 Level AA / NFR-USAB-02)', () => {
  describe('hexToRgb', () => {
    it('converts 6-digit hex codes correctly', () => {
      expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
      expect(hexToRgb('15803d')).toEqual([21, 128, 61]);
    });

    it('converts 3-digit shorthand hex codes correctly', () => {
      expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000')).toEqual([0, 0, 0]);
      expect(hexToRgb('#f00')).toEqual([255, 0, 0]);
    });

    it('returns null for invalid hex inputs', () => {
      expect(hexToRgb(null)).toBeNull();
      expect(hexToRgb(undefined)).toBeNull();
      expect(hexToRgb('')).toBeNull();
      expect(hexToRgb('#12')).toBeNull();
      expect(hexToRgb('#gggggg')).toBeNull();
      expect(hexToRgb(123456)).toBeNull();
    });
  });

  describe('getRelativeLuminance', () => {
    it('computes 1.0 for pure white and 0.0 for pure black', () => {
      expect(getRelativeLuminance(255, 255, 255)).toBeCloseTo(1.0, 4);
      expect(getRelativeLuminance(0, 0, 0)).toBeCloseTo(0.0, 4);
    });

    it('computes expected luminance for midtones', () => {
      const lum = getRelativeLuminance(21, 128, 61); // #15803d
      expect(lum).toBeGreaterThan(0);
      expect(lum).toBeLessThan(1);
    });
  });

  describe('calculateContrastRatio', () => {
    it('calculates maximum contrast 21:1 for black and white', () => {
      expect(calculateContrastRatio('#ffffff', '#000000')).toBe(21);
      expect(calculateContrastRatio('#000000', '#ffffff')).toBe(21);
    });

    it('calculates 1:1 contrast for identical colors', () => {
      expect(calculateContrastRatio('#ffffff', '#ffffff')).toBe(1);
      expect(calculateContrastRatio('#15803d', '#15803d')).toBe(1);
    });

    it('returns null if either color is invalid', () => {
      expect(calculateContrastRatio('#ffffff', 'invalid')).toBeNull();
      expect(calculateContrastRatio(null, '#ffffff')).toBeNull();
    });
  });

  describe('isContrastCompliant (WCAG 2.1 AA & AAA thresholds)', () => {
    it('verifies Level AA normal text threshold (>= 4.5:1)', () => {
      // #15803d on #ffffff is ~5.46:1
      const result = isContrastCompliant('#15803d', '#ffffff', 'AA', false);
      expect(result.compliant).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      expect(result.required).toBe(4.5);
    });

    it('verifies Level AA large text threshold (>= 3.0:1)', () => {
      const result = isContrastCompliant('#15803d', '#ffffff', 'AA', true);
      expect(result.compliant).toBe(true);
      expect(result.required).toBe(3.0);
    });

    it('verifies Level AAA thresholds (7.0:1 normal, 4.5:1 large)', () => {
      const normalResult = isContrastCompliant(
        '#000000',
        '#ffffff',
        'AAA',
        false
      );
      expect(normalResult.compliant).toBe(true);
      expect(normalResult.required).toBe(7.0);

      const largeResult = isContrastCompliant(
        '#15803d',
        '#ffffff',
        'AAA',
        true
      );
      expect(largeResult.compliant).toBe(true);
      expect(largeResult.required).toBe(4.5);
    });

    it('handles invalid colors safely', () => {
      const result = isContrastCompliant('invalid', '#ffffff');
      expect(result.compliant).toBe(false);
      expect(result.ratio).toBeNull();
    });
  });

  describe('auditPaletteContrast (Brand Palette Verification)', () => {
    it('defines BRAND_ACCESSIBILITY_PALETTE with valid color tokens', () => {
      expect(BRAND_ACCESSIBILITY_PALETTE).toBeDefined();
      expect(Object.keys(BRAND_ACCESSIBILITY_PALETTE).length).toBeGreaterThan(
        0
      );
    });

    it('confirms 100% of the core theme color palette meets WCAG 2.1 Level AA (4.5:1)', () => {
      const report = auditPaletteContrast();
      expect(report.total).toBeGreaterThan(0);
      expect(report.failed).toBe(0);
      expect(report.passed).toBe(report.total);
      expect(report.allCompliant).toBe(true);

      // Verify specific high-importance brand tokens
      const primaryCheck = report.results.find(
        (r) => r.key === 'primaryOnWhite'
      );
      expect(primaryCheck?.passes).toBe(true);
      expect(primaryCheck?.ratio).toBeGreaterThanOrEqual(4.5);

      const whiteOnPrimaryCheck = report.results.find(
        (r) => r.key === 'whiteOnPrimary'
      );
      expect(whiteOnPrimaryCheck?.passes).toBe(true);
      expect(whiteOnPrimaryCheck?.ratio).toBeGreaterThanOrEqual(4.5);

      const bodyTextCheck = report.results.find(
        (r) => r.key === 'bodyTextOnWhite'
      );
      expect(bodyTextCheck?.passes).toBe(true);
      expect(bodyTextCheck?.ratio).toBeGreaterThanOrEqual(7.0); // Meets even AAA
    });
  });

  describe('validateImageAccessibility', () => {
    it('identifies valid informative images with alt text', () => {
      const img = document.createElement('img');
      img.setAttribute('src', '/tomatoes.jpg');
      img.setAttribute('alt', 'Fresh Roma Tomatoes basket');

      const result = validateImageAccessibility(img);
      expect(result.hasAlt).toBe(true);
      expect(result.altText).toBe('Fresh Roma Tomatoes basket');
      expect(result.isDecorative).toBe(false);
      expect(result.isValid).toBe(true);
    });

    it('identifies valid decorative images (alt="" or aria-hidden="true")', () => {
      const img1 = document.createElement('img');
      img1.setAttribute('alt', '');
      expect(validateImageAccessibility(img1).isDecorative).toBe(true);
      expect(validateImageAccessibility(img1).isValid).toBe(true);

      const img2 = document.createElement('img');
      img2.setAttribute('aria-hidden', 'true');
      expect(validateImageAccessibility(img2).isDecorative).toBe(true);
      expect(validateImageAccessibility(img2).isValid).toBe(true);

      const img3 = document.createElement('img');
      img3.setAttribute('role', 'presentation');
      expect(validateImageAccessibility(img3).isDecorative).toBe(true);
      expect(validateImageAccessibility(img3).isValid).toBe(true);
    });

    it('flags images missing alt attributes as invalid', () => {
      const img = document.createElement('img');
      img.setAttribute('src', '/unlabelled.jpg');

      const result = validateImageAccessibility(img);
      expect(result.hasAlt).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('handles null or undefined element safely', () => {
      const result = validateImageAccessibility(null);
      expect(result.isValid).toBe(false);
      expect(result.hasAlt).toBe(false);
    });
  });

  describe('validateFormInputAccessibility', () => {
    it('validates form inputs with associated label element via htmlFor', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <label for="username-input">Username</label>
        <input id="username-input" type="text" />
      `;
      document.body.appendChild(container);

      const input = container.querySelector('#username-input');
      const result = validateFormInputAccessibility(input);

      expect(result.hasAccessibleName).toBe(true);
      expect(result.accessibleName).toBe('Username');
      expect(result.isAriaInvalid).toBe(false);

      document.body.removeChild(container);
    });

    it('validates form inputs with aria-label or aria-labelledby', () => {
      const input = document.createElement('input');
      input.setAttribute('aria-label', 'Search vegetables');

      const result = validateFormInputAccessibility(input);
      expect(result.hasAccessibleName).toBe(true);
      expect(result.accessibleName).toBe('Search vegetables');

      const container = document.createElement('div');
      container.innerHTML = `
        <span id="external-label">Price Range</span>
        <input id="test-price" aria-labelledby="external-label" />
      `;
      document.body.appendChild(container);

      const labelledInput = container.querySelector('#test-price');
      expect(validateFormInputAccessibility(labelledInput).accessibleName).toBe(
        'Price Range'
      );

      document.body.removeChild(container);
    });

    it('detects aria-invalid and aria-describedby for error states', () => {
      const input = document.createElement('input');
      input.setAttribute('aria-label', 'Email Address');
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', 'email-error');

      const result = validateFormInputAccessibility(input);
      expect(result.isAriaInvalid).toBe(true);
      expect(result.hasAriaDescribedBy).toBe(true);
    });

    it('handles null element safely', () => {
      const result = validateFormInputAccessibility(null);
      expect(result.hasAccessibleName).toBe(false);
      expect(result.isAriaInvalid).toBe(false);
    });
  });
});
