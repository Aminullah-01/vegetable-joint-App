import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from '../Toggle';

describe('Toggle Component (SEL-07, UI-05, WCAG Switch Pattern)', () => {
  it('renders switch with role="switch" and reflects aria-checked state', () => {
    const { rerender } = render(<Toggle checked={false} label="Available" />);

    const toggle = screen.getByRole('switch', { name: 'Available' });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    rerender(<Toggle checked={true} label="Available" />);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('triggers onChange with inverted boolean when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Toggle checked={false} onChange={handleChange} label="Accept Orders" />
    );

    const toggle = screen.getByRole('switch', { name: 'Accept Orders' });
    await user.click(toggle);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('triggers onChange on space and enter keyboard key presses', () => {
    const handleChange = vi.fn();

    render(
      <Toggle checked={true} onChange={handleChange} label="Active Listing" />
    );

    const toggle = screen.getByRole('switch', { name: 'Active Listing' });

    fireEvent.keyDown(toggle, { key: ' ' });
    expect(handleChange).toHaveBeenCalledWith(false);

    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('ignores clicks and key presses when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Toggle
        checked={false}
        disabled={true}
        onChange={handleChange}
        label="Disabled Toggle"
      />
    );

    const toggle = screen.getByRole('switch', { name: 'Disabled Toggle' });
    expect(toggle).toBeDisabled();

    await user.click(toggle);
    fireEvent.keyDown(toggle, { key: ' ' });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('sets aria-busy and prevents changes when loading is true', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Toggle
        checked={false}
        loading={true}
        onChange={handleChange}
        label="Loading Toggle"
      />
    );

    const toggle = screen.getByRole('switch', { name: 'Loading Toggle' });
    expect(toggle).toHaveAttribute('aria-busy', 'true');

    await user.click(toggle);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('renders label and description text with accessible typography', () => {
    render(
      <Toggle
        checked={true}
        label="Email Alerts"
        description="Receive updates on order status changes"
      />
    );

    expect(screen.getByText('Email Alerts')).toBeInTheDocument();
    expect(
      screen.getByText('Receive updates on order status changes')
    ).toBeInTheDocument();
  });

  it('supports sm, md, and lg size variants', () => {
    const { rerender } = render(<Toggle size="sm" label="Small Toggle" />);
    let toggle = screen.getByRole('switch', { name: 'Small Toggle' });
    expect(toggle).toHaveStyle({ width: '36px', height: '20px' });

    rerender(<Toggle size="md" label="Medium Toggle" />);
    toggle = screen.getByRole('switch', { name: 'Medium Toggle' });
    expect(toggle).toHaveStyle({ width: '44px', height: '24px' });

    rerender(<Toggle size="lg" label="Large Toggle" />);
    toggle = screen.getByRole('switch', { name: 'Large Toggle' });
    expect(toggle).toHaveStyle({ width: '52px', height: '28px' });
  });

  it('forwards ref to the underlying button element', () => {
    const ref = createRef();
    render(<Toggle ref={ref} label="Ref Toggle" />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
