import { Link } from 'react-router-dom';
import { STRINGS } from '../../constants';
import { formatCurrency } from '../../utils';

export function Cart() {
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
      <h1 style={{ fontSize: '1.75rem', color: '#15803d', margin: 0 }}>
        {STRINGS.CART.TITLE} (CART-01)
      </h1>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Cart Item Placeholder */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>🥬</span>
              <div>
                <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0' }}>
                  Fresh Ugwu (Fluted Pumpkin)
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {STRINGS.CART.QUANTITY}: 2 bunches
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: '700', color: '#15803d' }}>
                {formatCurrency(2400)}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>
              {STRINGS.CART.SUBTOTAL}:
            </span>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#15803d',
              }}
            >
              {formatCurrency(2400)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <Link
              to="/products"
              style={{
                color: '#64748b',
                padding: '0.6rem 1.2rem',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              {STRINGS.CART.CONTINUE_SHOPPING}
            </Link>
            <Link
              to="/checkout"
              style={{
                backgroundColor: '#15803d',
                color: '#ffffff',
                padding: '0.6rem 1.5rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
            >
              {STRINGS.CART.PROCEED_TO_CHECKOUT}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
