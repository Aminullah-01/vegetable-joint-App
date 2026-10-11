import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TermsOfUse } from '../TermsOfUse';
import { PrivacyNotice } from '../PrivacyNotice';
import { RefundPolicy } from '../RefundPolicy';
import { AppRoutes } from '../../../routes/AppRoutes';
import { AuthProvider, CartProvider, ToastProvider } from '../../../context';

function renderPolicy(ui, { route = '/terms' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/terms" element={ui} />
        <Route path="/privacy" element={ui} />
        <Route path="/refunds" element={ui} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/products" element={<div>Products Page</div>} />
        <Route path="/register" element={<div>Register Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderFullApp(route = '/terms') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Static Policy Pages (FE-053 / NFR-SEC-12, OI-10, OI-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Terms of Use Page', () => {
    it('renders heading, subtitle, last updated date, and table of contents', () => {
      renderPolicy(<TermsOfUse />, { route: '/terms' });

      expect(
        screen.getByRole('heading', { name: 'Terms of Use', level: 1 })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/govern your access to and use of Vegetable Joint/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/February 2026/i)).toBeInTheDocument();

      // Table of contents
      expect(
        screen.getByRole('link', {
          name: /1\. Introduction & Marketplace Model/i,
        })
      ).toHaveAttribute('href', '#introduction');
      expect(
        screen.getByRole('link', {
          name: /10\. Governing Law & Dispute Resolution/i,
        })
      ).toHaveAttribute('href', '#governing-law');
    });

    it('renders all core terms sections: roles, seller standards, ordering, and governing law', () => {
      renderPolicy(<TermsOfUse />, { route: '/terms' });

      // Core sections
      expect(
        screen.getByRole('heading', {
          name: /2\. User Accounts & Registration Eligibility/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name: /3\. Seller Listing & Produce Standards/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name: /4\. Order Placement & Fulfillment/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name: /10\. Governing Law & Dispute Resolution/i,
        })
      ).toBeInTheDocument();

      // Nigerian context references
      expect(
        screen.getByText(/Federal Republic of Nigeria/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /standardized units \(e\.g\. basket, bunch, bag, kilogram, piece, crate\)/i
        )
      ).toBeInTheDocument();
    });

    it('triggers window.print when print button is clicked', async () => {
      const user = userEvent.setup();
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      renderPolicy(<TermsOfUse />, { route: '/terms' });

      const printBtn = screen.getByRole('button', {
        name: /print policy document/i,
      });
      await user.click(printBtn);

      expect(printSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Privacy Notice Page (NFR-SEC-12, OI-10)', () => {
    it('renders NDPA 2023 compliance badge, data controller, and lawful bases', () => {
      renderPolicy(<PrivacyNotice />, { route: '/privacy' });

      expect(
        screen.getByRole('heading', { name: 'Privacy Notice', level: 1 })
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(/Nigeria Data Protection Act \(NDPA\) 2023/i).length
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByText(/Nigeria Data Protection Commission \(NDPC\)/i)
          .length
      ).toBeGreaterThan(0);

      // Lawful bases section
      expect(
        screen.getByRole('heading', {
          name: /3\. Legal Bases & Processing Purposes/i,
        })
      ).toBeInTheDocument();
      expect(screen.getByText(/Contractual Performance:/i)).toBeInTheDocument();
      expect(screen.getByText(/Legitimate Interests:/i)).toBeInTheDocument();
    });

    it('specifies data retention schedules conforming to SRS OI-10', () => {
      renderPolicy(<PrivacyNotice />, { route: '/privacy' });

      const retentionHeading = screen.getByRole('heading', {
        name: /5\. Data Retention Schedules \(SRS OI-10\)/i,
      });
      expect(retentionHeading).toBeInTheDocument();

      // 6-year financial/order retention and 2-year audit log retention
      expect(
        screen.getByText(/Order Records & Invoices:/i).closest('li')
      ).toHaveTextContent(/6 years/i);
      expect(
        screen.getByText(/Security & Audit Logs:/i).closest('li')
      ).toHaveTextContent(/2 years/i);
    });

    it('details user rights under NDPA 2023 and provides DPO contact information', () => {
      renderPolicy(<PrivacyNotice />, { route: '/privacy' });

      // User rights
      expect(
        screen.getByRole('heading', {
          name: /6\. Your Rights Under NDPA 2023/i,
        })
      ).toBeInTheDocument();
      expect(screen.getByText(/Right to Access/i)).toBeInTheDocument();
      expect(screen.getByText(/Right to Rectification/i)).toBeInTheDocument();
      expect(screen.getByText(/Right to Erasure/i)).toBeInTheDocument();

      // DPO contact
      expect(
        screen.getByRole('heading', {
          name: /9\. Data Protection Officer \(DPO\) Contact/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'privacy@vegetablejoint.ng' })
      ).toHaveAttribute('href', 'mailto:privacy@vegetablejoint.ng');
    });
  });

  describe('Refund & Dispute Policy Page (OI-11)', () => {
    it('articulates the perishable nature of fresh agricultural vegetables', () => {
      renderPolicy(<RefundPolicy />, { route: '/refunds' });

      expect(
        screen.getByRole('heading', {
          name: 'Refund & Dispute Policy',
          level: 1,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Perishable Goods & Disputes \(SRS OI-11\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Due to the organic, temperature-sensitive nature of fresh farm produce/i
        )
      ).toBeInTheDocument();
    });

    it('defines distinct reporting windows for leafy greens and hardy vegetables', () => {
      renderPolicy(<RefundPolicy />, { route: '/refunds' });

      expect(
        screen.getByText(/Leafy Greens & Cut Produce/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Within 4 Hours of Delivery/i)
      ).toBeInTheDocument();

      expect(screen.getByText(/Hardy & Root Vegetables/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Within 24 Hours of Delivery/i)
      ).toBeInTheDocument();
    });

    it('documents the 4-step manual dispute workflow conforming to Release 1.0 (OI-11)', () => {
      renderPolicy(<RefundPolicy />, { route: '/refunds' });

      expect(
        screen.getByText(/Step 1: Direct Seller Resolution/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Step 2: Escalation to Vegetable Joint Support/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Step 3: Platform Investigation & Mediation/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Step 4: Seller Moderation & Enforcement/i)
      ).toBeInTheDocument();
    });

    it('lists non-refundable scenarios and dispute resolution contact', () => {
      renderPolicy(<RefundPolicy />, { route: '/refunds' });

      expect(
        screen.getByRole('heading', {
          name: /7\. Ineligible \/ Non-Refundable Scenarios/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Claims submitted beyond the mandatory 4-hour/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Natural cosmetic irregularities/i)
      ).toBeInTheDocument();

      // Contact info
      expect(
        screen.getByRole('heading', { name: /9\. Dispute Support & Contact/i })
      ).toBeInTheDocument();
    });
  });

  describe('Policy Layout Navigation & Cross-Linking', () => {
    it('renders breadcrumb links back to Home', () => {
      renderPolicy(<TermsOfUse />, { route: '/terms' });

      const breadcrumbs = screen.getByRole('navigation', {
        name: 'Breadcrumb',
      });
      expect(breadcrumbs).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
        'href',
        '/'
      );
    });

    it('renders policy sidebar with links to all three static policies', () => {
      renderPolicy(<TermsOfUse />, { route: '/terms' });

      const sidebar = screen.getByTestId('policy-sidebar');
      expect(sidebar).toBeInTheDocument();

      expect(
        screen.getAllByRole('link', { name: /Terms of Use/i })[0]
      ).toHaveAttribute('href', '/terms');
      expect(
        screen.getAllByRole('link', { name: /Privacy Notice/i })[0]
      ).toHaveAttribute('href', '/privacy');
      expect(
        screen.getAllByRole('link', { name: /Refund & Dispute Policy/i })[0]
      ).toHaveAttribute('href', '/refunds');
    });

    it('renders customer support helpline card in sidebar', () => {
      renderPolicy(<TermsOfUse />, { route: '/terms' });

      expect(screen.getByText('Questions or Concerns?')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'support@vegetablejoint.ng' })
      ).toHaveAttribute('href', 'mailto:support@vegetablejoint.ng');
      expect(
        screen.getByRole('link', { name: '+234 800 000 0000' })
      ).toHaveAttribute('href', 'tel:+2348000000000');
    });
  });

  describe('AppRoutes Integration & Route Aliases', () => {
    it('renders Terms of Use via primary route /terms and alias /terms-of-use', async () => {
      const { unmount } = renderFullApp('/terms');
      expect(
        await screen.findByRole('heading', {
          name: 'Terms of Use',
          level: 1,
        })
      ).toBeInTheDocument();
      unmount();

      renderFullApp('/terms-of-use');
      expect(
        await screen.findByRole('heading', {
          name: 'Terms of Use',
          level: 1,
        })
      ).toBeInTheDocument();
    });

    it('renders Privacy Notice via primary route /privacy and aliases', async () => {
      const { unmount } = renderFullApp('/privacy');
      expect(
        await screen.findByRole('heading', {
          name: 'Privacy Notice',
          level: 1,
        })
      ).toBeInTheDocument();
      unmount();

      renderFullApp('/privacy-policy');
      expect(
        await screen.findByRole('heading', {
          name: 'Privacy Notice',
          level: 1,
        })
      ).toBeInTheDocument();
    });

    it('renders Refund Policy via primary route /refunds and aliases', async () => {
      const { unmount } = renderFullApp('/refunds');
      expect(
        await screen.findByRole('heading', {
          name: 'Refund & Dispute Policy',
          level: 1,
        })
      ).toBeInTheDocument();
      unmount();

      renderFullApp('/refund-policy');
      expect(
        await screen.findByRole('heading', {
          name: 'Refund & Dispute Policy',
          level: 1,
        })
      ).toBeInTheDocument();
    });

    it('renders policy links in the marketplace footer', async () => {
      renderFullApp('/');

      const footerLegal = await screen.findByTestId('footer-legal-links');
      expect(footerLegal).toBeInTheDocument();

      const termsLink = within(footerLegal).getByRole('link', {
        name: 'Terms of Use',
      });
      expect(termsLink).toHaveAttribute('href', '/terms');

      const privacyLink = within(footerLegal).getByRole('link', {
        name: 'Privacy Notice',
      });
      expect(privacyLink).toHaveAttribute('href', '/privacy');

      const refundsLink = within(footerLegal).getByRole('link', {
        name: /Refund & Dispute Policy/i,
      });
      expect(refundsLink).toHaveAttribute('href', '/refunds');
    });
  });
});
