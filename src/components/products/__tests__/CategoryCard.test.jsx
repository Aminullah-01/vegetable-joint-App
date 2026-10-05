import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CategoryCard } from '../CategoryCard';

const category = {
  id: 6,
  name: 'Spinach',
  slug: 'spinach',
  description: 'Leafy greens freshly harvested by verified growers.',
  products_count: 3,
  is_active: true,
};

describe('CategoryCard (FE-031, MKT-08, MKT-09)', () => {
  it('renders API-shaped category data and links to its filtered catalogue', () => {
    render(
      <MemoryRouter>
        <CategoryCard category={category} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Browse Spinach' });
    expect(link).toHaveAttribute('href', '/products?category=6');
    expect(screen.getByText(category.description)).toBeInTheDocument();
    expect(screen.getByText('3 products')).toBeInTheDocument();
  });

  it('uses the API slug when an id is unavailable', () => {
    render(
      <MemoryRouter>
        <CategoryCard
          category={{ name: 'Leafy greens', slug: 'leafy greens' }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/products?category=leafy%20greens'
    );
  });

  it('renders a compact selectable chip for filter panels', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CategoryCard
        category={category}
        variant="chip"
        selected
        onSelect={onSelect}
      />
    );

    const chip = screen.getByRole('button', { name: 'Browse Spinach' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveStyle({ minHeight: '44px' });

    await user.click(chip);
    expect(onSelect).toHaveBeenCalledWith(category);
  });

  it('hides inactive categories from buyers by default', () => {
    const { container } = render(
      <MemoryRouter>
        <CategoryCard category={{ ...category, is_active: false }} />
      </MemoryRouter>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('can display an inactive category when an admin context explicitly requests it', () => {
    render(
      <MemoryRouter>
        <CategoryCard
          category={{ ...category, is_active: false }}
          showInactive
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('link', { name: 'Browse Spinach' })
    ).toBeInTheDocument();
  });

  it('supports API-provided category imagery without a hard-coded category map', () => {
    render(
      <MemoryRouter>
        <CategoryCard
          category={{
            ...category,
            image_url: 'https://example.test/spinach.jpg',
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('img', { name: 'Spinach' })).toHaveAttribute(
      'src',
      'https://example.test/spinach.jpg'
    );
  });
});
