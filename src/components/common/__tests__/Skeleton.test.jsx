import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  TableSkeleton,
  ProductDetailSkeleton,
  OrderDetailSkeleton,
  CategoryGridSkeleton,
  TextSkeleton,
} from '../Skeleton';

describe('Skeleton Loaders (FE-040, MKT-10, Figma Section 16)', () => {
  describe('Base Skeleton Component', () => {
    it('renders with default rounded variant and shimmer animation', () => {
      const { container } = render(<Skeleton width="150px" height="24px" />);
      const skeleton = container.firstChild;

      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-shimmer');
      expect(skeleton).toHaveStyle({
        width: '150px',
        height: '24px',
        borderRadius: '8px',
      });
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('supports geometric variants: text, circular, rectangular, rounded', () => {
      const { rerender, container } = render(<Skeleton variant="text" />);
      expect(container.firstChild).toHaveStyle({ borderRadius: '4px' });

      rerender(<Skeleton variant="circular" width="40px" height="40px" />);
      expect(container.firstChild).toHaveStyle({ borderRadius: '50%' });

      rerender(<Skeleton variant="rectangular" />);
      expect(container.firstChild).toHaveStyle({ borderRadius: '0px' });

      rerender(<Skeleton variant="rounded" borderRadius="16px" />);
      expect(container.firstChild).toHaveStyle({ borderRadius: '16px' });
    });

    it('supports pulse and none animations', () => {
      const { rerender, container } = render(<Skeleton animation="pulse" />);
      expect(container.firstChild).toHaveClass('animate-pulse');

      rerender(<Skeleton animation="none" />);
      expect(container.firstChild).not.toHaveClass('skeleton-shimmer');
      expect(container.firstChild).not.toHaveClass('animate-pulse');
      expect(container.firstChild).toHaveStyle({ backgroundColor: '#e2e8f0' });
    });

    it('applies custom className and style props', () => {
      const { container } = render(
        <Skeleton className="custom-skel" style={{ margin: '12px' }} />
      );
      expect(container.firstChild).toHaveClass('custom-skel');
      expect(container.firstChild).toHaveStyle({ margin: '12px' });
    });
  });

  describe('ProductCardSkeleton Component (MKT-10)', () => {
    it('renders single product card skeleton by default', () => {
      render(<ProductCardSkeleton />);
      const cards = screen.getAllByTestId('product-card-skeleton');
      expect(cards).toHaveLength(1);
    });

    it('renders specified number of product card skeletons', () => {
      render(<ProductCardSkeleton count={4} />);
      const cards = screen.getAllByTestId('product-card-skeleton');
      expect(cards).toHaveLength(4);
    });
  });

  describe('ProductGridSkeleton Component (FE-040, MKT-10)', () => {
    it('renders a responsive grid with default count of 8 cards', () => {
      render(<ProductGridSkeleton />);
      const grid = screen.getByTestId('product-grid-skeleton');

      expect(grid).toBeInTheDocument();
      expect(grid).toHaveAttribute('role', 'status');
      expect(grid).toHaveAttribute('aria-label', 'Loading products...');

      const cards = screen.getAllByTestId('product-card-skeleton');
      expect(cards).toHaveLength(8);
    });

    it('supports custom card count and columns layout', () => {
      render(
        <ProductGridSkeleton
          count={12}
          columns="repeat(4, 1fr)"
          className="custom-grid"
        />
      );

      const grid = screen.getByTestId('product-grid-skeleton');
      expect(grid).toHaveClass('custom-grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, 1fr)' });

      const cards = screen.getAllByTestId('product-card-skeleton');
      expect(cards).toHaveLength(12);
    });
  });

  describe('TableSkeleton Component (FE-040, Figma Section 16)', () => {
    it('renders default 5 rows and 4 columns with role="status"', () => {
      render(<TableSkeleton />);
      const table = screen.getByTestId('table-skeleton');

      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute('role', 'status');
      expect(table).toHaveAttribute('aria-label', 'Loading table data...');
    });

    it('renders custom row and column configurations', () => {
      render(
        <TableSkeleton rows={8} columns={6} className="admin-table-skel" />
      );
      const table = screen.getByTestId('table-skeleton');
      expect(table).toHaveClass('admin-table-skel');
    });
  });

  describe('ProductDetailSkeleton Component (FE-040, MKT-05, Figma Section 6 & 16)', () => {
    it('renders 2-column detail page layout with image gallery and description', () => {
      render(<ProductDetailSkeleton className="custom-detail" />);
      const detail = screen.getByTestId('product-detail-skeleton');

      expect(detail).toBeInTheDocument();
      expect(detail).toHaveClass('custom-detail');
      expect(detail).toHaveAttribute('role', 'status');
      expect(detail).toHaveAttribute(
        'aria-label',
        'Loading product details...'
      );
    });
  });

  describe('OrderDetailSkeleton Component (FE-040, ORD-02, Figma Section 8 & 16)', () => {
    it('renders order detail page layout with header, timeline, items, and summary', () => {
      render(<OrderDetailSkeleton className="custom-order-skel" />);
      const orderDetail = screen.getByTestId('order-detail-skeleton');

      expect(orderDetail).toBeInTheDocument();
      expect(orderDetail).toHaveClass('custom-order-skel');
      expect(orderDetail).toHaveAttribute('role', 'status');
      expect(orderDetail).toHaveAttribute(
        'aria-label',
        'Loading order details...'
      );
    });
  });

  describe('CategoryGridSkeleton Component (FE-040, MKT-08, Figma Section 16)', () => {
    it('renders card variant with icon and label placeholders', () => {
      render(<CategoryGridSkeleton count={6} variant="card" />);
      const catGrid = screen.getByTestId('category-grid-skeleton');

      expect(catGrid).toBeInTheDocument();
      expect(catGrid).toHaveAttribute('role', 'status');
      expect(catGrid).toHaveAttribute('aria-label', 'Loading categories...');
    });

    it('renders chip variant with pill-shaped placeholders', () => {
      render(<CategoryGridSkeleton count={5} variant="chip" />);
      const catGrid = screen.getByTestId('category-grid-skeleton');

      expect(catGrid).toBeInTheDocument();
      expect(catGrid).toHaveClass('category-grid-skeleton');
    });
  });

  describe('TextSkeleton Component', () => {
    it('renders specified number of text lines with staggered widths', () => {
      const { container } = render(<TextSkeleton lines={3} gap="0.5rem" />);
      const lines = container.querySelectorAll('.skeleton-shimmer');
      expect(lines).toHaveLength(3);
    });
  });
});
