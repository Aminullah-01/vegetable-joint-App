import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SearchBar } from '../SearchBar';

// Helper component to inspect the URL after a submit (SRCH-06)
function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

const renderSearchBar = (props = {}, { initialEntries = ['/'] } = {}) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <SearchBar {...props} />
      <LocationDisplay />
    </MemoryRouter>
  );

describe('SearchBar (FE-033, SRCH-01, SRCH-06, UI-01, MKT-01)', () => {
  it('renders a keyword field with a submit action and accessible labelling', () => {
    renderSearchBar();

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Search vegetables, categories, and sellers')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'Search vegetables, categories, or sellers...'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Submit search' })
    ).toBeInTheDocument();
  });

  it('reflects the submitted keyword in the products URL (SRCH-01, SRCH-06)', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.type(
      screen.getByLabelText('Search vegetables, categories, and sellers'),
      'tomato'
    );
    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/products?search=tomato'
    );
  });

  it('trims the keyword and encodes it for the URL', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.type(
      screen.getByLabelText('Search vegetables, categories, and sellers'),
      '  green & leafy  '
    );
    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/products?search=green%20%26%20leafy'
    );
  });

  it('submits on Enter without a mouse click', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    const input = screen.getByLabelText(
      'Search vegetables, categories, and sellers'
    );
    await user.type(input, 'spinach{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/products?search=spinach'
    );
  });

  it('returns to the unfiltered catalogue when submitted empty', async () => {
    const user = userEvent.setup();
    renderSearchBar({}, { initialEntries: ['/products?search=tomato'] });

    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/products');
  });

  it('hands the trimmed keyword to a caller-supplied handler instead of routing', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderSearchBar({ onSearch });

    await user.type(
      screen.getByLabelText('Search vegetables, categories, and sellers'),
      '  onions  '
    );
    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    expect(onSearch).toHaveBeenCalledWith('onions');
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('shows the keyword already active in the URL so the bar matches the results', () => {
    renderSearchBar({}, { initialEntries: ['/products?search=pepper'] });

    expect(
      screen.getByLabelText('Search vegetables, categories, and sellers')
    ).toHaveValue('pepper');
  });

  it('re-syncs the field when the search URL parameter changes', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.type(
      screen.getByLabelText('Search vegetables, categories, and sellers'),
      'carrot'
    );
    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    expect(
      screen.getByLabelText('Search vegetables, categories, and sellers')
    ).toHaveValue('carrot');
  });

  it('supports pre-filling the field for a caller-defined default keyword', () => {
    renderSearchBar({ initialValue: 'ugwu' });

    expect(
      screen.getByLabelText('Search vegetables, categories, and sellers')
    ).toHaveValue('ugwu');
  });

  it('clears the field and drops only the search criterion from the URL', async () => {
    const user = userEvent.setup();
    renderSearchBar(
      {},
      { initialEntries: ['/products?search=tomato&category=3'] }
    );

    const clearButton = screen.getByRole('button', {
      name: 'Clear search query',
    });
    await user.click(clearButton);

    expect(
      screen.getByLabelText('Search vegetables, categories, and sellers')
    ).toHaveValue('');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/products?category=3'
    );
    expect(
      screen.queryByRole('button', { name: 'Clear search query' })
    ).not.toBeInTheDocument();
  });

  it('hides the clear action while the field is empty and when disabled', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    expect(
      screen.queryByRole('button', { name: 'Clear search query' })
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Search vegetables, categories, and sellers'),
      'pumpkin'
    );
    expect(
      screen.getByRole('button', { name: 'Clear search query' })
    ).toBeInTheDocument();
  });

  it('keeps the clear control hidden when showClear is false', async () => {
    const user = userEvent.setup();
    renderSearchBar({ showClear: false, initialValue: 'pumpkin' });

    expect(
      screen.queryByRole('button', { name: 'Clear search query' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit search' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/products?search=pumpkin'
    );
  });

  it('provides 44px touch targets for the search actions (NFR-USAB-03)', async () => {
    const user = userEvent.setup();
    renderSearchBar({ initialValue: 'yam' });

    const submitButton = screen.getByRole('button', { name: 'Submit search' });
    const clearButton = screen.getByRole('button', {
      name: 'Clear search query',
    });

    expect(submitButton).toHaveStyle({ minHeight: '36px' });
    expect(clearButton).toHaveStyle({ minWidth: '44px', minHeight: '44px' });

    await user.click(submitButton);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/products?search=yam'
    );
  });

  it('scales to the hero size used on the homepage', () => {
    renderSearchBar({ size: 'lg', ariaLabel: 'Search the marketplace' });

    expect(screen.getByLabelText('Search the marketplace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit search' })).toHaveStyle({
      minHeight: '40px',
    });
  });

  it('accepts custom labels for hero and navbar variants', () => {
    renderSearchBar({
      placeholder: 'Find fresh crops...',
      ariaLabel: 'Search vegetables and sellers (mobile)',
      submitLabel: 'Submit mobile search',
      clearLabel: 'Clear mobile search query',
      initialValue: 'beans',
    });

    expect(
      screen.getByPlaceholderText('Find fresh crops...')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Search vegetables and sellers (mobile)')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Submit mobile search' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear mobile search query' })
    ).toBeInTheDocument();
  });

  it('does not submit when navigateOnSubmit is disabled', async () => {
    const user = userEvent.setup();
    renderSearchBar({ navigateOnSubmit: false, initialValue: 'pepper' });

    await user.click(screen.getByRole('button', { name: 'Submit search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
