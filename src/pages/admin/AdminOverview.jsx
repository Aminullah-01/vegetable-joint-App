export function AdminOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Admin Overview (ADM-10)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Marketplace-wide operations, moderation queues, and metrics.
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
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Pending Seller Approvals
          </span>
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#d97706',
              display: 'block',
            }}
          >
            2
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Active Products
          </span>
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#15803d',
              display: 'block',
            }}
          >
            64
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Total Users
          </span>
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#1e293b',
              display: 'block',
            }}
          >
            152
          </span>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Platform GMV
          </span>
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#1e293b',
              display: 'block',
            }}
          >
            ₦1,240,000
          </span>
        </div>
      </div>
    </div>
  );
}

export default AdminOverview;
