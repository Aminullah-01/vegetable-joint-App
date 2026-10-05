import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FeaturedProductsSection } from '../FeaturedProductsSection';
import { productService } from '../../../services/productService.js';
import { CartProvider } from '../../../context/CartContext.jsx';
import { ToastProvider } from '../../../context/ToastContext.jsx';
import { STRINGS } from '../../../constants';

const mockProductList = [
  {
    id: 1,
    seller_id: 10,
    name: 'Fresh Roma Tomatoes',
    price: 2500,
    unit: 'basket',
    quantity: 45,
    availability: 'in_stock',
    average_rating: 4.8,
    rating_count: 28,
    location: 'Kano, Nigeria',
    seller: {
      id: 10,
      business_name: 'Green Valley Farms',
      location: 'Kano, Nigeria',
    },
  },
  {
    id: 2,
    seller_id: 12,
    name: 'Fresh Ugwu (Fluted Pumpkin)',
    price: 1200,
    unit: 'bunch',
    quantity: 80,
    availability: 'in_stock',
    average_rating: 4.9,
    rating_count: 42,
    location: 'Oyo, Nigeria',
    seller: {
      id: 12,
      business_name: 'Oyo Organic Greens',
      location: 'Oyo, Nigeria',
    },
  },
  {
    id: 3,
    seller_id: 14,
    name: 'Habanero Peppers (Atarodo)',
    price: 3000,
    unit: 'paint bucket',
    quantity: 2,
    availability: 'low_stock',
    average_rating: 4.6,
    rating_count: 19,
    location: 'Kaduna, Nigeria',
    seller: {
      id: 14,
      business_name: 'Kaduna Spice Hub',
      location: 'Kaduna, Nigeria',
    },
  },
  {
    id: 4,
    seller_id: 15,
    name: 'Red Bell Peppers (Tatase)',
    price: 3500,
    unit: 'basket',
    quantity: 0,
    availability: 'out_of_stock',
    average_rating: 4.5,
    rating_count: 15,
    location: 'Jos, Nigeria',
    seller: {
      id: 15,
      business_name: 'Plateau Fresh Harvest',
      location: 'Jos, Nigeria',
    },
  },
];

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CartProvider>{ui}</CartProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('FeaturedProductsSection Component (FE-042, MKT-01, MKT-02, MKT-10)', () => {
  let getProductsSpy;

  beforeEach(() => {
    getProductsSpy = vi
      .spyOn(productService, 'getProducts')
      .mockResolvedValue({ data: mockProductList });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders section header, badge, title, subtitle, and view all link (MKT-01, Figma Section 4)', async () => {
    renderWithProviders(<FeaturedProductsSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-products-grid')).toBeInTheDocument();
    });

    // Section container
    expect(screen.getByTestId('featured-products-section')).toBeInTheDocument();

    // Badge
    expect(screen.getByTestId('featured-badge')).toHaveTextContent(
      STRINGS.HOME.FEATURED_PRODUCTS_BADGE
    );

    // Title
    expect(screen.getByTestId('featured-heading')).toHaveTextContent(
      STRINGS.HOME.FEATURED_PRODUCTS_TITLE
    );

    // Subtitle
    expect(screen.getByTestId('featured-subtitle')).toHaveTextContent(
      STRINGS.HOME.FEATURED_PRODUCTS_SUBTITLE
    );

    // View All Link
    const viewAllLink = screen.getByTestId('featured-view-all-link');
    expect(viewAllLink).toHaveAttribute('href', '/products');
    expect(viewAllLink).toHaveTextContent(STRINGS.HOME.VIEW_ALL_PRODUCTS);
  });

  it('shows skeleton loader while products are loading (MKT-10)', () => {
    // Hang promise to verify loading state
    getProductsSpy.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<FeaturedProductsSection limit={6} />);

    expect(screen.getByTestId('product-grid-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('featured-products-grid')
    ).not.toBeInTheDocument();
  });

  it('renders grid of product cards with details, prices, and seller information (MKT-01, MKT-02)', async () => {
    renderWithProviders(<FeaturedProductsSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-products-grid')).toBeInTheDocument();
    });

    // Check produce cards are rendered
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    expect(screen.getByText('Fresh Ugwu (Fluted Pumpkin)')).toBeInTheDocument();
    expect(screen.getByText('Habanero Peppers (Atarodo)')).toBeInTheDocument();
    expect(screen.getByText('Red Bell Peppers (Tatase)')).toBeInTheDocument();

    // Check seller names
    expect(screen.getByText('Green Valley Farms')).toBeInTheDocument();
    expect(screen.getByText('Oyo Organic Greens')).toBeInTheDocument();

    // Check Naira prices with units
    expect(screen.getByText('₦2,500 / basket')).toBeInTheDocument();
    expect(screen.getByText('₦1,200 / bunch')).toBeInTheDocument();
  });

  it('respects limit prop and fetches with requested limit and sort', async () => {
    renderWithProviders(<FeaturedProductsSection limit={2} sort="newest" />);

    expect(getProductsSpy).toHaveBeenCalledWith({
      per_page: 2,
      sort: 'newest',
    });

    await waitFor(() => {
      expect(screen.getByTestId('featured-products-grid')).toBeInTheDocument();
    });

    // Limit was 2 so only first 2 items rendered
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    expect(screen.getByText('Fresh Ugwu (Fluted Pumpkin)')).toBeInTheDocument();
    expect(
      screen.queryByText('Habanero Peppers (Atarodo)')
    ).not.toBeInTheDocument();
  });

  it('renders empty state when no products are returned', async () => {
    getProductsSpy.mockResolvedValue({ data: [] });

    renderWithProviders(<FeaturedProductsSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-empty-state')).toBeInTheDocument();
    });

    expect(
      screen.getByText('No Featured Produce Available')
    ).toBeInTheDocument();
  });

  it('renders error state and retries on failure (MKT-10, ERR-01)', async () => {
    const user = userEvent.setup();
    getProductsSpy.mockRejectedValueOnce(new Error('Network error occurred'));

    renderWithProviders(<FeaturedProductsSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-error-state')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error occurred')).toBeInTheDocument();

    // Mock next response as success and click retry
    getProductsSpy.mockResolvedValueOnce({ data: mockProductList });
    const retryBtn = screen.getByRole('button', { name: /Try Again|Retry/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('featured-products-grid')).toBeInTheDocument();
    });
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
  });

  it('supports custom onAddToCart handler', async () => {
    const user = userEvent.setup();
    const handleAddToCart = vi.fn();

    renderWithProviders(
      <FeaturedProductsSection onAddToCart={handleAddToCart} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('featured-products-grid')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', {
      name: /Add to Cart/i,
    });
    expect(addButtons.length).toBeGreaterThan(0);

    await user.click(addButtons[0]);

    expect(handleAddToCart).toHaveBeenCalledTimes(1);
    expect(handleAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        name: 'Fresh Roma Tomatoes',
      })
    );
  });

  it('adds product to CartProvider and fires toast confirmation when default onAddToCart is used', async () => {
    const user = userEvent.setup();

    renderWithProviders(<FeaturedProductsSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-products-grid')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', {
      name: /Add to Cart/i,
    });

    // Click the first available item ("Fresh Roma Tomatoes")
    await user.click(addButtons[0]);

    // Toast should show up
    await waitFor(() => {
      expect(
        screen.getByText(/Added Fresh Roma Tomatoes to cart!/i)
      ).toBeInTheDocument();
    });
  });

  it('disables Add to Cart button for out of stock items (MKT-02, BR-02)', async () => {
    renderWithProviders(<FeaturedProductsSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-products-grid')).toBeInTheDocument();
    });

    // 4th product is out of stock (quantity: 0, availability: 'out_of_stock')
    const addButtons = screen.getAllByRole('button', {
      name: /Add to Cart/i,
    });
    expect(addButtons[3]).toBeDisabled();
  });

  it('can hide view all link when showViewAll is false', async () => {
    renderWithProviders(<FeaturedProductsSection showViewAll={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-products-grid')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('featured-view-all-link')
    ).not.toBeInTheDocument();
  });
});
