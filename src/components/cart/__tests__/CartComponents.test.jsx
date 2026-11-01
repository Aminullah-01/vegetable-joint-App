import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CartItem } from '../CartItem';
import { CartSummary } from '../CartSummary';
import { CartValidationNotices } from '../CartValidationNotices';
import { AuthContext } from '../../../context/authContextDef';

describe('Cart Components (FE-029, FE-030, CART-02, CART-03, CART-04, CART-05, CART-08, CHK-05)', () => {
  // ============================================================================
  // 1. CartItem Component
  // ============================================================================
  describe('CartItem Component (CART-02, CART-03, CART-04, NFR-USAB-03, NFR-USAB-04)', () => {
    const sampleItem = {
      id: 10,
      product_id: 1,
      name: 'Fresh Roma Tomatoes',
      price: 2500,
      quantity: 2,
      unit: 'basket',
      available_stock: 10,
      seller_id: 2,
      seller_name: 'Kaduna Organic Farms',
      seller_location: 'Kaduna',
      image: 'https://images.unsplash.com/photo-tomatoes',
    };

    it('renders all required cart line elements: name, image, unit price, quantity, and line subtotal (CART-04)', () => {
      render(
        <MemoryRouter>
          <CartItem item={sampleItem} />
        </MemoryRouter>
      );

      // 1. Heading Name
      expect(
        screen.getByRole('heading', { level: 2, name: 'Fresh Roma Tomatoes' })
      ).toBeInTheDocument();

      // 2. Unit price formatted in Naira with unit (NFR-USAB-04)
      expect(screen.getByText('₦2,500 / basket')).toBeInTheDocument();

      // 3. Line Subtotal (2 * 2500 = 5000)
      expect(screen.getByText('₦5,000')).toBeInTheDocument();

      // 4. Seller and location
      expect(screen.getByText('Kaduna Organic Farms')).toBeInTheDocument();
      expect(screen.getByText('Kaduna')).toBeInTheDocument();

      // 5. Quantity selector
      const qtyInput = screen.getByRole('spinbutton', {
        name: 'Quantity amount',
      });
      expect(qtyInput).toHaveValue(2);
    });

    it('emits onUpdateQuantity when quantity is changed', async () => {
      const user = userEvent.setup();
      const handleUpdate = vi.fn();

      render(
        <MemoryRouter>
          <CartItem item={sampleItem} onUpdateQuantity={handleUpdate} />
        </MemoryRouter>
      );

      const incBtn = screen.getByRole('button', { name: 'Increase quantity' });
      await user.click(incBtn);

      expect(handleUpdate).toHaveBeenCalledWith(1, 3);
    });

    it('emits onRemove when remove button is clicked (CART-03)', async () => {
      const user = userEvent.setup();
      const handleRemove = vi.fn();

      render(
        <MemoryRouter>
          <CartItem item={sampleItem} onRemove={handleRemove} />
        </MemoryRouter>
      );

      const removeBtn = screen.getByRole('button', {
        name: /Remove Fresh Roma Tomatoes from cart/i,
      });
      expect(removeBtn).toHaveStyle({ minWidth: '44px', minHeight: '44px' });

      await user.click(removeBtn);
      expect(handleRemove).toHaveBeenCalledWith(1);
    });

    it('displays stock limit reached warning when quantity equals available stock', () => {
      const maxStockItem = {
        ...sampleItem,
        quantity: 5,
        available_stock: 5,
      };

      render(
        <MemoryRouter>
          <CartItem item={maxStockItem} />
        </MemoryRouter>
      );

      expect(
        screen.getByText(/Max available stock reached/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Increase quantity' })
      ).toBeDisabled();
    });

    it('disables quantity selector and remove button when disabled is true', () => {
      render(
        <MemoryRouter>
          <CartItem item={sampleItem} disabled />
        </MemoryRouter>
      );

      expect(screen.getByRole('spinbutton')).toBeDisabled();
      expect(
        screen.getByRole('button', {
          name: /Remove Fresh Roma Tomatoes from cart/i,
        })
      ).toBeDisabled();
    });

    it('renders fallback vegetable placeholder when image is missing', () => {
      const noImageItem = {
        ...sampleItem,
        image: null,
      };

      render(
        <MemoryRouter>
          <CartItem item={noImageItem} />
        </MemoryRouter>
      );

      expect(
        screen.getByRole('img', { name: 'Fresh Roma Tomatoes' })
      ).toBeInTheDocument();
    });

    it('returns null when item prop is omitted or null', () => {
      const { container } = render(
        <MemoryRouter>
          <CartItem item={null} />
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================================================
  // 2. CartSummary Component
  // ============================================================================
  describe('CartSummary Component (CART-04, CART-05, CHK-05, BR-06)', () => {
    it('renders items subtotal and total formatted in Naira (CART-04, NFR-USAB-04)', () => {
      render(
        <MemoryRouter>
          <CartSummary
            subtotal={15000}
            total={15000}
            itemCount={4}
            uniqueItemCount={2}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByTestId('cart-summary-subtotal')).toHaveTextContent(
        '₦15,000'
      );
      expect(screen.getByTestId('cart-grand-total')).toHaveTextContent(
        '₦15,000'
      );
      expect(screen.getByText(/4 items, 2 varieties/i)).toBeInTheDocument();
    });

    it('displays multi-seller order split disclosure when sellersCount > 1 (CHK-05, BR-06)', () => {
      render(
        <MemoryRouter>
          <CartSummary
            subtotal={12000}
            total={12000}
            itemCount={3}
            sellersCount={2}
          />
        </MemoryRouter>
      );

      expect(
        screen.getByTestId('cart-multi-seller-notice')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Items from 2 different sellers/i)
      ).toBeInTheDocument();
    });

    it('displays guest checkout prompt when user is not authenticated', () => {
      const mockGuestAuth = {
        isAuthenticated: false,
        user: null,
      };

      render(
        <AuthContext.Provider value={mockGuestAuth}>
          <MemoryRouter>
            <CartSummary subtotal={5000} total={5000} itemCount={2} />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(
        screen.getByTestId('cart-guest-checkout-hint')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /You will be asked to sign in or register at checkout/i
        )
      ).toBeInTheDocument();
    });

    it('renders Proceed to Checkout and Continue Shopping action buttons (CART-05)', () => {
      render(
        <MemoryRouter>
          <CartSummary subtotal={7500} total={7500} itemCount={3} />
        </MemoryRouter>
      );

      const checkoutBtn = screen.getByRole('link', {
        name: /Proceed to Checkout/i,
      });
      expect(checkoutBtn).toBeInTheDocument();
      expect(checkoutBtn).toHaveAttribute('href', '/checkout');
      expect(checkoutBtn).toHaveStyle({ minHeight: '48px' });

      const continueBtn = screen.getByRole('link', {
        name: /Continue Shopping/i,
      });
      expect(continueBtn).toBeInTheDocument();
      expect(continueBtn).toHaveAttribute('href', '/products');
    });

    it('disables checkout button when disabled prop is true', () => {
      render(
        <MemoryRouter>
          <CartSummary subtotal={0} total={0} itemCount={0} disabled={true} />
        </MemoryRouter>
      );

      const checkoutBtn = screen.getByRole('button', {
        name: /Proceed to Checkout/i,
      });
      expect(checkoutBtn).toBeDisabled();
    });
  });

  // ============================================================================
  // 3. CartValidationNotices Component
  // ============================================================================
  describe('CartValidationNotices Component (CART-08, TC-18, ERR-01)', () => {
    const sampleChanges = [
      {
        type: 'price_changed',
        name: 'Fresh Roma Tomatoes',
        old_price: 2000,
        new_price: 2500,
        unit: 'basket',
      },
      {
        type: 'stock_reduced',
        name: 'Bell Peppers',
        new_quantity: 3,
        old_quantity: 5,
        unit: 'kg',
      },
      {
        type: 'unavailable',
        name: 'Organic Spinach',
      },
    ];

    it('renders alert banner with all structured changes (CART-08, TC-18)', () => {
      render(<CartValidationNotices changes={sampleChanges} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();

      // Price update notice
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
      expect(screen.getByText('₦2,000')).toBeInTheDocument();
      expect(screen.getByText('₦2,500')).toBeInTheDocument();

      // Stock reduction notice
      expect(screen.getByText('Bell Peppers')).toBeInTheDocument();
      expect(
        screen.getByText(/Quantity adjusted to 3 \(requested 5\)/i)
      ).toBeInTheDocument();

      // Unavailable notice
      expect(screen.getByText('Organic Spinach')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Item is out of stock \/ unavailable and removed from order/i
        )
      ).toBeInTheDocument();
    });

    it('triggers onAccept and onReviewCart callbacks when action buttons are clicked', async () => {
      const user = userEvent.setup();
      const handleAccept = vi.fn();
      const handleReview = vi.fn();

      render(
        <CartValidationNotices
          changes={sampleChanges}
          onAccept={handleAccept}
          onReviewCart={handleReview}
        />
      );

      const acceptBtn = screen.getByRole('button', {
        name: /Accept Changes & Proceed/i,
      });
      await user.click(acceptBtn);
      expect(handleAccept).toHaveBeenCalledTimes(1);

      const reviewBtn = screen.getByRole('button', {
        name: /Review in Cart/i,
      });
      await user.click(reviewBtn);
      expect(handleReview).toHaveBeenCalledTimes(1);
    });

    it('hides action buttons when showActions is false', () => {
      render(
        <CartValidationNotices changes={sampleChanges} showActions={false} />
      );

      expect(
        screen.queryByRole('button', { name: /Accept Changes & Proceed/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Review in Cart/i })
      ).not.toBeInTheDocument();
    });

    it('returns null when changes array is empty and notice is empty', () => {
      const { container } = render(
        <CartValidationNotices changes={[]} notice="" />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
