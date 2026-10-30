import { describe, it, expect } from 'vitest';
import { parseCheckoutError } from '../checkoutErrors.js';
import { ApiError } from '../../services/apiErrors.js';

describe('Checkout Errors Parser (CHK-04, ERR-01, ERR-02, NFR-REL-05)', () => {
  const mockCartItems = [
    {
      id: 1,
      product_id: 1,
      name: 'Fresh Roma Tomatoes',
      price: 1500,
      quantity: 3,
    },
    {
      id: 2,
      product_id: 2,
      name: 'Habanero Pepper (Atarodo)',
      price: 800,
      quantity: 2,
    },
  ];

  it('handles null, undefined, or empty error gracefully', () => {
    const res1 = parseCheckoutError(null);
    expect(res1.status).toBe(0);
    expect(res1.is409).toBe(false);
    expect(res1.is422).toBe(false);
    expect(res1.itemErrors).toEqual([]);
    expect(res1.fieldErrors).toEqual({});

    const res2 = parseCheckoutError(undefined);
    expect(res2.title).toBe('Order Placement Error');
  });

  describe('HTTP 409 Conflict Handling (CHK-04, ERR-01)', () => {
    it('parses structured changes array with stock reductions and price changes', () => {
      const conflictError = new ApiError({
        message: 'Stock conflict occurred.',
        status: 409,
        data: {
          changes: [
            {
              product_id: 1,
              name: 'Fresh Roma Tomatoes',
              type: 'stock_reduced',
              old_quantity: 3,
              new_quantity: 1,
            },
            {
              product_id: 2,
              name: 'Habanero Pepper (Atarodo)',
              type: 'price_changed',
              old_price: 800,
              new_price: 1000,
            },
            {
              product_id: 3,
              name: 'Organic Spinach',
              type: 'unavailable',
            },
          ],
        },
      });

      const parsed = parseCheckoutError(conflictError, mockCartItems);
      expect(parsed.is409).toBe(true);
      expect(parsed.status).toBe(409);
      expect(parsed.title).toBe('Stock Conflict — Order Cannot Be Placed');
      expect(parsed.itemErrors).toHaveLength(3);

      expect(parsed.itemErrors[0]).toMatchObject({
        productId: 1,
        type: 'stock_reduced',
        badgeText: 'Insufficient Stock',
      });
      expect(parsed.itemErrors[0].message).toContain('now 1 (requested 3)');

      expect(parsed.itemErrors[1]).toMatchObject({
        productId: 2,
        type: 'price_changed',
        badgeText: 'Price Changed',
      });

      expect(parsed.itemErrors[2]).toMatchObject({
        productId: 3,
        type: 'unavailable',
        badgeText: 'Unavailable',
      });
    });

    it('parses raw items array in 409 conflict payload', () => {
      const err = new ApiError({
        message: 'Conflict on items',
        status: 409,
        data: {
          items: [
            {
              id: 1,
              name: 'Fresh Roma Tomatoes',
              type: 'out_of_stock',
              requested_quantity: 4,
              available_stock: 0,
            },
          ],
        },
      });

      const parsed = parseCheckoutError(err, mockCartItems);
      expect(parsed.is409).toBe(true);
      expect(parsed.itemErrors.length).toBeGreaterThan(0);
      expect(parsed.itemErrors[0].badgeText).toBe('Out of Stock');
    });

    it('parses items array of string messages', () => {
      const err = {
        status: 409,
        errors: {
          items: [
            'Fresh Roma Tomatoes price has changed',
            'Habanero is out of stock',
          ],
        },
      };

      const parsed = parseCheckoutError(err, mockCartItems);
      expect(parsed.is409).toBe(true);
      expect(parsed.itemErrors.length).toBe(2);
      expect(parsed.itemErrors[0].badgeText).toBe('Price Changed');
      expect(parsed.itemErrors[1].badgeText).toBe('Insufficient Stock');
    });

    it('falls back to inspecting raw message against cart items when no structured list is returned', () => {
      const err = new ApiError({
        message: 'Fresh Roma Tomatoes stock is insufficient.',
        status: 409,
      });

      const parsed = parseCheckoutError(err, mockCartItems);
      expect(parsed.is409).toBe(true);
      expect(parsed.itemErrors).toHaveLength(1);
      expect(parsed.itemErrors[0].name).toBe('Fresh Roma Tomatoes');
      expect(parsed.itemErrors[0].badgeText).toBe('Insufficient Stock');
    });
  });

  describe('HTTP 422 Unprocessable Entity (ERR-01)', () => {
    it('parses validation field errors and sets appropriate title', () => {
      const valError = new ApiError({
        message: 'The given data was invalid.',
        status: 422,
        errors: {
          delivery_address: ['Delivery address is required.'],
          delivery_phone: ['Phone format is invalid.'],
        },
      });

      const parsed = parseCheckoutError(valError, mockCartItems);
      expect(parsed.is422).toBe(true);
      expect(parsed.title).toBe('Order Validation Issue');
      expect(parsed.fieldErrors).toHaveProperty('delivery_address');
      expect(parsed.fieldErrors).toHaveProperty('delivery_phone');
    });
  });

  describe('Technical Error Shielding (ERR-02)', () => {
    it('shields SQL, PDO, and database traces and displays friendly message', () => {
      const technicalErrors = [
        new Error(
          'SQLSTATE[23000]: Integrity constraint violation: 1048 Column cannot be null at line 42'
        ),
        new Error(
          'PDOException: Connection refused in DatabaseManager.php on line 12'
        ),
        new Error('Syntax error or access violation in PostgreSQL query'),
        new Error('Stack trace: at QueryBuilder.execute (/app/db.js:100)'),
      ];

      technicalErrors.forEach((techErr) => {
        const parsed = parseCheckoutError(techErr, mockCartItems);
        expect(parsed.title).toBe('Order Placement Error');
        expect(parsed.message).not.toMatch(/SQLSTATE/i);
        expect(parsed.message).not.toMatch(/PDOException/i);
        expect(parsed.message).not.toMatch(/Syntax error/i);
        expect(parsed.message).not.toMatch(/Stack trace/i);
        expect(parsed.message).toContain(
          'Something unexpected happened while communicating with the service'
        );
      });
    });
  });

  describe('Network and Offline Error Handling (NFR-REL-05)', () => {
    it('classifies network errors, keeps cart preserved notice and sets connection title', () => {
      const netErr = new ApiError({
        message: 'Unable to connect to the server.',
        status: 0,
        code: 'NETWORK_ERROR',
      });
      netErr.isNetworkError = true;

      const parsed = parseCheckoutError(netErr, mockCartItems);
      expect(parsed.isNetwork).toBe(true);
      expect(parsed.title).toBe('Connection Error — Cart Preserved');
      expect(parsed.message).toContain(
        'Your cart and order details are safely preserved'
      );
    });

    it('classifies TypeError fetch rejection as network error', () => {
      const fetchErr = new TypeError('Failed to fetch (API unreachable)');
      const parsed = parseCheckoutError(fetchErr, mockCartItems);
      expect(parsed.isNetwork).toBe(true);
      expect(parsed.title).toBe('Connection Error — Cart Preserved');
      expect(parsed.message).toContain(
        'Your cart and order details are safely preserved'
      );
    });
  });
});
