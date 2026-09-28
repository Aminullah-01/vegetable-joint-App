import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Spinner,
  EmptyState,
  ErrorState,
  Skeleton,
  ProductCardSkeleton,
  TableSkeleton,
  ToastItem,
} from '../index.js';

describe('Common UI Components (MKT-10, ERR-01, ERR-03)', () => {
  describe('Spinner component', () => {
    it('renders with role="status" and accessible screen reader text', () => {
      render(<Spinner label="Verifying session..." text="Loading..." />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Verifying session...');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders centered container when center prop is provided', () => {
      const { getByTestId } = render(<Spinner center />);
      expect(getByTestId('spinner-center')).toBeInTheDocument();
    });
  });

  describe('EmptyState component', () => {
    it('renders default and specific preset content', () => {
      render(<EmptyState type="cart" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
    });

    it('renders custom actions and triggers callbacks', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          title="Custom Empty Title"
          description="Nothing here"
          action={<button onClick={handleClick}>Start Shopping</button>}
        />
      );

      expect(screen.getByText('Custom Empty Title')).toBeInTheDocument();
      const actionBtn = screen.getByRole('button', { name: 'Start Shopping' });
      fireEvent.click(actionBtn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorState component', () => {
    it('renders "Unable to load products. Please try again." by default (MKT-10, ERR-01)', () => {
      render(<ErrorState />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/Unable to load products\. Please try again\./i)
      ).toBeInTheDocument();
    });

    it('fires onRetry callback when retry button is clicked', () => {
      const handleRetry = vi.fn();
      render(<ErrorState onRetry={handleRetry} retryLabel="Retry Loading" />);

      const retryBtn = screen.getByRole('button', { name: /Retry Loading/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('renders compact mode correctly', () => {
      render(<ErrorState compact title="Error" message="Network failure" />);
      expect(screen.getByTestId('error-state-compact')).toBeInTheDocument();
    });
  });

  describe('Skeleton component', () => {
    it('renders base skeleton with shimmer class', () => {
      const { container } = render(<Skeleton width="200px" height="20px" />);
      const skeleton = container.firstChild;
      expect(skeleton).toHaveClass('skeleton-shimmer');
      expect(skeleton).toHaveStyle({ width: '200px', height: '20px' });
    });

    it('renders ProductCardSkeleton and TableSkeleton compound components', () => {
      render(<ProductCardSkeleton count={2} />);
      const cardSkeletons = screen.getAllByTestId('product-card-skeleton');
      expect(cardSkeletons).toHaveLength(2);

      render(<TableSkeleton rows={3} columns={3} />);
      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
    });
  });

  describe('Toast component', () => {
    it('renders ToastItem and handles dismissal', () => {
      const handleDismiss = vi.fn();
      const toast = {
        id: 'toast-1',
        type: 'success',
        title: 'Success!',
        message: 'Product added to cart',
      };

      render(<ToastItem toast={toast} onDismiss={handleDismiss} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Product added to cart')).toBeInTheDocument();

      const dismissBtn = screen.getByRole('button', {
        name: 'Dismiss notification',
      });
      fireEvent.click(dismissBtn);
      expect(handleDismiss).toHaveBeenCalledWith('toast-1');
    });

    it('renders error toast with role="alert"', () => {
      const toast = {
        id: 'toast-err',
        type: 'error',
        message: 'Something went wrong',
      };

      render(<ToastItem toast={toast} onDismiss={() => {}} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
