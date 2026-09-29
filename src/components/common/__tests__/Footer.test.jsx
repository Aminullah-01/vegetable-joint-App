import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Footer } from '../Footer';
import { adminService } from '../../../services/adminService';

function TestWrapper({ children }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

TestWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

describe('Footer Component (FE-023, MKT-01, ADM-08)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Brand Information & Marketplace Links (MKT-01)', () => {
    it('renders marketplace logo and brand linking to root', () => {
      render(
        <TestWrapper>
          <Footer />
        </TestWrapper>
      );

      const brandLink = screen.getByRole('link', {
        name: /Vegetable Joint Homepage/i,
      });
      expect(brandLink).toBeInTheDocument();
      expect(brandLink).toHaveAttribute('href', '/');
    });

    it('renders core marketplace browsing links', () => {
      render(
        <TestWrapper>
          <Footer />
        </TestWrapper>
      );

      expect(
        screen.getByRole('link', { name: /Browse All Vegetables/i })
      ).toHaveAttribute('href', '/products');
      expect(
        screen.getByRole('link', { name: /Fresh Tomatoes/i })
      ).toHaveAttribute('href', '/products?category=1');
      expect(
        screen.getByRole('link', { name: /Shopping Cart/i })
      ).toHaveAttribute('href', '/cart');
    });

    it('renders role portals and account navigation links', () => {
      render(
        <TestWrapper>
          <Footer />
        </TestWrapper>
      );

      expect(
        screen.getByRole('link', { name: /Buyer Account/i })
      ).toHaveAttribute('href', '/account/profile');
      expect(
        screen.getByRole('link', { name: /Track My Orders/i })
      ).toHaveAttribute('href', '/account/orders');
      expect(
        screen.getByRole('link', { name: /Seller Portal \(Dashboard\)/i })
      ).toHaveAttribute('href', '/seller');
      expect(
        screen.getByRole('link', { name: /Admin Portal/i })
      ).toHaveAttribute('href', '/admin');
    });
  });

  describe('Dynamic Support & Contact Info from Admin Settings (ADM-08)', () => {
    it('displays default contact email and phone links', () => {
      render(
        <TestWrapper>
          <Footer />
        </TestWrapper>
      );

      const emailLink = screen.getByRole('link', {
        name: /support@vegetablejoint\.ng/i,
      });
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute(
        'href',
        'mailto:support@vegetablejoint.ng'
      );

      const phoneLink = screen.getByRole('link', {
        name: /\+?234\s?800\s?000\s?0000/i,
      });
      expect(phoneLink).toBeInTheDocument();
      expect(phoneLink).toHaveAttribute('href', 'tel:+2348000000000');
    });

    it('renders custom contact and support info passed via props', () => {
      render(
        <TestWrapper>
          <Footer
            siteName="Green Agro Market"
            contactEmail="custom@agro.ng"
            contactPhone="+234 801 234 5678"
            supportText="Direct helpline active 24/7."
            footerText="Custom Copyright 2026."
          />
        </TestWrapper>
      );

      expect(screen.getByText('Green Agro Market')).toBeInTheDocument();
      expect(
        screen.getByText('Direct helpline active 24/7.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /custom@agro\.ng/i })
      ).toHaveAttribute('href', 'mailto:custom@agro.ng');
      expect(
        screen.getByRole('link', { name: /\+234 801 234 5678/i })
      ).toHaveAttribute('href', 'tel:+234 801 234 5678');
      expect(screen.getByTestId('footer-copyright-text')).toHaveTextContent(
        'Custom Copyright 2026.'
      );
    });

    it('dynamically loads updated admin settings on mount (ADM-08)', async () => {
      vi.spyOn(adminService, 'getSettings').mockResolvedValue({
        site_name: 'Updated FarmHub',
        contact_email: 'desk@farmhub.ng',
        contact_phone: '+234 700 888 9999',
        support_text: 'Admin updated support hotline message.',
      });

      render(
        <TestWrapper>
          <Footer />
        </TestWrapper>
      );

      expect(
        await screen.findByText('Admin updated support hotline message.')
      ).toBeInTheDocument();
      expect(screen.getByText('Updated FarmHub')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /desk@farmhub\.ng/i })
      ).toHaveAttribute('href', 'mailto:desk@farmhub.ng');
    });
  });

  describe('Copyright & Trust Information', () => {
    it('displays copyright text containing the current year', async () => {
      const currentYear = new Date().getFullYear();
      render(
        <TestWrapper>
          <Footer />
        </TestWrapper>
      );

      const copyrightEl = await screen.findByTestId('footer-copyright-text');
      expect(copyrightEl).toBeInTheDocument();
      expect(copyrightEl.textContent).toContain(String(currentYear));
      expect(copyrightEl.textContent).toContain('Vegetable Joint');
    });

    it('displays verified agricultural trust assurances', async () => {
      render(
        <TestWrapper>
          <Footer />
        </TestWrapper>
      );

      expect(
        await screen.findByText(/Verified Agricultural Commerce/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Escrow & Direct Settlement/i)
      ).toBeInTheDocument();
    });
  });
});
