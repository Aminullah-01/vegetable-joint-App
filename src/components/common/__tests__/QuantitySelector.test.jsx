import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuantitySelector } from '../QuantitySelector';

describe('QuantitySelector (FE-030, MKT-06, CART-02)', () => {
  it('starts at one and declares the available stock as its maximum', () => {
    render(<QuantitySelector availableStock={8} />);

    const input = screen.getByRole('spinbutton', { name: 'Quantity amount' });
    expect(input).toHaveValue(1);
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '8');
    expect(screen.getByText('8 available')).toBeInTheDocument();
  });

  it('increases and decreases an uncontrolled quantity within the stock bounds', async () => {
    const user = userEvent.setup();
    render(<QuantitySelector availableStock={3} defaultValue={2} />);

    const input = screen.getByRole('spinbutton', { name: 'Quantity amount' });
    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(input).toHaveValue(3);
    expect(
      screen.getByRole('button', { name: 'Increase quantity' })
    ).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(input).toHaveValue(2);
  });

  it('never decreases below one', async () => {
    const user = userEvent.setup();
    render(<QuantitySelector availableStock={3} />);

    expect(
      screen.getByRole('button', { name: 'Decrease quantity' })
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(screen.getByRole('spinbutton')).toHaveValue(1);
  });

  it('clamps typed values to the stock limit and reports the usable quantity', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantitySelector availableStock={5} onChange={onChange} />);

    const input = screen.getByRole('spinbutton', { name: 'Quantity amount' });
    await user.clear(input);
    await user.type(input, '99');

    expect(input).toHaveValue(5);
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('uses the supplied controlled value and emits requested changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <QuantitySelector value={2} availableStock={4} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(screen.getByRole('spinbutton')).toHaveValue(2);
  });

  it('is fully disabled and announces Out of Stock when stock is zero', () => {
    render(<QuantitySelector availableStock={0} />);

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Decrease quantity' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Increase quantity' })
    ).toBeDisabled();
  });

  it('is disabled for a manually unavailable product even when stock remains', () => {
    render(<QuantitySelector availableStock={10} availability="unavailable" />);

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });

  it('provides a labelled group and 44px touch targets', () => {
    render(<QuantitySelector availableStock={3} />);

    expect(screen.getByRole('group', { name: 'Quantity' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Increase quantity' })
    ).toHaveStyle({
      minWidth: '44px',
      minHeight: '44px',
    });
  });

  it('respects the disabled prop and prevents interactions even when stock is available', () => {
    render(<QuantitySelector availableStock={10} disabled />);

    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Increase quantity' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Decrease quantity' })
    ).toBeDisabled();
  });

  it('treats boolean availability=false as out of stock', () => {
    render(<QuantitySelector availableStock={10} availability={false} />);

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });

  it('hides stock counter when showStock is false', () => {
    render(<QuantitySelector availableStock={5} showStock={false} />);

    expect(screen.queryByText(/available/i)).not.toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Quantity' });
    expect(group).not.toHaveAttribute('aria-describedby');
  });

  it('supports custom min bound and prevents decreasing below it', async () => {
    const user = userEvent.setup();
    render(<QuantitySelector min={3} defaultValue={3} availableStock={10} />);

    const decBtn = screen.getByRole('button', { name: 'Decrease quantity' });
    expect(decBtn).toBeDisabled();
    expect(screen.getByRole('spinbutton')).toHaveValue(3);

    const incBtn = screen.getByRole('button', { name: 'Increase quantity' });
    await user.click(incBtn);
    expect(screen.getByRole('spinbutton')).toHaveValue(4);
    expect(decBtn).not.toBeDisabled();
  });

  it('falls back to max prop when availableStock is omitted', () => {
    render(<QuantitySelector max={7} />);

    expect(screen.getByText('7 available')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '7');
  });

  it('renders custom label, className, and style props', () => {
    render(
      <QuantitySelector
        label="Crate Count"
        availableStock={5}
        className="custom-qty"
        style={{ margin: '10px' }}
      />
    );

    expect(screen.getByText('Crate Count')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Crate Count' })
    ).toBeInTheDocument();
  });

  it('forwards id, name, and data-testid attributes properly', () => {
    render(
      <QuantitySelector
        id="vegetable-qty-input"
        name="quantity_field"
        data-testid="custom-quantity-selector"
        availableStock={5}
      />
    );

    expect(screen.getByTestId('custom-quantity-selector')).toBeInTheDocument();
    const input = screen.getByTestId('quantity-input');
    expect(input).toHaveAttribute('id', 'vegetable-qty-input');
    expect(input).toHaveAttribute('name', 'quantity_field');
    expect(screen.getByTestId('quantity-decrease')).toBeInTheDocument();
    expect(screen.getByTestId('quantity-increase')).toBeInTheDocument();
  });

  it('safely handles non-positive or negative min/stock values', () => {
    // min <= 0 falls back to 1 (CART-02: min 1)
    render(<QuantitySelector min={-5} availableStock={-10} />);
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(0);
    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });

  it('clamps decimal input to floored integer', () => {
    const onChange = vi.fn();
    render(<QuantitySelector availableStock={10} onChange={onChange} />);

    const input = screen.getByRole('spinbutton', { name: 'Quantity amount' });
    fireEvent.change(input, { target: { value: '4.8' } });

    // Floored integer clamped within [1, 10]
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(input).toHaveValue(4);
  });
});
