import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { CartContext } from './cartContextDef.js';
import { AuthContext } from './authContextDef.js';
import { cartService } from '../services';
import { STRINGS } from '../constants';
import {
  calculateLineSubtotal,
  calculateCartTotals,
  mergeCartItems,
} from '../utils/cartCalculations.js';

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
  const [validationChanges, setValidationChanges] = useState([]);
  const [validationResult, setValidationResult] = useState(null);

  // CART-10: Server-side cart synchronization state
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const auth = useContext(AuthContext);
  const user = auth?.user;
  const isAuthenticated = auth?.isAuthenticated;
  const isBuyer = auth?.isBuyer || user?.role === 'buyer';
  const userId = user?.id;

  const hasInitializedSyncRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Sync state changes to storage
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  // Initial Server-side Cart Sync / Merge upon Buyer Authentication (CART-10)
  useEffect(() => {
    if (!isAuthenticated || !isBuyer || !userId) {
      hasInitializedSyncRef.current = false;
      return;
    }

    let isMounted = true;

    async function initialDeviceSync() {
      setSyncStatus('syncing');
      setSyncError(null);
      isSyncingRef.current = true;

      try {
        const remote = await cartService.fetchCart();
        const remoteItems = remote?.items || [];

        if (isMounted) {
          setItems((currentLocalItems) => {
            const merged = mergeCartItems(currentLocalItems, remoteItems);
            // Re-sync merged cart back to server to ensure parity across devices
            cartService.syncCart(merged).catch(() => {});
            return merged;
          });

          hasInitializedSyncRef.current = true;
          isSyncingRef.current = false;
          setSyncStatus('synced');
          setLastSyncedAt(new Date().toISOString());
        }
      } catch (err) {
        if (isMounted) {
          hasInitializedSyncRef.current = true;
          isSyncingRef.current = false;
          setSyncStatus('error');
          setSyncError(err?.message || 'Server cart sync unavailable');
        }
      }
    }

    initialDeviceSync();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isBuyer, userId]);

  // Debounced Auto-sync on Cart State Mutations for Authenticated Buyers (CART-10)
  useEffect(() => {
    if (
      !isAuthenticated ||
      !isBuyer ||
      !userId ||
      !hasInitializedSyncRef.current ||
      isSyncingRef.current
    ) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const result = await cartService.syncCart(items);
        if (isMounted) {
          setSyncStatus('synced');
          setLastSyncedAt(result?.updated_at || new Date().toISOString());
          setSyncError(null);
        }
      } catch (err) {
        if (isMounted) {
          setSyncStatus('error');
          setSyncError(err?.message || 'Failed to sync cart to server');
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [items, isAuthenticated, isBuyer, userId]);

  /**
   * Add a product to the cart with a specified quantity (CART-01, CART-02).
   *
   * @param {Object} product - Product entity.
   * @param {number} [quantity=1] - Quantity to add (≥ 1).
   * @returns {boolean} Whether item was successfully added/updated.
   */
  const addItem = useCallback((product, quantity = 1) => {
    if (!product || !product.id) return false;

    const requestedQty = Math.max(1, Math.floor(Number(quantity)) || 1);
    const availableStock =
      typeof product.quantity === 'number'
        ? product.quantity
        : typeof product.available_stock === 'number'
          ? product.available_stock
          : typeof product.quantity_available === 'number'
            ? product.quantity_available
            : typeof product.stock === 'number'
              ? product.stock
              : 999;

    if (
      availableStock <= 0 ||
      product.availability === 'out_of_stock' ||
      product.availability === 'unavailable' ||
      product.is_available === false
    ) {
      return false;
    }

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => Number(item.product_id ?? item.id) === Number(product.id)
      );

      if (existingIndex > -1) {
        // Item already in cart: increment quantity, bounded by stock (BR-04)
        const existing = prevItems[existingIndex];
        const newQty = Math.min(
          existing.quantity + requestedQty,
          availableStock
        );
        const effectivePrice = product.price ?? existing.price;
        const lineSubtotal = calculateLineSubtotal(effectivePrice, newQty);
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          price: effectivePrice,
          subtotal: lineSubtotal,
          available_stock: availableStock,
        };
        return updated;
      }

      // New line item
      const initialQty = Math.min(requestedQty, availableStock);
      const lineSubtotal = calculateLineSubtotal(product.price, initialQty);
      const newItem = {
        product_id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit || 'basket',
        quantity: initialQty,
        image: product.image || product.image_url || '',
        seller_id: product.seller_id,
        seller_name:
          product.seller?.business_name ||
          product.seller_name ||
          'Verified Seller',
        seller_location:
          product.seller?.location || product.seller_location || '',
        available_stock: availableStock,
        subtotal: lineSubtotal,
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
        (item) => Number(item.product_id ?? item.id) === Number(productId)
      );
      if (index === -1) return prevItems;

      const item = prevItems[index];
      // Clamped: min 1, max available stock (CART-02, BR-04)
      const stockLimit =
        typeof item.available_stock === 'number'
          ? item.available_stock
          : typeof item.quantity === 'number'
            ? item.quantity
            : 999;
      const validQty = Math.min(
        Math.max(1, Math.floor(Number(newQuantity)) || 1),
        stockLimit
      );

      const lineSubtotal = calculateLineSubtotal(item.price, validQty);
      const updated = [...prevItems];
      updated[index] = {
        ...item,
        quantity: validQty,
        subtotal: lineSubtotal,
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
      prevItems.filter(
        (item) => Number(item.product_id ?? item.id) !== Number(productId)
      )
    );
  }, []);

  /**
   * Clear all items from the cart (e.g. after order placement).
   */
  const clearCart = useCallback(() => {
    setItems([]);
    setValidationNotice(null);
    setValidationChanges([]);
    setValidationResult(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_CART_KEY);
      } catch {
        // storage restricted
      }
    }
    if (isAuthenticated && isBuyer && userId) {
      cartService.clearCart().catch(() => {});
    }
  }, [isAuthenticated, isBuyer, userId]);

  /**
   * Re-validate cart items against current catalog price, stock, availability and seller status before checkout (CART-08).
   *
   * @param {Array} [overrideItems] - Optional items array to validate. Defaults to current cart items.
   * @returns {Promise<{ is_valid: boolean, has_price_changes: boolean, has_stock_issues: boolean, has_unavailable: boolean, changes: Array, items: Array }>}
   */
  const validateCart = useCallback(
    async (overrideItems) => {
      const targetItems = overrideItems || items;
      if (!targetItems.length) {
        setValidationNotice(null);
        setValidationChanges([]);
        setValidationResult(null);
        return {
          is_valid: true,
          has_price_changes: false,
          has_stock_issues: false,
          has_unavailable: false,
          changes: [],
          items: [],
        };
      }

      try {
        const result = await cartService.validateCart(targetItems);
        const changes = Array.isArray(result.changes) ? result.changes : [];
        const hasIssues =
          !result.is_valid ||
          result.has_price_changes ||
          result.has_stock_issues ||
          result.has_unavailable ||
          changes.length > 0;

        if (hasIssues) {
          setValidationChanges(changes);
          setValidationResult(result);
          const noticeSummary =
            result.summary ||
            STRINGS.CART.REVALIDATION_NOTICE ||
            'Some items in your cart had price or stock changes and have been adjusted.';
          setValidationNotice(noticeSummary);
        } else {
          setValidationNotice(null);
          setValidationChanges([]);
          setValidationResult(result);
        }

        return {
          ...result,
          changes,
          is_valid: !hasIssues,
        };
      } catch {
        return {
          is_valid: true,
          has_price_changes: false,
          has_stock_issues: false,
          has_unavailable: false,
          changes: [],
          items: targetItems,
        };
      }
    },
    [items]
  );

  /**
   * Acknowledges and applies pending validation changes to the cart (CART-08, TC-18).
   * Synchronizes updated prices and stock into cart items, and removes unavailable items.
   *
   * @returns {Array} Updated cart items after applying changes.
   */
  const acknowledgeValidation = useCallback(() => {
    if (!validationResult || !Array.isArray(validationResult.items)) {
      setValidationNotice(null);
      setValidationChanges([]);
      setValidationResult(null);
      return items;
    }

    let updatedCart = [];
    setItems((currentItems) => {
      updatedCart = currentItems
        .map((item) => {
          const validated = validationResult.items.find(
            (vi) =>
              Number(vi.product_id ?? vi.id) ===
              Number(item.product_id ?? item.id)
          );

          // If product is missing or unavailable, remove from cart (CART-08)
          if (!validated || validated.is_available === false) {
            return null;
          }

          const currentPrice = validated.current_price ?? item.price;
          const currentStock = validated.current_stock ?? item.available_stock;
          const adjustedQty = Math.max(
            1,
            Math.min(item.quantity, currentStock)
          );

          return {
            ...item,
            price: currentPrice,
            available_stock: currentStock,
            quantity: adjustedQty,
            subtotal: calculateLineSubtotal(currentPrice, adjustedQty),
          };
        })
        .filter(Boolean);

      return updatedCart;
    });

    setValidationNotice(null);
    setValidationChanges([]);
    setValidationResult(null);
    return updatedCart;
  }, [items, validationResult]);

  /**
   * Clears the active validation notice and changes without applying changes.
   */
  const clearValidationNotice = useCallback(() => {
    setValidationNotice(null);
    setValidationChanges([]);
    setValidationResult(null);
  }, []);

  /**
   * Manually trigger server-side cart synchronization (CART-10).
   *
   * @param {Array} [overrideItems] - Optional items array to sync. Defaults to current cart items.
   * @returns {Promise<Array>}
   */
  const syncServerCart = useCallback(
    async (overrideItems) => {
      if (!isAuthenticated || !isBuyer || !userId) {
        return items;
      }
      setSyncStatus('syncing');
      setSyncError(null);
      try {
        const target = overrideItems || items;
        const result = await cartService.syncCart(target);
        setSyncStatus('synced');
        setLastSyncedAt(result?.updated_at || new Date().toISOString());
        return target;
      } catch (err) {
        setSyncStatus('error');
        const errText = err?.message || 'Server sync failed';
        setSyncError(errText);
        throw err;
      }
    },
    [isAuthenticated, isBuyer, userId, items]
  );

  // Derived calculations (BR-02: subtotal = price × qty, grand total = sum of subtotals)
  const cartTotals = useMemo(() => calculateCartTotals(items), [items]);
  const itemCount = cartTotals.itemCount;
  const uniqueItemCount = cartTotals.uniqueItemCount;
  const subtotal = cartTotals.subtotal;
  const total = cartTotals.total;

  const value = useMemo(
    () => ({
      items,
      itemCount,
      uniqueItemCount,
      subtotal,
      total,
      isEmpty: items.length === 0,
      validationNotice,
      validationChanges,
      validationResult,
      // CART-10: Server sync status and methods
      syncStatus,
      isSyncing: syncStatus === 'syncing',
      isSynced: syncStatus === 'synced',
      lastSyncedAt,
      syncError,
      syncServerCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      validateCart,
      acknowledgeValidation,
      clearValidationNotice,
    }),
    [
      items,
      itemCount,
      uniqueItemCount,
      subtotal,
      total,
      validationNotice,
      validationChanges,
      validationResult,
      syncStatus,
      lastSyncedAt,
      syncError,
      syncServerCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      validateCart,
      acknowledgeValidation,
      clearValidationNotice,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CartProvider;
