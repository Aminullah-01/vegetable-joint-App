/**
 * Accessibility (a11y) Verification Utilities
 *
 * Conforms to SRS Section 6.2 & NFR-USAB-02:
 * "The interface shall meet WCAG 2.1 Level AA for contrast (4.5:1 text),
 * keyboard operability, visible focus, form labels and image alternative text."
 */

/**
 * Converts a 3-digit or 6-digit hex color string into [r, g, b] array.
 *
 * @param {string} hex
 * @returns {[number, number, number]|null}
 */
export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const cleanHex = hex.replace(/^#/, '').trim();

  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }

  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }

  return null;
}

/**
 * Computes WCAG 2.1 relative luminance for an sRGB color.
 * Formula: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 *
 * @param {number} r (0-255)
 * @param {number} g (0-255)
 * @param {number} b (0-255)
 * @returns {number} Relative luminance between 0 (black) and 1 (white)
 */
export function getRelativeLuminance(r, g, b) {
  const [sR, sG, sB] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is lighter and L2 is darker.
 *
 * @param {string} color1 Hex string
 * @param {string} color2 Hex string
 * @returns {number|null} Contrast ratio rounded to 2 decimal places (1.00 to 21.00), or null if invalid.
 */
export function calculateContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getRelativeLuminance(...rgb1);
  const lum2 = getRelativeLuminance(...rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Determines whether a color contrast ratio meets WCAG 2.1 criteria.
 *
 * @param {string} foregroundHex
 * @param {string} backgroundHex
 * @param {'AA'|'AAA'} [level='AA']
 * @param {boolean} [isLargeText=false] Large text is >= 18pt (24px) or >= 14pt (18.66px) bold.
 * @returns {{ compliant: boolean, ratio: number|null, required: number }}
 */
export function isContrastCompliant(
  foregroundHex,
  backgroundHex,
  level = 'AA',
  isLargeText = false
) {
  const ratio = calculateContrastRatio(foregroundHex, backgroundHex);
  if (ratio === null) {
    return { compliant: false, ratio: null, required: 4.5 };
  }

  let required = 4.5;
  if (level === 'AA') {
    required = isLargeText ? 3.0 : 4.5;
  } else if (level === 'AAA') {
    required = isLargeText ? 4.5 : 7.0;
  }

  return {
    compliant: ratio >= required,
    ratio,
    required,
  };
}

/**
 * Central Brand Color Accessibility Palette
 * Evaluated against WCAG 2.1 Level AA (4.5:1 text contrast).
 */
export const BRAND_ACCESSIBILITY_PALETTE = {
  primaryOnWhite: {
    fg: '#15803d',
    bg: '#ffffff',
    label: 'Brand Primary Green on White Surface',
    requiredRatio: 4.5,
  },
  whiteOnPrimary: {
    fg: '#ffffff',
    bg: '#15803d',
    label: 'White Text on Primary Green Button',
    requiredRatio: 4.5,
  },
  bodyTextOnWhite: {
    fg: '#0f172a',
    bg: '#ffffff',
    label: 'Body Primary Text (#0f172a) on White',
    requiredRatio: 4.5,
  },
  secondaryTextOnWhite: {
    fg: '#475569',
    bg: '#ffffff',
    label: 'Secondary Text (#475569) on White',
    requiredRatio: 4.5,
  },
  mutedTextOnWhite: {
    fg: '#64748b',
    bg: '#ffffff',
    label: 'Muted Text (#64748b) on White',
    requiredRatio: 4.5,
  },
  errorTextOnWhite: {
    fg: '#dc2626',
    bg: '#ffffff',
    label: 'Error Text (#dc2626) on White',
    requiredRatio: 4.5,
  },
  warningTextOnWarningPill: {
    fg: '#92400e',
    bg: '#fef3c7',
    label: 'Warning Pill Text on Yellow Background',
    requiredRatio: 4.5,
  },
  errorTextOnErrorPill: {
    fg: '#b91c1c',
    bg: '#fee2e2',
    label: 'Error Pill Text on Red Background',
    requiredRatio: 4.5,
  },
  infoTextOnInfoPill: {
    fg: '#0369a1',
    bg: '#e0f2fe',
    label: 'Info Pill Text on Blue Background',
    requiredRatio: 4.5,
  },
};

/**
 * Audits all brand color combinations and returns a verification report.
 *
 * @param {Record<string, { fg: string, bg: string, label: string, requiredRatio: number }>} [palette]
 * @returns {{
 *   total: number,
 *   passed: number,
 *   failed: number,
 *   allCompliant: boolean,
 *   results: Array<{ key: string, label: string, ratio: number, required: number, passes: boolean }>
 * }}
 */
export function auditPaletteContrast(palette = BRAND_ACCESSIBILITY_PALETTE) {
  const keys = Object.keys(palette);
  const results = [];
  let passed = 0;

  keys.forEach((key) => {
    const item = palette[key];
    const check = isContrastCompliant(item.fg, item.bg, 'AA', false);
    const passes = Boolean(check.compliant);
    if (passes) passed += 1;

    results.push({
      key,
      label: item.label,
      ratio: check.ratio || 0,
      required: item.requiredRatio || 4.5,
      passes,
    });
  });

  return {
    total: keys.length,
    passed,
    failed: keys.length - passed,
    allCompliant: passed === keys.length,
    results,
  };
}

/**
 * Validates that an image DOM element satisfies WCAG 1.1.1 Non-text Content:
 * - Must have an `alt` attribute.
 * - If informative, `alt` attribute must be non-empty.
 *
 * @param {HTMLImageElement} imgElement
 * @returns {{ hasAlt: boolean, altText: string, isDecorative: boolean, isValid: boolean }}
 */
export function validateImageAccessibility(imgElement) {
  if (!imgElement) {
    return {
      hasAlt: false,
      altText: '',
      isDecorative: false,
      isValid: false,
    };
  }

  const hasAlt = imgElement.hasAttribute('alt');
  const altText = imgElement.getAttribute('alt') || '';
  const isAriaHidden = imgElement.getAttribute('aria-hidden') === 'true';
  const role = imgElement.getAttribute('role');

  const isDecorative =
    isAriaHidden ||
    role === 'presentation' ||
    role === 'none' ||
    (hasAlt && altText === '');
  const isValid =
    hasAlt || isAriaHidden || role === 'presentation' || role === 'none';

  return {
    hasAlt,
    altText,
    isDecorative,
    isValid,
  };
}

/**
 * Validates that a form control element satisfies WCAG 1.3.1 & 4.1.2:
 * - Has an accessible name (label, aria-label, or aria-labelledby).
 * - Links to helper or error text via aria-describedby when applicable.
 *
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} inputElement
 * @returns {{ hasAccessibleName: boolean, accessibleName: string, isAriaInvalid: boolean, hasAriaDescribedBy: boolean }}
 */
export function validateFormInputAccessibility(inputElement) {
  if (!inputElement) {
    return {
      hasAccessibleName: false,
      accessibleName: '',
      isAriaInvalid: false,
      hasAriaDescribedBy: false,
    };
  }

  const id = inputElement.getAttribute('id');
  const ariaLabel = inputElement.getAttribute('aria-label');
  const ariaLabelledBy = inputElement.getAttribute('aria-labelledby');
  let labelText = '';

  if (ariaLabel) {
    labelText = ariaLabel;
  } else if (ariaLabelledBy && typeof document !== 'undefined') {
    const labellingElement = document.getElementById(ariaLabelledBy);
    if (labellingElement) {
      labelText = labellingElement.textContent?.trim() || '';
    }
  } else if (id && typeof document !== 'undefined') {
    const labelElem = document.querySelector(`label[for="${id}"]`);
    if (labelElem) {
      labelText = labelElem.textContent?.trim() || '';
    }
  }

  const isAriaInvalid = inputElement.getAttribute('aria-invalid') === 'true';
  const hasAriaDescribedBy = Boolean(
    inputElement.getAttribute('aria-describedby')
  );

  return {
    hasAccessibleName: Boolean(labelText),
    accessibleName: labelText,
    isAriaInvalid,
    hasAriaDescribedBy,
  };
}
