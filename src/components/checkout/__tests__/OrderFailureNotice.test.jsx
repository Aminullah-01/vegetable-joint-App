import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrderFailureNotice } from '../OrderFailureNotice';

describe('OrderFailureNotice Component (FE-074 / CHK-04, ERR-01)', () => {
  it('renders HTTP 409 conflict header and summary for insufficient stock', () => {
    render(
      <MemoryRouter>
        <OrderFailureNotice
          status={409}
          error={{
            message: 'One or more items in your cart have stock conflicts.',
            code: 'CONFLICT',
          }}
          itemErrors={[
            {
              productId: 1,
              name: 'Fresh Roma Tomatoes',
              type: 'insufficient_stock',
              requestedQuantity: 8,
              availableStock: 3,
              message:
                'Insufficient stock for Fresh Roma Tomatoes. Requested 8, but only 3 is available (CHK-04).',
            },
          ]}
        />
      </MemoryRouter>
    );

    const alert = screen.getByTestId('order-failure-notice');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('data-status', '409');
    expect(alert).toHaveAttribute('data-error-type', 'conflict');

    expect(screen.getByTestId('order-failure-title')).toHaveTextContent(
      /Inventory or Price Conflict/i
    );
    expect(screen.getByTestId('order-failure-status-code')).toHaveTextContent(
      'HTTP 409'
    );
    expect(screen.getByTestId('order-failure-summary')).toHaveTextContent(
      /stock conflicts/i
    );

    // Per-item details
    expect(screen.getByTestId('order-failure-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('order-failure-item-badge')).toHaveTextContent(
      /Insufficient Stock/i
    );
    expect(screen.getByTestId('order-failure-item-message')).toHaveTextContent(
      /Requested 8, but only 3 is available/i
    );
    expect(screen.getByTestId('order-failure-stock-diff')).toHaveTextContent(
      /Requested quantity:\s*8/i
    );
    expect(screen.getByTestId('order-failure-stock-diff')).toHaveTextContent(
      /Available stock:\s*3/i
    );
  });

  it('renders HTTP 409 price change details with old and new price comparison', () => {
    render(
      <MemoryRouter>
        <OrderFailureNotice
          status={409}
          itemErrors={[
            {
              productId: 2,
              name: 'Red Bell Peppers',
              type: 'price_changed',
              oldPrice: 1800,
              newPrice: 2200,
              message:
                'Price for "Red Bell Peppers" has changed from ₦1,800 to ₦2,200 (ERR-01).',
            },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('order-failure-item-badge')).toHaveTextContent(
      /Price Changed/i
    );
    const priceDiff = screen.getByTestId('order-failure-price-diff');
    expect(priceDiff).toHaveTextContent(/Old price:\s*₦1,800/i);
    expect(priceDiff).toHaveTextContent(/New price:\s*₦2,200/i);
  });

  it('renders HTTP 422 validation failure with field errors breakdown', () => {
    render(
      <MemoryRouter>
        <OrderFailureNotice
          status={422}
          error="Order validation failed. Please provide all required delivery details (CHK-02, CHK-04)."
          fieldErrors={{
            delivery_name: ['Recipient name is required.'],
            delivery_phone: ['Phone number is required.'],
          }}
        />
      </MemoryRouter>
    );

    const alert = screen.getByTestId('order-failure-notice');
    expect(alert).toHaveAttribute('data-status', '422');
    expect(alert).toHaveAttribute('data-error-type', 'validation');
    expect(screen.getByTestId('order-failure-title')).toHaveTextContent(
      /Order Validation Error/i
    );

    const fieldErrors = screen.getByTestId('order-failure-field-errors');
    expect(fieldErrors).toHaveTextContent(
      /delivery name:\s*Recipient name is required/i
    );
    expect(fieldErrors).toHaveTextContent(
      /delivery phone:\s*Phone number is required/i
    );
  });

  it('triggers onReviewCart and onDismiss callbacks', async () => {
    const user = userEvent.setup();
    const handleReviewCart = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <MemoryRouter>
        <OrderFailureNotice
          status={409}
          onReviewCart={handleReviewCart}
          onDismiss={handleDismiss}
          itemErrors={[
            {
              productId: 3,
              name: 'Spinach',
              type: 'unavailable',
              message: 'This product is currently unavailable (ERR-01).',
            },
          ]}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('order-failure-review-cart-btn'));
    expect(handleReviewCart).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('order-failure-dismiss-btn'));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
