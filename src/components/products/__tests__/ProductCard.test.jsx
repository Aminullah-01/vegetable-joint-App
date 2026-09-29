import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard } from '../ProductCard';

describe('ProductCard Component (FE-026, MKT-02, REV-01, NFR-USAB-04)', () => {
  const sampleProduct = {
    id: 1,
    name: 'Fresh Roma Tomatoes',
    price: 2500,
    unit: 'basket',
    quantity: 45,
    availability: 'in_stock',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea',
    average_rating: 4.8,
    rating_count: 28,
    seller: {
      id: 1,
      business_name: 'Arewa Fresh Farms',
      location: 'Gombe',
    },
  };

  it('renders all required elements: image, name, price with unit, seller, location, availability badge, rating, and View Product action (MKT-02)', () => {
    render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} />
      </MemoryRouter>
    );

    // 1. Image
    const img = screen.getByRole('img', { name: 'Fresh Roma Tomatoes' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', sampleProduct.image);

    // 2. Name
    expect(
      screen.getByRole('heading', { level: 3, name: 'Fresh Roma Tomatoes' })
    ).toBeInTheDocument();

    // 3. Price with Unit (NFR-USAB-04)
    expect(screen.getByText('₦2,500 / basket')).toBeInTheDocument();

    // 4. Seller
    expect(screen.getByText('Arewa Fresh Farms')).toBeInTheDocument();

    // 5. Location
    expect(screen.getByText('Gombe')).toBeInTheDocument();

    // 6. Availability badge
    expect(screen.getByText('In Stock')).toBeInTheDocument();

    // 7. Rating (REV-01)
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('(28)')).toBeInTheDocument();

    // 8. View Product action (MKT-02)
    const viewBtn = screen.getByRole('link', { name: 'View Product' });
    expect(viewBtn).toBeInTheDocument();
    expect(viewBtn).toHaveAttribute('href', '/products/1');
    expect(viewBtn).toHaveStyle({ minHeight: '44px' });
  });

  it('displays "No ratings yet" when product has no rating value (REV-01)', () => {
    const unratedProduct = {
      ...sampleProduct,
      id: 2,
      average_rating: null,
      rating_count: 0,
    };

    render(
      <MemoryRouter>
        <ProductCard product={unratedProduct} />
      </MemoryRouter>
    );

    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();
  });

  it('correctly displays Out of Stock badge and prevents adding to cart when out of stock', () => {
    const outOfStockProduct = {
      ...sampleProduct,
      id: 3,
      quantity: 0,
      availability: 'out_of_stock',
    };

    render(
      <MemoryRouter>
        <ProductCard product={outOfStockProduct} onAddToCart={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /Add to Cart/i });
    expect(addBtn).toBeDisabled();
  });

  it('correctly displays Low Stock badge when stock is low', () => {
    const lowStockProduct = {
      ...sampleProduct,
      id: 4,
      quantity: 3,
      availability: 'low_stock',
    };

    render(
      <MemoryRouter>
        <ProductCard product={lowStockProduct} />
      </MemoryRouter>
    );

    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  it('renders fallback icon when image fails to load or is missing', () => {
    const noImageProduct = {
      ...sampleProduct,
      id: 5,
      image: null,
    };

    render(
      <MemoryRouter>
        <ProductCard product={noImageProduct} />
      </MemoryRouter>
    );

    // Fallback vegetable emoji icon
    expect(screen.getByRole('img', { name: 'Vegetable' })).toBeInTheDocument();
  });

  it('triggers image error fallback when img tag encounters an error', () => {
    render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} />
      </MemoryRouter>
    );

    const img = screen.getByRole('img', { name: 'Fresh Roma Tomatoes' });
    fireEvent.error(img);

    expect(screen.getByRole('img', { name: 'Vegetable' })).toBeInTheDocument();
  });

  it('fires onAddToCart callback with product data when Add to Cart button is clicked', async () => {
    const user = userEvent.setup();
    const handleAddToCart = vi.fn();

    render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} onAddToCart={handleAddToCart} />
      </MemoryRouter>
    );

    const addBtn = screen.getByRole('button', { name: /Add to Cart/i });
    await user.click(addBtn);

    expect(handleAddToCart).toHaveBeenCalledTimes(1);
    expect(handleAddToCart).toHaveBeenCalledWith(sampleProduct);
  });

  it('supports flattened props as an alternative to product object', () => {
    render(
      <MemoryRouter>
        <ProductCard
          id={10}
          name="Bell Peppers"
          price={1800}
          unit="kg"
          sellerName="Plateau Veggies"
          location="Jos"
          availability="in_stock"
          rating={4.5}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Bell Peppers')).toBeInTheDocument();
    expect(screen.getByText('₦1,800 / kg')).toBeInTheDocument();
    expect(screen.getByText('Plateau Veggies')).toBeInTheDocument();
    expect(screen.getByText('Jos')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });
});
