import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderStatusBadge } from '../OrderStatusBadge';
import { OrderStatusTimeline } from '../OrderStatusTimeline';
import {
  ORDER_STATUSES,
  ORDER_LIFECYCLE_STEPS,
  normalizeOrderStatus,
  getOrderStatusConfig,
  isTerminalStatus,
  isCancelledStatus,
  isStepCompleted,
} from '../../../utils/orderStatus';

describe('OrderStatusBadge Component (FE-038, ORD-02, ORD-05, BR-07, NFR-USAB-02)', () => {
  it('renders pending status badge with amber styling and indicator dot', () => {
    render(<OrderStatusBadge status="pending" />);

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Pending');
    expect(badge).toHaveAttribute('aria-label', 'Order status: Pending');
    expect(badge).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('order-status-badge-dot')).toBeInTheDocument();
  });

  it('renders confirmed status badge with blue styling', () => {
    render(<OrderStatusBadge status="confirmed" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Confirmed');
    expect(badge).toHaveAttribute('data-status', 'confirmed');
  });

  it('renders processing status badge with purple styling', () => {
    render(<OrderStatusBadge status="processing" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Processing');
    expect(badge).toHaveAttribute('data-status', 'processing');
  });

  it('renders ready status badge with teal styling', () => {
    render(<OrderStatusBadge status="ready" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Ready for Delivery');
    expect(badge).toHaveAttribute('data-status', 'ready');
  });

  it('renders completed status badge with agricultural green styling', () => {
    render(<OrderStatusBadge status="completed" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Completed');
    expect(badge).toHaveAttribute('data-status', 'completed');
  });

  it('renders cancelled status badge with distinct red styling', () => {
    render(<OrderStatusBadge status="cancelled" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Cancelled');
    expect(badge).toHaveAttribute('data-status', 'cancelled');
  });

  it('handles case-insensitivity and defaults unknown status to pending', () => {
    render(<OrderStatusBadge status="COMPLETED" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();

    render(<OrderStatusBadge status="unknown_status" testId="badge-unknown" />);
    const unknownBadge = screen.getByTestId('badge-unknown');
    expect(unknownBadge).toHaveTextContent('Pending');
  });

  it('hides the indicator dot when showDot is false', () => {
    render(<OrderStatusBadge status="completed" showDot={false} />);
    expect(
      screen.queryByTestId('order-status-badge-dot')
    ).not.toBeInTheDocument();
  });

  it('supports size variations (sm, md, lg)', () => {
    const { rerender } = render(
      <OrderStatusBadge status="pending" size="sm" />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="pending" size="lg" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('OrderStatusTimeline Component (FE-038, ORD-02, ORD-06, ORD-07, BR-07)', () => {
  const mockHistory = [
    {
      id: 1,
      order_id: 101,
      from_status: null,
      to_status: 'pending',
      changed_by: 6,
      actor: 'Buyer (Amina Bello)',
      note: 'Order placed at checkout (CHK-03)',
      created_at: '2026-02-20T10:00:00Z',
    },
    {
      id: 2,
      order_id: 101,
      from_status: 'pending',
      to_status: 'confirmed',
      changed_by: 2,
      actor: 'Seller (Arewa Fresh Farms)',
      note: 'Order confirmed and harvest scheduled',
      created_at: '2026-02-20T10:45:00Z',
    },
    {
      id: 3,
      order_id: 101,
      from_status: 'confirmed',
      to_status: 'processing',
      changed_by: 2,
      actor: 'Seller (Arewa Fresh Farms)',
      note: 'Produce washed, weighed and packaged',
      created_at: '2026-02-20T14:30:00Z',
    },
  ];

  it('renders pipeline progression indicating active and completed stages', () => {
    render(
      <OrderStatusTimeline
        statusHistory={mockHistory}
        currentStatus="processing"
      />
    );

    expect(
      screen.getByTestId('order-status-timeline-pipeline')
    ).toBeInTheDocument();

    // Pending should be completed
    const pendingStep = screen.getByTestId(
      'order-status-timeline-step-pending'
    );
    expect(pendingStep).toHaveAttribute('data-step-status', 'completed');

    // Confirmed should be completed
    const confirmedStep = screen.getByTestId(
      'order-status-timeline-step-confirmed'
    );
    expect(confirmedStep).toHaveAttribute('data-step-status', 'completed');

    // Processing should be active
    const processingStep = screen.getByTestId(
      'order-status-timeline-step-processing'
    );
    expect(processingStep).toHaveAttribute('data-step-status', 'active');

    // Ready should be pending
    const readyStep = screen.getByTestId('order-status-timeline-step-ready');
    expect(readyStep).toHaveAttribute('data-step-status', 'pending');
  });

  it('renders detailed chronological status history with timestamps and notes (ORD-02, ORD-06)', () => {
    render(
      <OrderStatusTimeline
        statusHistory={mockHistory}
        currentStatus="processing"
      />
    );

    const historyList = screen.getByTestId(
      'order-status-timeline-history-list'
    );
    expect(historyList).toBeInTheDocument();

    // Event headers
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Order Confirmed by Seller')).toBeInTheDocument();
    expect(
      screen.getByText('Produce Preparation & Packing')
    ).toBeInTheDocument();

    // Actors
    expect(screen.getByText('Buyer (Amina Bello)')).toBeInTheDocument();
    expect(screen.getAllByText('Seller (Arewa Fresh Farms)')).toHaveLength(2);

    // Notes
    expect(
      screen.getByText('Order placed at checkout (CHK-03)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Order confirmed and harvest scheduled')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Produce washed, weighed and packaged')
    ).toBeInTheDocument();

    // Formatted timestamps in WAT timezone
    expect(
      screen.getByTestId('order-status-timeline-timestamp-0')
    ).toHaveTextContent('WAT');
  });

  it('renders cancelled order banner and cancellation reason (ORD-07)', () => {
    const cancelledHistory = [
      {
        id: 1,
        to_status: 'pending',
        changed_by: 6,
        created_at: '2026-02-20T10:00:00Z',
      },
      {
        id: 2,
        to_status: 'cancelled',
        changed_by: 2,
        actor: 'Seller',
        note: 'Fresh spinach stock damaged during heavy rainfall (ORD-07)',
        created_at: '2026-02-20T11:00:00Z',
      },
    ];

    render(
      <OrderStatusTimeline
        statusHistory={cancelledHistory}
        currentStatus="cancelled"
      />
    );

    expect(
      screen.getByTestId('order-status-timeline-cancelled-banner')
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Fresh spinach stock damaged during heavy rainfall (ORD-07)'
      )[0]
    ).toBeInTheDocument();
  });

  it('renders empty message when no status history is provided', () => {
    render(<OrderStatusTimeline statusHistory={[]} currentStatus="pending" />);

    expect(
      screen.getByText('No status history recorded yet.')
    ).toBeInTheDocument();
  });

  it('supports hiding pipeline stepper when showPipeline is false', () => {
    render(
      <OrderStatusTimeline
        statusHistory={mockHistory}
        currentStatus="pending"
        showPipeline={false}
      />
    );

    expect(
      screen.queryByTestId('order-status-timeline-pipeline')
    ).not.toBeInTheDocument();
  });
});

describe('Order Status Utility Functions (orderStatus.js)', () => {
  it('normalizes statuses properly', () => {
    expect(normalizeOrderStatus('  CONFIRMED ')).toBe('confirmed');
    expect(normalizeOrderStatus('invalid_status')).toBe('pending');
    expect(normalizeOrderStatus(null)).toBe('pending');
  });

  it('checks terminal statuses correctly', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
    expect(isTerminalStatus('pending')).toBe(false);
    expect(isTerminalStatus('processing')).toBe(false);
  });

  it('checks cancelled status', () => {
    expect(isCancelledStatus('cancelled')).toBe(true);
    expect(isCancelledStatus('completed')).toBe(false);
  });

  it('evaluates step progression correctly', () => {
    expect(isStepCompleted('pending', 'confirmed')).toBe(true);
    expect(isStepCompleted('confirmed', 'confirmed')).toBe(true);
    expect(isStepCompleted('ready', 'confirmed')).toBe(false);
    expect(isStepCompleted('completed', 'ready')).toBe(false);
  });

  it('retrieves status configuration with label and styles', () => {
    const config = getOrderStatusConfig('confirmed');
    expect(config.label).toBe('Confirmed');
    expect(config.bg).toBe('#e0f2fe');
    expect(config.text).toBe('#0369a1');
  });

  it('exports expected ORDER_STATUSES and ORDER_LIFECYCLE_STEPS', () => {
    expect(ORDER_LIFECYCLE_STEPS).toEqual([
      'pending',
      'confirmed',
      'processing',
      'ready',
      'completed',
    ]);
    expect(ORDER_STATUSES.PENDING).toBe('pending');
    expect(ORDER_STATUSES.COMPLETED).toBe('completed');
  });
});
