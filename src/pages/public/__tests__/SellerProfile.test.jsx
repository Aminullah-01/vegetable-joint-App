import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SellerProfile } from '../SellerProfile';
import { sellerService, productService } from '../../../services';
import { CartProvider, ToastProvider } from '../../../context';

// Mock seller matching schema and mockStore
const sampleSeller = {
  id: 1,
  user_id: 2,
  business_name: 'Arewa Fresh Farms',
  description:
    'Premier commercial vegetable grower based in Gombe. We supply premium Roma tomatoes, bell peppers, and fresh northern onions directly to consumers and restaurants.',
  location: 'Gombe',
  phone: '+2348031234567',
  approval_status: 'approved',
  average_rating: 4.8,
  rating_count: 36,
  total_products: 3,
  created_at: '2026-01-10T08:00:00Z',
  products: [
    {
      id: 1,
      seller_id: 1,
      category_id: 1,
      name: 'Fresh Roma Tomatoes',
      description: 'Firm and succulent farm-fresh Roma tomatoes.',
      price: 2500,
      unit: 'basket',
      quantity: 45,
      availability: 'in_stock',
      average_rating: 4.8,
      rating_count: 28,
      image: 'https://example.com/tomatoes.jpg',
      category: { id: 1, name: 'Tomato', slug: 'tomato' },
      seller: {
        id: 1,
        business_name: 'Arewa Fresh Farms',
        location: 'Gombe',
        phone: '+2348031234567',
      },
    },
    {
      id: 2,
      seller_id: 1,
      category_id: 2,
      name: 'Fresh Scotch Bonnet (Ata Rodo)',
      description: 'Hot, fragrant red scotch bonnet peppers.',
      price: 1800,
      unit: 'basket',
      quantity: 20,
      availability: 'in_stock',
      average_rating: 4.6,
      rating_count: 15,
      image: 'https://example.com/peppers.jpg',
      category: { id: 2, name: 'Pepper', slug: 'pepper' },
      seller: {
        id: 1,
        business_name: 'Arewa Fresh Farms',
        location: 'Gombe',
        phone: '+2348031234567',
      },
    },
    {
      id: 3,
      seller_id: 1,
      category_id: 3,
      name: 'Out of Stock Northern Onions',
      description: 'Crisp dry northern red onions.',
      price: 3200,
      unit: 'bag',
      quantity: 0,
      availability: 'out_of_stock',
      average_rating: 4.5,
      rating_count: 10,
      image: 'https://example.com/onions.jpg',
      category: { id: 3, name: 'Onion', slug: 'onion' },
      seller: {
        id: 1,
        business_name: 'Arewa Fresh Farms',
        location: 'Gombe',
        phone: '+2348031234567',
      },
    },
  ],
};

function renderWithProviders(ui, { route = '/sellers/1' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <CartProvider>
          <Routes>
            <Route path="/sellers/:id" element={ui} />
            <Route path="/products" element={<div>Products Page</div>} />
            <Route
              path="/products/:id"
              element={<div>Product Details Page</div>}
            />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('SellerProfile Page (FE-052 / MKT-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton while fetching seller data', () => {
    vi.spyOn(sellerService, 'getPublicSellerById').mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    renderWithProviders(<SellerProfile />);
    expect(screen.getByTestId('seller-profile-loading')).toBeInTheDocument();
  });

  it('renders business name, description, location, contact, rating, and verified badge', async () => {
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      sampleSeller
    );

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Arewa Fresh Farms',
          level: 1,
        })
      ).toBeInTheDocument();
    });

    // Business description
    expect(
      screen.getByText(/Premier commercial vegetable grower based in Gombe/i)
    ).toBeInTheDocument();

    // Location within hero header
    const heroHeader = screen.getByTestId('seller-hero-header');
    expect(heroHeader).toHaveTextContent('Gombe');

    // Contact Phone
    expect(screen.getByText('+2348031234567')).toBeInTheDocument();

    // Verified badge
    expect(screen.getByTestId('verified-seller-badge')).toBeInTheDocument();
    expect(screen.getByText('Verified Seller')).toBeInTheDocument();

    // Member since
    expect(screen.getByText(/Member since January 2026/i)).toBeInTheDocument();

    // Ratings on hero header
    expect(heroHeader).toHaveTextContent('4.8');
    expect(heroHeader).toHaveTextContent('(36)');

    // Breadcrumbs
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Marketplace' })
    ).toBeInTheDocument();
  });

  it('renders all available products belonging to the seller', async () => {
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      sampleSeller
    );

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Fresh Scotch Bonnet (Ata Rodo)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Out of Stock Northern Onions')
    ).toBeInTheDocument();

    // Check price and unit formatting
    expect(screen.getByText(/₦2,500/i)).toBeInTheDocument();
    expect(screen.getByText(/₦1,800/i)).toBeInTheDocument();
    expect(screen.getByText(/₦3,200/i)).toBeInTheDocument();

    // View Product and Add to Cart buttons
    const viewButtons = screen.getAllByRole('link', { name: /view/i });
    expect(viewButtons.length).toBeGreaterThanOrEqual(3);

    const addButtons = screen.getAllByRole('button', {
      name: /add to cart/i,
    });
    // First two products are in stock, third is out of stock (disabled)
    expect(addButtons.length).toBe(3);
    expect(addButtons[0]).toBeEnabled();
    expect(addButtons[1]).toBeEnabled();
    expect(addButtons[2]).toBeDisabled();
  });

  it('filters seller products by keyword search input', async () => {
    const user = userEvent.setup();
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      sampleSeller
    );

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search seller's vegetables/i
    );
    await user.type(searchInput, 'Roma');

    // Only Roma tomatoes should be visible
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    expect(
      screen.queryByText('Fresh Scotch Bonnet (Ata Rodo)')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Out of Stock Northern Onions')
    ).not.toBeInTheDocument();

    // Clear search using the clear button
    const clearButton = screen.getByRole('button', {
      name: /clear search query/i,
    });
    await user.click(clearButton);

    // All products should be restored
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    expect(
      screen.getByText('Fresh Scotch Bonnet (Ata Rodo)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Out of Stock Northern Onions')
    ).toBeInTheDocument();
  });

  it('filters seller products by in-stock toggle', async () => {
    const user = userEvent.setup();
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      sampleSeller
    );

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(
        screen.getByText('Out of Stock Northern Onions')
      ).toBeInTheDocument();
    });

    const inStockCheckbox = screen.getByLabelText(/in-stock only/i);
    await user.click(inStockCheckbox);

    // Out of stock product should be filtered out
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    expect(
      screen.getByText('Fresh Scotch Bonnet (Ata Rodo)')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Out of Stock Northern Onions')
    ).not.toBeInTheDocument();

    // Toggle back
    await user.click(inStockCheckbox);
    expect(
      screen.getByText('Out of Stock Northern Onions')
    ).toBeInTheDocument();
  });

  it('filters seller products by category dropdown', async () => {
    const user = userEvent.setup();
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      sampleSeller
    );

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    });

    const categorySelect = screen.getByRole('combobox', {
      name: /filter by category/i,
    });
    await user.selectOptions(categorySelect, 'pepper');

    expect(
      screen.getByText('Fresh Scotch Bonnet (Ata Rodo)')
    ).toBeInTheDocument();
    expect(screen.queryByText('Fresh Roma Tomatoes')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Out of Stock Northern Onions')
    ).not.toBeInTheDocument();
  });

  it('sorts seller products by price ascending and descending', async () => {
    const user = userEvent.setup();
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      sampleSeller
    );

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole('combobox', {
      name: /sort vegetables/i,
    });

    // Sort: Price Low to High (Scotch Bonnet ₦1800, Roma ₦2500, Onions ₦3200)
    await user.selectOptions(sortSelect, 'price_asc');

    const productHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(productHeadings[0]).toHaveTextContent(
      'Fresh Scotch Bonnet (Ata Rodo)'
    );
    expect(productHeadings[1]).toHaveTextContent('Fresh Roma Tomatoes');
    expect(productHeadings[2]).toHaveTextContent(
      'Out of Stock Northern Onions'
    );

    // Sort: Price High to Low (Onions ₦3200, Roma ₦2500, Scotch Bonnet ₦1800)
    await user.selectOptions(sortSelect, 'price_desc');
    const updatedHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(updatedHeadings[0]).toHaveTextContent(
      'Out of Stock Northern Onions'
    );
    expect(updatedHeadings[1]).toHaveTextContent('Fresh Roma Tomatoes');
    expect(updatedHeadings[2]).toHaveTextContent(
      'Fresh Scotch Bonnet (Ata Rodo)'
    );
  });

  it('adds product to cart when clicking Add to Cart on product card', async () => {
    const user = userEvent.setup();
    const onAddToCartMock = vi.fn();
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      sampleSeller
    );

    renderWithProviders(<SellerProfile onAddToCart={onAddToCartMock} />);

    await waitFor(() => {
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', {
      name: /add to cart/i,
    });
    await user.click(addButtons[0]);

    expect(onAddToCartMock).toHaveBeenCalledTimes(1);
    expect(onAddToCartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        name: 'Fresh Roma Tomatoes',
      })
    );
  });

  it('renders empty state when seller has 0 listed products', async () => {
    const emptySeller = {
      ...sampleSeller,
      products: [],
    };
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      emptySeller
    );
    vi.spyOn(productService, 'getProducts').mockResolvedValue({
      data: [],
      meta: { total: 0 },
    });

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(screen.getByText('No Vegetables Listed Yet')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Arewa Fresh Farms currently has no vegetables available for sale/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /browse marketplace vegetables/i })
    ).toBeInTheDocument();
  });

  it('renders search empty state when filtering yields no results, and resets filters', async () => {
    const user = userEvent.setup();
    vi.spyOn(sellerService, 'getPublicSellerById').mockResolvedValue(
      sampleSeller
    );

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search seller's vegetables/i
    );
    await user.type(searchInput, 'NonExistentVegetableXYZ');

    expect(screen.getByText('No Matching Vegetables')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', {
      name: /clear filters/i,
    });
    await user.click(clearBtn);

    // Should reset and show products again
    expect(screen.getByText('Fresh Roma Tomatoes')).toBeInTheDocument();
  });

  it('renders 404 empty state when seller is not found', async () => {
    vi.spyOn(sellerService, 'getPublicSellerById').mockRejectedValue({
      status: 404,
      message: 'Seller not found.',
    });

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(screen.getByTestId('seller-not-found')).toBeInTheDocument();
    });

    expect(screen.getByText('Seller Not Found')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /browse marketplace vegetables/i })
    ).toBeInTheDocument();
  });

  it('renders error state and retries on failure', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(sellerService, 'getPublicSellerById')
      .mockRejectedValueOnce(new Error('Network error loading seller'))
      .mockResolvedValueOnce(sampleSeller);

    renderWithProviders(<SellerProfile />);

    await waitFor(() => {
      expect(screen.getByTestId('seller-error-state')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Unable to Load Seller Profile')
    ).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /try again/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Arewa Fresh Farms',
          level: 1,
        })
      ).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
