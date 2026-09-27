import { useParams, Link } from 'react-router-dom';

export function SellerProfile() {
  const { id } = useParams();

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Seller Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#15803d',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
          }}
        >
          👨‍🌾
        </div>
        <div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <h1 style={{ fontSize: '1.6rem', color: '#1e293b', margin: 0 }}>
              Ibrahim Agro Farms (Seller #{id})
            </h1>
            <span
              style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}
            >
              Verified Seller
            </span>
          </div>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: '0.5rem 0 0 0',
            }}
          >
            Location: Mile 12 Market, Ketu, Lagos State • Member since May 2025
          </p>
        </div>
      </div>

      {/* Seller Products */}
      <div>
        <h2
          style={{
            fontSize: '1.25rem',
            color: '#15803d',
            marginBottom: '1rem',
          }}
        >
          Vegetables listed by this seller
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {[
            { id: 1, name: 'Fresh Ugwu', price: '₦1,200', unit: 'per bunch' },
            {
              id: 2,
              name: 'Red Tomatoes',
              price: '₦8,500',
              unit: 'per basket',
            },
          ].map((prod) => (
            <div
              key={prod.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0' }}>
                {prod.name}
              </h3>
              <p
                style={{
                  color: '#15803d',
                  fontWeight: '700',
                  margin: '0 0 0.75rem 0',
                }}
              >
                {prod.price}{' '}
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {prod.unit}
                </span>
              </p>
              <Link
                to={`/products/${prod.id}`}
                style={{
                  color: '#15803d',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                View Details →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SellerProfile;
