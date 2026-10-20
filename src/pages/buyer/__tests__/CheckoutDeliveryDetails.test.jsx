import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Checkout } from '../Checkout';
import { CartContext } from '../../../context/cartContextDef';
import { ToastProvider, AuthProvider } from '../../../context';
import { authService } from '../../../services/authService';
import { mockStore } from '../../../data/mockStore';
import { STRINGS, DELIVERY_DETAILS_STORAGE_KEY } from '../../../constants';

const sampleTomato = {
  id: 1,
  product_id: 1,
  name: 'Fresh Roma Tomatoes',
  price: 2500,
  unit: 'basket',
  quantity: 4,
  available_stock: 10,
  subtotal: 10000,
  seller_id: 1,
  seller: { id: 1, business_name: 'Arewa Fresh Farms' },
};

async function loginAsBuyer() {
  const result = await authService.login({
    email: 'buyer@example.com',
    password: 'password123',
  });
  localStorage.setItem('vegetable_joint_token', result.token);
  return result;
}

function renderCheckout(cartOverrides = {}) {
  const defaultCart = {
    items: [sampleTomato],
    isEmpty: false,
    itemCount: 4,
    uniqueItemCount: 1,
    subtotal: 10000,
    total: 10000,
    validationNotice: null,
    validationChanges: [],
    validationResult: null,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    validateCart: vi.fn().mockResolvedValue({
      is_valid: true,
      has_price_changes: false,
      has_stock_issues: false,
      has_unavailable: false,
      changes: [],
      items: [sampleTomato],
    }),
    acknowledgeValidation: vi.fn().mockReturnValue([sampleTomato]),
    clearValidationNotice: vi.fn(),
  };

  const cartValue = { ...defaultCart, ...cartOverrides };

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={['/checkout']}>
        <ToastProvider>
          <AuthProvider>
            <CartContext.Provider value={cartValue}>
              <Routes>
                <Route path="/checkout" element={children} />
                <Route path="/cart" element={<div>Mock Cart Page</div>} />
                <Route
                  path="/checkout/confirmation/:ref"
                  element={<div>Mock Confirmation Page</div>}
                />
              </Routes>
            </CartContext.Provider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return { ...render(<Checkout />, { wrapper: Wrapper }), cartValue };
}

async function waitUntilReady() {
  await screen.findByTestId('delivery-details-form');
  await waitFor(() =>
    expect(
      screen.queryByTestId('checkout-validating-indicator')
    ).not.toBeInTheDocument()
  );
}

async function fillAddress(user, { street, town, state, notes } = {}) {
  const streetInput = screen.getByTestId('delivery-street-input');
  await user.clear(streetInput);
  await user.type(streetInput, street || '12 Adeola Street, Obalende');

  const townInput = screen.getByTestId('delivery-town-input');
  await user.clear(townInput);
  await user.type(townInput, town || 'Ikeja');

  await user.selectOptions(
    screen.getByTestId('delivery-state-select'),
    state || 'Lagos'
  );

  if (notes) {
    await user.type(screen.getByTestId('delivery-notes-input'), notes);
  }
}

describe('Checkout delivery details form (FE-070 / CHK-02)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockStore.reset();
  });

  it('renders all delivery detail fields', async () => {
    await loginAsBuyer();
    renderCheckout();
    await waitUntilReady();

    expect(screen.getByTestId('checkout-delivery-section')).toBeInTheDocument();
    expect(
      screen.getByTestId('delivery-recipient-name-input')
    ).toBeInTheDocument();
    expect(screen.getByTestId('delivery-phone-input')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-street-input')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-town-input')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-state-select')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-notes-input')).toBeInTheDocument();
  });

  it('pre-fills recipient name and phone from the buyer profile (CHK-02)', async () => {
    await loginAsBuyer();
    renderCheckout();
    await waitUntilReady();

    expect(await screen.findByDisplayValue('Amina Bello')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-phone-input')).toHaveValue(
      '+2348078901234'
    );
    // Address is not stored on the profile, so it starts empty.
    expect(screen.getByTestId('delivery-street-input')).toHaveValue('');
    expect(screen.getByTestId('delivery-town-input')).toHaveValue('');
    expect(screen.getByTestId('delivery-state-select')).toHaveValue('');
  });

  it('validates the address fields inline and does not save invalid details', async () => {
    const user = userEvent.setup();
    await loginAsBuyer();
    renderCheckout();
    await waitUntilReady();

    await user.click(screen.getByTestId('delivery-details-submit'));

    expect(
      screen.getByText('Street address or landmark is required.')
    ).toBeInTheDocument();
    expect(screen.getByText('Town or area is required.')).toBeInTheDocument();
    expect(screen.getByText('State is required.')).toBeInTheDocument();
    expect(localStorage.getItem(DELIVERY_DETAILS_STORAGE_KEY)).toBeNull();
  });

  it('saves valid delivery details and confirms success (CHK-02)', async () => {
    const user = userEvent.setup();
    await loginAsBuyer();
    renderCheckout();
    await waitUntilReady();

    await fillAddress(user, { notes: 'Call on arrival' });
    await user.click(screen.getByTestId('delivery-details-submit'));

    expect(
      await screen.findByText(STRINGS.CHECKOUT.DELIVERY_SAVED)
    ).toBeInTheDocument();

    const saved = JSON.parse(
      localStorage.getItem(DELIVERY_DETAILS_STORAGE_KEY)
    );
    expect(saved).toMatchObject({
      name: 'Amina Bello',
      phone: '+2348078901234',
      street: '12 Adeola Street, Obalende',
      town: 'Ikeja',
      state: 'Lagos',
      notes: 'Call on arrival',
    });
  });

  it('treats delivery notes as optional', async () => {
    const user = userEvent.setup();
    await loginAsBuyer();
    renderCheckout();
    await waitUntilReady();

    await fillAddress(user);
    await user.click(screen.getByTestId('delivery-details-submit'));

    expect(
      await screen.findByText(STRINGS.CHECKOUT.DELIVERY_SAVED)
    ).toBeInTheDocument();

    const saved = JSON.parse(
      localStorage.getItem(DELIVERY_DETAILS_STORAGE_KEY)
    );
    expect(saved.notes).toBe('');
  });

  it('restores a previously saved address from this device', async () => {
    localStorage.setItem(
      DELIVERY_DETAILS_STORAGE_KEY,
      JSON.stringify({
        name: 'Old Name',
        phone: '08000000000',
        street: '7 Broad Street',
        town: 'Surulere',
        state: 'Oyo',
        notes: 'Leave at the gate',
      })
    );

    await loginAsBuyer();
    renderCheckout();
    await waitUntilReady();

    // Address restored from storage.
    expect(screen.getByTestId('delivery-street-input')).toHaveValue(
      '7 Broad Street'
    );
    expect(screen.getByTestId('delivery-town-input')).toHaveValue('Surulere');
    expect(screen.getByTestId('delivery-state-select')).toHaveValue('Oyo');
    expect(screen.getByTestId('delivery-notes-input')).toHaveValue(
      'Leave at the gate'
    );
    // Profile name/phone win over the stale saved values.
    expect(await screen.findByDisplayValue('Amina Bello')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-phone-input')).toHaveValue(
      '+2348078901234'
    );
  });
});
