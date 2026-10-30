import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../passwordHash.js';
import {
  CONFIRM_DIALOG_VARIANTS,
  getFocusableElements,
  handleTabFocusTrap,
} from '../modal.js';
import { env } from '../env.js';
import { isOriginAllowed } from '../origin.js';
import { resolveRef, validateAgainstSchema } from '../schemaValidator.js';

describe('Remaining Utilities: PasswordHash, Modal, Env, SchemaValidator', () => {
  describe('Password Hashing Utility (passwordHash.js, AUTH-04, NFR-SEC-01)', () => {
    it('generates deterministic mock hash starting with mock$', () => {
      const hash1 = hashPassword('MySecret123');
      const hash2 = hashPassword('MySecret123');
      expect(hash1).toMatch(/^mock\$[0-9a-f]{16}$/);
      expect(hash1).toBe(hash2);
    });

    it('generates distinct hashes for different passwords', () => {
      const hashA = hashPassword('PasswordA1');
      const hashB = hashPassword('PasswordB2');
      expect(hashA).not.toBe(hashB);
    });

    it('handles null, undefined, or empty password string', () => {
      const emptyHash = hashPassword('');
      expect(emptyHash).toMatch(/^mock\$/);
      const nullHash = hashPassword(null);
      expect(nullHash).toMatch(/^mock\$/);
    });

    it('verifies passwords accurately with verifyPassword', () => {
      const hash = hashPassword('ValidPass123');
      expect(verifyPassword('ValidPass123', hash)).toBe(true);
      expect(verifyPassword('WrongPass456', hash)).toBe(false);
      expect(verifyPassword('ValidPass123', '')).toBe(false);
      expect(verifyPassword('ValidPass123', null)).toBe(false);
      expect(verifyPassword('ValidPass123', undefined)).toBe(false);
    });
  });

  describe('Modal and Focus Trapping (modal.js, NFR-USAB-02)', () => {
    it('defines standard confirm dialog variants', () => {
      expect(CONFIRM_DIALOG_VARIANTS).toEqual({
        DANGER: 'danger',
        WARNING: 'warning',
        PRIMARY: 'primary',
        INFO: 'info',
      });
    });

    it('queries focusable elements and excludes disabled or aria-hidden elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <a href="#link" id="link1">Link</a>
        <button id="btn1">Active Button</button>
        <button disabled id="btn2">Disabled Button</button>
        <input type="text" id="input1" />
        <input type="hidden" id="hidden1" />
        <div aria-hidden="true">
          <button id="btnHidden">Hidden Button</button>
        </div>
        <select id="select1"><option>1</option></select>
        <textarea id="textarea1"></textarea>
        <div tabindex="0" id="tabdiv">Tabable</div>
        <div tabindex="-1" id="notab">Not Tabable</div>
      `;
      document.body.appendChild(container);

      const focusable = getFocusableElements(container);
      const ids = focusable.map((el) => el.id);

      expect(ids).toContain('link1');
      expect(ids).toContain('btn1');
      expect(ids).toContain('input1');
      expect(ids).toContain('select1');
      expect(ids).toContain('textarea1');
      expect(ids).toContain('tabdiv');

      expect(ids).not.toContain('btn2'); // disabled
      expect(ids).not.toContain('hidden1'); // type="hidden"
      expect(ids).not.toContain('notab'); // tabindex="-1"

      document.body.removeChild(container);
    });

    it('returns empty array when container is null or invalid', () => {
      expect(getFocusableElements(null)).toEqual([]);
      expect(getFocusableElements({})).toEqual([]);
    });

    it('traps tab focus within container forward and backward', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button id="firstBtn">First</button>
        <button id="lastBtn">Last</button>
      `;
      document.body.appendChild(container);

      const firstBtn = container.querySelector('#firstBtn');
      const lastBtn = container.querySelector('#lastBtn');

      // Forward Tab from last element wraps to first
      lastBtn.focus();
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        cancelable: true,
      });
      const handled = handleTabFocusTrap(tabEvent, container);
      expect(handled).toBe(true);
      expect(document.activeElement).toBe(firstBtn);

      // Backward Tab from first element wraps to last
      firstBtn.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        cancelable: true,
      });
      const shiftHandled = handleTabFocusTrap(shiftTabEvent, container);
      expect(shiftHandled).toBe(true);
      expect(document.activeElement).toBe(lastBtn);

      // Ignores non-Tab keydown
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      expect(handleTabFocusTrap(enterEvent, container)).toBe(false);

      // Null event / null container
      expect(handleTabFocusTrap(null, container)).toBe(false);
      expect(handleTabFocusTrap(tabEvent, null)).toBe(false);

      document.body.removeChild(container);
    });

    it('handles empty container focus trap without crashing', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        cancelable: true,
      });
      const handled = handleTabFocusTrap(tabEvent, container);
      expect(handled).toBe(true);

      document.body.removeChild(container);
    });
  });

  describe('Environment Configuration (env.js, NFR-SEC-09)', () => {
    it('exposes standard environment properties', () => {
      expect(env.appName).toBeDefined();
      expect(env.appEnv).toBeDefined();
      expect(env.apiBaseUrl).toBeDefined();
      expect(env.sanctumCsrfUrl).toBeDefined();
      expect(env.authStrategy).toBeDefined();
      expect(Array.isArray(env.allowedOrigins)).toBe(true);
    });

    it('validates origins correctly with isOriginAllowed', () => {
      expect(isOriginAllowed('http://localhost:3000', env.allowedOrigins)).toBe(
        true
      );
      expect(
        isOriginAllowed('https://malicious-phishing.com', env.allowedOrigins)
      ).toBe(false);
    });
  });

  describe('Schema Validator (schemaValidator.js, IF-06, NFR-MAIN-05)', () => {
    it('resolves valid internal $ref schemas', () => {
      const userSchema = resolveRef('#/components/schemas/User');
      expect(userSchema).toBeDefined();
      expect(userSchema.type).toBe('object');
      expect(userSchema.properties).toHaveProperty('email');
    });

    it('throws error for invalid or external $ref', () => {
      expect(() => resolveRef('http://external.com/schema.json')).toThrow(
        /Only internal references/
      );
      expect(() =>
        resolveRef('#/components/schemas/NonExistentSchema')
      ).toThrow(/Failed to resolve ref/);
      expect(resolveRef(null)).toBeNull();
    });

    it('validates simple data types accurately against OpenAPI schema', () => {
      const stringSchema = { type: 'string' };
      expect(validateAgainstSchema('Fresh Tomatoes', stringSchema).valid).toBe(
        true
      );
      expect(validateAgainstSchema(12345, stringSchema).valid).toBe(false);

      const intSchema = { type: 'integer' };
      expect(validateAgainstSchema(42, intSchema).valid).toBe(true);
      expect(validateAgainstSchema(3.14, intSchema).valid).toBe(false);

      const boolSchema = { type: 'boolean' };
      expect(validateAgainstSchema(true, boolSchema).valid).toBe(true);
      expect(validateAgainstSchema('true', boolSchema).valid).toBe(false);
    });

    it('validates nullable and required object properties', () => {
      const objSchema = {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          notes: { type: 'string', nullable: true },
        },
      };

      // Valid object with null nullable property
      const validObj = { id: 1, name: 'Roma Tomatoes', notes: null };
      expect(validateAgainstSchema(validObj, objSchema).valid).toBe(true);

      // Missing required property
      const missingProp = { id: 1 };
      const missingRes = validateAgainstSchema(missingProp, objSchema);
      expect(missingRes.valid).toBe(false);
      expect(missingRes.errors[0]).toContain(
        "missing required property 'name'"
      );
    });

    it('validates array schemas and item types', () => {
      const arraySchema = {
        type: 'array',
        items: { type: 'string' },
      };

      expect(validateAgainstSchema(['a', 'b', 'c'], arraySchema).valid).toBe(
        true
      );
      expect(validateAgainstSchema(['a', 123, 'c'], arraySchema).valid).toBe(
        false
      );
    });

    it('validates enum values against schema enum definitions', () => {
      const enumSchema = {
        type: 'string',
        enum: ['pending', 'confirmed', 'completed'],
      };

      expect(validateAgainstSchema('pending', enumSchema).valid).toBe(true);
      expect(validateAgainstSchema('invalid_status', enumSchema).valid).toBe(
        false
      );
    });
  });
});
