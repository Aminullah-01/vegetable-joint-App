/**
 * Form Validation Utilities
 *
 * SRS References:
 * - AUTH-01: Name, email address, phone number, password.
 * - AUTH-08: Enforce unique email addresses and minimum password length of 8 characters containing letters and digits.
 * - UI-05: Simple forms with inline validation, helpful error messages, and disabled state during submission.
 */

/**
 * Standard email format regex matching RFC 5322 simplified pattern.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone number regex matching local and international numbers (Nigerian e.g. 080..., +234...).
 */
export const PHONE_REGEX = /^\+?[0-9\s-]{10,18}$/;

/**
 * Validates a user's full name.
 *
 * @param {string} name
 * @returns {string|null} Error message or null if valid.
 */
export function validateName(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Full name is required.';
  }
  if (name.trim().length < 2) {
    return 'Full name must be at least 2 characters.';
  }
  return null;
}

/**
 * Validates an email address format.
 *
 * @param {string} email
 * @returns {string|null} Error message or null if valid.
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return 'Email address is required.';
  }
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

/**
 * Validates a phone number.
 *
 * @param {string} phone
 * @param {boolean} [required=true]
 * @returns {string|null} Error message or null if valid.
 */
export function validatePhone(phone, required = true) {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return required ? 'Phone number is required.' : null;
  }
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (!PHONE_REGEX.test(phone.trim()) || digitsOnly.length < 10) {
    return 'Please enter a valid phone number (at least 10 digits).';
  }
  return null;
}

/**
 * Evaluates password criteria per AUTH-08 (≥ 8 chars, containing letters and digits).
 *
 * @param {string} password
 * @returns {{
 *   hasMinLength: boolean,
 *   hasLetter: boolean,
 *   hasDigit: boolean,
 *   isValid: boolean
 * }}
 */
export function getPasswordCriteria(password = '') {
  const pwd = String(password || '');
  const hasMinLength = pwd.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);

  return {
    hasMinLength,
    hasLetter,
    hasDigit,
    isValid: hasMinLength && hasLetter && hasDigit,
  };
}

/**
 * Validates a password against AUTH-08 rules.
 *
 * @param {string} password
 * @returns {string|null} Error message or null if valid.
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  const criteria = getPasswordCriteria(password);
  if (!criteria.hasMinLength) {
    return 'Password must be at least 8 characters.';
  }
  if (!criteria.hasLetter || !criteria.hasDigit) {
    return 'Password must contain both letters and digits.';
  }
  return null;
}

/**
 * Validates password confirmation match.
 *
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {string|null} Error message or null if valid.
 */
export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}
