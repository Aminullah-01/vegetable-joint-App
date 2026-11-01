import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';

import { Navbar } from '../../../components/common/Navbar';
import { ProductDetails } from '../../public/ProductDetails';
import { Products } from '../../public/Products';
import { Cart } from '../../public/Cart';
import { Login } from '../../auth/Login';
import { Register } from '../../auth/Register';
import { Checkout } from '../Checkout';
import { OrderConfirmation } from '../OrderConfirmation';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';

import { AuthProvider, CartProvider, ToastProvider } from '../../../context';
import { mockStore } from '../../../data/mockStore';
import { mockSwitch } from '../../../services/mockSwitch';
import { formatCurrency } from '../../../utils';
import { DELIVERY_DETAILS_STORAGE_KEY } from '../../../constants';

/**
 * End-to-End Test Harness for Buyer Purchase Journey
 * Renders shared Navbar and core journey routes.
 */
function BuyerJourneyApp({
  initialEntries = ['/products/1'],
  initialUser = null,
  initialCart = null,
}) {
  if (initialUser) {
    localStorage.setItem('vegetable_joint_user', JSON.stringify(initialUser));
    localStorage.setItem('vegetable_joint_token', 'mock-buyer-jwt-token');
  }

  if (initialCart) {
    localStorage.setItem('vegetable_joint_cart', JSON.stringify(initialCart));
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Navbar />
            <Routes>
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
                <Route path="/checkout" element={<Checkout />} />
                <Route
                  path="/checkout/confirmation/:ref"
                  element={<OrderConfirmation />}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

BuyerJourneyApp.propTypes = {
  initialEntries: PropTypes.arrayOf(PropTypes.string),
  initialUser: PropTypes.object,
  initialCart: PropTypes.array,
};

const defaultBuyerUser = {
  id: 6,
  name: 'Amina Bello',
  email: 'buyer@example.com',
  phone: '+2348078901234',
  role: 'buyer',
  status: 'active',
};

const sampleDeliveryAddress = {
  name: 'Amina Bello',
  phone: '+2348078901234',
  street: '14 Bompai Road',
  town: 'Nassarawa',
  state: 'Kano',
  notes: 'Call on arrival at the gate',
};

/**
 * Helper: wait until /checkout is loaded and background cart validation completes.
 */
async function waitUntilCheckoutReady() {
  expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();
  await waitFor(() => {
    expect(
      screen.queryByTestId('checkout-validating-indicator')
    ).not.toBeInTheDocument();
  });
}

describe('FE-114 E2E: Buyer Purchase Journey (TC-08 to TC-16)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSwitch.setMockMode(true);
    mockStore.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    mockSwitch.reset();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // TC-08: Open a product & add to cart (MKT-05, CART-01, CART-07)
  // ---------------------------------------------------------------------------
  describe('TC-08: Open product detail and add to cart (MKT-05, CART-01, CART-07)', () => {
    it('displays all MKT-05 fields on product details and updates navbar badge on add to cart', async () => {
      const user = userEvent.setup();

      render(<BuyerJourneyApp initialEntries={['/products/1']} />);

      // Wait for product details to load
      expect(await screen.findByTestId('product-name')).toBeInTheDocument();

      // Verify all MKT-05 fields:
      // 1. Name
      expect(screen.getByTestId('product-name')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );

      // 2. Image
      const imageContainer = screen.getByTestId('product-image');
      expect(imageContainer).toBeInTheDocument();
      const img = screen.getByRole('img', { name: /fresh roma tomatoes/i });
      expect(img).toBeInTheDocument();

      // 3. Description
      expect(screen.getByTestId('product-description')).toHaveTextContent(
        /Bright red, firm, and succulent farm-fresh Roma tomatoes/i
      );

      // 4. Price & 5. Unit
      expect(screen.getByTestId('product-price')).toHaveTextContent('₦2,500');
      expect(screen.getByTestId('product-unit')).toHaveTextContent('/ basket');

      // 6. Available stock
      expect(screen.getByTestId('product-stock')).toHaveTextContent(
        '45 available'
      );

      // 7. Seller Name
      const sellerLinks = screen.getAllByTestId('product-seller');
      expect(sellerLinks[0]).toHaveTextContent('Arewa Fresh Farms');

      // 8. Seller Location
      expect(screen.getByTestId('product-location')).toHaveTextContent('Gombe');

      // 9. Availability Status
      const badges = screen.getAllByTestId('availability-badge');
      expect(badges[0]).toHaveTextContent(/in stock|available/i);

      // 10. Rating
      expect(
        screen.getByRole('status', { name: /rating: 4.8/i })
      ).toBeInTheDocument();

      // Navbar badge is not present initially (cart is empty)
      expect(screen.queryByTestId('navbar-cart-badge')).not.toBeInTheDocument();

      // Add product to cart (CART-01, CART-07)
      const addToCartBtn = screen.getByTestId('add-to-cart-button');
      await user.click(addToCartBtn);

      // Toast feedback appears
      expect(
        await screen.findByText(
          /Added 1 basket of Fresh Roma Tomatoes to cart!/i
        )
      ).toBeInTheDocument();

      // Navbar badge updates to 1 (CART-07)
      const badge = await screen.findByTestId('navbar-cart-badge');
      expect(badge).toHaveTextContent('1');
    });
  });

  // ---------------------------------------------------------------------------
  // TC-09: Increase quantity in cart (CART-02, CART-04)
  // ---------------------------------------------------------------------------
  describe('TC-09: Increase quantity in cart (CART-02, CART-04)', () => {
    it('increases quantity and subtotal when clicking increase button', async () => {
      const user = userEvent.setup();
      const initialCart = [
        {
          id: 1,
          product_id: 1,
          name: 'Fresh Roma Tomatoes',
          price: 2500,
          unit: 'basket',
          quantity: 1,
          available_stock: 45,
          subtotal: 2500,
          seller_id: 1,
          seller: {
            id: 1,
            business_name: 'Arewa Fresh Farms',
            location: 'Gombe',
          },
        },
      ];

      render(
        <BuyerJourneyApp initialEntries={['/cart']} initialCart={initialCart} />
      );

      // Cart loaded with item
      expect(
        await screen.findByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();
      expect(screen.getByTestId('cart-item-subtotal-1')).toHaveTextContent(
        formatCurrency(2500)
      );
      expect(screen.getByTestId('cart-grand-total')).toHaveTextContent(
        formatCurrency(2500)
      );
      expect(screen.getByTestId('navbar-cart-badge')).toHaveTextContent('1');

      // Increase quantity by clicking the "+" button
      const increaseBtn = screen.getByRole('button', {
        name: /increase quantity/i,
      });
      await user.click(increaseBtn);

      // Subtotal and Grand Total update to 2 * 2500 = 5000 (CART-04)
      await waitFor(() => {
        expect(screen.getByTestId('cart-item-subtotal-1')).toHaveTextContent(
          formatCurrency(5000)
        );
      });
      expect(screen.getByTestId('cart-grand-total')).toHaveTextContent(
        formatCurrency(5000)
      );
      expect(screen.getByTestId('navbar-cart-badge')).toHaveTextContent('2');
    });

    it('prevents quantity from exceeding available stock limit', async () => {
      const user = userEvent.setup();
      // Product 7 in mock data has available_stock = 3
      const cappedCart = [
        {
          id: 7,
          product_id: 7,
          name: 'Sweet Jos Carrots',
          price: 2200,
          unit: 'bag',
          quantity: 2,
          available_stock: 3,
          subtotal: 4400,
          seller_id: 3,
          seller: {
            id: 3,
            business_name: 'Plateau Veggies Ltd',
            location: 'Jos',
          },
        },
      ];

      render(
        <BuyerJourneyApp initialEntries={['/cart']} initialCart={cappedCart} />
      );

      const carrotRow = await screen.findByTestId('cart-item-7');
      const carrotIncreaseBtn = within(carrotRow).getByRole('button', {
        name: /increase quantity/i,
      });

      // Can increment from 2 to 3
      expect(carrotIncreaseBtn).toBeEnabled();
      await user.click(carrotIncreaseBtn);

      await waitFor(() => {
        expect(
          within(carrotRow).getByTestId('cart-item-subtotal-7')
        ).toHaveTextContent(formatCurrency(6600));
      });

      // At available stock = 3, increase button is disabled (cannot exceed stock)
      expect(carrotIncreaseBtn).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // TC-10: Remove product from cart (CART-03)
  // ---------------------------------------------------------------------------
  describe('TC-10: Remove product from cart (CART-03)', () => {
    it('removes product from cart and updates totals and navbar count', async () => {
      const user = userEvent.setup();
      const initialCart = [
        {
          id: 1,
          product_id: 1,
          name: 'Fresh Roma Tomatoes',
          price: 2500,
          unit: 'basket',
          quantity: 2,
          available_stock: 45,
          subtotal: 5000,
          seller_id: 1,
          seller: {
            id: 1,
            business_name: 'Arewa Fresh Farms',
            location: 'Gombe',
          },
        },
        {
          id: 2,
          product_id: 2,
          name: 'Fresh Scotch Bonnet (Ata Rodo)',
          price: 1800,
          unit: 'basket',
          quantity: 1,
          available_stock: 25,
          subtotal: 1800,
          seller_id: 1,
          seller: {
            id: 1,
            business_name: 'Arewa Fresh Farms',
            location: 'Gombe',
          },
        },
      ];

      render(
        <BuyerJourneyApp initialEntries={['/cart']} initialCart={initialCart} />
      );

      // Verify both items present initially
      expect(await screen.findByTestId('cart-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('cart-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('cart-grand-total')).toHaveTextContent(
        formatCurrency(6800)
      );
      expect(screen.getByTestId('navbar-cart-badge')).toHaveTextContent('3');

      // Remove product 2 (Scotch Bonnet)
      const removeBtn2 = screen.getByTestId('cart-remove-button-2');
      await user.click(removeBtn2);

      // Product 2 removed from view
      await waitFor(() => {
        expect(screen.queryByTestId('cart-item-2')).not.toBeInTheDocument();
      });

      // Product 1 remains, totals updated to ₦5,000, navbar count updated to 2
      expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('cart-grand-total')).toHaveTextContent(
        formatCurrency(5000)
      );
      expect(screen.getByTestId('navbar-cart-badge')).toHaveTextContent('2');

      // Remove product 1 (Tomatoes) -> Cart transitions to empty state
      const removeBtn1 = screen.getByTestId('cart-remove-button-1');
      await user.click(removeBtn1);

      expect(await screen.findByTestId('empty-cart-state')).toBeInTheDocument();
      expect(screen.getByText(/Your cart is empty\./i)).toBeInTheDocument();
      expect(screen.queryByTestId('navbar-cart-badge')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TC-11: Checkout with empty cart (CART-05)
  // ---------------------------------------------------------------------------
  describe('TC-11: Checkout with empty cart (CART-05)', () => {
    it('prevents direct checkout access when cart is empty and displays empty state', async () => {
      render(
        <BuyerJourneyApp
          initialEntries={['/checkout']}
          initialUser={defaultBuyerUser}
          initialCart={[]}
        />
      );

      const emptyState = await screen.findByTestId('checkout-empty-cart-state');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent(/Your cart is empty\./i);
      expect(
        screen.getByTestId('checkout-empty-browse-button')
      ).toBeInTheDocument();
    });

    it('displays "Your cart is empty." on cart page and prevents checkout action', async () => {
      render(<BuyerJourneyApp initialEntries={['/cart']} initialCart={[]} />);

      expect(await screen.findByTestId('empty-cart-state')).toBeInTheDocument();
      expect(screen.getByText(/Your cart is empty\./i)).toBeInTheDocument();
      expect(
        screen.queryByTestId('cart-checkout-button')
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TC-12: Guest proceeds to checkout (CART-09)
  // ---------------------------------------------------------------------------
  describe('TC-12: Guest proceeds to checkout (CART-09)', () => {
    it('prompts unauthenticated guest to log in/register and preserves cart afterwards', async () => {
      const user = userEvent.setup();
      const guestCart = [
        {
          id: 1,
          product_id: 1,
          name: 'Fresh Roma Tomatoes',
          price: 2500,
          unit: 'basket',
          quantity: 2,
          available_stock: 45,
          subtotal: 5000,
          seller_id: 1,
          seller: {
            id: 1,
            business_name: 'Arewa Fresh Farms',
            location: 'Gombe',
          },
        },
      ];

      render(
        <BuyerJourneyApp initialEntries={['/cart']} initialCart={guestCart} />
      );

      // Guest views cart and sees guest checkout hint
      expect(
        await screen.findByText('Fresh Roma Tomatoes')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('cart-guest-checkout-hint')
      ).toBeInTheDocument();

      // Guest clicks Proceed to Checkout
      const checkoutBtn = screen.getByTestId('cart-checkout-button');
      await user.click(checkoutBtn);

      // ProtectedRoute redirects guest to /login
      expect(
        await screen.findByRole('heading', {
          name: /Sign In to Vegetable Joint/i,
        })
      ).toBeInTheDocument();

      // Guest notice banner is displayed (CART-09)
      const guestNotice = screen.getByTestId('checkout-guest-notice');
      expect(guestNotice).toBeInTheDocument();
      expect(guestNotice).toHaveTextContent(
        /Please sign in or register to complete your checkout/i
      );
      expect(guestNotice).toHaveTextContent(
        /Your shopping cart has been preserved/i
      );

      // Authenticate with valid buyer credentials
      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const submitBtn = screen.getByRole('button', { name: /Sign In/i });

      await user.clear(emailInput);
      await user.type(emailInput, 'buyer@example.com');
      await user.clear(passwordInput);
      await user.type(passwordInput, 'password123');
      await user.click(submitBtn);

      // Redirected back to /checkout with cart retained intact (CART-09)
      await waitUntilCheckoutReady();

      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-total')).toHaveTextContent(
        formatCurrency(5000)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // TC-13: Register with duplicate email (AUTH-08)
  // ---------------------------------------------------------------------------
  describe('TC-13: Register with duplicate email (AUTH-08)', () => {
    it('rejects registration with duplicate email and creates no account', async () => {
      const user = userEvent.setup();

      render(<BuyerJourneyApp initialEntries={['/register']} />);

      expect(
        await screen.findByRole('heading', { name: /Join Vegetable Joint/i })
      ).toBeInTheDocument();

      // Enter details with duplicate email already taken in mockStore (buyer@example.com)
      const nameInput = screen.getByTestId('register-name-input');
      const emailInput = screen.getByTestId('register-email-input');
      const passwordInput = screen.getByTestId('register-password-input');
      const confirmInput = screen.getByTestId(
        'register-confirm-password-input'
      );
      const submitBtn = screen.getByTestId('register-submit-btn');

      await user.type(nameInput, 'Amina Bello');
      await user.type(emailInput, 'buyer@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmInput, 'password123');
      await user.click(submitBtn);

      // Rejected with field error (AUTH-08)
      const duplicateErrors = await screen.findAllByText(
        /The email has already been taken/i
      );
      expect(duplicateErrors.length).toBeGreaterThan(0);

      // User remains on registration page
      expect(screen.getByTestId('register-submit-btn')).toBeInTheDocument();
      expect(localStorage.getItem('vegetable_joint_token')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // TC-14: Login with wrong password (AUTH-04, AUTH-09)
  // ---------------------------------------------------------------------------
  describe('TC-14: Login with wrong password (AUTH-04, AUTH-09)', () => {
    it('returns generic "Invalid login credentials." and discloses nothing about email existence', async () => {
      const user = userEvent.setup();

      render(<BuyerJourneyApp initialEntries={['/login']} />);

      expect(
        await screen.findByRole('heading', {
          name: /Sign In to Vegetable Joint/i,
        })
      ).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const submitBtn = screen.getByRole('button', { name: /Sign In/i });

      // Valid email with incorrect password
      await user.type(emailInput, 'buyer@example.com');
      await user.type(passwordInput, 'wrongPassword999');
      await user.click(submitBtn);

      // Generic invalid credentials message displayed (AUTH-04, AUTH-09)
      const errorMsg = await screen.findByTestId('login-error-message');
      expect(errorMsg).toHaveTextContent(/Invalid login credentials\./i);

      // No token issued; user remains on login page
      expect(localStorage.getItem('vegetable_joint_token')).toBeNull();
      expect(
        screen.getByRole('button', { name: /Sign In/i })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TC-15: Place order with valid cart and delivery details (CHK-03 to CHK-08)
  // ---------------------------------------------------------------------------
  describe('TC-15: Place order with valid cart and delivery details (CHK-03 to CHK-08)', () => {
    it('creates Pending order, displays confirmation, clears cart, and decrements stock', async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(sampleDeliveryAddress)
      );

      const initialCart = [
        {
          id: 1,
          product_id: 1,
          name: 'Fresh Roma Tomatoes',
          price: 2500,
          unit: 'basket',
          quantity: 2,
          available_stock: 45,
          subtotal: 5000,
          seller_id: 1,
          seller: {
            id: 1,
            business_name: 'Arewa Fresh Farms',
            location: 'Gombe',
          },
        },
      ];

      // Initial product stock before order
      const initialStock = mockStore.products.find((p) => p.id === 1).quantity;
      expect(initialStock).toBe(45);

      render(
        <BuyerJourneyApp
          initialEntries={['/checkout']}
          initialUser={defaultBuyerUser}
          initialCart={initialCart}
        />
      );

      // Wait until checkout is loaded and cart re-validation completes
      await waitUntilCheckoutReady();

      // Proceed to review modal (CHK-03)
      const reviewBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(reviewBtn);

      // Order review modal opens with order details
      const modal = await screen.findByTestId('checkout-review-modal');
      expect(
        within(modal).getByTestId('review-delivery-section')
      ).toBeInTheDocument();
      expect(
        within(modal).getByTestId('review-recipient-name')
      ).toHaveTextContent('Amina Bello');
      expect(within(modal).getByTestId('review-order-total')).toHaveTextContent(
        formatCurrency(5000)
      );

      // Explicit confirmation checkbox inside modal (CHK-03)
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);
      expect(confirmCheckbox).toBeChecked();

      // Confirm & Place Order
      const confirmPlaceBtn = within(modal).getByTestId(
        'checkout-confirm-place-order-button'
      );
      await user.click(confirmPlaceBtn);

      // Navigates to confirmation page (CHK-08)
      expect(
        await screen.findByTestId('order-confirmation-page')
      ).toBeInTheDocument();

      // Verify confirmation page details:
      // 1. Order status is Pending (CHK-06)
      const statusBadge = screen.getByTestId('confirmation-order-status');
      expect(statusBadge).toHaveTextContent(/pending/i);

      // 2. Human-readable order number (CHK-06)
      const orderNumber = screen.getByTestId('confirmation-order-number');
      expect(orderNumber.textContent).toMatch(/VJ-\d{8}-\d{3}/);

      // 3. Delivery Details (CHK-08)
      expect(
        screen.getByTestId('confirmation-recipient-name')
      ).toHaveTextContent('Amina Bello');
      expect(
        screen.getByTestId('confirmation-delivery-address')
      ).toHaveTextContent(/14 Bompai Road, Nassarawa, Kano/i);

      // 4. Items snapshot (CHK-06)
      expect(screen.getByTestId('confirmation-item-name')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('confirmation-grand-total')).toHaveTextContent(
        formatCurrency(5000)
      );

      // 5. Cart cleared from localStorage and navbar count removed (CHK-08)
      const rawStoredCart = localStorage.getItem('vegetable_joint_cart');
      const parsedCart = rawStoredCart ? JSON.parse(rawStoredCart) : [];
      expect(parsedCart).toHaveLength(0);
      expect(screen.queryByTestId('navbar-cart-badge')).not.toBeInTheDocument();

      // 6. Stock decremented atomically in store (CHK-07)
      const updatedStock = mockStore.products.find((p) => p.id === 1).quantity;
      expect(updatedStock).toBe(43); // 45 - 2 = 43
    });
  });

  // ---------------------------------------------------------------------------
  // TC-16: Cart with items from two sellers (CHK-05)
  // ---------------------------------------------------------------------------
  describe('TC-16: Cart with items from two sellers (CHK-05)', () => {
    it('creates two independent orders sharing one checkout reference', async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(sampleDeliveryAddress)
      );

      const multiSellerCart = [
        {
          id: 1,
          product_id: 1,
          name: 'Fresh Roma Tomatoes',
          price: 2500,
          unit: 'basket',
          quantity: 2,
          available_stock: 45,
          subtotal: 5000,
          seller_id: 1,
          seller: {
            id: 1,
            business_name: 'Arewa Fresh Farms',
            location: 'Gombe',
          },
        },
        {
          id: 4,
          product_id: 4,
          name: 'Fresh Spinach (Alayyaho / Shoko)',
          price: 900,
          unit: 'bunch',
          quantity: 3,
          available_stock: 30,
          subtotal: 2700,
          seller_id: 2,
          seller: {
            id: 2,
            business_name: 'Green Harvest Co-op',
            location: 'Kaduna',
          },
        },
      ];

      render(
        <BuyerJourneyApp
          initialEntries={['/cart']}
          initialUser={defaultBuyerUser}
          initialCart={multiSellerCart}
        />
      );

      // Cart shows 2 seller groups and multi-seller checkout note
      expect(await screen.findByTestId('seller-group-1')).toBeInTheDocument();
      expect(screen.getByTestId('seller-group-2')).toBeInTheDocument();
      expect(
        screen.getByTestId('cart-multi-seller-notice')
      ).toBeInTheDocument();
      expect(screen.getByTestId('cart-grand-total')).toHaveTextContent(
        formatCurrency(7700)
      );

      // Proceed to checkout
      await user.click(screen.getByTestId('cart-checkout-button'));

      // Wait until checkout is loaded and cart re-validation completes
      await waitUntilCheckoutReady();

      // Open review modal
      await user.click(screen.getByTestId('checkout-place-order-button'));

      // In review modal, explicit confirm and place order
      const modal = await screen.findByTestId('checkout-review-modal');
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);
      await user.click(
        within(modal).getByTestId('checkout-confirm-place-order-button')
      );

      // On confirmation page:
      expect(
        await screen.findByTestId('order-confirmation-page')
      ).toBeInTheDocument();

      // Multi-seller split notice displayed (CHK-05)
      const splitNotice = screen.getByTestId('confirmation-split-notice');
      expect(splitNotice).toBeInTheDocument();
      expect(splitNotice).toHaveTextContent(/Multi-Seller Order/i);

      // Verify two order cards created
      const orderNumbers = screen.getAllByTestId('confirmation-order-number');
      expect(orderNumbers).toHaveLength(2);

      const sellerNames = screen.getAllByTestId('confirmation-seller-name');
      expect(sellerNames[0]).toHaveTextContent('Arewa Fresh Farms');
      expect(sellerNames[1]).toHaveTextContent('Green Harvest Cooperative');

      // Verify grand total combines both orders (5000 + 2700 = 7700)
      expect(screen.getByTestId('confirmation-grand-total')).toHaveTextContent(
        formatCurrency(7700)
      );

      // Verify in store that two distinct orders were created sharing the same checkout_ref
      const recentOrders = mockStore.orders.slice(0, 2);
      expect(recentOrders).toHaveLength(2);
      expect(recentOrders[0].seller_id).not.toBe(recentOrders[1].seller_id);
      expect(recentOrders[0].checkout_ref).toBe(recentOrders[1].checkout_ref);
    });
  });

  // ---------------------------------------------------------------------------
  // Complete Full End-to-End Buyer Purchase Journey
  // Browse -> Product Detail -> Add to Cart -> Cart -> Guest Checkout -> Login -> Checkout -> Confirmation
  // ---------------------------------------------------------------------------
  describe('Full End-to-End Buyer Purchase Flow', () => {
    it('executes the complete buyer flow from browse to order confirmation smoothly', async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        DELIVERY_DETAILS_STORAGE_KEY,
        JSON.stringify(sampleDeliveryAddress)
      );

      // Start at product details for Product 1 (Fresh Roma Tomatoes)
      render(<BuyerJourneyApp initialEntries={['/products/1']} />);

      // 1. Browse & Verify Product Details (TC-08)
      expect(await screen.findByTestId('product-name')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.queryByTestId('navbar-cart-badge')).not.toBeInTheDocument();

      // 2. Add to Cart (TC-08)
      await user.click(screen.getByTestId('add-to-cart-button'));
      expect(await screen.findByTestId('navbar-cart-badge')).toHaveTextContent(
        '1'
      );

      // 3. View Cart (TC-09)
      const cartLink = screen.getByRole('link', { name: /shopping cart/i });
      await user.click(cartLink);
      expect(await screen.findByTestId('cart-page')).toBeInTheDocument();
      expect(screen.getByTestId('cart-item-subtotal-1')).toHaveTextContent(
        formatCurrency(2500)
      );

      // Increase quantity in cart
      await user.click(
        screen.getByRole('button', { name: /increase quantity/i })
      );
      await waitFor(() => {
        expect(screen.getByTestId('cart-item-subtotal-1')).toHaveTextContent(
          formatCurrency(5000)
        );
      });
      expect(screen.getByTestId('navbar-cart-badge')).toHaveTextContent('2');

      // 4. Guest attempts checkout -> Redirected to login (TC-12)
      await user.click(screen.getByTestId('cart-checkout-button'));
      expect(
        await screen.findByTestId('checkout-guest-notice')
      ).toBeInTheDocument();

      // 5. Sign in as Buyer
      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      await user.type(emailInput, 'buyer@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(screen.getByRole('button', { name: /Sign In/i }));

      // 6. Arrives at Checkout with cart intact
      await waitUntilCheckoutReady();
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-total')).toHaveTextContent(
        formatCurrency(5000)
      );

      // 7. Proceed to review modal
      await user.click(screen.getByTestId('checkout-place-order-button'));

      // 8. Explicitly confirm and place order in review modal
      const modal = await screen.findByTestId('checkout-review-modal');
      const confirmCheckbox = within(modal).getByTestId(
        'checkout-explicit-confirm-checkbox'
      );
      await user.click(confirmCheckbox);
      await user.click(
        within(modal).getByTestId('checkout-confirm-place-order-button')
      );

      // 9. Order confirmation displayed (TC-15)
      expect(
        await screen.findByTestId('order-confirmation-page')
      ).toBeInTheDocument();
      expect(screen.getByTestId('confirmation-order-status')).toHaveTextContent(
        /pending/i
      );
      expect(screen.getByTestId('confirmation-item-name')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('confirmation-grand-total')).toHaveTextContent(
        formatCurrency(5000)
      );

      // Cart emptied and stock reduced
      expect(screen.queryByTestId('navbar-cart-badge')).not.toBeInTheDocument();
      const updatedStock = mockStore.products.find((p) => p.id === 1).quantity;
      expect(updatedStock).toBe(43);
    });
  });
});
