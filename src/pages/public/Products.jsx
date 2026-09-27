import { Link } from 'react-router-dom';

export function Products() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', color: '#15803d', margin: 0 }}>
            Marketplace Vegetables
          </h1>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: '0.25rem 0 0 0',
            }}
          >
            Browse, search, and filter fresh produce from verified sellers (SRS:
            MKT-02, SRCH-01)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search spinach, tomatoes, onions..."
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              minWidth: '260px',
            }}
            readOnly
          />
        </div>
      </div>

      {/* Placeholder Listing Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {[
          {
            id: 1,
            name: 'Fresh Ugwu (Fluted Pumpkin)',
            price: '₦1,200',
            unit: 'per bunch',
            seller: 'Ibrahim Farm',
          },
          {
            id: 2,
            name: 'Roma Tomatoes (Basket)',
            price: '₦8,500',
            unit: 'per basket',
            seller: 'Kano Fresh Produce',
          },
          {
            id: 3,
            name: 'Red Onions (5kg bag)',
            price: '₦4,000',
            unit: 'per 5kg',
            seller: 'Alhaji Musa Farms',
          },
          {
            id: 4,
            name: 'Green Bell Peppers (Tatase)',
            price: '₦2,500',
            unit: 'per kg',
            seller: 'Plateau Greens',
          },
        ].map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                height: '120px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
              }}
            >
              🥗
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1rem',
                  color: '#1e293b',
                  marginBottom: '0.25rem',
                }}
              >
                {item.name}
              </h3>
              <p
                style={{
                  color: '#15803d',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  margin: 0,
                }}
              >
                {item.price}{' '}
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: 'normal',
                  }}
                >
                  {item.unit}
                </span>
              </p>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '0.8rem',
                  marginTop: '0.25rem',
                }}
              >
                Seller: {item.seller}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <Link
                to={`/products/${item.id}`}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                }}
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Products;
