import { describe, it, expect } from 'vitest';
import {
  TIMEZONE_LAGOS,
  formatCurrency,
  formatPrice,
  parsePrice,
  formatDate,
  formatDateTime,
  toUtcIso,
  formatNumber,
  formatStock,
  formatRelativeTime,
  formatRating,
} from '../formatters.js';

describe('Formatting Utilities (NFR-USAB-04, NFR-LOC-02, CON-07, DAT-06)', () => {
  describe('formatCurrency', () => {
    it('formats positive integers into Nigerian Naira with thousands separators', () => {
      expect(formatCurrency(2500)).toContain('2,500');
      expect(formatCurrency(1000000)).toContain('1,000,000');
    });

    it('formats zero or invalid amounts safely as ₦0', () => {
      expect(formatCurrency(0)).toContain('0');
      expect(formatCurrency(null)).toBe('₦0');
      expect(formatCurrency(undefined)).toBe('₦0');
      expect(formatCurrency('invalid')).toBe('₦0');
    });

    it('handles decimal kobo amounts when present', () => {
      const formatted = formatCurrency(2500.5);
      expect(formatted).toContain('2,500.50');
    });
  });

  describe('formatPrice', () => {
    it('appends selling unit with standard separator (NFR-USAB-04)', () => {
      expect(formatPrice(2500, 'basket')).toMatch(/2,500\s*\/\s*basket/);
      expect(formatPrice(1200, 'kg')).toMatch(/1,200\s*\/\s*kg/);
    });

    it('cleans redundant "per" or leading slashes from units', () => {
      expect(formatPrice(500, 'per bunch')).toMatch(/500\s*\/\s*bunch/);
      expect(formatPrice(3000, '/ bag')).toMatch(/3,000\s*\/\s*bag/);
    });

    it('returns raw currency if unit is omitted', () => {
      expect(formatPrice(2500)).toContain('2,500');
    });
  });

  describe('parsePrice', () => {
    it('parses formatted currency strings back into float numbers', () => {
      expect(parsePrice('₦2,500.50')).toBe(2500.5);
      expect(parsePrice('₦1,000,000')).toBe(1000000);
      expect(parsePrice(1500)).toBe(1500);
      expect(parsePrice('')).toBe(0);
      expect(parsePrice(null)).toBe(0);
    });
  });

  describe('formatDate and formatDateTime (WAT / Africa/Lagos)', () => {
    it('verifies timezone constant is Africa/Lagos', () => {
      expect(TIMEZONE_LAGOS).toBe('Africa/Lagos');
    });

    it('formats ISO timestamps into Nigerian locale date format', () => {
      const formatted = formatDate('2026-03-15T10:30:00Z');
      expect(formatted).toContain('2026');
      expect(formatted).toMatch(/Mar|March/);
    });

    it('formats date and time with WAT timezone indicator', () => {
      const formatted = formatDateTime('2026-03-15T10:30:00Z');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('WAT');
    });

    it('returns empty string for invalid date input', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate('invalid-date')).toBe('');
      expect(formatDateTime('')).toBe('');
    });
  });

  describe('toUtcIso', () => {
    it('converts date to standard UTC ISO 8601 string (DAT-06)', () => {
      const utcString = toUtcIso(new Date('2026-09-25T14:00:00Z'));
      expect(utcString).toBe('2026-09-25T14:00:00.000Z');
    });
  });

  describe('formatNumber and formatStock', () => {
    it('formats numbers with comma thousands separators', () => {
      expect(formatNumber(12500)).toBe('12,500');
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber('invalid')).toBe('0');
    });

    it('formats stock quantity with unit', () => {
      expect(formatStock(45, 'bunches')).toBe('45 bunches');
      expect(formatStock(100)).toBe('100 units');
    });
  });

  describe('formatRelativeTime', () => {
    it('handles recent timestamps', () => {
      expect(formatRelativeTime(new Date().toISOString())).toBe('Just now');
      expect(formatRelativeTime(null)).toBe('');
      expect(formatRelativeTime('invalid')).toBe('');
    });

    it('formats minutes and hours ago accurately', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');

      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000
      ).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });
  });

  describe('formatRating (REV-01)', () => {
    it('formats numeric ratings with one decimal place', () => {
      expect(formatRating(4.5)).toBe('4.5');
      expect(formatRating(5)).toBe('5.0');
      expect(formatRating(3)).toBe('3.0');
    });

    it('clamps values exceeding 5.0 to 5.0', () => {
      expect(formatRating(5.8)).toBe('5.0');
      expect(formatRating(10)).toBe('5.0');
    });

    it('returns "No ratings yet" for unrated, 0, or invalid input', () => {
      expect(formatRating(null)).toBe('No ratings yet');
      expect(formatRating(undefined)).toBe('No ratings yet');
      expect(formatRating(0)).toBe('No ratings yet');
      expect(formatRating(-1)).toBe('No ratings yet');
      expect(formatRating('')).toBe('No ratings yet');
      expect(formatRating('abc')).toBe('No ratings yet');
    });
  });
});
