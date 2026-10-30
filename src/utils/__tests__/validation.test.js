import { describe, it, expect } from 'vitest';
import {
  EMAIL_REGEX,
  PHONE_REGEX,
  validateName,
  validateEmail,
  validatePhone,
  getPasswordCriteria,
  validatePassword,
  validateConfirmPassword,
  validateBusinessName,
  validateLocation,
  validateDescription,
  validateStreetAddress,
  validateTownArea,
  validateState,
  validateDeliveryNotes,
} from '../validation.js';

describe('Validation Utilities (AUTH-01, AUTH-08, UI-05, CHK-02)', () => {
  describe('Regular Expressions', () => {
    it('defines EMAIL_REGEX matching standard email addresses', () => {
      expect(EMAIL_REGEX.test('user@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('invalid-email')).toBe(false);
    });

    it('defines PHONE_REGEX matching Nigerian and international phone formats', () => {
      expect(PHONE_REGEX.test('08012345678')).toBe(true);
      expect(PHONE_REGEX.test('+2348012345678')).toBe(true);
      expect(PHONE_REGEX.test('123')).toBe(false);
    });
  });

  describe('validateName (AUTH-01, UI-05)', () => {
    it('returns error when name is empty, null, undefined, or whitespace', () => {
      expect(validateName('')).toBe('Full name is required.');
      expect(validateName('   ')).toBe('Full name is required.');
      expect(validateName(null)).toBe('Full name is required.');
      expect(validateName(undefined)).toBe('Full name is required.');
      expect(validateName(123)).toBe('Full name is required.');
    });

    it('returns error when trimmed name is shorter than 2 characters', () => {
      expect(validateName('A')).toBe(
        'Full name must be at least 2 characters.'
      );
      expect(validateName(' B ')).toBe(
        'Full name must be at least 2 characters.'
      );
    });

    it('returns null for valid names', () => {
      expect(validateName('Amina Bello')).toBeNull();
      expect(validateName('Chidi Okafor')).toBeNull();
      expect(validateName('  Aliyu Musa  ')).toBeNull();
    });
  });

  describe('validateEmail (AUTH-01, AUTH-08, UI-05)', () => {
    it('returns error when email is empty, null, undefined, or whitespace', () => {
      expect(validateEmail('')).toBe('Email address is required.');
      expect(validateEmail('   ')).toBe('Email address is required.');
      expect(validateEmail(null)).toBe('Email address is required.');
      expect(validateEmail(undefined)).toBe('Email address is required.');
      expect(validateEmail(456)).toBe('Email address is required.');
    });

    it('returns error for invalid email formats', () => {
      expect(validateEmail('not-an-email')).toBe(
        'Please enter a valid email address.'
      );
      expect(validateEmail('user@')).toBe(
        'Please enter a valid email address.'
      );
      expect(validateEmail('@domain.com')).toBe(
        'Please enter a valid email address.'
      );
      expect(validateEmail('user@domain')).toBe(
        'Please enter a valid email address.'
      );
      expect(validateEmail('user @domain.com')).toBe(
        'Please enter a valid email address.'
      );
    });

    it('returns null for valid email addresses', () => {
      expect(validateEmail('buyer@example.com')).toBeNull();
      expect(validateEmail('seller.green@farm.ng')).toBeNull();
      expect(validateEmail('user+tag@domain.co.uk')).toBeNull();
      expect(validateEmail('  trimmed@example.com  ')).toBeNull();
    });
  });

  describe('validatePhone (AUTH-01, UI-05)', () => {
    it('handles required vs optional phone numbers when empty', () => {
      expect(validatePhone('', true)).toBe('Phone number is required.');
      expect(validatePhone('   ', true)).toBe('Phone number is required.');
      expect(validatePhone(null, true)).toBe('Phone number is required.');
      expect(validatePhone('', false)).toBeNull();
      expect(validatePhone(null, false)).toBeNull();
    });

    it('returns error for phone numbers with less than 10 digits', () => {
      expect(validatePhone('12345')).toBe(
        'Please enter a valid phone number (at least 10 digits).'
      );
      expect(validatePhone('080123')).toBe(
        'Please enter a valid phone number (at least 10 digits).'
      );
      expect(validatePhone('abcdefghijk')).toBe(
        'Please enter a valid phone number (at least 10 digits).'
      );
    });

    it('returns null for valid Nigerian and international phone numbers', () => {
      expect(validatePhone('08012345678')).toBeNull();
      expect(validatePhone('+2348012345678')).toBeNull();
      expect(validatePhone('080-1234-5678')).toBeNull();
      expect(validatePhone('+234 801 234 5678')).toBeNull();
      expect(validatePhone('+15551234567')).toBeNull();
    });
  });

  describe('getPasswordCriteria (AUTH-08)', () => {
    it('evaluates null or empty password correctly', () => {
      expect(getPasswordCriteria('')).toEqual({
        hasMinLength: false,
        hasLetter: false,
        hasDigit: false,
        isValid: false,
      });
      expect(getPasswordCriteria(null)).toEqual({
        hasMinLength: false,
        hasLetter: false,
        hasDigit: false,
        isValid: false,
      });
    });

    it('identifies missing length (< 8 chars)', () => {
      const res = getPasswordCriteria('Pass1');
      expect(res.hasMinLength).toBe(false);
      expect(res.hasLetter).toBe(true);
      expect(res.hasDigit).toBe(true);
      expect(res.isValid).toBe(false);
    });

    it('identifies missing digits (letters only)', () => {
      const res = getPasswordCriteria('PasswordOnly');
      expect(res.hasMinLength).toBe(true);
      expect(res.hasLetter).toBe(true);
      expect(res.hasDigit).toBe(false);
      expect(res.isValid).toBe(false);
    });

    it('identifies missing letters (digits only)', () => {
      const res = getPasswordCriteria('12345678');
      expect(res.hasMinLength).toBe(true);
      expect(res.hasLetter).toBe(false);
      expect(res.hasDigit).toBe(true);
      expect(res.isValid).toBe(false);
    });

    it('returns isValid: true when all AUTH-08 criteria are met', () => {
      const res = getPasswordCriteria('SecurePass123');
      expect(res.hasMinLength).toBe(true);
      expect(res.hasLetter).toBe(true);
      expect(res.hasDigit).toBe(true);
      expect(res.isValid).toBe(true);
    });
  });

  describe('validatePassword (AUTH-08)', () => {
    it('returns error when password is empty or non-string', () => {
      expect(validatePassword('')).toBe('Password is required.');
      expect(validatePassword(null)).toBe('Password is required.');
      expect(validatePassword(undefined)).toBe('Password is required.');
      expect(validatePassword(12345678)).toBe('Password is required.');
    });

    it('returns error when password is under 8 characters', () => {
      expect(validatePassword('Pass1')).toBe(
        'Password must be at least 8 characters.'
      );
    });

    it('returns error when password lacks letters or digits', () => {
      expect(validatePassword('abcdefghijk')).toBe(
        'Password must contain both letters and digits.'
      );
      expect(validatePassword('1234567890')).toBe(
        'Password must contain both letters and digits.'
      );
    });

    it('returns null for valid passwords meeting AUTH-08', () => {
      expect(validatePassword('FreshVegetables2026')).toBeNull();
      expect(validatePassword('Secure123')).toBeNull();
    });
  });

  describe('validateConfirmPassword', () => {
    it('returns error when confirmPassword is empty', () => {
      expect(validateConfirmPassword('SecurePass1', '')).toBe(
        'Please confirm your password.'
      );
      expect(validateConfirmPassword('SecurePass1', null)).toBe(
        'Please confirm your password.'
      );
    });

    it('returns error when passwords do not match', () => {
      expect(validateConfirmPassword('SecurePass1', 'DifferentPass2')).toBe(
        'Passwords do not match.'
      );
    });

    it('returns null when passwords match identically', () => {
      expect(validateConfirmPassword('SecurePass1', 'SecurePass1')).toBeNull();
    });
  });

  describe('validateBusinessName (AUTH-02)', () => {
    it('returns error when empty, null, or whitespace', () => {
      expect(validateBusinessName('')).toBe(
        'Business or Farm name is required.'
      );
      expect(validateBusinessName('   ')).toBe(
        'Business or Farm name is required.'
      );
      expect(validateBusinessName(null)).toBe(
        'Business or Farm name is required.'
      );
      expect(validateBusinessName(123)).toBe(
        'Business or Farm name is required.'
      );
    });

    it('returns error when shorter than 2 characters', () => {
      expect(validateBusinessName('F')).toBe(
        'Business name must be at least 2 characters.'
      );
    });

    it('returns error when exceeding 150 characters', () => {
      const longName = 'A'.repeat(151);
      expect(validateBusinessName(longName)).toBe(
        'Business name cannot exceed 150 characters.'
      );
    });

    it('returns null for valid business names', () => {
      expect(validateBusinessName('Green Harvest Farms')).toBeNull();
      expect(validateBusinessName('Plateau Fresh Veggies')).toBeNull();
    });
  });

  describe('validateLocation (AUTH-02, SRCH-03)', () => {
    it('returns error when location is empty, null, or whitespace', () => {
      expect(validateLocation('')).toBe('Farm or stall location is required.');
      expect(validateLocation('   ')).toBe(
        'Farm or stall location is required.'
      );
      expect(validateLocation(null)).toBe(
        'Farm or stall location is required.'
      );
      expect(validateLocation(789)).toBe('Farm or stall location is required.');
    });

    it('returns error when location is under 2 characters', () => {
      expect(validateLocation('L')).toBe(
        'Location must be at least 2 characters.'
      );
    });

    it('returns error when location exceeds 150 characters', () => {
      const longLocation = 'L'.repeat(151);
      expect(validateLocation(longLocation)).toBe(
        'Location cannot exceed 150 characters.'
      );
    });

    it('returns null for valid locations', () => {
      expect(validateLocation('Jos North, Plateau State')).toBeNull();
      expect(validateLocation('Mile 12 Market, Lagos')).toBeNull();
    });
  });

  describe('validateDescription (AUTH-02)', () => {
    it('returns null for optional/empty descriptions', () => {
      expect(validateDescription('')).toBeNull();
      expect(validateDescription(null)).toBeNull();
      expect(validateDescription(undefined)).toBeNull();
    });

    it('returns error when description exceeds 1000 characters', () => {
      const longDesc = 'D'.repeat(1001);
      expect(validateDescription(longDesc)).toBe(
        'Description cannot exceed 1000 characters.'
      );
    });

    it('returns null for valid descriptions within limits', () => {
      expect(
        validateDescription(
          'Fresh organic farm produce sourced directly from Jos.'
        )
      ).toBeNull();
    });
  });

  describe('validateStreetAddress (CHK-02)', () => {
    it('returns error when empty, null, or whitespace', () => {
      expect(validateStreetAddress('')).toBe(
        'Street address or landmark is required.'
      );
      expect(validateStreetAddress('   ')).toBe(
        'Street address or landmark is required.'
      );
      expect(validateStreetAddress(null)).toBe(
        'Street address or landmark is required.'
      );
      expect(validateStreetAddress(999)).toBe(
        'Street address or landmark is required.'
      );
    });

    it('returns error when under 3 characters', () => {
      expect(validateStreetAddress('Ab')).toBe(
        'Street address must be at least 3 characters.'
      );
    });

    it('returns error when exceeding 200 characters', () => {
      const longStreet = 'S'.repeat(201);
      expect(validateStreetAddress(longStreet)).toBe(
        'Street address cannot exceed 200 characters.'
      );
    });

    it('returns null for valid street addresses', () => {
      expect(
        validateStreetAddress('Plot 14 Farm Road, Opposite First Bank')
      ).toBeNull();
    });
  });

  describe('validateTownArea (CHK-02)', () => {
    it('returns error when empty, null, or whitespace', () => {
      expect(validateTownArea('')).toBe('Town or area is required.');
      expect(validateTownArea('   ')).toBe('Town or area is required.');
      expect(validateTownArea(null)).toBe('Town or area is required.');
      expect(validateTownArea(123)).toBe('Town or area is required.');
    });

    it('returns error when under 2 characters', () => {
      expect(validateTownArea('T')).toBe(
        'Town or area must be at least 2 characters.'
      );
    });

    it('returns error when exceeding 100 characters', () => {
      const longTown = 'T'.repeat(101);
      expect(validateTownArea(longTown)).toBe(
        'Town or area cannot exceed 100 characters.'
      );
    });

    it('returns null for valid towns', () => {
      expect(validateTownArea('Maitama')).toBeNull();
      expect(validateTownArea('Ikeja')).toBeNull();
    });
  });

  describe('validateState (CHK-02)', () => {
    it('returns error when empty, null, or whitespace', () => {
      expect(validateState('')).toBe('State is required.');
      expect(validateState('   ')).toBe('State is required.');
      expect(validateState(null)).toBe('State is required.');
      expect(validateState(123)).toBe('State is required.');
    });

    it('returns error when exceeding 100 characters', () => {
      const longState = 'S'.repeat(101);
      expect(validateState(longState)).toBe(
        'State cannot exceed 100 characters.'
      );
    });

    it('returns null for valid states', () => {
      expect(validateState('Lagos')).toBeNull();
      expect(validateState('Plateau')).toBeNull();
      expect(validateState('FCT (Abuja)')).toBeNull();
    });
  });

  describe('validateDeliveryNotes (CHK-02)', () => {
    it('returns null when notes are empty, null, or undefined', () => {
      expect(validateDeliveryNotes('')).toBeNull();
      expect(validateDeliveryNotes(null)).toBeNull();
      expect(validateDeliveryNotes(undefined)).toBeNull();
    });

    it('returns error when delivery notes exceed 500 characters', () => {
      const longNotes = 'N'.repeat(501);
      expect(validateDeliveryNotes(longNotes)).toBe(
        'Delivery notes cannot exceed 500 characters.'
      );
    });

    it('returns null for valid delivery notes', () => {
      expect(
        validateDeliveryNotes('Leave package with gate security.')
      ).toBeNull();
    });
  });
});
