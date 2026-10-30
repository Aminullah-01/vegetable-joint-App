import { describe, it, expect } from 'vitest';
import { isLowStock, isOutOfStock, getStockStatus } from '../stock.js';
import {
  IMAGE_BUDGETS,
  isValidImageUrl,
  parseAspectRatio,
  getOptimizedImageUrl,
  validateProductImage,
  formatFileSize,
} from '../image.js';

describe('Stock & Image Utilities (SEL-05, SEL-07, SEL-09, NFR-PERF-03, A-08, A-09)', () => {
  describe('Stock Utilities (SEL-07, SEL-09, BR-01, TC-21)', () => {
    describe('isLowStock (SEL-09, A-09)', () => {
      it('returns true when quantity is strictly positive and <= threshold (default 5)', () => {
        expect(isLowStock(1)).toBe(true);
        expect(isLowStock(3)).toBe(true);
        expect(isLowStock(5)).toBe(true);
        expect(isLowStock('4')).toBe(true);
      });

      it('respects configurable custom per-product threshold (A-09)', () => {
        expect(isLowStock(8, 10)).toBe(true);
        expect(isLowStock(10, 10)).toBe(true);
        expect(isLowStock(11, 10)).toBe(false);
      });

      it('returns false when quantity is greater than threshold', () => {
        expect(isLowStock(6, 5)).toBe(false);
        expect(isLowStock(100, 5)).toBe(false);
      });

      it('returns false when quantity is zero, negative, or invalid', () => {
        expect(isLowStock(0)).toBe(false);
        expect(isLowStock(-2)).toBe(false);
        expect(isLowStock('not-a-number')).toBe(false);
      });
    });

    describe('isOutOfStock (SEL-07, BR-01, TC-21)', () => {
      it('returns true when quantity is 0 or negative', () => {
        expect(isOutOfStock(0)).toBe(true);
        expect(isOutOfStock('0')).toBe(true);
        expect(isOutOfStock(-1)).toBe(true);
        expect(isOutOfStock('invalid')).toBe(true);
      });

      it('returns false when quantity is positive', () => {
        expect(isOutOfStock(1)).toBe(false);
        expect(isOutOfStock(25)).toBe(false);
      });
    });

    describe('getStockStatus (SEL-07, SEL-09, BR-01)', () => {
      it('returns "unavailable" when seller marks produce unavailable regardless of stock', () => {
        expect(getStockStatus(100, 5, 'unavailable')).toBe('unavailable');
        expect(getStockStatus(50, 5, false)).toBe('unavailable');
      });

      it('returns "out_of_stock" when quantity is 0 or negative', () => {
        expect(getStockStatus(0, 5, 'available')).toBe('out_of_stock');
        expect(getStockStatus(-3, 5, true)).toBe('out_of_stock');
      });

      it('returns "low_stock" when quantity is between 1 and threshold', () => {
        expect(getStockStatus(3, 5, 'available')).toBe('low_stock');
        expect(getStockStatus(5, 5, 'available')).toBe('low_stock');
      });

      it('returns "in_stock" when quantity exceeds threshold', () => {
        expect(getStockStatus(15, 5, 'available')).toBe('in_stock');
      });
    });
  });

  describe('Image Utilities (SEL-05, NFR-PERF-03, A-08)', () => {
    it('defines standard budget constants', () => {
      expect(IMAGE_BUDGETS.THUMBNAIL_MAX_KB).toBe(100);
      expect(IMAGE_BUDGETS.DETAIL_MAX_KB).toBe(300);
      expect(IMAGE_BUDGETS.UPLOAD_MAX_MB).toBe(2);
      expect(IMAGE_BUDGETS.UPLOAD_MAX_BYTES).toBe(2 * 1024 * 1024);
      expect(IMAGE_BUDGETS.ALLOWED_MIME_TYPES).toEqual([
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);
    });

    describe('isValidImageUrl', () => {
      it('returns false for empty, null, undefined, or whitespace', () => {
        expect(isValidImageUrl('')).toBe(false);
        expect(isValidImageUrl('   ')).toBe(false);
        expect(isValidImageUrl(null)).toBe(false);
        expect(isValidImageUrl(undefined)).toBe(false);
      });

      it('rejects javascript: pseudo-protocol URIs for security', () => {
        expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
        expect(isValidImageUrl('JAVASCRIPT:void(0)')).toBe(false);
      });

      it('returns true for valid image sources and paths', () => {
        expect(isValidImageUrl('https://example.com/images/tomato.jpg')).toBe(
          true
        );
        expect(isValidImageUrl('/images/peppers.webp')).toBe(true);
        expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(
          true
        );
      });
    });

    describe('parseAspectRatio', () => {
      it('returns undefined for auto or empty ratio', () => {
        expect(parseAspectRatio('auto')).toBeUndefined();
        expect(parseAspectRatio('')).toBeUndefined();
        expect(parseAspectRatio(undefined)).toBeUndefined();
        expect(parseAspectRatio(-1)).toBeUndefined();
      });

      it('parses numeric ratios', () => {
        expect(parseAspectRatio(1.5)).toBe('1.5');
        expect(parseAspectRatio(1)).toBe('1');
      });

      it('parses fractional ratio strings', () => {
        expect(parseAspectRatio('4/3')).toBe('4/3');
        expect(parseAspectRatio('16 / 9')).toBe('16/9');
        expect(parseAspectRatio('1.33')).toBe('1.33');
      });

      it('returns undefined for malformed ratio strings', () => {
        expect(parseAspectRatio('invalid-ratio')).toBeUndefined();
      });
    });

    describe('getOptimizedImageUrl (NFR-PERF-03)', () => {
      it('returns empty string if URL is invalid', () => {
        expect(getOptimizedImageUrl('')).toBe('');
        expect(getOptimizedImageUrl(null)).toBe('');
      });

      it('returns original URL if no resize or quality options provided', () => {
        const url = 'https://example.com/tomatoes.jpg';
        expect(getOptimizedImageUrl(url, {})).toBe(url);
      });

      it('appends width, height, and quality parameters to full HTTP URLs', () => {
        const url = 'https://example.com/carrots.jpg';
        const optimized = getOptimizedImageUrl(url, {
          width: 300,
          height: 200,
          quality: 80,
        });
        expect(optimized).toContain('w=300');
        expect(optimized).toContain('h=200');
        expect(optimized).toContain('q=80');
      });

      it('returns original URL for relative paths', () => {
        const relativeUrl = '/assets/spinach.jpg';
        expect(getOptimizedImageUrl(relativeUrl, { width: 100 })).toBe(
          relativeUrl
        );
      });
    });

    describe('validateProductImage (SEL-05, A-08)', () => {
      it('returns null when file is optional / null', () => {
        expect(validateProductImage(null)).toBeNull();
        expect(validateProductImage(undefined)).toBeNull();
      });

      it('rejects unsupported MIME types (PDF, GIF, SVG)', () => {
        const pdfFile = { type: 'application/pdf', size: 500000 };
        expect(validateProductImage(pdfFile)).toBe(
          'Image must be in JPEG, PNG, or WebP format (SEL-05).'
        );

        const gifFile = { type: 'image/gif', size: 500000 };
        expect(validateProductImage(gifFile)).toBe(
          'Image must be in JPEG, PNG, or WebP format (SEL-05).'
        );
      });

      it('rejects files exceeding the 2 MB budget (SEL-05, A-08)', () => {
        const oversized = { type: 'image/jpeg', size: 3 * 1024 * 1024 }; // 3 MB
        expect(validateProductImage(oversized)).toBe(
          'Image file size must not exceed 2 MB (SEL-05).'
        );
      });

      it('returns null for valid images within the 2 MB budget', () => {
        const validJpeg = { type: 'image/jpeg', size: 1024 * 1024 };
        const validPng = { type: 'image/png', size: 500 * 1024 };
        const validWebp = { type: 'image/webp', size: 250 * 1024 };

        expect(validateProductImage(validJpeg)).toBeNull();
        expect(validateProductImage(validPng)).toBeNull();
        expect(validateProductImage(validWebp)).toBeNull();
      });
    });

    describe('formatFileSize', () => {
      it('formats byte counts cleanly', () => {
        expect(formatFileSize(500)).toBe('500 B');
        expect(formatFileSize(1024)).toBe('1.0 KB');
        expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
      });
    });
  });
});
