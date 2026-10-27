/**
 * UUID Generation & Validation Utilities
 *
 * SRS References:
 * - NFR-REL-04: Order submission shall be idempotent so double-clicks or retries
 *   cannot create duplicate orders.
 * - CHK-05: When cart items belong to several sellers, the system shall create one
 *   order per seller, linked by a shared checkout reference (UUID).
 * - Database Schema: `orders.checkout_ref CHAR(36) NOT NULL` (indexed, client-generated UUID).
 */

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generates an RFC 4122 Version 4 UUID string.
 * Uses the Web Cryptography API (`crypto.randomUUID`) when available,
 * with a cryptographically sound fallback for environments lacking native support.
 *
 * @returns {string} 36-character lowercase UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    try {
      return crypto.randomUUID().toLowerCase();
    } catch {
      // Fall through to manual generation if crypto.randomUUID fails
    }
  }

  // Fallback: RFC 4122 v4 using crypto.getRandomValues if present, else Math.random
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version 4 bits (0100 in high nibble of byte 6)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Set variant bits (10 in high bits of byte 8)
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      ''
    );
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  // Math.random fallback (e.g., minimal test environments without crypto)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks whether a given string is a valid RFC 4122 UUID (v4 or standard format).
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isValidUUID(str) {
  if (typeof str !== 'string' || str.length !== 36) {
    return false;
  }
  return UUID_V4_REGEX.test(str);
}

/**
 * Generates a checkout reference UUID for grouping multi-seller orders and ensuring idempotency.
 * Satisfies CHK-05, NFR-REL-04, and Database Schema `orders.checkout_ref CHAR(36)`.
 *
 * @returns {string} 36-character UUID string.
 */
export function generateCheckoutRef() {
  return generateUUID();
}
