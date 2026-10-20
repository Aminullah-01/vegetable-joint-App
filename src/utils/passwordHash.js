/**
 * Mock password hashing helpers (front-end mock mode only).
 *
 * In production the Laravel backend stores salted bcrypt/Argon2 hashes and
 * verifies them server-side (SRS NFR-SEC-01, AUTH-04). This in-browser mock
 * substitutes a small deterministic one-way digest so that:
 *   - plaintext passwords are never stored on seeded demo accounts, and
 *   - hashed credentials are never returned in API-shaped responses.
 *
 * This is intentionally NOT cryptographically secure and must never be used
 * outside the mock data layer.
 */

const MOCK_SALT = 'vegetable-joint::mock::v1';

/**
 * Deterministically derive a non-reversible mock digest for a password.
 *
 * @param {string} password - Plaintext password supplied by the user.
 * @returns {string} Mock digest string prefixed with `mock$`.
 */
export function hashPassword(password) {
  const input = `${MOCK_SALT}:${String(password ?? '')}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ code, 0x85ebca6b) + i) >>> 0;
  }

  return `mock$${h1.toString(16).padStart(8, '0')}${h2
    .toString(16)
    .padStart(8, '0')}`;
}

/**
 * Verify a plaintext password against a mock digest.
 *
 * @param {string} password - Plaintext password supplied by the user.
 * @param {string} hash - Stored mock digest.
 * @returns {boolean} True when the password matches the digest.
 */
export function verifyPassword(password, hash) {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  return hashPassword(password) === hash;
}

export default hashPassword;
