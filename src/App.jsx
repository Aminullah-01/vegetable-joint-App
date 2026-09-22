import React from 'react';

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: '#15803d',
          color: '#ffffff',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#15803d',
              fontSize: '1.25rem',
            }}
          >
            🥦
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
              Vegetable Joint
            </h1>
            <p style={{ fontSize: '0.75rem', opacity: 0.9, margin: 0 }}>
              Digital Vegetable Marketplace
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.8rem',
            backgroundColor: '#166534',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
          }}
        >
          FE-001 Setup Complete
        </span>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          width: '100%',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🌱</span>
            <div>
              <h2 style={{ fontSize: '1.75rem', color: '#15803d', marginBottom: '0.25rem' }}>
                Welcome to Vegetable Joint
              </h2>
              <p style={{ color: '#64748b' }}>
                Connecting vegetable sellers, farmers, and buyers across Nigeria.
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              marginBottom: '2rem',
            }}
          >
            <h3 style={{ color: '#166534', fontSize: '1rem', marginBottom: '0.5rem' }}>
              ✓ Task FE-001: React Project & Folder Structure Initialised
            </h3>
            <p style={{ color: '#15803d', fontSize: '0.875rem', margin: 0 }}>
              Built with Vite + React, conforming to CON-01 and NFR-MAIN-01 modular architecture:
              assets, components (common, products, cart, layout), pages, services, data, hooks, context, routes, and utils.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: '#fafafa',
              }}
            >
              <h4 style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '0.5rem' }}>
                📦 Modular Architecture
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Clean separation between UI components, service layer, context, and mock/API data.
              </p>
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: '#fafafa',
              }}
            >
              <h4 style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '0.5rem' }}>
                ⚡ Fast Development
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Powered by Vite with instant Hot Module Replacement (HMR) and optimized build bundling.
              </p>
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: '#fafafa',
              }}
            >
              <h4 style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '0.5rem' }}>
                🇳🇬 Nigerian Marketplace
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Designed for local vegetable commerce with Naira (₦) currency, Lagos timezone, and role-based flows.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          padding: '1.5rem',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '0.875rem',
          backgroundColor: '#ffffff',
        }}
      >
        Vegetable Joint &copy; {new Date().getFullYear()} — Built by TriNova Technologies
      </footer>
    </div>
  );
}

export default App;
