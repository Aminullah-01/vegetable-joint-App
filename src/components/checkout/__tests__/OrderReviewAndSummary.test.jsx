import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrderReviewModal } from '../OrderReviewModal';
import { OrderSummary } from '../OrderSummary';

describe('Checkout Component Tests: OrderReviewModal & OrderSummary (FE-035, CHK-03, CHK-04, CHK-05, CHK-09, BR-02, BR-06)', () => {
  const sampleItems = [
    {
      id: 1,
      product_id: 1,
      name: 'Fresh Roma Tomatoes',
      price: 2500,
      quantity: 2,
      unit: 'basket',
      seller_id: 10,
      seller: {
        id: 10,
        business_name: 'Kaduna Greens',
        location: 'Kaduna',
      },
    },
    {
      id: 2,
      product_id: 2,
      name: 'Bell Peppers',
      price: 1800,
      quantity: 1,
      unit: 'kg',
      seller_id: 20,
      seller: {
        id: 20,
        business_name: 'Jos Farm Hub',
        location: 'Plateau',
      },
    },
  ];

  const sampleDelivery = {
    name: 'Amina Bello',
    phone: '08031234567',
    street: '14 Yakubu Gowon Way',
    town: 'Kaduna',
    state: 'Kaduna',
    notes: 'Call when arriving at the gate',
  };

  // ============================================================================
  // 1. OrderReviewModal Tests
  // ============================================================================
  describe('OrderReviewModal Component (CHK-03, CHK-05, CHK-09, Figma Section 10)', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <MemoryRouter>
          <OrderReviewModal
            isOpen={false}
            onClose={vi.fn()}
            onConfirmOrder={vi.fn()}
            items={sampleItems}
            deliveryDetails={sampleDelivery}
          />
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders modal dialog with grouped seller orders, delivery address, and payment method (CHK-03, CHK-05, CHK-09)', () => {
      render(
        <MemoryRouter>
          <OrderReviewModal
            isOpen={true}
            onClose={vi.fn()}
            onConfirmOrder={vi.fn()}
            items={sampleItems}
            deliveryDetails={sampleDelivery}
            subtotal={6800}
            total={6800}
          />
        </MemoryRouter>
      );

      // Modal dialog & heading
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByText('Review & Confirm Your Order (CHK-03)')
      ).toBeInTheDocument();

      // Multi-seller group splitting (CHK-05)
      expect(screen.getByText(/Kaduna Greens/i)).toBeInTheDocument();
      expect(screen.getByText(/Jos Farm Hub/i)).toBeInTheDocument();
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
      expect(screen.getByText('Bell Peppers')).toBeInTheDocument();

      // Delivery Information
      expect(screen.getByTestId('review-recipient-name')).toHaveTextContent(
        'Amina Bello'
      );
      expect(screen.getByTestId('review-phone')).toHaveTextContent(
        '08031234567'
      );
      expect(screen.getByTestId('review-address')).toHaveTextContent(
        '14 Yakubu Gowon Way, Kaduna, Kaduna'
      );
      expect(screen.getByTestId('review-notes')).toHaveTextContent(
        'Call when arriving at the gate'
      );

      // Pay on Delivery disclosure (CHK-09)
      expect(
        screen.getByText(/Pay on delivery \/ pay seller directly/i)
      ).toBeInTheDocument();

      // Total amount
      expect(screen.getByTestId('review-order-total')).toHaveTextContent(
        '₦6,800'
      );
    });

    it('requires explicit confirmation checkbox before enabling Place Order button (CHK-03)', async () => {
      const user = userEvent.setup();
      const handleToggleConfirm = vi.fn();
      const handleConfirmOrder = vi.fn();

      const { rerender } = render(
        <MemoryRouter>
          <OrderReviewModal
            isOpen={true}
            onClose={vi.fn()}
            onConfirmOrder={handleConfirmOrder}
            items={sampleItems}
            deliveryDetails={sampleDelivery}
            hasConfirmed={false}
            onToggleConfirm={handleToggleConfirm}
          />
        </MemoryRouter>
      );

      // Checkbox is unchecked
      const checkbox = screen.getByTestId('checkout-explicit-confirm-checkbox');
      expect(checkbox).not.toBeChecked();

      // Place order button is disabled
      const placeOrderBtn = screen.getByTestId(
        'checkout-confirm-place-order-button'
      );
      expect(placeOrderBtn).toBeDisabled();

      // Toggling confirmation
      await user.click(checkbox);
      expect(handleToggleConfirm).toHaveBeenCalledTimes(1);

      // Re-render as confirmed
      rerender(
        <MemoryRouter>
          <OrderReviewModal
            isOpen={true}
            onClose={vi.fn()}
            onConfirmOrder={handleConfirmOrder}
            items={sampleItems}
            deliveryDetails={sampleDelivery}
            hasConfirmed={true}
            onToggleConfirm={handleToggleConfirm}
          />
        </MemoryRouter>
      );

      expect(placeOrderBtn).not.toBeDisabled();
      await user.click(placeOrderBtn);
      expect(handleConfirmOrder).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator and disables submit button when isSubmitting is true', () => {
      render(
        <MemoryRouter>
          <OrderReviewModal
            isOpen={true}
            onClose={vi.fn()}
            onConfirmOrder={vi.fn()}
            items={sampleItems}
            deliveryDetails={sampleDelivery}
            hasConfirmed={true}
            isSubmitting={true}
          />
        </MemoryRouter>
      );

      const submitBtn = screen.getByTestId(
        'checkout-confirm-place-order-button'
      );
      expect(submitBtn).toBeDisabled();
      expect(screen.getByText(/Placing Order\.\.\./i)).toBeInTheDocument();
    });

    it('calls onClose when close or Back button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(
        <MemoryRouter>
          <OrderReviewModal
            isOpen={true}
            onClose={handleClose}
            onConfirmOrder={vi.fn()}
            items={sampleItems}
            deliveryDetails={sampleDelivery}
          />
        </MemoryRouter>
      );

      const backBtn = screen.getByTestId('checkout-review-back-button');
      await user.click(backBtn);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('displays submission error message when submissionError prop is provided (ERR-01)', () => {
      render(
        <MemoryRouter>
          <OrderReviewModal
            isOpen={true}
            onClose={vi.fn()}
            onConfirmOrder={vi.fn()}
            items={sampleItems}
            deliveryDetails={sampleDelivery}
            submissionError="Network timeout: Order could not be placed. Please try again."
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('review-order-error')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Network timeout: Order could not be placed\. Please try again\./i
        )
      ).toBeInTheDocument();
    });

    it('renders OrderFailureNotice and handles Review Cart action on inventory conflict (CHK-04, TC-17)', async () => {
      const user = userEvent.setup();
      const handleReviewCart = vi.fn();
      const handleClose = vi.fn();
      const failureData = {
        status: 409,
        message:
          'Some items in your order are no longer available in the requested quantity.',
        itemErrors: [
          {
            product_id: 1,
            name: 'Fresh Roma Tomatoes',
            message: 'Only 1 basket remaining',
          },
        ],
      };

      render(
        <MemoryRouter>
          <OrderReviewModal
            isOpen={true}
            onClose={handleClose}
            onConfirmOrder={vi.fn()}
            items={sampleItems}
            deliveryDetails={sampleDelivery}
            orderFailure={failureData}
            onReviewCart={handleReviewCart}
          />
        </MemoryRouter>
      );

      expect(
        screen.getByTestId('review-order-failure-notice')
      ).toBeInTheDocument();
      const reviewCartBtn = screen.getByTestId(
        'review-order-failure-review-cart-btn'
      );
      await user.click(reviewCartBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(handleReviewCart).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 2. OrderSummary Component Tests
  // ============================================================================
  describe('OrderSummary Component (CHK-03, CHK-05, CHK-09, BR-02)', () => {
    it('renders item list, subtotal, and grand total in checkout sidebar', () => {
      render(
        <MemoryRouter>
          <OrderSummary
            items={sampleItems}
            subtotal={6800}
            total={6800}
            itemCount={3}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
      expect(screen.getByText('Bell Peppers')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-subtotal')).toHaveTextContent(
        '₦6,800'
      );
      expect(screen.getByTestId('checkout-total')).toHaveTextContent('₦6,800');
    });

    it('alerts user of multiple seller split orders when items belong to multiple sellers (CHK-05)', () => {
      render(
        <MemoryRouter>
          <OrderSummary items={sampleItems} subtotal={6800} total={6800} />
        </MemoryRouter>
      );

      expect(
        screen.getByTestId('checkout-multi-seller-notice')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Multi-Seller Order \(2 sellers\)/i)
      ).toBeInTheDocument();
    });

    it('triggers onProceedToReview callback when review order button is clicked', async () => {
      const user = userEvent.setup();
      const handleProceed = vi.fn();

      render(
        <MemoryRouter>
          <OrderSummary
            items={sampleItems}
            subtotal={6800}
            total={6800}
            onProceedToReview={handleProceed}
          />
        </MemoryRouter>
      );

      const reviewBtn = screen.getByTestId('checkout-place-order-button');
      await user.click(reviewBtn);

      expect(handleProceed).toHaveBeenCalledTimes(1);
    });
  });
});
