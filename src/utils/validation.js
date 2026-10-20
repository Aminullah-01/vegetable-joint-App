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

/**
 * Validates a seller's business or farm name (AUTH-02).
 *
 * @param {string} businessName
 * @returns {string|null} Error message or null if valid.
 */
export function validateBusinessName(businessName) {
  if (
    !businessName ||
    typeof businessName !== 'string' ||
    !businessName.trim()
  ) {
    return 'Business or Farm name is required.';
  }
  if (businessName.trim().length < 2) {
    return 'Business name must be at least 2 characters.';
  }
  if (businessName.trim().length > 150) {
    return 'Business name cannot exceed 150 characters.';
  }
  return null;
}

/**
 * Validates a seller's farm or stall location (AUTH-02, SRCH-03).
 *
 * @param {string} location
 * @returns {string|null} Error message or null if valid.
 */
export function validateLocation(location) {
  if (!location || typeof location !== 'string' || !location.trim()) {
    return 'Farm or stall location is required.';
  }
  if (location.trim().length < 2) {
    return 'Location must be at least 2 characters.';
  }
  if (location.trim().length > 150) {
    return 'Location cannot exceed 150 characters.';
  }
  return null;
}

/**
 * Validates a seller description (AUTH-02).
 *
 * @param {string} description
 * @returns {string|null} Error message or null if valid.
 */
export function validateDescription(description) {
  if (!description) return null;
  if (typeof description === 'string' && description.length > 1000) {
    return 'Description cannot exceed 1000 characters.';
  }
  return null;
}

/**
 * Validates a delivery street address / landmark line (CHK-02).
 *
 * @param {string} street
 * @returns {string|null} Error message or null if valid.
 */
export function validateStreetAddress(street) {
  if (!street || typeof street !== 'string' || !street.trim()) {
    return 'Street address or landmark is required.';
  }
  const trimmed = street.trim();
  if (trimmed.length < 3) {
    return 'Street address must be at least 3 characters.';
  }
  if (trimmed.length > 200) {
    return 'Street address cannot exceed 200 characters.';
  }
  return null;
}

/**
 * Validates a delivery town / area (CHK-02).
 *
 * @param {string} town
 * @returns {string|null} Error message or null if valid.
 */
export function validateTownArea(town) {
  if (!town || typeof town !== 'string' || !town.trim()) {
    return 'Town or area is required.';
  }
  const trimmed = town.trim();
  if (trimmed.length < 2) {
    return 'Town or area must be at least 2 characters.';
  }
  if (trimmed.length > 100) {
    return 'Town or area cannot exceed 100 characters.';
  }
  return null;
}

/**
 * Validates a delivery state (CHK-02).
 *
 * @param {string} state
 * @returns {string|null} Error message or null if valid.
 */
export function validateState(state) {
  if (!state || typeof state !== 'string' || !state.trim()) {
    return 'State is required.';
  }
  if (state.trim().length > 100) {
    return 'State cannot exceed 100 characters.';
  }
  return null;
}

/**
 * Validates optional delivery notes (CHK-02).
 *
 * @param {string} notes
 * @returns {string|null} Error message or null if valid.
 */
export function validateDeliveryNotes(notes) {
  if (!notes) return null;
  if (typeof notes === 'string' && notes.length > 500) {
    return 'Delivery notes cannot exceed 500 characters.';
  }
  return null;
}
