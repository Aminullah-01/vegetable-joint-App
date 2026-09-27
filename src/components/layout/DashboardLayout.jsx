import { Link, NavLink, Outlet } from 'react-router-dom';
import { env } from '../../utils';

export function DashboardLayout({ title, role, navItems }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Dashboard Top Header */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#15803d',
              fontWeight: '700',
              fontSize: '1.1rem',
            }}
          >
            <span>🥦</span>
            <span>{env.appName}</span>
          </Link>
          <span
            style={{
              backgroundColor: role === 'admin' ? '#fef3c7' : '#e0f2fe',
              color: role === 'admin' ? '#92400e' : '#0369a1',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/account/profile"
            style={{
              color: '#475569',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            My Profile
          </Link>
          <Link
            to="/"
            style={{
              color: '#15803d',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '500',
            }}
          >
            ← View Marketplace
          </Link>
        </div>
      </header>

      {/* Dashboard Body (Sidebar + Content) */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: '240px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: '#94a3b8',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
              paddingLeft: '0.5rem',
            }}
          >
            Navigation
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                color: isActive ? '#15803d' : '#334155',
                backgroundColor: isActive ? '#f0fdf4' : 'transparent',
                fontWeight: isActive ? '600' : '500',
                fontSize: '0.9rem',
                textDecoration: 'none',
                transition: 'background-color 0.15s ease',
              })}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </aside>

        {/* Dashboard Main Area */}
        <main
          style={{
            flex: 1,
            padding: '2rem',
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
