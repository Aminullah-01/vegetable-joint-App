import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SellerCard } from '../SellerCard';

const seller = {
  id: 1,
  user_id: 2,
  business_name: 'Arewa Fresh Farms',
  description:
    'Premier commercial vegetable grower based in Gombe. We supply premium Roma tomatoes, bell peppers, and fresh northern onions directly to consumers.',
  location: 'Gombe',
  approval_status: 'approved',
  average_rating: 4.8,
  rating_count: 36,
  products_count: 6,
};

const renderCard = (props = {}) =>
  render(
    <MemoryRouter>
      <SellerCard seller={seller} {...props} />
    </MemoryRouter>
  );

describe('SellerCard (FE-032, MKT-01, MKT-07, REV-01)', () => {
  it('shows business name, location, rating, summary and a profile link', () => {
    renderCard();

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Arewa Fresh Farms',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Gombe')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('(36)')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Premier commercial vegetable grower based in Gombe. We supply premium Roma tomatoes, bell peppers, and fresh northern onions directly to consumers.'
      )
    ).toBeInTheDocument();
  });

  it('links to the public seller profile page (MKT-07)', () => {
    renderCard();

    const viewSeller = screen.getByRole('link', {
      name: 'View seller profile for Arewa Fresh Farms',
    });
    expect(viewSeller).toHaveAttribute('href', '/sellers/1');
    expect(viewSeller).toHaveStyle({ minHeight: '44px' });
    expect(
      screen.getByRole('link', { name: 'Arewa Fresh Farms' })
    ).toHaveAttribute('href', '/sellers/1');
  });

  it('shows the product count for the seller', () => {
    renderCard();

    expect(screen.getByText('6 products')).toBeInTheDocument();
  });

  it('uses a singular product label when the seller lists one product', () => {
    renderCard({ seller: { ...seller, products_count: 1 } });

    expect(screen.getByText('1 product')).toBeInTheDocument();
  });

  it('displays "No ratings yet" when the seller has no rating value (REV-01)', () => {
    renderCard({
      seller: { ...seller, average_rating: null, rating_count: 0 },
    });

    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();
  });

  it('marks approved sellers as verified', () => {
    renderCard();

    expect(screen.getByText('Verified Seller')).toBeInTheDocument();
  });

  it('hides sellers that are not approved from public listings (MKT-04)', () => {
    const { container } = renderCard({
      seller: { ...seller, approval_status: 'pending' },
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('can display an unapproved seller when an admin context explicitly requests it', () => {
    renderCard({
      seller: { ...seller, approval_status: 'suspended' },
      showUnapproved: true,
    });

    expect(
      screen.getByRole('heading', { level: 3, name: 'Arewa Fresh Farms' })
    ).toBeInTheDocument();
  });

  it('omits optional sections when disabled', () => {
    renderCard({
      showDescription: false,
      showRating: false,
      showProductCount: false,
    });

    expect(screen.queryByText('No ratings yet')).not.toBeInTheDocument();
    expect(screen.queryByText('6 products')).not.toBeInTheDocument();
    expect(screen.queryByText(seller.description)).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /View seller profile/i })
    ).toBeInTheDocument();
  });

  it('reads the mock store total_products column as the product count', () => {
    renderCard({
      seller: {
        id: 2,
        user_id: 3,
        business_name: 'Green Harvest Cooperative',
        description: 'Farmers cooperative cultivating organic leafy greens.',
        location: 'Kano',
        approval_status: 'approved',
        average_rating: 4.6,
        rating_count: 24,
        total_products: 4,
      },
    });

    expect(screen.getByText('4 products')).toBeInTheDocument();
  });

  it('supports individual column props instead of a seller object', () => {
    render(
      <MemoryRouter>
        <SellerCard
          id={3}
          businessName="Jos Plateau Organic Farms"
          location="Plateau"
          description="High-altitude cool climate farming in Jos."
          rating={4.9}
          ratingCount={42}
          productCount={5}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Jos Plateau Organic Farms',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Plateau')).toBeInTheDocument();
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('5 products')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'View seller profile for Jos Plateau Organic Farms',
      })
    ).toHaveAttribute('href', '/sellers/3');
  });

  it('renders an API-supplied logo and falls back when the image fails', () => {
    renderCard({
      seller: { ...seller, logo_url: 'https://example.test/logo.png' },
    });

    const logo = document.querySelector('.seller-card img');
    expect(logo).toHaveAttribute('src', 'https://example.test/logo.png');

    fireEvent.error(logo);
    expect(document.querySelector('.seller-card img')).toBeNull();
    expect(
      screen.getByRole('link', { name: /View seller profile/i })
    ).toBeInTheDocument();
  });

  it('does not render a profile link when no seller id is available', () => {
    const { id: _id, ...idLessSeller } = seller;
    renderCard({ seller: idLessSeller });

    expect(
      screen.getByRole('heading', { level: 3, name: 'Arewa Fresh Farms' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /View seller profile/i })
    ).toBeNull();
  });

  it('accepts an explicit destination override', () => {
    renderCard({ to: '/products?seller=1' });

    expect(
      screen.getByRole('link', { name: /View seller profile/i })
    ).toHaveAttribute('href', '/products?seller=1');
  });
});
