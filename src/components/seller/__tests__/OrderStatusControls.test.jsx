import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderStatusControls } from '../OrderStatusControls';
import { sellerService } from '../../../services/sellerService';
import { ToastContext } from '../../../context/toastContextDef';

/**
 * Task FE-092 / SEL-11, ORD-05, ORD-07: Order Status Controls
 *
 * SRS References:
 * - SEL-11: The seller shall be able to advance order status according to the lifecycle in 3.6.2.
 * - ORD-05: The system shall reject any status change that is not in the transition table with a clear error.
 * - ORD-07: Cancellation by a Seller or Administrator shall require a reason, which shall be visible to the buyer.
 * - BR-07: Order status may only change along the lifecycle in 3.6.2; Completed and Cancelled are terminal.
 * - SRS 3.6.2 (Figure 2):
 *     - Pending -> Confirmed (Seller)
 *     - Confirmed -> Processing (Seller)
 *     - Processing -> Ready (Seller)
 *     - Ready -> Completed (Seller)
 *     - Pending, Confirmed, Processing -> Cancelled (Seller, reason required)
 *     - Ready -> Cancelled (Administrator only)
 *     - Completed, Cancelled (Terminal)
 */

const baseOrder = {
  id: 101,
  order_number: 'VJ-20260220-001',
  seller_id: 1,
  buyer_id: 6,
  total_amount: 7500,
  status: 'pending',
  items: [{ id: 1, product_name: 'Fresh Tomatoes', quantity: 3, price: 2500 }],
};

function renderControls({
  order = baseOrder,
  onStatusUpdated = vi.fn(),
  disabled = false,
  toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() },
} = {}) {
  return {
    onStatusUpdated,
    toast,
    ...render(
      <ToastContext.Provider value={toast}>
        <OrderStatusControls
          order={order}
          onStatusUpdated={onStatusUpdated}
          disabled={disabled}
        />
      </ToastContext.Provider>
    ),
  };
}

describe('FE-092 / SEL-11, ORD-05, ORD-07: Order Status Controls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. Only Valid Next Step Offered (SEL-11, ORD-05, SRS 3.6.2)', () => {
    it('offers ONLY "Confirm Order" when status is "pending"', () => {
      renderControls({ order: { ...baseOrder, status: 'pending' } });

      const advanceBtn = screen.getByTestId('advance-status-btn');
      expect(advanceBtn).toBeInTheDocument();
      expect(advanceBtn).toHaveTextContent(/Confirm Order/i);

      // Verifies invalid jumps are NOT offered
      expect(screen.queryByText(/Start Processing/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Mark Ready for Delivery/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Complete Order/i)).not.toBeInTheDocument();
    });

    it('advances from "pending" to "confirmed" when clicking "Confirm Order"', async () => {
      const user = userEvent.setup();
      const updateSpy = vi
        .spyOn(sellerService, 'updateOrderStatus')
        .mockResolvedValueOnce({ ...baseOrder, status: 'confirmed' });

      const { onStatusUpdated, toast } = renderControls({
        order: { ...baseOrder, status: 'pending' },
      });

      await user.click(screen.getByTestId('advance-status-btn'));

      expect(updateSpy).toHaveBeenCalledWith(101, 'confirmed', '');
      await waitFor(() => {
        expect(onStatusUpdated).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'confirmed' })
        );
      });
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Confirmed')
      );
    });

    it('offers ONLY "Start Processing" when status is "confirmed"', async () => {
      const user = userEvent.setup();
      const updateSpy = vi
        .spyOn(sellerService, 'updateOrderStatus')
        .mockResolvedValueOnce({ ...baseOrder, status: 'processing' });

      const { onStatusUpdated } = renderControls({
        order: { ...baseOrder, status: 'confirmed' },
      });

      const advanceBtn = screen.getByTestId('advance-status-btn');
      expect(advanceBtn).toHaveTextContent(/Start Processing/i);
      expect(screen.queryByText(/Confirm Order/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Complete Order/i)).not.toBeInTheDocument();

      await user.click(advanceBtn);
      expect(updateSpy).toHaveBeenCalledWith(101, 'processing', '');
      await waitFor(() => {
        expect(onStatusUpdated).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'processing' })
        );
      });
    });

    it('offers ONLY "Mark Ready for Delivery" when status is "processing"', async () => {
      const user = userEvent.setup();
      const updateSpy = vi
        .spyOn(sellerService, 'updateOrderStatus')
        .mockResolvedValueOnce({ ...baseOrder, status: 'ready' });

      const { onStatusUpdated } = renderControls({
        order: { ...baseOrder, status: 'processing' },
      });

      const advanceBtn = screen.getByTestId('advance-status-btn');
      expect(advanceBtn).toHaveTextContent(/Mark Ready for Delivery/i);

      await user.click(advanceBtn);
      expect(updateSpy).toHaveBeenCalledWith(101, 'ready', '');
      await waitFor(() => {
        expect(onStatusUpdated).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'ready' })
        );
      });
    });

    it('offers ONLY "Complete Order" when status is "ready"', async () => {
      const user = userEvent.setup();
      const updateSpy = vi
        .spyOn(sellerService, 'updateOrderStatus')
        .mockResolvedValueOnce({ ...baseOrder, status: 'completed' });

      const { onStatusUpdated } = renderControls({
        order: { ...baseOrder, status: 'ready' },
      });

      const advanceBtn = screen.getByTestId('advance-status-btn');
      expect(advanceBtn).toHaveTextContent(/Complete Order/i);

      await user.click(advanceBtn);
      expect(updateSpy).toHaveBeenCalledWith(101, 'completed', '');
      await waitFor(() => {
        expect(onStatusUpdated).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'completed' })
        );
      });
    });

    it('allows including an optional transition note (ORD-06)', async () => {
      const user = userEvent.setup();
      const updateSpy = vi
        .spyOn(sellerService, 'updateOrderStatus')
        .mockResolvedValueOnce({ ...baseOrder, status: 'confirmed' });

      renderControls({ order: { ...baseOrder, status: 'pending' } });

      await user.click(screen.getByTestId('toggle-note-btn'));
      const noteInput = screen.getByTestId('status-note-input');
      expect(noteInput).toBeInTheDocument();

      await user.type(noteInput, 'Harvested from greenhouse 2 at 7am');
      await user.click(screen.getByTestId('advance-status-btn'));

      expect(updateSpy).toHaveBeenCalledWith(
        101,
        'confirmed',
        'Harvested from greenhouse 2 at 7am'
      );
    });
  });

  describe('2. Cancellation Requires a Reason (ORD-07)', () => {
    it('renders "Cancel Order..." button when status is "pending", "confirmed", or "processing"', () => {
      const { unmount } = renderControls({
        order: { ...baseOrder, status: 'pending' },
      });
      expect(screen.getByTestId('open-cancel-dialog-btn')).toBeInTheDocument();
      unmount();

      const { unmount: unmount2 } = renderControls({
        order: { ...baseOrder, status: 'confirmed' },
      });
      expect(screen.getByTestId('open-cancel-dialog-btn')).toBeInTheDocument();
      unmount2();

      renderControls({ order: { ...baseOrder, status: 'processing' } });
      expect(screen.getByTestId('open-cancel-dialog-btn')).toBeInTheDocument();
    });

    it('does NOT offer cancellation to seller when status is "ready" (Admin only per SRS 3.6.2)', () => {
      renderControls({ order: { ...baseOrder, status: 'ready' } });

      expect(
        screen.queryByTestId('open-cancel-dialog-btn')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('ready-cancellation-notice')
      ).toBeInTheDocument();
      expect(screen.getByTestId('ready-cancellation-notice')).toHaveTextContent(
        /Cancellation at this stage requires Administrator assistance/i
      );
    });

    it('opens cancellation modal when clicking "Cancel Order..."', async () => {
      const user = userEvent.setup();
      renderControls({ order: { ...baseOrder, status: 'pending' } });

      await user.click(screen.getByTestId('open-cancel-dialog-btn'));

      expect(screen.getByTestId('cancel-order-modal')).toBeInTheDocument();
      expect(
        screen.getByTestId('cancellation-reason-input')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-cancel-order-btn')
      ).toBeInTheDocument();
    });

    it('rejects cancellation when reason is empty (ORD-07)', async () => {
      const user = userEvent.setup();
      const cancelSpy = vi.spyOn(sellerService, 'cancelOrder');

      renderControls({ order: { ...baseOrder, status: 'pending' } });

      await user.click(screen.getByTestId('open-cancel-dialog-btn'));
      await user.click(screen.getByTestId('confirm-cancel-order-btn'));

      // Verifies error message displayed and API NOT called
      expect(
        screen.getByText(
          /A reason is required to cancel this order \(ORD-07\)/i
        )
      ).toBeInTheDocument();
      expect(cancelSpy).not.toHaveBeenCalled();
    });

    it('rejects cancellation when reason has fewer than 5 characters', async () => {
      const user = userEvent.setup();
      const cancelSpy = vi.spyOn(sellerService, 'cancelOrder');

      renderControls({ order: { ...baseOrder, status: 'pending' } });

      await user.click(screen.getByTestId('open-cancel-dialog-btn'));
      fireEvent.change(screen.getByTestId('cancellation-reason-input'), {
        target: { value: 'bad' },
      });
      await user.click(screen.getByTestId('confirm-cancel-order-btn'));

      expect(
        screen.getByText(
          /Please provide a more descriptive cancellation reason/i
        )
      ).toBeInTheDocument();
      expect(cancelSpy).not.toHaveBeenCalled();
    });

    it('successfully cancels order when valid reason is provided (ORD-07)', async () => {
      const user = userEvent.setup();
      const cancelSpy = vi
        .spyOn(sellerService, 'cancelOrder')
        .mockResolvedValueOnce({
          ...baseOrder,
          status: 'cancelled',
          cancel_reason: 'Severe frost ruined morning harvest',
        });

      const { onStatusUpdated, toast } = renderControls({
        order: { ...baseOrder, status: 'confirmed' },
      });

      await user.click(screen.getByTestId('open-cancel-dialog-btn'));
      fireEvent.change(screen.getByTestId('cancellation-reason-input'), {
        target: { value: 'Severe frost ruined morning harvest' },
      });
      await user.click(screen.getByTestId('confirm-cancel-order-btn'));

      expect(cancelSpy).toHaveBeenCalledWith(
        101,
        'Severe frost ruined morning harvest'
      );
      await waitFor(() => {
        expect(onStatusUpdated).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'cancelled',
            cancel_reason: 'Severe frost ruined morning harvest',
          })
        );
      });
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('cancelled and stock has been restored')
      );
    });

    it('dismisses modal without cancelling when clicking "Keep Order"', async () => {
      const user = userEvent.setup();
      const cancelSpy = vi.spyOn(sellerService, 'cancelOrder');

      renderControls({ order: { ...baseOrder, status: 'pending' } });

      await user.click(screen.getByTestId('open-cancel-dialog-btn'));
      expect(screen.getByTestId('cancel-order-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('cancel-modal-dismiss-btn'));
      await waitFor(() => {
        expect(
          screen.queryByTestId('cancel-order-modal')
        ).not.toBeInTheDocument();
      });
      expect(cancelSpy).not.toHaveBeenCalled();
    });
  });

  describe('3. Terminal States Protection (BR-07)', () => {
    it('renders terminal notice with NO controls when status is "completed"', () => {
      renderControls({ order: { ...baseOrder, status: 'completed' } });

      expect(screen.getByTestId('terminal-status-notice')).toBeInTheDocument();
      expect(screen.getByText(/Order Completed/i)).toBeInTheDocument();
      expect(
        screen.queryByTestId('advance-status-btn')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('open-cancel-dialog-btn')
      ).not.toBeInTheDocument();
    });

    it('renders terminal notice with NO controls when status is "cancelled"', () => {
      renderControls({
        order: {
          ...baseOrder,
          status: 'cancelled',
          cancel_reason: 'Produce spoiled',
        },
      });

      expect(screen.getByTestId('terminal-status-notice')).toBeInTheDocument();
      expect(screen.getByText(/Order Cancelled/i)).toBeInTheDocument();
      expect(
        screen.queryByTestId('advance-status-btn')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('open-cancel-dialog-btn')
      ).not.toBeInTheDocument();
    });
  });

  describe('4. Error Handling and Resilience', () => {
    it('displays error message when advancement API rejects invalid transition (ORD-05)', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'updateOrderStatus').mockRejectedValueOnce(
        new Error('Invalid order status transition from pending to processing.')
      );

      const { toast } = renderControls({
        order: { ...baseOrder, status: 'pending' },
      });

      await user.click(screen.getByTestId('advance-status-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('status-advance-error')).toBeInTheDocument();
      });
      expect(screen.getByTestId('status-advance-error')).toHaveTextContent(
        /Invalid order status transition/i
      );
      expect(toast.error).toHaveBeenCalled();
    });

    it('displays error message inside cancellation modal when cancel API fails', async () => {
      const user = userEvent.setup();
      vi.spyOn(sellerService, 'cancelOrder').mockRejectedValueOnce(
        new Error(
          'Failed to restore produce inventory. Please contact support.'
        )
      );

      renderControls({ order: { ...baseOrder, status: 'pending' } });

      await user.click(screen.getByTestId('open-cancel-dialog-btn'));
      fireEvent.change(screen.getByTestId('cancellation-reason-input'), {
        target: { value: 'Unable to fulfill order' },
      });
      await user.click(screen.getByTestId('confirm-cancel-order-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('cancel-api-error')).toBeInTheDocument();
      });
      expect(screen.getByTestId('cancel-api-error')).toHaveTextContent(
        /Failed to restore produce inventory/i
      );
    });
  });
});
