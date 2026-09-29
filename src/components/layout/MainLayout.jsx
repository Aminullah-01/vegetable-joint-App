import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Spinner } from '../common/Spinner.jsx';
import { Navbar } from '../common/Navbar.jsx';
import { Footer } from '../common/Footer.jsx';

/**
 * Main marketplace layout shell
 * Contains the shared Navbar header, page content outlet with lazy loading suspense, and shared Footer.
 */
export function MainLayout() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      {/* Top Shared Navbar (FE-022 / UI-01, UI-07, CART-07) */}
      <Navbar />

      {/* Main Content Shell */}
      <main
        style={{
          flex: 1,
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          boxSizing: 'border-box',
        }}
      >
        <Suspense
          fallback={<Spinner size="lg" center text="Loading page..." />}
        >
          <Outlet />
        </Suspense>
      </main>

      {/* Shared Footer (FE-023 / MKT-01, ADM-08) */}
      <Footer />
    </div>
  );
}

export default MainLayout;
