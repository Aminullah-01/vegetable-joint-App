import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProductDetails } from '../ProductDetails';
import { productService } from '../../../services';
import { CartProvider, ToastProvider } from '../../../context';
import { STRINGS } from '../../../constants';

const sampleInStockProduct = {
  id: 10,
  seller_id: 2,
  category_id: 1,
  name: 'Farm Fresh Bell Peppers',
  description: 'Crisp green and red bell peppers.',
  price: 1500,
  unit: 'basket',
  quantity: 5,
  low_stock_threshold: 2,
  availability: 'in_stock',
  seller: {
    id: 2,
    business_name: 'Kaduna Greens',
    location: 'Kaduna',
  },
};

const sampleSingleStockProduct = {
  ...sampleInStockProduct,
  id: 11,
  name: 'Rare Organic Squash',
  quantity: 1,
};

const sampleZeroStockProduct = {
  ...sampleInStockProduct,
  id: 12,
  name: 'Sold Out Carrots',
  quantity: 0,
  availability: 'out_of_stock',
};

const sampleUnavailableProduct = {
  ...sampleInStockProduct,
  id: 13,
  name: 'Seasonally Unavailable Yams',
  quantity: 20,
  availability: 'unavailable',
};

function renderWithProviders(ui, { route = '/products/10' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <CartProvider>
          <Routes>
            <Route path="/products/:id" element={ui} />
            <Route path="/cart" element={<div>Cart Page</div>} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ProductDetails Add to Cart & Quantity Selector (FE-051 / MKT-06 / CART-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes quantity selector to 1 and bounds minimum quantity to 1', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleInStockProduct
    );
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails productId={10} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const qtyInput = screen.getByRole('spinbutton', {
      name: /quantity amount/i,
    });
    expect(qtyInput).toHaveValue(1);

    const decBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.DECREASE_QUANTITY,
    });
    // At minimum 1, decrement is disabled
    expect(decBtn).toBeDisabled();

    const incBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    expect(incBtn).toBeEnabled();
  });

  it('limits quantity increment to available stock and disables increment button at limit', async () => {
    const user = userEvent.setup();
    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleInStockProduct
    ); // quantity: 5
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails productId={10} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const incBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    const decBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.DECREASE_QUANTITY,
    });
    const qtyInput = screen.getByRole('spinbutton', {
      name: /quantity amount/i,
    });

    // 1 -> 2
    await user.click(incBtn);
    expect(qtyInput).toHaveValue(2);
    expect(decBtn).toBeEnabled();

    // 2 -> 3
    await user.click(incBtn);
    expect(qtyInput).toHaveValue(3);

    // 3 -> 4
    await user.click(incBtn);
    expect(qtyInput).toHaveValue(4);

    // 4 -> 5 (max stock limit)
    await user.click(incBtn);
    expect(qtyInput).toHaveValue(5);
    expect(incBtn).toBeDisabled();

    // Clicking again should not exceed 5
    await user.click(incBtn);
    expect(qtyInput).toHaveValue(5);

    // Decrement from 5 -> 4 re-enables increment button
    await user.click(decBtn);
    expect(qtyInput).toHaveValue(4);
    expect(incBtn).toBeEnabled();
  });

  it('disables both increment and decrement when available stock is exactly 1', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleSingleStockProduct
    );
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails productId={11} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const qtyInput = screen.getByRole('spinbutton', {
      name: /quantity amount/i,
    });
    expect(qtyInput).toHaveValue(1);

    const decBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.DECREASE_QUANTITY,
    });
    const incBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });

    // 1 is both min and max, so both buttons must be disabled
    expect(decBtn).toBeDisabled();
    expect(incBtn).toBeDisabled();

    // But Add to Cart button remains enabled for this 1 available unit
    const addBtn = screen.getByTestId('add-to-cart-button');
    expect(addBtn).toBeEnabled();
  });

  it('clamps manual input within [1, availableStock]', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleInStockProduct
    ); // quantity: 5
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails productId={10} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const qtyInput = screen.getByRole('spinbutton', {
      name: /quantity amount/i,
    });

    // Attempt to enter a number exceeding available stock (e.g. 50) -> clamps to 5
    fireEvent.change(qtyInput, { target: { value: '50' } });
    expect(qtyInput).toHaveValue(5);

    // Attempt to enter 0 -> clamps to minimum 1
    fireEvent.change(qtyInput, { target: { value: '0' } });
    expect(qtyInput).toHaveValue(1);
  });

  it('disables quantity selector and Add to Cart button with "Out of Stock" when quantity is 0', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleZeroStockProduct
    );
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails productId={12} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    // Quantity selector buttons and input are disabled
    const incBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    const decBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.DECREASE_QUANTITY,
    });
    const qtyInput = screen.getByRole('spinbutton', {
      name: /quantity amount/i,
    });

    expect(incBtn).toBeDisabled();
    expect(decBtn).toBeDisabled();
    expect(qtyInput).toBeDisabled();

    // Add to Cart button is disabled with "Out of Stock" text
    const addBtn = screen.getByTestId('add-to-cart-button');
    expect(addBtn).toBeDisabled();
    expect(addBtn).toHaveTextContent(STRINGS.PRODUCTS.OUT_OF_STOCK);

    // Stock indicator confirms Out of Stock
    expect(screen.getByTestId('product-stock')).toHaveTextContent(
      STRINGS.PRODUCTS.OUT_OF_STOCK
    );
  });

  it('disables quantity selector and Add to Cart button when seller marks product unavailable', async () => {
    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleUnavailableProduct
    );
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails productId={13} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const incBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    const addBtn = screen.getByTestId('add-to-cart-button');

    expect(incBtn).toBeDisabled();
    expect(addBtn).toBeDisabled();
    expect(addBtn).toHaveTextContent(STRINGS.PRODUCTS.OUT_OF_STOCK);
  });

  it('successfully adds selected quantity to cart with toast confirmation and visual feedback', async () => {
    const user = userEvent.setup();
    const onAddToCartMock = vi.fn();

    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleInStockProduct
    );
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(
      <ProductDetails productId={10} onAddToCart={onAddToCartMock} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    // Select quantity = 3
    const incBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    await user.click(incBtn);
    await user.click(incBtn);

    const addBtn = screen.getByTestId('add-to-cart-button');
    await user.click(addBtn);

    // Callback invoked with chosen quantity
    expect(onAddToCartMock).toHaveBeenCalledTimes(1);
    expect(onAddToCartMock).toHaveBeenCalledWith(sampleInStockProduct, 3);

    // Toast confirmation
    await waitFor(() => {
      expect(
        screen.getByText(/added 3 baskets of farm fresh bell peppers to cart!/i)
      ).toBeInTheDocument();
    });

    // In-cart indicator appears showing items in cart
    await waitFor(() => {
      expect(screen.getByTestId('in-cart-indicator')).toHaveTextContent(
        '3 currently in your cart'
      );
    });
  });

  it('dynamically limits quantity selector to remaining stock when item is already in cart', async () => {
    const user = userEvent.setup();
    vi.spyOn(productService, 'getProductById').mockResolvedValue(
      sampleInStockProduct
    ); // total stock: 5
    vi.spyOn(productService, 'getProducts').mockResolvedValue({ data: [] });

    renderWithProviders(<ProductDetails productId={10} />);

    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toBeInTheDocument();
    });

    const incBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.INCREASE_QUANTITY,
    });
    const addBtn = screen.getByTestId('add-to-cart-button');

    // Add 2 to cart
    await user.click(incBtn); // qty = 2
    await user.click(addBtn);

    await waitFor(() => {
      expect(screen.getByTestId('in-cart-indicator')).toHaveTextContent(
        '2 currently in your cart'
      );
    });

    // Remaining capacity is now 5 - 2 = 3.
    // The quantity selector max should now be 3.
    const qtyInput = screen.getByRole('spinbutton', {
      name: /quantity amount/i,
    });
    expect(qtyInput).toHaveValue(1);

    // Increment 1 -> 2 -> 3 (remaining limit)
    await user.click(incBtn); // 2
    await user.click(incBtn); // 3
    expect(qtyInput).toHaveValue(3);
    expect(incBtn).toBeDisabled();

    // Add remaining 3 to cart
    await user.click(addBtn);

    // Now all 5 are in cart
    await waitFor(() => {
      expect(screen.getByTestId('in-cart-indicator')).toHaveTextContent(
        'All 5 available in your cart'
      );
    });

    // Once all stock is in cart, add to cart is disabled with "Max in Cart"
    expect(addBtn).toBeDisabled();
    expect(addBtn).toHaveTextContent(/max in cart/i);
    expect(incBtn).toBeDisabled();
  });
});
