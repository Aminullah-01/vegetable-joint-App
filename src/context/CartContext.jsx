import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CartContext } from './cartContextDef.js';
import { productService } from '../services';

const STORAGE_CART_KEY = 'vegetable_joint_cart';

/**
 * Loads cart from localStorage safely wrapped in try/catch (CART-06).
 * @returns {Array}
 */
function loadCartFromStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persists cart to localStorage safely wrapped in try/catch (CART-06).
 * @param {Array} items
 */
function saveCartToStorage(items) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or storage restricted
  }
}

/**
 * Cart Provider Component
 * Conforms to SRS CART-01 to CART-09, BR-02, BR-04, and CART-06.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCartFromStorage);
  const [validationNotice, setValidationNotice] = useState(null);

  // Sync state changes to storage
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  /**
   * Add a product to the cart with a specified quantity (CART-01, CART-02).
   *
   * @param {Object} product - Product entity.
   * @param {number} [quantity=1] - Quantity to add (≥ 1).
   * @returns {boolean} Whether item was successfully added/updated.
   */
  const addItem = useCallback((product, quantity = 1) => {
    if (!product || !product.id) return false;

    const requestedQty = Math.max(1, Number(quantity) || 1);
    const availableStock =
      typeof product.quantity === 'number'
        ? product.quantity
        : product.available_stock || 999;

    if (availableStock <= 0 || product.availability === 'out_of_stock') {
      return false;
    }

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => Number(item.product_id) === Number(product.id)
      );

      if (existingIndex > -1) {
        // Item already in cart: increment quantity, bounded by stock (BR-04)
        const existing = prevItems[existingIndex];
        const newQty = Math.min(
          existing.quantity + requestedQty,
          availableStock
        );
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          price: product.price ?? existing.price,
          subtotal: (product.price ?? existing.price) * newQty,
          available_stock: availableStock,
        };
        return updated;
      }

      // New line item
      const initialQty = Math.min(requestedQty, availableStock);
      const newItem = {
        product_id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit || 'basket',
        quantity: initialQty,
        image: product.image || '',
        seller_id: product.seller_id,
        seller_name: product.seller?.business_name || 'Verified Seller',
        seller_location: product.seller?.location || '',
        available_stock: availableStock,
        subtotal: product.price * initialQty,
      };

      return [...prevItems, newItem];
    });

    return true;
  }, []);

  /**
   * Update quantity of a cart line (CART-02).
   * Quantity is bounded between 1 and available stock (never fall below 1; use removeItem to delete).
   *
   * @param {number|string} productId
   * @param {number} newQuantity
   */
  const updateQuantity = useCallback((productId, newQuantity) => {
    setItems((prevItems) => {
      const index = prevItems.findIndex(
        (item) => Number(item.product_id) === Number(productId)
      );
      if (index === -1) return prevItems;

      const item = prevItems[index];
      // Clamped: min 1, max available stock (CART-02, BR-04)
      const stockLimit = item.available_stock || 999;
      const validQty = Math.min(
        Math.max(1, Number(newQuantity) || 1),
        stockLimit
      );

      const updated = [...prevItems];
      updated[index] = {
        ...item,
        quantity: validQty,
        subtotal: item.price * validQty,
      };
      return updated;
    });
  }, []);

  /**
   * Remove a line item from the cart (CART-03).
   *
   * @param {number|string} productId
   */
  const removeItem = useCallback((productId) => {
    setItems((prevItems) =>
      prevItems.filter((item) => Number(item.product_id) !== Number(productId))
    );
  }, []);

  /**
   * Clear all items from the cart (e.g. after order placement).
   */
  const clearCart = useCallback(() => {
    setItems([]);
    setValidationNotice(null);
  }, []);

  /**
   * Re-validate cart items against current catalog price and stock before checkout (CART-08).
   *
   * @returns {Promise<{ is_valid: boolean, has_price_changes: boolean, has_stock_issues: boolean }>}
   */
  const validateCart = useCallback(async () => {
    if (!items.length) {
      return {
        is_valid: false,
        has_price_changes: false,
        has_stock_issues: false,
        items: [],
      };
    }

    try {
      const result = await productService.validateCart(items);

      if (result.has_price_changes || result.has_stock_issues) {
        // Synchronize updated prices and stock into cart
        setItems((currentItems) => {
          return currentItems
            .map((item) => {
              const checked = result.items?.find(
                (ci) => Number(ci.product_id) === Number(item.product_id)
              );
              if (!checked || checked.is_available === false) {
                return null; // Out of stock / removed
              }
              const newPrice = checked.current_price ?? item.price;
              const newStock = checked.current_stock ?? item.available_stock;
              const adjustedQty = Math.min(item.quantity, newStock);

              return {
                ...item,
                price: newPrice,
                available_stock: newStock,
                quantity: adjustedQty,
                subtotal: newPrice * adjustedQty,
              };
            })
            .filter(Boolean);
        });

        setValidationNotice(
          'Some items in your cart had price or stock changes and have been adjusted.'
        );
      } else {
        setValidationNotice(null);
      }

      return result;
    } catch {
      return {
        is_valid: true,
        has_price_changes: false,
        has_stock_issues: false,
        items,
      };
    }
  }, [items]);

  // Derived calculations (BR-02: subtotal = price × qty, grand total = sum of subtotals)
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const uniqueItemCount = items.length;

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const total = subtotal; // No delivery fee, tax or discount in 1.0 (BR-02)

  const value = useMemo(
    () => ({
      items,
      itemCount,
      uniqueItemCount,
      subtotal,
      total,
      isEmpty: items.length === 0,
      validationNotice,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      validateCart,
    }),
    [
      items,
      itemCount,
      uniqueItemCount,
      subtotal,
      total,
      validationNotice,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      validateCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CartProvider;
