import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CategoriesSection } from '../CategoriesSection';
import { categoryService } from '../../../services/categoryService.js';
import { STRINGS } from '../../../constants';

const mockCategoryList = [
  {
    id: 1,
    name: 'Tomato',
    slug: 'tomato',
    description: 'Fresh farm tomatoes, plum, cherry, and paste varieties.',
    is_active: true,
    products_count: 3,
  },
  {
    id: 2,
    name: 'Pepper',
    slug: 'pepper',
    description:
      'Peppers including habanero (ata rodo), tatashe, chilli, and bell peppers.',
    is_active: true,
    products_count: 5,
  },
  {
    id: 3,
    name: 'Onion',
    slug: 'onion',
    description: 'Dry red onions, white onions, and spring onions.',
    is_active: true,
    products_count: 2,
  },
  {
    id: 4,
    name: 'Carrot',
    slug: 'carrot',
    description: 'Sweet, crunchy farm carrots fresh from the Jos plateau.',
    is_active: true,
    products_count: 4,
  },
  {
    id: 5,
    name: 'Cabbage',
    slug: 'cabbage',
    description: 'Crisp green and purple head cabbage.',
    is_active: false,
    products_count: 0,
  },
];

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('CategoriesSection Component (FE-043, MKT-01, MKT-08, MKT-09, MKT-10)', () => {
  let getCategoriesSpy;

  beforeEach(() => {
    getCategoriesSpy = vi
      .spyOn(categoryService, 'getCategories')
      .mockResolvedValue(mockCategoryList);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders section header, badge, title, subtitle, and view all link (MKT-01, MKT-08)', async () => {
    renderWithRouter(<CategoriesSection />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });

    // Section container
    expect(screen.getByTestId('categories-section')).toBeInTheDocument();

    // Badge
    expect(screen.getByTestId('categories-badge')).toHaveTextContent(
      STRINGS.HOME.CATEGORIES_BADGE
    );

    // Title
    expect(screen.getByTestId('categories-heading')).toHaveTextContent(
      STRINGS.HOME.CATEGORIES_TITLE
    );

    // Subtitle
    expect(screen.getByTestId('categories-subtitle')).toHaveTextContent(
      STRINGS.HOME.CATEGORIES_SUBTITLE
    );

    // View All Link
    const viewAllLink = screen.getByTestId('categories-view-all-link');
    expect(viewAllLink).toHaveAttribute('href', '/products');
    expect(viewAllLink).toHaveTextContent(STRINGS.HOME.VIEW_ALL_CATEGORIES);
  });

  it('shows skeleton loader while categories are being fetched (MKT-10)', () => {
    // Hang promise to verify loading state
    getCategoriesSpy.mockReturnValue(new Promise(() => {}));

    renderWithRouter(<CategoriesSection />);

    expect(screen.getByTestId('category-grid-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('categories-grid')).not.toBeInTheDocument();
  });

  it('renders active categories as cards linking to filtered product catalog (MKT-08)', async () => {
    renderWithRouter(<CategoriesSection />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });

    // Active categories rendered
    expect(screen.getByText('Tomato')).toBeInTheDocument();
    expect(screen.getByText('Pepper')).toBeInTheDocument();
    expect(screen.getByText('Onion')).toBeInTheDocument();
    expect(screen.getByText('Carrot')).toBeInTheDocument();

    // Inactive category hidden by default
    expect(screen.queryByText('Cabbage')).not.toBeInTheDocument();

    // Category cards link to filtered product catalog
    const tomatoLink = screen.getByRole('link', {
      name: STRINGS.PRODUCTS.BROWSE_CATEGORY('Tomato'),
    });
    expect(tomatoLink).toHaveAttribute('href', '/products?category=1');

    const pepperLink = screen.getByRole('link', {
      name: STRINGS.PRODUCTS.BROWSE_CATEGORY('Pepper'),
    });
    expect(pepperLink).toHaveAttribute('href', '/products?category=2');
  });

  it('displays category description, product count, and vegetable illustration', async () => {
    renderWithRouter(<CategoriesSection />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });

    // Check descriptions
    expect(
      screen.getByText(
        'Fresh farm tomatoes, plum, cherry, and paste varieties.'
      )
    ).toBeInTheDocument();

    // Check product counts
    expect(
      screen.getByText(STRINGS.PRODUCTS.CATEGORY_PRODUCTS(3))
    ).toBeInTheDocument();
    expect(
      screen.getByText(STRINGS.PRODUCTS.CATEGORY_PRODUCTS(5))
    ).toBeInTheDocument();

    // Check vegetable icons
    expect(screen.getByText('🍅')).toBeInTheDocument();
    expect(screen.getByText('🌶️')).toBeInTheDocument();
  });

  it('respects limit prop to restrict number of visible categories', async () => {
    renderWithRouter(<CategoriesSection limit={2} />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });

    expect(screen.getByText('Tomato')).toBeInTheDocument();
    expect(screen.getByText('Pepper')).toBeInTheDocument();
    expect(screen.queryByText('Onion')).not.toBeInTheDocument();
  });

  it('includes inactive categories when showInactive is true', async () => {
    renderWithRouter(<CategoriesSection showInactive={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });

    expect(screen.getByText('Cabbage')).toBeInTheDocument();
  });

  it('renders error state and allows user to retry on failure (MKT-10, ERR-01)', async () => {
    const user = userEvent.setup();
    getCategoriesSpy.mockRejectedValueOnce(
      new Error('Failed to load categories')
    );

    renderWithRouter(<CategoriesSection />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-error-state')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load categories')).toBeInTheDocument();

    // Setup success on retry
    getCategoriesSpy.mockResolvedValueOnce(mockCategoryList);
    const retryBtn = screen.getByRole('button', { name: /Try Again|Retry/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });
    expect(screen.getByText('Tomato')).toBeInTheDocument();
  });

  it('renders empty state when no categories are returned', async () => {
    getCategoriesSpy.mockResolvedValue([]);

    renderWithRouter(<CategoriesSection />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText('No Categories Available')).toBeInTheDocument();
  });

  it('supports custom onSelectCategory handler', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    renderWithRouter(<CategoriesSection onSelectCategory={handleSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });

    const tomatoBtn = screen.getByRole('button', {
      name: STRINGS.PRODUCTS.BROWSE_CATEGORY('Tomato'),
    });
    await user.click(tomatoBtn);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        name: 'Tomato',
      })
    );
  });

  it('can render in chip variant mode', async () => {
    renderWithRouter(<CategoriesSection variant="chip" />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });

    const grid = screen.getByTestId('categories-grid');
    const chips = grid.querySelectorAll('.category-card');
    expect(chips.length).toBeGreaterThan(0);
    expect(chips[0].className).toContain('category-chip');
  });

  it('hides view all link when showViewAll is false', async () => {
    renderWithRouter(<CategoriesSection showViewAll={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('categories-view-all-link')
    ).not.toBeInTheDocument();
  });
});
