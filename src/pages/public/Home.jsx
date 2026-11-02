import {
  HeroSection,
  FeaturedProductsSection,
  CategoriesSection,
  FeaturedSellersSection,
  HowItWorksSection,
  BenefitsSection,
  CtaSection,
} from '../../components/home';

export function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* 1. Hero Section with Search and CTAs (FE-041, MKT-01, SRCH-01) */}
      <HeroSection />

      {/* 2. Featured Fresh Produce Section (FE-042, MKT-01) */}
      <FeaturedProductsSection />

      {/* 3. Vegetable Categories Section (FE-043, MKT-01, MKT-08) */}
      <CategoriesSection />

      {/* 4. Featured Sellers Showcase (FE-044, MKT-01, MKT-07) */}
      <FeaturedSellersSection />

      {/* 5. How It Works (FE-045, MKT-01) */}
      <HowItWorksSection />

      {/* 6. Marketplace Benefits & Value Propositions (FE-045, MKT-01) */}
      <BenefitsSection />

      {/* 7. Homepage Call to Action (FE-045, MKT-01) */}
      <CtaSection />
    </div>
  );
}

export default Home;
