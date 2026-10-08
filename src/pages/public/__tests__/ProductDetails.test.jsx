import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProductDetails } from '../ProductDetails';
import { productService } from '../../../services';
import { CartProvider, ToastProvider } from '../../../context';
import { STRINGS } from '../../../constants';

const sampleProduct = {
  id: 1,
  seller_id: 1,
  category_id: 1,
  name: 'Fresh Roma Tomatoes',
  description:
    'Succulent farm-fresh Roma tomatoes harvested in Gombe. Ideal for traditional Nigerian stews.',
  price: 2500,
  unit: 'basket',
  quantity: 45,
  low_stock_threshold: 5,
  image: 'https://example.com/tomatoes.jpg',
  availability: 'in_stock',
  average_rating: 4.8,
  rating_count: 28,
  category: {
    id: 1,
    name: 'Tomato',
    slug: 'tomato',
  },
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    location: 'Gombe',
    phone: '+2348031234567',
  },
};

const sampleOutOfStockProduct = {
  ...sampleProduct,
  id: 2,
  name: 'Out of Stock Scotch Bonnet',
  quantity: 0,
  availability: 'out_of_stock',
};

const sampleRelatedProducts = [
  {
    id: 3,
    seller_id: 1,
    category_id: 1,
    name: 'Cherry Tomatoes',
    price: 3000,
    unit: 'basket',
    quantity: 10,
    availability: 'in_stock',
    image: 'https://example.com/cherry.jpg',
    average_rating: 4.5,
    rating_count: 12,
    seller: {
      id: 1,
      business_name: 'Arewa Fresh Farms',
      location: 'Gombe',
    },
  },
];

function renderWithProviders(ui, { route = '/products/1' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <CartProvider>
          <Routes>
            <Route path="/products/:id" element={ui} />
            <Route path="/products" element={<div>Products Page</div>} />
            <Route
              path="/sellers/:id"
              element={<div>Seller Profile Page</div>}
            />
            <Route path="/cart" element={<div>Cart Page</div>} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ProductDetails Page (FE-050 / MKT-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all MKT-05 acceptance criteria fields for a valid product', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(sampleProduct);
    vi.spyOn(productService, 'getProducts').mockResolvedValue({
      data: sampleRelatedProducts,
      meta: { total: 1 },
    });

    renderWithProviders(<ProductDetails />);

    // 1. Loading state is displayed initially
    expect(screen.getByTestId('product-detail-skeleton')).toBeInTheDocument();

    // 2. Wait for product data to resolve
    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    // 1. Name
    expect(screen.getByTestId('product-name')).toHaveTextContent(
      'Fresh Roma Tomatoes'
    );

    // 2. Image
    const imageContainer = screen.getByTestId('product-image');
    expect(imageContainer).toBeInTheDocument();
    const imgEl = screen.getByRole('img', { name: /fresh roma tomatoes/i });
    expect(imgEl).toHaveAttribute('src', 'https://example.com/tomatoes.jpg');

    // 3. Description
    expect(screen.getByTestId('product-description')).toHaveTextContent(
      'Succulent farm-fresh Roma tomatoes harvested in Gombe.'
    );

    // 4. Price & 5. Unit
    const priceEl = screen.getByTestId('product-price');
    expect(priceEl).toHaveTextContent('₦2,500');
    expect(screen.getByTestId('product-unit')).toHaveTextContent('/ basket');

    // 6. Stock
    expect(screen.getByTestId('product-stock')).toHaveTextContent(
      '45 available'
    );

    // 7. Seller
    const sellerLinks = screen.getAllByTestId('product-seller');
    expect(sellerLinks[0]).toHaveTextContent('Arewa Fresh Farms');
    expect(sellerLinks[0].closest('a')).toHaveAttribute('href', '/sellers/1');

    // 8. Location
    expect(screen.getByTestId('product-location')).toHaveTextContent('Gombe');

    // 9. Availability Badge
    const badges = screen.getAllByTestId('availability-badge');
    expect(badges[0]).toBeInTheDocument();
    expect(badges[0]).toHaveTextContent(/available|in stock/i);

    // 10. Rating
    expect(
      screen.getByRole('status', { name: /rating: 4.8/i })
    ).toBeInTheDocument();
  });

  it('renders 404 empty state when product is not found', async () => {
    const notFoundError = new Error(STRINGS.ERRORS.PRODUCT_NOT_FOUND);
    notFoundError.status = 404;
    vi.spyOn(productService, 'getProductById').mockRejectedValue(notFoundError);

    renderWithProviders(<ProductDetails />, { route: '/products/9999' });

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: STRINGS.ERRORS.PRODUCT_NOT_FOUND })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /browse vegetables/i })
    ).toHaveAttribute('href', '/products');
  });

  it('renders error state when an API error occurs and supports retry', async () => {
    const apiError = new Error('Network error');
    apiError.status = 500;
    const getProductSpy = vi
      .spyOn(productService, 'getProductById')
      .mockRejectedValueOnce(apiError)
      .mockResolvedValueOnce(sampleProduct);

    vi.spyOn(productService, 'getProducts').mockResolvedValue({
      data: [],
    });

    renderWithProviders(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/network error/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await userEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toHaveTextContent(
        'Fresh Roma Tomatoes'
      );
    });

    expect(getProductSpy).toHaveBeenCalledTimes(2);
  });

  it('handles quantity selector changes and clamps properly', async () => {
    const user = userEvent.setup();
    vi.spyOn(productService, 'getProductById').mockResolvedValue({
      ...sampleProduct,
      quantity: 5,
    });
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const qtyInput = screen.getByRole('spinbutton', {
      name: /quantity amount/i,
    });
    expect(qtyInput).toHaveValue(1);

    const incButton = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    const decButton = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.DECREASE_QUANTITY,
    });

    // Increase to 2
    await user.click(incButton);
    expect(qtyInput).toHaveValue(2);

    // Increase up to max 5
    await user.click(incButton);
    await user.click(incButton);
    await user.click(incButton);
    expect(qtyInput).toHaveValue(5);
    expect(incButton).toBeDisabled();

    // Decrease down to 4
    await user.click(decButton);
    expect(qtyInput).toHaveValue(4);
  });

  it('adds item to cart and triggers toast feedback and callback', async () => {
    const user = userEvent.setup();
    const onAddToCartMock = vi.fn();

    vi.spyOn(productService, 'getProductById').mockResolvedValue(sampleProduct);
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails onAddToCart={onAddToCartMock} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const incButton = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    await user.click(incButton); // quantity = 2

    const addToCartButton = screen.getByTestId('add-to-cart-button');
    await user.click(addToCartButton);

    expect(onAddToCartMock).toHaveBeenCalledTimes(1);
    expect(onAddToCartMock).toHaveBeenCalledWith(sampleProduct, 2);

    // Toast message appears in document
    await waitFor(() => {
      expect(
        screen.getByText(/added 2 baskets of fresh roma tomatoes to cart!/i)
      ).toBeInTheDocument();
    });
  });

  it('disables quantity selector and Add to Cart button when product is out of stock', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleOutOfStockProduct
    );
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    // Stock label shows "Out of Stock"
    expect(screen.getByTestId('product-stock')).toHaveTextContent(
      STRINGS.PRODUCTS.OUT_OF_STOCK
    );

    // Add to cart button is disabled
    const addToCartBtn = screen.getByTestId('add-to-cart-button');
    expect(addToCartBtn).toBeDisabled();
    expect(addToCartBtn).toHaveTextContent(STRINGS.PRODUCTS.OUT_OF_STOCK);

    // Quantity selector buttons are disabled
    const incButton = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    expect(incButton).toBeDisabled();
  });

  it('renders breadcrumbs and back navigation link', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(sampleProduct);
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const backLink = screen.getByRole('link', {
      name: STRINGS.PRODUCTS.BACK_TO_PRODUCTS,
    });
    expect(backLink).toHaveAttribute('href', '/products');

    const breadcrumbNav = screen.getByRole('navigation', {
      name: /breadcrumb/i,
    });
    expect(breadcrumbNav).toBeInTheDocument();
    expect(
      within(breadcrumbNav).getByRole('link', { name: 'Home' })
    ).toHaveAttribute('href', '/');
    expect(
      within(breadcrumbNav).getByRole('link', { name: 'Vegetables' })
    ).toHaveAttribute('href', '/products');
    expect(
      within(breadcrumbNav).getByRole('link', { name: 'Tomato' })
    ).toHaveAttribute('href', '/products?category=tomato');
  });

  it('renders related products grid when available', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(sampleProduct);
    vi.spyOn(productService, 'getProducts').mockResolvedValue({
      data: sampleRelatedProducts,
    });

    renderWithProviders(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByTestId('related-products-grid')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: /related fresh produce/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Cherry Tomatoes')).toBeInTheDocument();
  });

  it('renders seller preview card with link to seller profile', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(sampleProduct);
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails />);

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /view seller profile →/i })
      ).toHaveAttribute('href', '/sellers/1');
    });

    expect(screen.getByText(/2348031234567/)).toBeInTheDocument();
  });
});
