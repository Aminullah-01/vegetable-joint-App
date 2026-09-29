import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Button, Link } from '../index.js';

describe('Button and Link Components (FE-025, UI-03, NFR-USAB-03)', () => {
  // ============================================================================
  // 1. Button Component Tests
  // ============================================================================
  describe('Button Component', () => {
    it('renders with default props and text content', () => {
      render(<Button>Add to Cart 🛒</Button>);

      const btn = screen.getByRole('button', { name: /Add to Cart 🛒/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('type', 'button');
      expect(btn).toHaveClass('btn', 'btn-primary', 'btn-md');
    });

    it('satisfies touch target minimum ≥ 44×44px on standard size (NFR-USAB-03)', () => {
      render(<Button size="md">Proceed to Checkout</Button>);

      const btn = screen.getByRole('button', { name: /Proceed to Checkout/i });
      expect(btn).toHaveStyle({ minHeight: '44px', minWidth: '44px' });
    });

    it('renders primary, secondary, and danger variants (FE-025 acceptance criteria)', () => {
      const { rerender } = render(
        <Button variant="primary">Primary Action</Button>
      );
      expect(screen.getByRole('button')).toHaveClass('btn-primary');

      rerender(<Button variant="secondary">Secondary Action</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-secondary');

      rerender(<Button variant="danger">Delete Item</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-danger');

      rerender(<Button variant="destructive">Remove All</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-destructive');
    });

    it('renders outline, ghost, and accent variants', () => {
      const { rerender } = render(<Button variant="outline">Explore</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-outline');

      rerender(<Button variant="ghost">Cancel</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-ghost');

      rerender(<Button variant="accent">Special Deal</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-accent');
    });

    it('renders sm and lg button sizes (UI-03)', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn-sm');

      rerender(<Button size="lg">Large CTA</Button>);
      const lgBtn = screen.getByRole('button');
      expect(lgBtn).toHaveClass('btn-lg');
      expect(lgBtn).toHaveStyle({ minHeight: '48px' });
    });

    it('handles disabled state correctly (FE-025)', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );

      const btn = screen.getByRole('button', { name: /Disabled Button/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      expect(btn).toHaveClass('btn-disabled');

      await user.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('handles loading state with spinner and prevents interaction (FE-025)', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button loading loadingText="Placing Order..." onClick={handleClick}>
          Place Order
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toHaveClass('btn-loading');

      // Accessible spinner is present
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(screen.getByText('Placing Order...')).toBeInTheDocument();

      await user.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('renders spinner without shifting text when loadingText is omitted', () => {
      render(<Button loading>Save Changes</Button>);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('renders fullWidth buttons for mobile and checkout CTAs (UI-03)', () => {
      render(<Button fullWidth>Checkout Now</Button>);

      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('btn-full-width');
      expect(btn).toHaveStyle({ width: '100%' });
    });

    it('renders startIcon and endIcon adornments', () => {
      render(
        <Button
          startIcon={<span data-testid="start-icon">🥦</span>}
          endIcon={<span data-testid="end-icon">→</span>}
        >
          View Vegetables
        </Button>
      );

      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
      expect(screen.getByText('View Vegetables')).toBeInTheDocument();
    });

    it('fires onClick callback when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByRole('button', { name: /Click Me/i });
      await user.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('polymorphically renders as React Router Link when "to" prop is passed', () => {
      render(
        <MemoryRouter>
          <Button to="/vegetables" variant="primary">
            Browse Crops
          </Button>
        </MemoryRouter>
      );

      const link = screen.getByRole('link', { name: /Browse Crops/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/vegetables');
      expect(link).toHaveClass('btn', 'btn-primary');
    });

    it('polymorphically renders as native anchor when "href" prop is passed', () => {
      render(
        <Button href="https://example.com/docs" variant="outline">
          External Docs
        </Button>
      );

      const link = screen.getByRole('link', { name: /External Docs/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com/docs');
      expect(link).toHaveClass('btn', 'btn-outline');
    });

    it('forwards ref to button DOM element', () => {
      const btnRef = createRef();
      render(<Button ref={btnRef}>With Ref</Button>);

      expect(btnRef.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  // ============================================================================
  // 2. Link Component Tests
  // ============================================================================
  describe('Link Component', () => {
    it('renders text and supports onClick handler', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Link onClick={handleClick}>Terms of Service</Link>);

      const link = screen.getByRole('link', { name: /Terms of Service/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('link', 'link-primary');

      await user.click(link);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders client-side React Router navigation when "to" is provided', () => {
      render(
        <MemoryRouter>
          <Link to="/orders">View Orders</Link>
        </MemoryRouter>
      );

      const link = screen.getByRole('link', { name: /View Orders/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/orders');
    });

    it('renders external link attributes with security protections and accessible text', () => {
      render(
        <Link href="https://nigeriaagriculture.gov.ng" external>
          Federal Ministry of Agriculture
        </Link>
      );

      const link = screen.getByRole('link', {
        name: /Federal Ministry of Agriculture/i,
      });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(screen.getByText('(opens in a new tab)')).toBeInTheDocument();
    });

    it('renders primary, secondary, muted, and danger link variants', () => {
      const { rerender } = render(<Link variant="primary">Primary</Link>);
      expect(screen.getByRole('link')).toHaveClass('link-primary');

      rerender(<Link variant="secondary">Secondary</Link>);
      expect(screen.getByRole('link')).toHaveClass('link-secondary');

      rerender(<Link variant="muted">Muted</Link>);
      expect(screen.getByRole('link')).toHaveClass('link-muted');

      rerender(<Link variant="danger">Cancel Order</Link>);
      expect(screen.getByRole('link')).toHaveClass('link-danger');
    });

    it('supports touchTarget prop ensuring ≥ 44×44px hit area (NFR-USAB-03)', () => {
      render(<Link touchTarget>Mobile Tap Target</Link>);

      const link = screen.getByRole('link', { name: /Mobile Tap Target/i });
      expect(link).toHaveClass('link-touch-target');
      expect(link).toHaveStyle({ minHeight: '44px', minWidth: '44px' });
    });

    it('handles disabled state preventing navigation', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Link disabled onClick={handleClick}>
          Unavailable Link
        </Link>
      );

      const link = screen.getByRole('link', { name: /Unavailable Link/i });
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveClass('link-disabled');

      await user.click(link);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('renders startIcon and endIcon adornments', () => {
      render(
        <Link
          startIcon={<span data-testid="link-start">←</span>}
          endIcon={<span data-testid="link-end">↗</span>}
        >
          Back to Marketplace
        </Link>
      );

      expect(screen.getByTestId('link-start')).toBeInTheDocument();
      expect(screen.getByTestId('link-end')).toBeInTheDocument();
      expect(screen.getByText('Back to Marketplace')).toBeInTheDocument();
    });

    it('forwards ref to anchor DOM element', () => {
      const linkRef = createRef();
      render(
        <Link ref={linkRef} href="/privacy">
          Privacy Policy
        </Link>
      );

      expect(linkRef.current).toBeInstanceOf(HTMLAnchorElement);
    });
  });
});
