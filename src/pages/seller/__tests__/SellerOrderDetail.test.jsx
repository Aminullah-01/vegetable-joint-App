import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerOrderDetail } from '../SellerOrderDetail';
import { sellerService } from '../../../services/sellerService';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';

/**
 * Task FE-091 / SEL-10: Seller Order Detail
 *
 * SRS References:
 * - SEL-10: The Orders view shall list only orders that contain the seller’s own products,
 *           filterable by status and date, and show buyer name, phone and delivery details
 *           needed to fulfil the order.
 * - SEL-14 / BR-08: A seller shall never be able to view, edit or delete another seller’s
 *                   products, orders or profile (object-level authorization).
 * - ORD-02 / ORD-07: Items, quantities, prices, delivery details, status history with timestamps
 *                    and cancellation reason if cancelled.
 * - CHK-09: Payment method disclosure ("Pay on delivery / pay seller directly").
 * - Figma Section 13: Order number, buyer name/phone, delivery details, items, totals, status timeline.
 */

const mockSeller1 = {
  id: 2,
  name: 'Bello Ibrahim',
  email: 'seller@example.com',
  role: 'seller',
  seller_id: 1,
  approval_status: 'approved',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    approval_status: 'approved',
  },
};

const mockSeller2 = {
  id: 4,
  name: 'Kano Agro Admin',
  email: 'kano@example.com',
  role: 'seller',
  seller_id: 2,
  approval_status: 'approved',
  seller: {
    id: 2,
    business_name: 'Kano Green Agro',
    approval_status: 'approved',
  },
};

const sampleOrders = {
  101: {
    id: 101,
    order_number: 'VJ-20260220-001',
    seller_id: 1,
    buyer_id: 6,
    total_amount: 7500,
    status: 'pending',
    payment_method: 'cash_on_delivery',
    delivery_name: 'Amina Bello',
    delivery_phone: '+2348012345678',
    delivery_address: '12 Ahmadu Bello Way, Victoria Island, Lagos',
    notes: 'Please call on arrival, ring doorbell twice.',
    cancel_reason: null,
    created_at: '2026-02-20T10:00:00Z',
    buyer: {
      id: 6,
      name: 'Amina Bello',
      email: 'amina.bello@example.com',
      phone: '+2348012345678',
    },
    items: [
      {
        id: 1,
        product_id: 1,
        product_name: 'Fresh Roma Tomatoes',
        quantity: 3,
        unit: 'basket',
        price: 2500,
        subtotal: 7500,
      },
    ],
    status_history: [
      {
        id: 1,
        from_status: null,
        to_status: 'pending',
        note: 'Order placed by buyer (CHK-03)',
        created_at: '2026-02-20T10:00:00Z',
      },
    ],
  },
  102: {
    id: 102,
    order_number: 'VJ-20260221-002',
    seller_id: 1,
    buyer_id: 7,
    total_amount: 14400,
    status: 'confirmed',
    payment_method: 'cash_on_delivery',
    delivery_name: 'Emeka Okafor',
    delivery_phone: '+2348098765432',
    delivery_address: '45 Marina Street, Lagos Island',
    notes: null, // No notes provided
    cancel_reason: null,
    created_at: '2026-02-21T14:30:00Z',
    buyer: {
      id: 7,
      name: 'Emeka Okafor',
      email: 'emeka@example.com',
      phone: '+2348098765432',
    },
    items: [
      {
        id: 2,
        product_id: 2,
        product_name: 'Organic Spinach (Alayahu)',
        quantity: 12,
        unit: 'bunch',
        price: 800,
        subtotal: 9600,
      },
      {
        id: 3,
        product_id: 3,
        product_name: 'Sweet Bell Peppers',
        quantity: 4,
        unit: 'kg',
        price: 1200,
        subtotal: 4800,
      },
    ],
    status_history: [
      {
        id: 1,
        from_status: null,
        to_status: 'pending',
        note: 'Order placed by buyer',
        created_at: '2026-02-21T14:30:00Z',
      },
      {
        id: 2,
        from_status: 'pending',
        to_status: 'confirmed',
        note: 'Confirmed by seller',
        created_at: '2026-02-21T15:00:00Z',
      },
    ],
  },
  103: {
    id: 103,
    order_number: 'VJ-20260222-003',
    seller_id: 1,
    buyer_id: 8,
    total_amount: 5000,
    status: 'cancelled',
    payment_method: 'cash_on_delivery',
    delivery_name: 'Fatima Garba',
    delivery_phone: '+2348033334444',
    delivery_address: '8 Zoo Road, Kano Municipal, Kano',
    notes: 'Leave at security gate.',
    cancel_reason: 'Buyer requested cancellation due to sudden travel (ORD-07)',
    created_at: '2026-02-22T09:15:00Z',
    buyer: {
      id: 8,
      name: 'Fatima Garba',
      email: 'fatima@example.com',
      phone: '+2348033334444',
    },
    items: [
      {
        id: 4,
        product_id: 5,
        product_name: 'Fresh Carrots',
        quantity: 5,
        unit: 'kg',
        price: 1000,
        subtotal: 5000,
      },
    ],
    status_history: [
      {
        id: 1,
        from_status: null,
        to_status: 'pending',
        note: 'Order placed by buyer',
        created_at: '2026-02-22T09:15:00Z',
      },
      {
        id: 2,
        from_status: 'pending',
        to_status: 'cancelled',
        note: 'Buyer requested cancellation due to sudden travel (ORD-07)',
        created_at: '2026-02-22T10:00:00Z',
      },
    ],
  },
  104: {
    id: 104,
    order_number: 'VJ-20260223-004',
    seller_id: 2, // Belongs to SELLER 2 (Object-level authorization check: SEL-14)
    buyer_id: 9,
    total_amount: 18000,
    status: 'pending',
    payment_method: 'cash_on_delivery',
    delivery_name: 'Foreign Buyer',
    delivery_phone: '+2348000000000',
    delivery_address: 'Confidential Address of Another Seller Customer',
    notes: 'Confidential note.',
    cancel_reason: null,
    created_at: '2026-02-23T11:00:00Z',
    buyer: {
      id: 9,
      name: 'Foreign Buyer',
      email: 'foreign@example.com',
      phone: '+2348000000000',
    },
    items: [
      {
        id: 5,
        product_id: 8,
        product_name: 'Competitor Produce',
        quantity: 10,
        unit: 'bag',
        price: 1800,
        subtotal: 18000,
      },
    ],
    status_history: [
      {
        id: 1,
        from_status: null,
        to_status: 'pending',
        note: 'Order placed',
        created_at: '2026-02-23T11:00:00Z',
      },
    ],
  },
};

function renderSellerOrderDetailPage({
  user = mockSeller1,
  orderId = 101,
  toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() },
} = {}) {
  const authContextValue = {
    user,
    isAuthenticated: true,
    isSeller: true,
    isAdmin: false,
    isBuyer: false,
  };

  return {
    toast,
    ...render(
      <AuthContext.Provider value={authContextValue}>
        <ToastContext.Provider value={toast}>
          <MemoryRouter initialEntries={[`/seller/orders/${orderId}`]}>
            <Routes>
              <Route
                path="/seller/orders/:id"
                element={<SellerOrderDetail />}
              />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
  };
}

renderSellerOrderDetailPage.propTypes = {
  user: PropTypes.object,
  orderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  toast: PropTypes.object,
};

describe('FE-091 / SEL-10: Seller Order Detail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(sellerService, 'getSellerOrderById').mockImplementation(
      async (id, params = {}) => {
        const order = sampleOrders[id];
        if (!order) {
          const notFoundError = new Error('Order not found.');
          notFoundError.status = 404;
          notFoundError.code = 'NOT_FOUND';
          throw notFoundError;
        }

        // Object-level authorization check simulation (SEL-14)
        if (
          params?.seller_id != null &&
          Number(order.seller_id) !== Number(params.seller_id)
        ) {
          const forbiddenError = new Error(
            'You are not authorized to view this order.'
          );
          forbiddenError.status = 403;
          forbiddenError.code = 'FORBIDDEN';
          throw forbiddenError;
        }

        return JSON.parse(JSON.stringify(order));
      }
    );
  });

  describe('1. Order Header & Metadata (SEL-10, Figma Section 13)', () => {
    it('renders order reference number, date, and color-coded status badge', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('order-number')).toHaveTextContent(
          'VJ-20260220-001'
        );
      });

      expect(
        screen.getByTestId('order-header-status-badge')
      ).toBeInTheDocument();
      expect(screen.getByTestId('order-date')).toBeInTheDocument();
      expect(screen.getByTestId('order-total-amount')).toBeInTheDocument();
      expect(screen.getByTestId('order-items-count')).toHaveTextContent(
        '1 line item'
      );
    });

    it('renders back link to /seller/orders and print button', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('back-to-orders-link')).toBeInTheDocument();
      });

      expect(screen.getByTestId('back-to-orders-link')).toHaveAttribute(
        'href',
        '/seller/orders'
      );
      expect(screen.getByTestId('print-dispatch-slip-btn')).toBeInTheDocument();
    });

    it('triggers window.print when print dispatch slip button is clicked', async () => {
      const user = userEvent.setup();
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(
          screen.getByTestId('print-dispatch-slip-btn')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('print-dispatch-slip-btn'));
      expect(printSpy).toHaveBeenCalledTimes(1);

      printSpy.mockRestore();
    });
  });

  describe('2. Produce Items Fulfillment Spec (SEL-10: "Items")', () => {
    it('renders item product name, unit, unit price, quantity, and subtotal', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('order-items-table')).toBeInTheDocument();
      });

      expect(screen.getByTestId('item-name-1')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('item-unit-1')).toHaveTextContent('basket');
      expect(screen.getByTestId('item-price-1')).toHaveTextContent('₦2,500');
      expect(screen.getByTestId('item-qty-1')).toHaveTextContent('× 3');
      expect(screen.getByTestId('item-subtotal-1')).toHaveTextContent('₦7,500');
    });

    it('renders multiple line items with accurate subtotals and total due', async () => {
      renderSellerOrderDetailPage({ orderId: 102 });

      await waitFor(() => {
        expect(screen.getByTestId('order-number')).toHaveTextContent(
          'VJ-20260221-002'
        );
      });

      expect(screen.getByTestId('item-name-2')).toHaveTextContent(
        'Organic Spinach (Alayahu)'
      );
      expect(screen.getByTestId('item-unit-2')).toHaveTextContent('bunch');
      expect(screen.getByTestId('item-subtotal-2')).toHaveTextContent('₦9,600');

      expect(screen.getByTestId('item-name-3')).toHaveTextContent(
        'Sweet Bell Peppers'
      );
      expect(screen.getByTestId('item-unit-3')).toHaveTextContent('kg');
      expect(screen.getByTestId('item-subtotal-3')).toHaveTextContent('₦4,800');

      expect(screen.getByTestId('order-subtotal')).toHaveTextContent('₦14,400');
      expect(screen.getByTestId('order-total-due')).toHaveTextContent(
        '₦14,400'
      );
    });
  });

  describe('3. Buyer Information (SEL-10: "buyer name/phone")', () => {
    it('renders buyer name and formatted phone number', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('order-buyer-name')).toHaveTextContent(
          'Amina Bello'
        );
      });

      expect(screen.getByTestId('order-buyer-phone')).toHaveTextContent(
        '+2348012345678'
      );
    });

    it('renders direct call link with tel: URI for easy mobile dialing', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('call-buyer-link')).toBeInTheDocument();
      });

      expect(screen.getByTestId('call-buyer-link')).toHaveAttribute(
        'href',
        'tel:+2348012345678'
      );
    });

    it('renders buyer email with mailto: link when available', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('order-buyer-email')).toBeInTheDocument();
      });

      expect(screen.getByTestId('order-buyer-email')).toHaveAttribute(
        'href',
        'mailto:amina.bello@example.com'
      );
      expect(screen.getByTestId('order-buyer-email')).toHaveTextContent(
        'amina.bello@example.com'
      );
    });
  });

  describe('4. Delivery Details (SEL-10: "delivery details")', () => {
    it('renders full delivery street address', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(
          screen.getByTestId('order-delivery-address')
        ).toBeInTheDocument();
      });

      expect(screen.getByTestId('order-delivery-address')).toHaveTextContent(
        '12 Ahmadu Bello Way, Victoria Island, Lagos'
      );
    });

    it('renders delivery notes when customer provided special delivery instructions', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('order-delivery-notes')).toBeInTheDocument();
      });

      expect(screen.getByTestId('order-delivery-notes')).toHaveTextContent(
        'Please call on arrival, ring doorbell twice.'
      );
    });

    it('renders empty notes fallback message when no special delivery notes were provided', async () => {
      renderSellerOrderDetailPage({ orderId: 102 });

      await waitFor(() => {
        expect(
          screen.getByTestId('order-delivery-notes-empty')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByTestId('order-delivery-notes-empty')
      ).toHaveTextContent('No special delivery notes provided.');
    });

    it('renders payment method disclosure notice (CHK-09)', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('order-payment-method')).toBeInTheDocument();
      });

      expect(screen.getByText(/Payment Terms/i)).toBeInTheDocument();
      expect(screen.getByText(/Pay on delivery/i)).toBeInTheDocument();
    });
  });

  describe('5. Order Timeline & Cancellation Details (ORD-02, ORD-07)', () => {
    it('renders status timeline component with history events', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(
          screen.getByTestId('order-timeline-section')
        ).toBeInTheDocument();
      });
    });

    it('renders cancellation banner with cancellation reason for cancelled orders (ORD-07)', async () => {
      renderSellerOrderDetailPage({ orderId: 103 });

      await waitFor(() => {
        expect(
          screen.getByTestId('order-cancellation-banner')
        ).toBeInTheDocument();
      });

      expect(screen.getByTestId('cancellation-reason')).toHaveTextContent(
        'Buyer requested cancellation due to sudden travel (ORD-07)'
      );
    });
  });

  describe('6. Object-Level Authorization (SEL-10, SEL-14, BR-08, TC-23)', () => {
    it('allows Seller 1 to view Order 101 which belongs to Seller 1', async () => {
      renderSellerOrderDetailPage({ user: mockSeller1, orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('order-number')).toHaveTextContent(
          'VJ-20260220-001'
        );
      });

      expect(
        screen.queryByTestId('seller-order-unauthorized')
      ).not.toBeInTheDocument();
    });

    it('blocks Seller 1 from viewing Order 104 which belongs to Seller 2 (SEL-14)', async () => {
      renderSellerOrderDetailPage({ user: mockSeller1, orderId: 104 });

      await waitFor(() => {
        expect(
          screen.getByTestId('seller-order-unauthorized')
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Access Denied \(SEL-14\)/i)).toBeInTheDocument();
      // Verifies confidential buyer phone and delivery address are NEVER leaked:
      expect(
        screen.queryByText(/Confidential Address/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByText('+2348000000000')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-items-table')).not.toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Return to My Orders/i })
      ).toHaveAttribute('href', '/seller/orders');
    });

    it('allows Seller 2 to view Order 104 when authenticated as Seller 2', async () => {
      renderSellerOrderDetailPage({ user: mockSeller2, orderId: 104 });

      await waitFor(() => {
        expect(screen.getByTestId('order-number')).toHaveTextContent(
          'VJ-20260223-004'
        );
      });

      expect(
        screen.queryByTestId('seller-order-unauthorized')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('order-buyer-name')).toHaveTextContent(
        'Foreign Buyer'
      );
      expect(screen.getByTestId('item-name-5')).toHaveTextContent(
        'Competitor Produce'
      );
    });
  });

  describe('7. Loading & Error Handling', () => {
    it('displays loading skeleton before order data resolves', () => {
      renderSellerOrderDetailPage({ orderId: 101 });
      expect(
        screen.getByTestId('seller-order-detail-loading')
      ).toBeInTheDocument();
    });

    it('displays error state with retry button on unexpected network failure', async () => {
      vi.spyOn(sellerService, 'getSellerOrderById').mockRejectedValueOnce(
        new Error('Network error connecting to Vegetable Joint backend.')
      );

      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('seller-order-error')).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /Network error connecting to Vegetable Joint backend./i
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('retry-btn')).toBeInTheDocument();
    });

    it('recovers and loads order successfully when clicking retry', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'getSellerOrderById')
        .mockRejectedValueOnce(new Error('Temporary server glitch'))
        .mockResolvedValueOnce(sampleOrders[101]);

      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('seller-order-error')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('retry-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('order-number')).toHaveTextContent(
          'VJ-20260220-001'
        );
      });

      expect(
        screen.queryByTestId('seller-order-error')
      ).not.toBeInTheDocument();
    });

    it('reloads order when clicking refresh button in header', async () => {
      const user = userEvent.setup();
      const getOrderSpy = vi.spyOn(sellerService, 'getSellerOrderById');

      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('refresh-order-btn')).toBeInTheDocument();
      });

      expect(getOrderSpy).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTestId('refresh-order-btn'));

      await waitFor(() => {
        expect(getOrderSpy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('8. Integrated Order Status Controls (SEL-11, ORD-05, ORD-07, FE-092)', () => {
    it('renders order status controls with valid next action button', async () => {
      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('order-status-controls')).toBeInTheDocument();
      });

      expect(screen.getByTestId('advance-status-btn')).toHaveTextContent(
        /Confirm Order/i
      );
      expect(screen.getByTestId('open-cancel-dialog-btn')).toBeInTheDocument();
    });

    it('advances order status and reactively updates badge and controls on detail page', async () => {
      const user = userEvent.setup();
      const updateSpy = vi
        .spyOn(sellerService, 'updateOrderStatus')
        .mockResolvedValueOnce({
          ...sampleOrders[101],
          status: 'confirmed',
        });

      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(screen.getByTestId('advance-status-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('advance-status-btn'));
      expect(updateSpy).toHaveBeenCalledWith(101, 'confirmed', '');

      await waitFor(() => {
        expect(
          screen.getByTestId('order-header-status-badge')
        ).toHaveTextContent(/Confirmed/i);
        expect(screen.getByTestId('advance-status-btn')).toHaveTextContent(
          /Start Processing/i
        );
      });
    });

    it('cancels order with mandatory reason and displays cancellation banner', async () => {
      const user = userEvent.setup();
      const cancelSpy = vi
        .spyOn(sellerService, 'cancelOrder')
        .mockResolvedValueOnce({
          ...sampleOrders[101],
          status: 'cancelled',
          cancel_reason: 'Produce spoiled during storage',
        });

      renderSellerOrderDetailPage({ orderId: 101 });

      await waitFor(() => {
        expect(
          screen.getByTestId('open-cancel-dialog-btn')
        ).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('open-cancel-dialog-btn'));
      expect(screen.getByTestId('cancel-order-modal')).toBeInTheDocument();

      // Submit with reason
      fireEvent.change(screen.getByTestId('cancellation-reason-input'), {
        target: { value: 'Produce spoiled during storage' },
      });
      await user.click(screen.getByTestId('confirm-cancel-order-btn'));

      expect(cancelSpy).toHaveBeenCalledWith(
        101,
        'Produce spoiled during storage'
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('order-cancellation-banner')
        ).toBeInTheDocument();
        expect(screen.getByTestId('cancellation-reason')).toHaveTextContent(
          /Produce spoiled during storage/i
        );
        expect(
          screen.getByTestId('terminal-status-notice')
        ).toBeInTheDocument();
      });
    });
  });
});
