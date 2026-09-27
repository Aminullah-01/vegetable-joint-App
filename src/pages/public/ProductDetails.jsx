import { useParams, Link } from 'react-router-dom';
import { formatPrice } from '../../utils';

export function ProductDetails() {
  const { id } = useParams();

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
        <Link
          to="/products"
          style={{ color: '#15803d', textDecoration: 'none' }}
        >
          ← Back to Vegetables
        </Link>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
        }}
      >
        <div
          style={{
            height: '280px',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '4rem',
          }}
        >
          🥬
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <span
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
            }}
          >
            In Stock • ID #{id}
          </span>
          <h1 style={{ fontSize: '1.75rem', color: '#1e293b', margin: 0 }}>
            Fresh Nigerian Spinach (Efo Tete)
          </h1>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#15803d',
              margin: 0,
            }}
          >
            {formatPrice(1500, 'bundle')}
          </p>
          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Naturally harvested, pesticide-free fresh greens. Sourced directly
            from local farmers in Oyo State.
          </p>
          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '1rem',
              fontSize: '0.85rem',
              color: '#64748b',
            }}
          >
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Seller:{' '}
              <Link
                to="/sellers/1"
                style={{
                  color: '#15803d',
                  fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                Ibrahim Agro Farms
              </Link>
            </p>
            <p style={{ margin: 0 }}>
              Delivery within Lagos & Ibadan available.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            <Link
              to="/cart"
              style={{
                flex: 1,
                textAlign: 'center',
                backgroundColor: '#15803d',
                color: '#ffffff',
                padding: '0.75rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Add to Cart 🛒
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;
