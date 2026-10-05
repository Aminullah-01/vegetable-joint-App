import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FeaturedSellersSection } from '../FeaturedSellersSection';
import { sellerService } from '../../../services/sellerService.js';
import { STRINGS } from '../../../constants';

const mockSellerList = [
  {
    id: 1,
    business_name: 'Green Valley Farms',
    location: 'Kano, Nigeria',
    description:
      'Family-owned organic vegetable farm cultivating high-yield tomatoes and sweet peppers.',
    average_rating: 4.8,
    rating_count: 36,
    total_products: 12,
    approval_status: 'approved',
    image: null,
  },
  {
    id: 2,
    business_name: 'Oyo Organic Greens',
    location: 'Ibadan, Oyo State',
    description:
      'Hydroponic and open-field farm producing fresh spinach, ugwu, and traditional herbs.',
    average_rating: 4.9,
    rating_count: 52,
    total_products: 8,
    approval_status: 'approved',
    image: null,
  },
  {
    id: 3,
    business_name: 'Jos Highland Harvest',
    location: 'Jos, Plateau State',
    description:
      'Cool-climate vegetable specialist supplying crisp carrots, cabbage, and potatoes.',
    average_rating: 4.7,
    rating_count: 24,
    total_products: 15,
    approval_status: 'approved',
    image: null,
  },
  {
    id: 4,
    business_name: 'Unapproved Farm',
    location: 'Kaduna, Nigeria',
    description: 'Pending verification account.',
    average_rating: 0,
    rating_count: 0,
    total_products: 0,
    approval_status: 'pending',
    image: null,
  },
];

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('FeaturedSellersSection Component (FE-044, MKT-01, MKT-04, MKT-07, MKT-10)', () => {
  let getPublicSellersSpy;

  beforeEach(() => {
    getPublicSellersSpy = vi
      .spyOn(sellerService, 'getPublicSellers')
      .mockResolvedValue({ data: mockSellerList });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders section header, badge, title, subtitle, and view all link (MKT-01, Figma Section 4)', async () => {
    renderWithRouter(<FeaturedSellersSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-sellers-grid')).toBeInTheDocument();
    });

    // Section container
    expect(screen.getByTestId('featured-sellers-section')).toBeInTheDocument();

    // Badge
    expect(screen.getByTestId('featured-sellers-badge')).toHaveTextContent(
      STRINGS.HOME.FEATURED_SELLERS_BADGE
    );

    // Title
    expect(screen.getByTestId('featured-sellers-heading')).toHaveTextContent(
      STRINGS.HOME.FEATURED_SELLERS_TITLE
    );

    // Subtitle
    expect(screen.getByTestId('featured-sellers-subtitle')).toHaveTextContent(
      STRINGS.HOME.FEATURED_SELLERS_SUBTITLE
    );

    // View All Link
    const viewAllLink = screen.getByTestId('featured-sellers-view-all-link');
    expect(viewAllLink).toHaveAttribute('href', '/products');
    expect(viewAllLink).toHaveTextContent(STRINGS.HOME.VIEW_ALL_SELLERS);
  });

  it('shows skeleton loader while sellers are loading (MKT-10)', () => {
    // Hang promise to verify loading state
    getPublicSellersSpy.mockReturnValue(new Promise(() => {}));

    renderWithRouter(<FeaturedSellersSection limit={3} />);

    expect(screen.getByTestId('seller-grid-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('featured-sellers-grid')
    ).not.toBeInTheDocument();
  });

  it('renders seller cards linking to public seller profiles (FE-044, MKT-01, MKT-07)', async () => {
    renderWithRouter(<FeaturedSellersSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-sellers-grid')).toBeInTheDocument();
    });

    // Business names
    expect(screen.getByText('Green Valley Farms')).toBeInTheDocument();
    expect(screen.getByText('Oyo Organic Greens')).toBeInTheDocument();
    expect(screen.getByText('Jos Highland Harvest')).toBeInTheDocument();

    // Locations
    expect(screen.getByText('Kano, Nigeria')).toBeInTheDocument();
    expect(screen.getByText('Ibadan, Oyo State')).toBeInTheDocument();
    expect(screen.getByText('Jos, Plateau State')).toBeInTheDocument();

    // Descriptions
    expect(
      screen.getByText(/Family-owned organic vegetable farm/i)
    ).toBeInTheDocument();

    // Product counts
    expect(
      screen.getByText(STRINGS.SELLERS.PRODUCTS_LABEL(12))
    ).toBeInTheDocument();

    // Verified badges
    const verifiedBadges = screen.getAllByText(STRINGS.SELLERS.VERIFIED_SELLER);
    expect(verifiedBadges.length).toBe(3);

    // Links to seller profiles (/sellers/:id)
    const viewButtons = screen.getAllByRole('link', {
      name: /View seller profile for /i,
    });
    expect(viewButtons.length).toBe(3);
    expect(viewButtons[0]).toHaveAttribute('href', '/sellers/1');
    expect(viewButtons[1]).toHaveAttribute('href', '/sellers/2');
    expect(viewButtons[2]).toHaveAttribute('href', '/sellers/3');
  });

  it('filters out unapproved sellers from public view (MKT-04)', async () => {
    renderWithRouter(<FeaturedSellersSection />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-sellers-grid')).toBeInTheDocument();
    });

    // Unapproved farm should not be visible
    expect(screen.queryByText('Unapproved Farm')).not.toBeInTheDocument();
  });

  it('respects limit prop to restrict number of visible sellers', async () => {
    renderWithRouter(<FeaturedSellersSection limit={2} />);

    expect(getPublicSellersSpy).toHaveBeenCalledWith({ per_page: 2 });

    await waitFor(() => {
      expect(screen.getByTestId('featured-sellers-grid')).toBeInTheDocument();
    });

    expect(screen.getByText('Green Valley Farms')).toBeInTheDocument();
    expect(screen.getByText('Oyo Organic Greens')).toBeInTheDocument();
    expect(screen.queryByText('Jos Highland Harvest')).not.toBeInTheDocument();
  });

  it('renders error state and retries on failure (MKT-10, ERR-01)', async () => {
    const user = userEvent.setup();
    getPublicSellersSpy.mockRejectedValueOnce(
      new Error('Failed to load sellers')
    );

    renderWithRouter(<FeaturedSellersSection />);

    await waitFor(() => {
      expect(screen.getByTestId('sellers-error-state')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load sellers')).toBeInTheDocument();

    // Retry successfully
    getPublicSellersSpy.mockResolvedValueOnce({ data: mockSellerList });
    const retryBtn = screen.getByRole('button', { name: /Try Again|Retry/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('featured-sellers-grid')).toBeInTheDocument();
    });
    expect(screen.getByText('Green Valley Farms')).toBeInTheDocument();
  });

  it('renders empty state when no sellers are returned', async () => {
    getPublicSellersSpy.mockResolvedValue({ data: [] });

    renderWithRouter(<FeaturedSellersSection />);

    await waitFor(() => {
      expect(screen.getByTestId('sellers-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText('No Verified Sellers Found')).toBeInTheDocument();
  });

  it('hides view all link when showViewAll is false', async () => {
    renderWithRouter(<FeaturedSellersSection showViewAll={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('featured-sellers-grid')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('featured-sellers-view-all-link')
    ).not.toBeInTheDocument();
  });
});
