import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SellerProductForm } from '../SellerProductForm';
import { AuthContext } from '../../../context/authContextDef';
import { ToastContext } from '../../../context/toastContextDef';
import { sellerService } from '../../../services/sellerService';
import { categoryService } from '../../../services/categoryService';
import { mockStore } from '../../../data/mockStore';

// Mock approved seller user
const mockApprovedSeller = {
  id: 2,
  seller_id: 1,
  name: 'Ibrahim Danladi',
  email: 'seller@arewafarms.ng',
  role: 'seller',
  seller: {
    id: 1,
    business_name: 'Arewa Fresh Farms',
    approval_status: 'approved',
    location: 'Gombe',
  },
};

// Mock pending seller user (AUTH-03)
const mockPendingSeller = {
  id: 5,
  seller_id: 4,
  name: 'Pending Farmer',
  email: 'pending@seller.ng',
  role: 'seller',
  seller: {
    id: 4,
    business_name: 'Kano Green Fields',
    approval_status: 'pending',
    location: 'Kano',
  },
};

const sampleCategories = [
  { id: 1, name: 'Tomato', slug: 'tomato' },
  { id: 2, name: 'Pepper', slug: 'pepper' },
  { id: 3, name: 'Leafy Greens', slug: 'leafy-greens' },
  { id: 4, name: 'Onion', slug: 'onion' },
];

function renderSellerProductForm({
  user = mockApprovedSeller,
  initialRoute = '/seller/products/new',
  mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    showToast: vi.fn(),
  },
} = {}) {
  const authValue = {
    user,
    role: user?.role || 'seller',
    isAuthenticated: Boolean(user),
    token: 'test-token',
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    updateUser: vi.fn(),
  };

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <ToastContext.Provider value={mockToast}>
          <AuthContext.Provider value={authValue}>
            <Routes>
              <Route path="/seller/products/new" element={children} />
              <Route path="/seller/products/:id/edit" element={children} />
              <Route
                path="/seller/products"
                element={
                  <div data-testid="mock-seller-products-page">
                    Mock Seller Products Page
                  </div>
                }
              />
              <Route
                path="/seller"
                element={
                  <div data-testid="mock-seller-overview-page">
                    Mock Seller Overview Page
                  </div>
                }
              />
            </Routes>
          </AuthContext.Provider>
        </ToastContext.Provider>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return {
    ...render(<SellerProductForm />, { wrapper: Wrapper }),
    mockToast,
  };
}

describe('FE-083 / SEL-02: Add Product Form', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    vi.restoreAllMocks();

    // Default mock categoryService responses
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(
      sampleCategories
    );
  });

  describe('1. Form Layout and Fields (SEL-02, Figma Section 13)', () => {
    it('renders page title, subtitle, and navigation back link', async () => {
      renderSellerProductForm();

      expect(await screen.findByTestId('product-form-title')).toHaveTextContent(
        /Add New Vegetable Listing/i
      );
      expect(screen.getByTestId('product-form-subtitle')).toHaveTextContent(
        /Publish a new vegetable listing with price, unit, and stock/i
      );
      expect(screen.getByTestId('product-form-back-link')).toHaveAttribute(
        'href',
        '/seller/products'
      );
    });

    it('renders all mandatory and optional fields with appropriate labels and helpers', async () => {
      renderSellerProductForm();

      // Mandatory fields (SEL-02)
      expect(
        await screen.findByTestId('product-name-input')
      ).toBeInTheDocument();
      expect(screen.getByTestId('product-category-select')).toBeInTheDocument();
      expect(screen.getByTestId('product-price-input')).toBeInTheDocument();
      expect(screen.getByTestId('product-unit-select')).toBeInTheDocument();
      expect(screen.getByTestId('product-quantity-input')).toBeInTheDocument();

      // Optional / derived fields
      expect(screen.getByTestId('product-threshold-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('product-description-input')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('product-availability-select')
      ).toBeInTheDocument();
      expect(screen.getByTestId('product-image-input')).toBeInTheDocument();

      // Actions
      expect(screen.getByTestId('save-product-submit-btn')).toHaveTextContent(
        /Save & Publish Listing/i
      );
      expect(screen.getByTestId('product-cancel-link')).toHaveAttribute(
        'href',
        '/seller/products'
      );
    });

    it('populates active categories into the category select dropdown', async () => {
      renderSellerProductForm();

      const categorySelect = await screen.findByTestId(
        'product-category-select'
      );
      expect(categorySelect).toHaveTextContent(/Tomato/i);
      expect(categorySelect).toHaveTextContent(/Pepper/i);
      expect(categorySelect).toHaveTextContent(/Leafy Greens/i);
      expect(categorySelect).toHaveTextContent(/Onion/i);
    });

    it('renders all standard produce units (kg, basket, bag, bunch, piece, crate)', async () => {
      renderSellerProductForm();

      const unitSelect = await screen.findByTestId('product-unit-select');
      expect(unitSelect).toHaveTextContent(/per basket/i);
      expect(unitSelect).toHaveTextContent(/per kg/i);
      expect(unitSelect).toHaveTextContent(/per bag/i);
      expect(unitSelect).toHaveTextContent(/per bunch/i);
      expect(unitSelect).toHaveTextContent(/per piece/i);
      expect(unitSelect).toHaveTextContent(/per crate/i);
    });
  });

  describe('2. Client-Side Inline Validation (SEL-02, UI-05, NFR-USAB-05)', () => {
    it('validates mandatory name field and displays error on empty submission', async () => {
      const createSpy = vi.spyOn(sellerService, 'createProduct');
      const user = userEvent.setup();

      renderSellerProductForm();

      const nameInput = await screen.findByTestId('product-name-input');
      await user.clear(nameInput);

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      expect(
        await screen.findByText(/Vegetable name is required \(SEL-02\)/i)
      ).toBeInTheDocument();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects vegetable name shorter than 2 characters', async () => {
      const user = userEvent.setup();

      renderSellerProductForm();

      const nameInput = await screen.findByTestId('product-name-input');
      await user.type(nameInput, 'A');

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      expect(
        await screen.findByText(/Vegetable name must be at least 2 characters/i)
      ).toBeInTheDocument();
    });

    it('validates category selection is mandatory', async () => {
      const user = userEvent.setup();

      renderSellerProductForm();

      const catSelect = await screen.findByTestId('product-category-select');
      await user.selectOptions(catSelect, '');

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      expect(
        await screen.findByText(
          /Please select a vegetable category \(SEL-02\)/i
        )
      ).toBeInTheDocument();
    });

    it('validates price must be strictly greater than 0 (> 0, SEL-02)', async () => {
      const user = userEvent.setup();

      renderSellerProductForm();

      const priceInput = await screen.findByTestId('product-price-input');
      await user.clear(priceInput);
      await user.type(priceInput, '0');

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      expect(
        await screen.findByText(/Price must be greater than ₦0 \(SEL-02\)/i)
      ).toBeInTheDocument();

      // Negative price
      await user.clear(priceInput);
      await user.type(priceInput, '-100');
      await user.click(submitBtn);

      expect(
        await screen.findByText(/Price must be greater than ₦0 \(SEL-02\)/i)
      ).toBeInTheDocument();
    });

    it('validates quantity cannot be negative (>= 0, SEL-02)', async () => {
      const user = userEvent.setup();

      renderSellerProductForm();

      const qtyInput = await screen.findByTestId('product-quantity-input');
      await user.clear(qtyInput);
      await user.type(qtyInput, '-5');

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      expect(
        await screen.findByText(/Quantity cannot be negative \(SEL-02\)/i)
      ).toBeInTheDocument();
    });

    it('allows quantity = 0 without error and automatically reflects Out of Stock', async () => {
      const user = userEvent.setup();

      renderSellerProductForm();

      const qtyInput = await screen.findByTestId('product-quantity-input');
      await user.clear(qtyInput);
      await user.type(qtyInput, '0');

      expect(
        screen.getByTestId('product-derived-availability-label')
      ).toHaveTextContent(/Out of Stock \(Automatic\)/i);
    });
  });

  describe('3. Availability Mode & Derivation (SEL-07, BR-01)', () => {
    it('shows "Available (In Stock)" when quantity > 0 and mode is available', async () => {
      renderSellerProductForm();

      await screen.findByTestId('product-quantity-input');
      expect(
        screen.getByTestId('product-derived-availability-label')
      ).toHaveTextContent(/Available \(In Stock\)/i);
    });

    it('allows seller to manually select "Unavailable" to hide listing regardless of stock', async () => {
      const user = userEvent.setup();

      renderSellerProductForm();

      const availSelect = await screen.findByTestId(
        'product-availability-select'
      );
      await user.selectOptions(availSelect, 'unavailable');

      expect(
        screen.getByTestId('product-derived-availability-label')
      ).toHaveTextContent(/Unavailable \(Hidden from buyers\)/i);
    });
  });

  describe('4. Product Image Validation & Constraints (SEL-05, A-08)', () => {
    it('shows default vegetable placeholder 🥦 when no image is uploaded', async () => {
      renderSellerProductForm();

      expect(
        await screen.findByTestId('product-image-placeholder-icon')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('product-image-preview')
      ).not.toBeInTheDocument();
    });

    it('rejects file larger than 2 MB with clear error message (SEL-05, A-08)', async () => {
      const user = userEvent.setup();

      renderSellerProductForm();

      const fileInput = await screen.findByTestId('product-image-input');
      // Create fake file of 2.5 MB (2.5 * 1024 * 1024 bytes)
      const largeFile = new File(
        [new ArrayBuffer(2.5 * 1024 * 1024)],
        'large-farm.jpg',
        {
          type: 'image/jpeg',
        }
      );

      await user.upload(fileInput, largeFile);

      expect(
        await screen.findByTestId('product-image-error')
      ).toHaveTextContent(/Image file size must not exceed 2 MB \(SEL-05\)/i);
    });

    it('rejects unsupported file formats (e.g. PDF or GIF)', async () => {
      renderSellerProductForm();

      const fileInput = await screen.findByTestId('product-image-input');
      const pdfFile = new File(['%PDF-1.4'], 'document.pdf', {
        type: 'application/pdf',
      });

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      expect(
        await screen.findByTestId('product-image-error')
      ).toHaveTextContent(
        /Image must be in JPEG, PNG, or WebP format \(SEL-05\)/i
      );
    });

    it('accepts valid JPEG file, displays preview, and allows removing it', async () => {
      const user = userEvent.setup();
      // Mock URL.createObjectURL and URL.revokeObjectURL
      global.URL.createObjectURL = vi.fn(
        () => 'blob:http://localhost/test-preview'
      );
      global.URL.revokeObjectURL = vi.fn();

      renderSellerProductForm();

      const fileInput = await screen.findByTestId('product-image-input');
      const validFile = new File(['valid-image-bytes'], 'fresh-peppers.jpg', {
        type: 'image/jpeg',
      });

      await user.upload(fileInput, validFile);

      const preview = await screen.findByTestId('product-image-preview');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveAttribute(
        'src',
        'blob:http://localhost/test-preview'
      );

      // Click remove image
      const removeBtn = screen.getByTestId('product-remove-image-btn');
      await user.click(removeBtn);

      expect(
        screen.queryByTestId('product-image-preview')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('product-image-placeholder-icon')
      ).toBeInTheDocument();
    });
  });

  describe('5. Quick Fill Helper', () => {
    it('populates valid sample produce values when clicking Quick Fill button', async () => {
      const user = userEvent.setup();

      renderSellerProductForm();

      const quickFillBtn = await screen.findByTestId('product-quick-fill-btn');
      await user.click(quickFillBtn);

      expect(screen.getByTestId('product-name-input')).toHaveValue(
        'Farm Fresh Roma Tomatoes'
      );
      expect(screen.getByTestId('product-price-input')).toHaveValue(2800);
      expect(screen.getByTestId('product-unit-select')).toHaveValue('basket');
      expect(screen.getByTestId('product-quantity-input')).toHaveValue(25);
      expect(screen.getByTestId('product-description-input').value).toContain(
        'Gombe farms'
      );
    });
  });

  describe('6. Successful Product Creation & Navigation (SEL-02, TC-19)', () => {
    it('submits valid produce form, calls service, shows toast, and navigates to /seller/products', async () => {
      const createSpy = vi
        .spyOn(sellerService, 'createProduct')
        .mockResolvedValue({
          id: 101,
          name: 'Sweet Habanero Peppers',
          price: 2400,
          quantity: 20,
        });

      const user = userEvent.setup();
      const { mockToast } = renderSellerProductForm();

      // Fill in fields
      const nameInput = await screen.findByTestId('product-name-input');
      await user.type(nameInput, 'Sweet Habanero Peppers');

      const catSelect = screen.getByTestId('product-category-select');
      await user.selectOptions(catSelect, '2'); // Pepper

      const priceInput = screen.getByTestId('product-price-input');
      await user.type(priceInput, '2400');

      const unitSelect = screen.getByTestId('product-unit-select');
      await user.selectOptions(unitSelect, 'basket');

      const qtyInput = screen.getByTestId('product-quantity-input');
      await user.clear(qtyInput);
      await user.type(qtyInput, '20');

      const descInput = screen.getByTestId('product-description-input');
      await user.type(
        descInput,
        'Freshly harvested yellow peppers from Arewa farms.'
      );

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_id: 1,
            name: 'Sweet Habanero Peppers',
            category_id: 2,
            price: 2400,
            unit: 'basket',
            quantity: 20,
            availability: 'in_stock',
          })
        );
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('Sweet Habanero Peppers')
      );

      // Successfully navigated to products list
      expect(
        await screen.findByTestId('mock-seller-products-page')
      ).toBeInTheDocument();
    });
  });

  describe('7. Server Error Handling & Resilience', () => {
    it('surfaces server error in alert box and preserves user inputs on failure', async () => {
      vi.spyOn(sellerService, 'createProduct').mockRejectedValue(
        new Error('Database error saving product')
      );

      const user = userEvent.setup();
      renderSellerProductForm();

      const nameInput = await screen.findByTestId('product-name-input');
      await user.type(nameInput, 'Organic Spinach');

      const priceInput = screen.getByTestId('product-price-input');
      await user.type(priceInput, '1500');

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      await user.click(submitBtn);

      const errorAlert = await screen.findByTestId('product-form-error-alert');
      expect(errorAlert).toHaveTextContent(/Database error saving product/i);

      // Verify form values remain preserved
      expect(screen.getByTestId('product-name-input')).toHaveValue(
        'Organic Spinach'
      );
      expect(screen.getByTestId('product-price-input')).toHaveValue(1500);
    });
  });

  describe('8. Publishing Locked State for Unapproved Sellers (AUTH-03, ADM-03)', () => {
    it('shows locked publishing message and disables submit for pending seller', async () => {
      renderSellerProductForm({ user: mockPendingSeller });

      const lockedContainer = await screen.findByTestId(
        'product-form-publishing-locked'
      );
      expect(lockedContainer).toHaveTextContent(
        /Product publishing is disabled/i
      );
      expect(lockedContainer).toHaveTextContent(/AUTH-03, ADM-03/i);

      const submitBtn = screen.getByTestId('save-product-submit-btn');
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveTextContent(
        /Publishing Disabled \(Pending Approval\)/i
      );

      const backLink = screen.getByTestId('product-form-blocked-back-link');
      expect(backLink).toHaveAttribute('href', '/seller');
    });
  });
});
