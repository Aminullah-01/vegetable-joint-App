import { describe, it, expect } from 'vitest';
import {
  calculateLineSubtotal,
  calculateCartTotals,
  reconcileWithServerTotals,
  calculateSellerSubtotals,
} from '../cartCalculations';

describe('Cart Totals Calculation Utility (FE-056 / CART-04, BR-02)', () => {
  describe('calculateLineSubtotal (Line subtotal = price × qty, BR-02)', () => {
    it('calculates line subtotal accurately for integer prices and quantities', () => {
      expect(calculateLineSubtotal(2500, 2)).toBe(5000);
      expect(calculateLineSubtotal(1200, 3)).toBe(3600);
      expect(calculateLineSubtotal(450, 10)).toBe(4500);
    });

    it('handles numeric string inputs correctly', () => {
      expect(calculateLineSubtotal('2500', '2')).toBe(5000);
      expect(calculateLineSubtotal('1500', 4)).toBe(6000);
      expect(calculateLineSubtotal(800, '5')).toBe(4000);
    });

    it('rounds fractional kobo accurately to 2 decimal places', () => {
      expect(calculateLineSubtotal(250.75, 3)).toBe(752.25);
      expect(calculateLineSubtotal(199.99, 2)).toBe(399.98);
    });

    it('floors fractional quantities to whole numbers per SRS A-10', () => {
      // Quantities are whole numbers of selected unit (e.g. baskets, bunches)
      expect(calculateLineSubtotal(1000, 2.7)).toBe(2000); // 2 * 1000
      expect(calculateLineSubtotal(500, 3.9)).toBe(1500); // 3 * 500
    });

    it('returns 0 when quantity or price is 0', () => {
      expect(calculateLineSubtotal(2500, 0)).toBe(0);
      expect(calculateLineSubtotal(0, 5)).toBe(0);
      expect(calculateLineSubtotal(0, 0)).toBe(0);
    });

    it('returns 0 for negative, invalid, or missing values', () => {
      expect(calculateLineSubtotal(-2500, 2)).toBe(0);
      expect(calculateLineSubtotal(2500, -2)).toBe(0);
      expect(calculateLineSubtotal(null, 2)).toBe(0);
      expect(calculateLineSubtotal(2500, null)).toBe(0);
      expect(calculateLineSubtotal(undefined, 2)).toBe(0);
      expect(calculateLineSubtotal(2500, undefined)).toBe(0);
      expect(calculateLineSubtotal(NaN, 2)).toBe(0);
      expect(calculateLineSubtotal('invalid', 2)).toBe(0);
    });
  });

  describe('calculateCartTotals (Grand total = sum of line subtotals, BR-02)', () => {
    const sampleItems = [
      {
        product_id: 1,
        name: 'Fresh Tomatoes',
        price: 2500,
        quantity: 2,
        seller_id: 1,
      },
      {
        product_id: 2,
        name: 'Fresh Ugwu',
        price: 1200,
        quantity: 3,
        seller_id: 2,
      },
      {
        product_id: 3,
        name: 'Onions',
        price: 800,
        quantity: 5,
        seller_id: 1,
      },
    ];

    it('computes line subtotals, subtotal, and grand total identically (BR-02)', () => {
      // Expected:
      // Line 1: 2500 * 2 = 5000
      // Line 2: 1200 * 3 = 3600
      // Line 3: 800 * 5 = 4000
      // Subtotal = 5000 + 3600 + 4000 = 12600
      // Grand Total = 12600 (No delivery fee, tax or discount in 1.0 per BR-02)
      // Total itemCount = 2 + 3 + 5 = 10
      // Unique item count = 3
      const totals = calculateCartTotals(sampleItems);

      expect(totals.subtotal).toBe(12600);
      expect(totals.total).toBe(12600);
      expect(totals.itemCount).toBe(10);
      expect(totals.uniqueItemCount).toBe(3);
      expect(totals.deliveryFee).toBe(0);
      expect(totals.tax).toBe(0);
      expect(totals.discount).toBe(0);
      expect(totals.isServerAuthoritative).toBe(false);
      expect(totals.hasDiscrepancy).toBe(false);

      expect(totals.lineItems).toHaveLength(3);
      expect(totals.lineItems[0].subtotal).toBe(5000);
      expect(totals.lineItems[1].subtotal).toBe(3600);
      expect(totals.lineItems[2].subtotal).toBe(4000);
    });

    it('handles empty cart correctly', () => {
      const totals = calculateCartTotals([]);

      expect(totals.subtotal).toBe(0);
      expect(totals.total).toBe(0);
      expect(totals.itemCount).toBe(0);
      expect(totals.uniqueItemCount).toBe(0);
      expect(totals.lineItems).toEqual([]);
    });

    it('handles null, undefined, or non-array inputs safely', () => {
      const totalsNull = calculateCartTotals(null);
      expect(totalsNull.subtotal).toBe(0);
      expect(totalsNull.total).toBe(0);
      expect(totalsNull.itemCount).toBe(0);

      const totalsUndefined = calculateCartTotals(undefined);
      expect(totalsUndefined.subtotal).toBe(0);

      const totalsObj = calculateCartTotals('invalid');
      expect(totalsObj.subtotal).toBe(0);
    });

    it('skips or sanitizes corrupted line items', () => {
      const corruptedItems = [
        null,
        { product_id: 1, price: 2000, quantity: 1 },
        { product_id: 2, price: 'invalid', quantity: null },
      ];

      const totals = calculateCartTotals(corruptedItems);
      expect(totals.subtotal).toBe(2000);
      expect(totals.total).toBe(2000);
      expect(totals.itemCount).toBe(1);
      expect(totals.uniqueItemCount).toBe(3);
    });

    it('applies server value as authoritative when provided (CART-04)', () => {
      // Client calculated total: 5000 + 3600 + 4000 = 12600
      // Server returned updated authoritative total: 12000 (e.g. price change or promotional bundle)
      const totals = calculateCartTotals(sampleItems, {
        serverTotal: 12000,
        serverSubtotal: 12000,
      });

      expect(totals.isServerAuthoritative).toBe(true);
      expect(totals.total).toBe(12000);
      expect(totals.subtotal).toBe(12000);
      expect(totals.hasDiscrepancy).toBe(true);
      expect(totals.discrepancyAmount).toBe(600);
    });
  });

  describe('reconcileWithServerTotals (Server value authoritative per CART-04)', () => {
    it('returns client totals when server totals match exactly', () => {
      const clientTotals = { subtotal: 5000, total: 5000 };
      const serverResponse = { subtotal: 5000, total: 5000 };

      const result = reconcileWithServerTotals(clientTotals, serverResponse);

      expect(result.authoritativeTotal).toBe(5000);
      expect(result.authoritativeSubtotal).toBe(5000);
      expect(result.hasDiscrepancy).toBe(false);
      expect(result.discrepancy).toBe(0);
      expect(result.serverNotice).toBeNull();
    });

    it('overrides client totals with server totals and provides adjustment notice when discrepancies occur', () => {
      const clientTotals = { subtotal: 8000, total: 8000 };
      const serverResponse = { subtotal: 7500, total: 7500 }; // Price dropped or stock adjusted

      const result = reconcileWithServerTotals(clientTotals, serverResponse);

      expect(result.authoritativeTotal).toBe(7500);
      expect(result.authoritativeSubtotal).toBe(7500);
      expect(result.hasDiscrepancy).toBe(true);
      expect(result.discrepancy).toBe(500);
      expect(result.serverNotice).toContain('Cart total adjusted');
    });

    it('extracts server totals from nested API data response format', () => {
      const clientTotals = { subtotal: 4000, total: 4000 };
      const serverResponse = { data: { total: 4200, subtotal: 4200 } };

      const result = reconcileWithServerTotals(clientTotals, serverResponse);

      expect(result.authoritativeTotal).toBe(4200);
      expect(result.hasDiscrepancy).toBe(true);
      expect(result.discrepancy).toBe(200);
    });

    it('falls back safely to client totals if server response is null or missing total', () => {
      const clientTotals = { subtotal: 3000, total: 3000 };

      const result = reconcileWithServerTotals(clientTotals, null);

      expect(result.authoritativeTotal).toBe(3000);
      expect(result.hasDiscrepancy).toBe(false);
    });
  });

  describe('calculateSellerSubtotals (Multi-vendor subtotal grouping, CHK-05, BR-06)', () => {
    it('groups items by seller and calculates each seller independent subtotal and itemCount', () => {
      const multiVendorItems = [
        {
          product_id: 1,
          name: 'Tomatoes',
          price: 2500,
          quantity: 2,
          seller_id: 10,
          seller_name: 'Farm A',
          seller_location: 'Kano',
        },
        {
          product_id: 2,
          name: 'Peppers',
          price: 1500,
          quantity: 3,
          seller_id: 10,
          seller_name: 'Farm A',
          seller_location: 'Kano',
        },
        {
          product_id: 3,
          name: 'Ugwu',
          price: 1200,
          quantity: 4,
          seller_id: 20,
          seller_name: 'Farm B',
          seller_location: 'Oyo',
        },
      ];

      const groups = calculateSellerSubtotals(multiVendorItems);

      expect(groups).toHaveLength(2);

      // Farm A: 2 * 2500 + 3 * 1500 = 5000 + 4500 = 9500, itemCount: 5
      const farmA = groups.find((g) => g.sellerId === 10);
      expect(farmA).toBeDefined();
      expect(farmA.sellerName).toBe('Farm A');
      expect(farmA.subtotal).toBe(9500);
      expect(farmA.itemCount).toBe(5);
      expect(farmA.items).toHaveLength(2);

      // Farm B: 4 * 1200 = 4800, itemCount: 4
      const farmB = groups.find((g) => g.sellerId === 20);
      expect(farmB).toBeDefined();
      expect(farmB.sellerName).toBe('Farm B');
      expect(farmB.subtotal).toBe(4800);
      expect(farmB.itemCount).toBe(4);
      expect(farmB.items).toHaveLength(1);
    });

    it('returns empty array when items list is empty or invalid', () => {
      expect(calculateSellerSubtotals([])).toEqual([]);
      expect(calculateSellerSubtotals(null)).toEqual([]);
      expect(calculateSellerSubtotals(undefined)).toEqual([]);
    });
  });
});
