import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Cart } from '../Cart';
import { CartItem } from '../../../components/cart/CartItem';
import { CartSummary } from '../../../components/cart/CartSummary';
import { CartContext } from '../../../context/cartContextDef.js';
import { ToastContext } from '../../../context/toastContextDef.js';
import { CartProvider } from '../../../context/CartContext.jsx';
import { STRINGS } from '../../../constants';
import { formatCurrency, formatPrice } from '../../../utils';

// Helper to render Cart with custom cart context state
function renderWithCartContext(
  customCartValue = {},
  customToastValue = {},
  route = '/cart'
) {
  const defaultCartValue = {
    items: [],
    itemCount: 0,
    uniqueItemCount: 0,
    subtotal: 0,
    total: 0,
    isEmpty: true,
    validationNotice: null,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    validateCart: vi.fn(),
    ...customCartValue,
  };

  const defaultToastValue = {
    show: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
    clear: vi.fn(),
    ...customToastValue,
  };

  return {
    cartValue: defaultCartValue,
    toastValue: defaultToastValue,
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <ToastContext.Provider value={defaultToastValue}>
          <CartContext.Provider value={defaultCartValue}>
            <Routes>
              <Route path="/cart" element={<Cart />} />
              <Route path="/products" element={<div>Products Page</div>} />
              <Route path="/checkout" element={<div>Checkout Page</div>} />
              <Route
                path="/products/:id"
                element={<div>Product Details Page</div>}
              />
              <Route
                path="/sellers/:id"
                element={<div>Seller Profile Page</div>}
              />
              <Route path="/" element={<div>Home Page</div>} />
            </Routes>
          </CartContext.Provider>
        </ToastContext.Provider>
      </MemoryRouter>
    ),
  };
}

// Sample test items
const mockItems = [
  {
    product_id: 101,
    name: 'Fresh Tomatoes',
    price: 2500,
    unit: 'basket',
    quantity: 2,
    image: 'https://example.com/tomatoes.jpg',
    seller_id: 1,
    seller_name: 'Green Valley Farms',
    seller_location: 'Kano, Nigeria',
    available_stock: 15,
    subtotal: 5000,
  },
  {
    product_id: 102,
    name: 'Fresh Ugwu (Fluted Pumpkin)',
    price: 1200,
    unit: 'bunch',
    quantity: 3,
    image: '',
    seller_id: 2,
    seller_name: 'Sunrise Organics',
    seller_location: 'Oyo, Nigeria',
    available_stock: 20,
    subtotal: 3600,
  },
];

describe('Cart Page Layout (FE-054 / CART-04, CART-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty Cart State (CART-05)', () => {
    it('renders empty state with "Your cart is empty." message and blocks checkout', () => {
      renderWithCartContext({
        items: [],
        itemCount: 0,
        subtotal: 0,
        total: 0,
        isEmpty: true,
      });

      // Verify empty heading per CART-05 & ERR-01 verbatim
      expect(
        screen.getByRole('heading', {
          name: STRINGS.CART.EMPTY_TITLE,
          level: 3,
        })
      ).toBeInTheDocument();
      expect(screen.getByText(STRINGS.CART.EMPTY_SUBTITLE)).toBeInTheDocument();

      // Verify Start Shopping CTA button linking to /products
      const startShoppingBtn = screen.getByTestId('cart-empty-start-shopping');
      expect(startShoppingBtn).toBeInTheDocument();
      expect(startShoppingBtn.closest('a')).toHaveAttribute(
        'href',
        '/products'
      );

      // Verify Proceed to Checkout is NOT rendered/available
      expect(
        screen.queryByTestId('cart-checkout-button')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('cart-summary')).not.toBeInTheDocument();
    });
  });

  describe('Cart Page with Populated Line Items (CART-04, CART-05)', () => {
    it('renders line items with product, quantity, unit price, and subtotal', () => {
      renderWithCartContext({
        items: mockItems,
        itemCount: 5,
        uniqueItemCount: 2,
        subtotal: 8600,
        total: 8600,
        isEmpty: false,
      });

      // Verify Cart Title and Item count badge
      expect(
        screen.getByRole('heading', {
          name: STRINGS.CART.TITLE,
          level: 1,
        })
      ).toBeInTheDocument();
      expect(screen.getByTestId('cart-item-count-badge')).toHaveTextContent(
        '5 items'
      );

      // Verify Line Item 1: Fresh Tomatoes
      const item1 = screen.getByTestId('cart-item-101');
      expect(within(item1).getByText('Fresh Tomatoes')).toBeInTheDocument();
      expect(within(item1).getByText('Green Valley Farms')).toBeInTheDocument();
      expect(
        within(item1).getByTestId('cart-item-unit-price-101')
      ).toHaveTextContent(formatPrice(2500, 'basket'));
      expect(
        within(item1).getByTestId('cart-item-subtotal-101')
      ).toHaveTextContent(formatCurrency(5000));

      // Verify Line Item 2: Fresh Ugwu
      const item2 = screen.getByTestId('cart-item-102');
      expect(
        within(item2).getByText('Fresh Ugwu (Fluted Pumpkin)')
      ).toBeInTheDocument();
      expect(within(item2).getByText('Sunrise Organics')).toBeInTheDocument();
      expect(
        within(item2).getByTestId('cart-item-unit-price-102')
      ).toHaveTextContent(formatPrice(1200, 'bunch'));
      expect(
        within(item2).getByTestId('cart-item-subtotal-102')
      ).toHaveTextContent(formatCurrency(3600));

      // Verify Grand Total in Order Summary (CART-04)
      const summary = screen.getByTestId('cart-summary');
      expect(
        within(summary).getByTestId('cart-summary-subtotal')
      ).toHaveTextContent(formatCurrency(8600));
      expect(within(summary).getByTestId('cart-grand-total')).toHaveTextContent(
        formatCurrency(8600)
      );

      // Verify "Proceed to Checkout" button (CART-05)
      const checkoutBtn = screen.getByTestId('cart-checkout-button');
      expect(checkoutBtn).toBeInTheDocument();
      expect(checkoutBtn).toHaveTextContent(STRINGS.CART.PROCEED_TO_CHECKOUT);
      expect(checkoutBtn.closest('a')).toHaveAttribute('href', '/checkout');

      // Verify "Continue Shopping" button (CART-05)
      const continueShoppingBtn = screen.getByTestId(
        'cart-continue-shopping-button'
      );
      expect(continueShoppingBtn).toBeInTheDocument();
      expect(continueShoppingBtn).toHaveTextContent(
        STRINGS.CART.CONTINUE_SHOPPING
      );
      expect(continueShoppingBtn.closest('a')).toHaveAttribute(
        'href',
        '/products'
      );
    });

    it('displays multi-seller notification when cart contains items from multiple vendors (CHK-05, BR-06)', () => {
      renderWithCartContext({
        items: mockItems, // Contains Seller 1 and Seller 2
        itemCount: 5,
        subtotal: 8600,
        total: 8600,
        isEmpty: false,
      });

      const multiSellerNotice = screen.getByTestId('cart-multi-seller-notice');
      expect(multiSellerNotice).toBeInTheDocument();
      expect(multiSellerNotice).toHaveTextContent(
        'Items from 2 different sellers'
      );
      expect(multiSellerNotice).toHaveTextContent(
        'items from each seller will be placed as independent orders'
      );
    });

    it('renders breadcrumb navigation to Home and Marketplace', () => {
      renderWithCartContext({
        items: mockItems,
        itemCount: 5,
        subtotal: 8600,
        total: 8600,
        isEmpty: false,
      });

      const breadcrumb = screen.getByRole('navigation', {
        name: /breadcrumb/i,
      });
      expect(breadcrumb).toBeInTheDocument();
      expect(within(breadcrumb).getByText('Home')).toHaveAttribute('href', '/');
      expect(within(breadcrumb).getByText('Marketplace')).toHaveAttribute(
        'href',
        '/products'
      );
      expect(within(breadcrumb).getByText('Shopping Cart')).toBeInTheDocument();
    });

    it('renders re-validation notice if validation notice exists (CART-08)', () => {
      renderWithCartContext({
        items: mockItems,
        itemCount: 5,
        subtotal: 8600,
        total: 8600,
        isEmpty: false,
        validationNotice:
          'Some items in your cart had price or stock changes and have been adjusted.',
      });

      const alert = screen.getByTestId('cart-validation-notice');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(
        'Some items in your cart had price or stock changes and have been adjusted.'
      );
    });
  });

  describe('Interactive Cart Actions (CART-02, CART-03, CART-05)', () => {
    it('triggers updateQuantity when quantity increment or decrement button is clicked', async () => {
      const user = userEvent.setup();
      const updateQuantityMock = vi.fn();

      renderWithCartContext({
        items: [mockItems[0]],
        itemCount: 2,
        subtotal: 5000,
        total: 5000,
        isEmpty: false,
        updateQuantity: updateQuantityMock,
      });

      const item = screen.getByTestId('cart-item-101');
      const incrementBtn = within(item).getByRole('button', {
        name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
      });
      await user.click(incrementBtn);

      expect(updateQuantityMock).toHaveBeenCalledWith(101, 3);

      const decrementBtn = within(item).getByRole('button', {
        name: STRINGS.PRODUCTS.DECREASE_QUANTITY,
      });
      await user.click(decrementBtn);

      expect(updateQuantityMock).toHaveBeenCalledWith(101, 1);
    });

    it('triggers removeItem and notifies user with toast when remove button is clicked', async () => {
      const user = userEvent.setup();
      const removeItemMock = vi.fn();
      const toastInfoMock = vi.fn();

      renderWithCartContext(
        {
          items: [mockItems[0]],
          itemCount: 2,
          subtotal: 5000,
          total: 5000,
          isEmpty: false,
          removeItem: removeItemMock,
        },
        {
          info: toastInfoMock,
        }
      );

      const removeBtn = screen.getByTestId('cart-remove-button-101');
      await user.click(removeBtn);

      expect(removeItemMock).toHaveBeenCalledWith(101);
      expect(toastInfoMock).toHaveBeenCalledWith(
        'Removed "Fresh Tomatoes" from your cart.'
      );
    });

    it('opens confirm dialog when Clear Cart is clicked and clears cart on confirmation', async () => {
      const user = userEvent.setup();
      const clearCartMock = vi.fn();
      const toastInfoMock = vi.fn();

      renderWithCartContext(
        {
          items: mockItems,
          itemCount: 5,
          subtotal: 8600,
          total: 8600,
          isEmpty: false,
          clearCart: clearCartMock,
        },
        {
          info: toastInfoMock,
        }
      );

      const clearBtn = screen.getByTestId('clear-cart-button');
      await user.click(clearBtn);

      // Verify confirmation dialog is visible
      expect(
        screen.getByRole('heading', {
          name: 'Clear your shopping cart?',
          level: 2,
        })
      ).toBeInTheDocument();

      const confirmBtn = screen.getByTestId('clear-cart-dialog-confirm-button');
      await user.click(confirmBtn);

      expect(clearCartMock).toHaveBeenCalledTimes(1);
      expect(toastInfoMock).toHaveBeenCalledWith(
        'Your shopping cart has been cleared.'
      );
    });
  });

  describe('Integration with CartProvider', () => {
    it('manages adding, updating, removing items, and grand totals end-to-end', async () => {
      function CartIntegrationWrapper() {
        return (
          <MemoryRouter initialEntries={['/cart']}>
            <CartProvider>
              <Routes>
                <Route path="/cart" element={<Cart />} />
                <Route path="/products" element={<div>Products Catalog</div>} />
                <Route path="/checkout" element={<div>Checkout Page</div>} />
              </Routes>
            </CartProvider>
          </MemoryRouter>
        );
      }

      const { unmount } = render(<CartIntegrationWrapper />);

      // Initially empty
      expect(
        screen.getByRole('heading', {
          name: STRINGS.CART.EMPTY_TITLE,
          level: 3,
        })
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('cart-checkout-button')
      ).not.toBeInTheDocument();

      unmount();
    });
  });

  describe('CartItem Component (CART-04)', () => {
    it('renders with placeholder when image is missing and displays unit price with unit', () => {
      const itemWithoutImage = {
        product_id: 105,
        name: 'Fresh Carrots',
        price: 1500,
        unit: 'kg',
        quantity: 2,
        image: '',
        available_stock: 10,
        subtotal: 3000,
      };

      render(
        <MemoryRouter>
          <CartItem
            item={itemWithoutImage}
            onUpdateQuantity={vi.fn()}
            onRemove={vi.fn()}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Fresh Carrots')).toBeInTheDocument();
      expect(screen.getByTestId('cart-item-unit-price-105')).toHaveTextContent(
        formatPrice(1500, 'kg')
      );
      expect(screen.getByTestId('cart-item-subtotal-105')).toHaveTextContent(
        formatCurrency(3000)
      );
      expect(screen.getByTestId('lazy-image-placeholder')).toBeInTheDocument();
    });

    it('returns null if item is missing', () => {
      const { container } = render(
        <MemoryRouter>
          <CartItem item={null} />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('CartSummary Component (CART-04, CART-05)', () => {
    it('disables checkout button when disabled prop is true or itemCount is 0', () => {
      render(
        <MemoryRouter>
          <CartSummary subtotal={0} total={0} itemCount={0} disabled />
        </MemoryRouter>
      );

      const checkoutBtn = screen.getByTestId('cart-checkout-button');
      expect(checkoutBtn).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
