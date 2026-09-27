import { Link } from 'react-router-dom';

export function Checkout() {
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
        Checkout & Delivery Details (CHK-01 to CHK-04)
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Delivery Form */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.15rem',
              color: '#1e293b',
              marginBottom: '1rem',
            }}
          >
            Delivery Information
          </h2>
          <form
            style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            onSubmit={(e) => e.preventDefault()}
          >
            <div>
              <label
                htmlFor="checkout-name"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                }}
              >
                Contact Name
              </label>
              <input
                id="checkout-name"
                type="text"
                placeholder="Receiver name"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="checkout-phone"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                }}
              >
                Phone Number
              </label>
              <input
                id="checkout-phone"
                type="tel"
                placeholder="e.g. 08012345678"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="checkout-address"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                }}
              >
                Delivery Address
              </label>
              <textarea
                id="checkout-address"
                rows={3}
                placeholder="Street address, apartment/suite, area"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="checkout-city"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                }}
              >
                State / City
              </label>
              <select
                id="checkout-city"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="lagos">Lagos State</option>
                <option value="abuja">Abuja (FCT)</option>
                <option value="oyo">Oyo State (Ibadan)</option>
                <option value="kano">Kano State</option>
              </select>
            </div>
          </form>
        </div>

        {/* Order Summary & Place Order */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', color: '#1e293b', margin: 0 }}>
            Order Summary
          </h2>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
            }}
          >
            <span>Items (1):</span>
            <span>₦2,400</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
            }}
          >
            <span>Estimated Delivery:</span>
            <span>₦1,000</span>
          </div>
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: '700',
              fontSize: '1.1rem',
              color: '#15803d',
            }}
          >
            <span>Total:</span>
            <span>₦3,400</span>
          </div>

          <div
            style={{
              backgroundColor: '#f0fdf4',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#166534',
            }}
          >
            Payment Method: Cash or Bank Transfer on Delivery (OI-01)
          </div>

          <Link
            to="/checkout/confirmation/ORD-2026-001"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '8px',
              textAlign: 'center',
              textDecoration: 'none',
              fontWeight: '600',
              marginTop: 'auto',
            }}
          >
            Place Order Now →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
