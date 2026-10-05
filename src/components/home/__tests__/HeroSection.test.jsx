import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HeroSection } from '../HeroSection';
import { STRINGS } from '../../../constants';

function renderHero(props = {}) {
  return render(
    <MemoryRouter>
      <HeroSection {...props} />
    </MemoryRouter>
  );
}

describe('HeroSection Component (FE-041, MKT-01, SRCH-01, NFR-USAB-02)', () => {
  it('renders headline, badge, and supporting narrative (MKT-01, Figma Section 4)', () => {
    renderHero();

    // 1. Headline
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: STRINGS.HOME.HERO_HEADLINE,
      })
    ).toBeInTheDocument();

    // 2. Badge
    expect(screen.getByTestId('hero-badge')).toHaveTextContent(
      STRINGS.HOME.HERO_TITLE
    );

    // 3. Subtitle / narrative
    expect(screen.getByTestId('hero-subtitle')).toHaveTextContent(
      STRINGS.HOME.HERO_SUBTITLE
    );
  });

  it('renders integrated search bar with placeholder and search action (FE-041, SRCH-01)', () => {
    renderHero();

    const searchInput = screen.getByRole('searchbox', {
      name: /Search marketplace vegetables, categories, or sellers/i,
    });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute(
      'placeholder',
      STRINGS.HOME.SEARCH_PLACEHOLDER
    );

    const submitBtn = screen.getByRole('button', { name: 'Search' });
    expect(submitBtn).toBeInTheDocument();
  });

  it('triggers custom onSearch handler when submitted', async () => {
    const user = userEvent.setup();
    const handleSearch = vi.fn();

    renderHero({ onSearch: handleSearch });

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'Fresh Tomatoes');

    const submitBtn = screen.getByRole('button', { name: 'Search' });
    await user.click(submitBtn);

    expect(handleSearch).toHaveBeenCalledTimes(1);
    expect(handleSearch).toHaveBeenCalledWith('Fresh Tomatoes');
  });

  it('renders quick search chips linking to filtered catalogue', () => {
    renderHero();

    const quickTagsContainer = screen.getByTestId('hero-quick-tags');
    expect(quickTagsContainer).toBeInTheDocument();

    const expectedTags = [
      'Tomatoes',
      'Peppers',
      'Onions',
      'Leafy Greens',
      'Carrots',
    ];
    expectedTags.forEach((tag) => {
      const tagLink = screen.getByRole('link', { name: `Search for ${tag}` });
      expect(tagLink).toBeInTheDocument();
      expect(tagLink).toHaveAttribute(
        'href',
        `/products?search=${encodeURIComponent(tag)}`
      );
    });
  });

  it('renders Call to Action buttons with links and touch targets >= 44px (MKT-01, NFR-USAB-03)', () => {
    renderHero();

    // Browse Vegetables CTA
    const browseBtn = screen.getByRole('link', {
      name: new RegExp(STRINGS.HOME.SHOP_VEGETABLES, 'i'),
    });
    expect(browseBtn).toBeInTheDocument();
    expect(browseBtn).toHaveAttribute('href', '/products');
    expect(browseBtn).toHaveStyle({ minHeight: '48px' });

    // Start Selling CTA
    const sellerBtn = screen.getByRole('link', {
      name: new RegExp(STRINGS.HOME.START_SELLING, 'i'),
    });
    expect(sellerBtn).toBeInTheDocument();
    expect(sellerBtn).toHaveAttribute('href', '/register?role=seller');
    expect(sellerBtn).toHaveStyle({ minHeight: '48px' });
  });

  it('renders trust highlights and value propositions (MKT-01)', () => {
    renderHero();

    expect(screen.getByText(STRINGS.HOME.BENEFIT_FRESH)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.HOME.BENEFIT_VERIFIED)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.HOME.BENEFIT_PRICING)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.HOME.BENEFIT_PAYMENT)).toBeInTheDocument();
  });

  it('supports custom headline, subtitle, quick tags, and hiding trust badges', () => {
    renderHero({
      headline: 'Custom Gombe Produce Market',
      subtitle: 'Fast delivery to northern hubs',
      quickTags: ['Garlic', 'Ginger'],
      showTrustBadges: false,
    });

    expect(screen.getByText('Custom Gombe Produce Market')).toBeInTheDocument();
    expect(
      screen.getByText('Fast delivery to northern hubs')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Search for Garlic' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Search for Ginger' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('hero-trust-badges')).not.toBeInTheDocument();
  });
});
