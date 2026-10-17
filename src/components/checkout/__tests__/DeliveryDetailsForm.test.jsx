import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryDetailsForm } from '../DeliveryDetailsForm';
import {
  validateStreetAddress,
  validateTownArea,
  validateState,
  validateDeliveryNotes,
} from '../../../utils';

async function fillRequiredFields(user, overrides = {}) {
  const values = {
    name: 'Amina Bello',
    phone: '08012345678',
    street: '12 Adeola Street, opposite Obalende Market',
    town: 'Ikeja',
    state: 'Lagos',
    ...overrides,
  };

  const nameInput = screen.getByTestId('delivery-recipient-name-input');
  await user.clear(nameInput);
  await user.type(nameInput, values.name);

  const phoneInput = screen.getByTestId('delivery-phone-input');
  await user.clear(phoneInput);
  await user.type(phoneInput, values.phone);

  const streetInput = screen.getByTestId('delivery-street-input');
  await user.clear(streetInput);
  await user.type(streetInput, values.street);

  const townInput = screen.getByTestId('delivery-town-input');
  await user.clear(townInput);
  await user.type(townInput, values.town);

  await user.selectOptions(
    screen.getByTestId('delivery-state-select'),
    values.state
  );
}

describe('DeliveryDetailsForm (FE-070 / CHK-02)', () => {
  it('renders all delivery detail fields with labels', () => {
    render(<DeliveryDetailsForm />);

    expect(screen.getByTestId('delivery-details-form')).toBeInTheDocument();
    expect(
      screen.getByTestId('delivery-recipient-name-input')
    ).toBeInTheDocument();
    expect(screen.getByTestId('delivery-phone-input')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-street-input')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-town-input')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-state-select')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-notes-input')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-details-submit')).toBeInTheDocument();

    expect(screen.getByLabelText(/Recipient Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Street \/ Landmark/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Town \/ Area/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^State/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delivery Notes/i)).toBeInTheDocument();
  });

  it('pre-fills fields from initialValues (CHK-02 prefill)', () => {
    render(
      <DeliveryDetailsForm
        initialValues={{
          name: 'Emeka Nwosu',
          phone: '+2348089012345',
          street: '7 Broad Street',
          town: 'Surulere',
          state: 'Oyo',
          notes: 'Call on arrival',
        }}
      />
    );

    expect(screen.getByTestId('delivery-recipient-name-input')).toHaveValue(
      'Emeka Nwosu'
    );
    expect(screen.getByTestId('delivery-phone-input')).toHaveValue(
      '+2348089012345'
    );
    expect(screen.getByTestId('delivery-street-input')).toHaveValue(
      '7 Broad Street'
    );
    expect(screen.getByTestId('delivery-town-input')).toHaveValue('Surulere');
    expect(screen.getByTestId('delivery-state-select')).toHaveValue('Oyo');
    expect(screen.getByTestId('delivery-notes-input')).toHaveValue(
      'Call on arrival'
    );
  });

  it('shows inline errors for all required fields and does not submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DeliveryDetailsForm onSubmit={onSubmit} />);

    await user.click(screen.getByTestId('delivery-details-submit'));

    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required.')).toBeInTheDocument();
    expect(
      screen.getByText('Street address or landmark is required.')
    ).toBeInTheDocument();
    expect(screen.getByText('Town or area is required.')).toBeInTheDocument();
    expect(screen.getByText('State is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates phone format inline', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DeliveryDetailsForm
        initialValues={{
          name: 'Amina Bello',
          phone: '123',
          street: '12 Adeola Street',
          town: 'Ikeja',
          state: 'Lagos',
        }}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByTestId('delivery-details-submit'));

    expect(
      screen.getByText(
        'Please enter a valid phone number (at least 10 digits).'
      )
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the values when the form is valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <DeliveryDetailsForm
        initialValues={{
          name: 'Amina Bello',
          phone: '08012345678',
          street: '12 Adeola Street',
          town: 'Ikeja',
          state: 'Lagos',
          notes: '',
        }}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByTestId('delivery-details-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Amina Bello',
      phone: '08012345678',
      street: '12 Adeola Street',
      town: 'Ikeja',
      state: 'Lagos',
      notes: '',
    });
  });

  it('treats delivery notes as optional and accepts an empty value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DeliveryDetailsForm onSubmit={onSubmit} />);

    await fillRequiredFields(user);

    await user.click(screen.getByTestId('delivery-details-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].notes).toBe('');
  });

  it('notifies the parent on every change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DeliveryDetailsForm onChange={onChange} />);

    await user.type(screen.getByTestId('delivery-town-input'), 'Ikeja');

    expect(onChange).toHaveBeenCalled();
    const lastValues = onChange.mock.calls.at(-1)[0];
    expect(lastValues.town).toBe('Ikeja');
  });

  it('caps delivery notes at 500 characters', () => {
    render(<DeliveryDetailsForm />);
    expect(screen.getByTestId('delivery-notes-input')).toHaveAttribute(
      'maxlength',
      '500'
    );
  });

  it('can hide the submit button', () => {
    render(<DeliveryDetailsForm showSubmit={false} />);
    expect(
      screen.queryByTestId('delivery-details-submit')
    ).not.toBeInTheDocument();
  });
});

describe('Delivery detail validators (CHK-02)', () => {
  it('validateStreetAddress enforces required and length bounds', () => {
    expect(validateStreetAddress('')).toBe(
      'Street address or landmark is required.'
    );
    expect(validateStreetAddress('ab')).toBe(
      'Street address must be at least 3 characters.'
    );
    expect(validateStreetAddress('a'.repeat(201))).toBe(
      'Street address cannot exceed 200 characters.'
    );
    expect(validateStreetAddress('12 Adeola Street')).toBeNull();
  });

  it('validateTownArea enforces required and length bounds', () => {
    expect(validateTownArea('')).toBe('Town or area is required.');
    expect(validateTownArea('a')).toBe(
      'Town or area must be at least 2 characters.'
    );
    expect(validateTownArea('a'.repeat(101))).toBe(
      'Town or area cannot exceed 100 characters.'
    );
    expect(validateTownArea('Ikeja')).toBeNull();
  });

  it('validateState requires a state', () => {
    expect(validateState('')).toBe('State is required.');
    expect(validateState('Lagos')).toBeNull();
  });

  it('validateDeliveryNotes is optional and capped at 500 characters', () => {
    expect(validateDeliveryNotes('')).toBeNull();
    expect(validateDeliveryNotes(undefined)).toBeNull();
    expect(validateDeliveryNotes('a'.repeat(501))).toBe(
      'Delivery notes cannot exceed 500 characters.'
    );
    expect(validateDeliveryNotes('Leave at the gate')).toBeNull();
  });
});
