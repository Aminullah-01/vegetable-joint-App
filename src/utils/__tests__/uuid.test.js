import { describe, it, expect } from 'vitest';
import { generateUUID, isValidUUID, generateCheckoutRef } from '../uuid.js';

describe('UUID Utilities (FE-075 / NFR-REL-04, CHK-05)', () => {
  it('generates a valid 36-character RFC 4122 Version 4 UUID string', () => {
    const uuid = generateUUID();
    expect(uuid).toHaveLength(36);
    expect(isValidUUID(uuid)).toBe(true);
    // Version 4 check: character at index 14 must be '4'
    expect(uuid[14]).toBe('4');
    // Variant check: character at index 19 must be '8', '9', 'a', or 'b'
    expect(['8', '9', 'a', 'b']).toContain(uuid[19].toLowerCase());
  });

  it('validates RFC 4122 UUID strings accurately', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBe(true);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716-44665544000')).toBe(false); // 35 chars
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(12345)).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });

  it('generates unique checkout references across multiple calls', () => {
    const set = new Set();
    for (let i = 0; i < 50; i++) {
      const ref = generateCheckoutRef();
      expect(isValidUUID(ref)).toBe(true);
      set.add(ref);
    }
    expect(set.size).toBe(50);
  });
});
