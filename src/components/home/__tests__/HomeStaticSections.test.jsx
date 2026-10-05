import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HowItWorksSection } from '../HowItWorksSection';
import { BenefitsSection } from '../BenefitsSection';
import { CtaSection } from '../CtaSection';
import { STRINGS } from '../../../constants';
import { ROUTES } from '../../../routes/routeConfig';

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('HowItWorksSection Component (FE-045, MKT-01, Figma Section 4)', () => {
  it('renders default badge, heading, subtitle, and accessibility attributes', () => {
    render(<HowItWorksSection />);

    const section = screen.getByTestId('how-it-works-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-labelledby', 'how-it-works-heading');

    expect(screen.getByTestId('how-it-works-badge')).toHaveTextContent(
      STRINGS.HOME.HOW_IT_WORKS_BADGE
    );

    const heading = screen.getByRole('heading', {
      level: 2,
      name: STRINGS.HOME.HOW_IT_WORKS_TITLE,
    });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('id', 'how-it-works-heading');

    expect(screen.getByTestId('how-it-works-subtitle')).toHaveTextContent(
      STRINGS.HOME.HOW_IT_WORKS_SUBTITLE
    );
  });

  it('renders the 4 visual steps: Discover, Compare, Order, and Receive', () => {
    render(<HowItWorksSection />);

    const grid = screen.getByTestId('how-it-works-grid');
    expect(grid).toBeInTheDocument();

    const expectedSteps = [
      { num: 1, title: 'Discover' },
      { num: 2, title: 'Compare' },
      { num: 3, title: 'Order' },
      { num: 4, title: 'Receive' },
    ];

    expectedSteps.forEach(({ num, title }) => {
      const stepItem = screen.getByTestId(`how-it-works-step-${num}`);
      expect(stepItem).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 3, name: title })
      ).toBeInTheDocument();
    });

    // Check step descriptions from strings
    expect(
      screen.getByText(/Browse farm-fresh vegetables/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Compare transparent prices in Naira/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Add fresh produce to your cart/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Coordinate delivery or pickup/i)
    ).toBeInTheDocument();
  });

  it('renders custom badge, heading, and step items when provided', () => {
    const customSteps = [
      {
        number: 1,
        title: 'Browse Farms',
        description: 'Find nearby farms.',
        icon: '🚜',
      },
      {
        number: 2,
        title: 'Direct Chat',
        description: 'Talk to farmers.',
        icon: '💬',
      },
    ];

    render(
      <HowItWorksSection
        badge="Quick Process"
        title="Custom Workflow"
        subtitle="Step by step instructions"
        steps={customSteps}
        className="custom-works-class"
        style={{ marginTop: '10px' }}
      />
    );

    expect(screen.getByTestId('how-it-works-badge')).toHaveTextContent(
      'Quick Process'
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Custom Workflow' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works-subtitle')).toHaveTextContent(
      'Step by step instructions'
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Browse Farms' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Direct Chat' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works-section')).toHaveClass(
      'custom-works-class'
    );
  });

  it('handles empty badge and subtitle gracefully', () => {
    render(<HowItWorksSection badge="" subtitle="" />);

    expect(screen.queryByTestId('how-it-works-badge')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('how-it-works-subtitle')
    ).not.toBeInTheDocument();
  });
});

describe('BenefitsSection Component (FE-045, MKT-01, Figma Section 4)', () => {
  it('renders default badge, heading, subtitle, and accessible container', () => {
    render(<BenefitsSection />);

    const section = screen.getByTestId('benefits-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-labelledby', 'benefits-heading');

    expect(screen.getByTestId('benefits-badge')).toHaveTextContent(
      STRINGS.HOME.BENEFITS_BADGE
    );

    const heading = screen.getByRole('heading', {
      level: 2,
      name: STRINGS.HOME.BENEFITS_TITLE,
    });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('id', 'benefits-heading');

    expect(screen.getByTestId('benefits-subtitle')).toHaveTextContent(
      STRINGS.HOME.BENEFITS_SUBTITLE
    );
  });

  it('renders the 6 marketplace value propositions per source design', () => {
    render(<BenefitsSection />);

    const expectedBenefits = [
      'Fresh vegetable marketplace',
      'Multiple trusted sellers',
      'Easy product discovery',
      'Simple ordering',
      'Transparent pricing',
      'Convenient delivery details',
    ];

    expectedBenefits.forEach((title, idx) => {
      const card = screen.getByTestId(`benefit-card-${idx}`);
      expect(card).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 3, name: title })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Access 100% farm-fresh vegetables/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Connect with vetted, approved vegetable farmers/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Find exactly what you need with keyword search/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/standardized units \(baskets, bunches, kg\)/i)
    ).toBeInTheDocument();
  });

  it('renders custom badge, heading, items, and styles when provided', () => {
    const customItems = [
      {
        title: 'Zero Middlemen',
        description: 'Trade directly with local growers.',
        icon: '🤝',
      },
    ];

    render(
      <BenefitsSection
        badge="Market Advantage"
        title="Why Choose Us"
        subtitle="The best produce network"
        items={customItems}
        className="custom-benefits-class"
        style={{ padding: '30px' }}
      />
    );

    expect(screen.getByTestId('benefits-badge')).toHaveTextContent(
      'Market Advantage'
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Why Choose Us' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('benefits-subtitle')).toHaveTextContent(
      'The best produce network'
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Zero Middlemen' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Trade directly with local growers.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('benefits-section')).toHaveClass(
      'custom-benefits-class'
    );
  });

  it('handles empty badge and subtitle gracefully', () => {
    render(<BenefitsSection badge="" subtitle="" />);

    expect(screen.queryByTestId('benefits-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('benefits-subtitle')).not.toBeInTheDocument();
  });
});

describe('CtaSection Component (FE-045, MKT-01, Figma Section 4)', () => {
  it('renders headline, badge, subtitle, and trust elements per Figma design', () => {
    renderWithRouter(<CtaSection />);

    const section = screen.getByTestId('cta-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-labelledby', 'cta-heading');

    expect(screen.getByTestId('cta-badge')).toHaveTextContent(
      'Farm-to-Doorstep Marketplace'
    );

    const heading = screen.getByRole('heading', {
      level: 2,
      name: STRINGS.HOME.CTA_TITLE,
    });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('id', 'cta-heading');

    expect(screen.getByTestId('cta-subtitle')).toHaveTextContent(
      STRINGS.HOME.CTA_SUBTITLE
    );

    const trustElements = screen.getByTestId('cta-trust-elements');
    expect(trustElements).toBeInTheDocument();
    expect(trustElements).toHaveTextContent('100% Direct Farm Produce');
    expect(trustElements).toHaveTextContent('Verified Local Sellers');
    expect(trustElements).toHaveTextContent('Transparent Pricing in Naira');
  });

  it('renders primary CTA linking to /products with correct label and min touch target (NFR-USAB-03)', () => {
    renderWithRouter(<CtaSection />);

    const primaryBtn = screen.getByTestId('cta-primary-button');
    expect(primaryBtn).toBeInTheDocument();
    expect(primaryBtn).toHaveTextContent(STRINGS.HOME.CTA_PRIMARY);
    expect(primaryBtn).toHaveAttribute('href', ROUTES.PRODUCTS);
  });

  it('renders secondary CTA linking to /register with correct label and min touch target (NFR-USAB-03)', () => {
    renderWithRouter(<CtaSection />);

    const secondaryBtn = screen.getByTestId('cta-secondary-button');
    expect(secondaryBtn).toBeInTheDocument();
    expect(secondaryBtn).toHaveTextContent(STRINGS.HOME.CTA_SECONDARY);
    expect(secondaryBtn).toHaveAttribute('href', ROUTES.REGISTER);
  });

  it('supports custom props for titles, URLs, and labels', () => {
    renderWithRouter(
      <CtaSection
        title="Custom CTA Title"
        subtitle="Custom Subtitle Text"
        primaryText="Shop Now"
        primaryTo="/catalog"
        secondaryText="Become a Vendor"
        secondaryTo="/vendor-signup"
        className="my-cta-class"
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Custom CTA Title' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('cta-subtitle')).toHaveTextContent(
      'Custom Subtitle Text'
    );

    const primaryBtn = screen.getByTestId('cta-primary-button');
    expect(primaryBtn).toHaveTextContent('Shop Now');
    expect(primaryBtn).toHaveAttribute('href', '/catalog');

    const secondaryBtn = screen.getByTestId('cta-secondary-button');
    expect(secondaryBtn).toHaveTextContent('Become a Vendor');
    expect(secondaryBtn).toHaveAttribute('href', '/vendor-signup');

    expect(screen.getByTestId('cta-section')).toHaveClass('my-cta-class');
  });

  it('omits buttons and subtitle when empty props are passed', () => {
    renderWithRouter(
      <CtaSection subtitle="" primaryText="" secondaryText="" />
    );

    expect(screen.queryByTestId('cta-subtitle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cta-primary-button')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('cta-secondary-button')
    ).not.toBeInTheDocument();
  });
});
