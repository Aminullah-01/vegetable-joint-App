import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
