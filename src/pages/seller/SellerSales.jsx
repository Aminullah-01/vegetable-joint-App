export function SellerSales() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
          Sales & Analytics (SEL-12)
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.25rem 0 0 0',
          }}
        >
          Revenue tracking, order counts, and marketplace performance.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
            This Month
          </span>
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#15803d',
              display: 'block',
              marginTop: '0.25rem',
            }}
          >
            ₦142,500
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
            Total Completed Orders
          </span>
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#1e293b',
              display: 'block',
              marginTop: '0.25rem',
            }}
          >
            38
          </span>
        </div>
      </div>
    </div>
  );
}

export default SellerSales;
