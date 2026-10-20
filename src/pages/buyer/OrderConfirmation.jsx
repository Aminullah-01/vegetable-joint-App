import { useParams, Link } from 'react-router-dom';
import {
  CheckoutStepper,
  PaymentMethodDisplay,
} from '../../components/checkout';

export function OrderConfirmation() {
  const { ref } = useParams();

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '2rem auto',
        padding: '0 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
      data-testid="order-confirmation-page"
    >
      {/* 4-Step Visual Stepper at Step 4: Confirmation (CHK-10, Figma Section 10) */}
      <CheckoutStepper currentStep={4} clickable={false} />

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2.5rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          textAlign: 'center',
        }}
      >
        <span
          style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}
        >
          🎉
        </span>
        <h1
          style={{
            fontSize: '1.75rem',
            color: '#15803d',
            marginBottom: '0.5rem',
          }}
        >
          Order Confirmed!
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.95rem',
            margin: '0 0 1.5rem 0',
          }}
        >
          Thank you for ordering with Vegetable Joint. Your order has been
          placed with the sellers.
        </p>

        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <span
            style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}
          >
            Order Reference
          </span>
          <strong style={{ fontSize: '1.15rem', color: '#1e293b' }}>
            {ref || 'ORD-2026-001'}
          </strong>
        </div>

        {/* Payment Method Notice (CHK-09, Figma Section 11) */}
        <PaymentMethodDisplay
          variant="inline"
          style={{ marginBottom: '1.5rem', textAlign: 'left' }}
        />

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link
            to="/account/orders"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}
          >
            View My Orders
          </Link>
          <Link
            to="/products"
            style={{
              color: '#15803d',
              border: '1px solid #15803d',
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              fontSize: '0.9rem',
            }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmation;
