import PropTypes from 'prop-types';
import { useAuth } from '../../hooks';
import {
  SELLER_STATUS,
  getSellerApprovalStatus,
  getSellerStatusMeta,
} from '../../utils/sellerStatus.js';
import { SellerStatusBadge } from './SellerStatusBadge.jsx';

/**
 * SellerApprovalNotice
 *
 * Notice banner displayed to sellers to inform them of their account status
 * and explain publishing restrictions when not yet approved.
 *
 * Conforms to SRS:
 * - AUTH-03: Newly registered Seller account shall have status "Pending approval"
 *   and shall not publish listings until an Administrator approves it.
 * - ADM-03: Admins can approve, reject, suspend, and reactivate seller accounts.
 * - BR-11: A pending or suspended seller's products are not shown publicly.
 * - Figma Section 8: "After registration, seller status: 'Your seller account is pending approval.'"
 * - Figma Section 17: Distinct states for Pending, Rejected, Suspended with accessible text labels.
 *
 * @param {Object} props
 * @param {string} [props.status] - Explicit status override ('pending' | 'rejected' | 'suspended' | 'approved')
 * @param {string} [props.reason] - Rejection or suspension reason message
 * @param {boolean} [props.inline=false] - Display as compact inline alert rather than full card
 */
export function SellerApprovalNotice({ status: explicitStatus, reason, inline = false }) {
  const { user } = useAuth();
  const status = explicitStatus || getSellerApprovalStatus(user);

  // If approved or not a seller, no warning/notice needed
  if (!status || status === SELLER_STATUS.APPROVED) {
    return null;
  }

  const meta = getSellerStatusMeta(status);
  const rejectionReason =
    reason ||
    user?.seller_profile?.rejection_reason ||
    user?.rejection_reason ||
    null;

  // 1. Pending Approval State (AUTH-03)
  if (status === SELLER_STATUS.PENDING) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="seller-approval-notice"
        data-status="pending"
        style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: inline ? '8px' : '12px',
          padding: inline ? '0.875rem 1rem' : '1.25rem 1.5rem',
          boxShadow: inline ? 'none' : '0 2px 8px -2px rgba(245, 158, 11, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <span
            style={{
              fontSize: inline ? '1.35rem' : '1.75rem',
              lineHeight: 1,
              marginTop: '0.1rem',
            }}
            aria-hidden="true"
          >
            ⏳
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap',
                marginBottom: '0.35rem',
              }}
            >
              <h2
                style={{
                  fontSize: inline ? '0.95rem' : '1.1rem',
                  fontWeight: 700,
                  color: '#92400e',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Your seller account is pending approval (AUTH-03)
              </h2>
              <SellerStatusBadge status={status} size="sm" />
            </div>

            <p
              style={{
                color: '#78350f',
                fontSize: '0.875rem',
                margin: '0 0 0.5rem 0',
                lineHeight: 1.5,
              }}
            >
              Your seller registration was submitted successfully and is currently under
              review by platform administrators. While your account is pending approval,{' '}
              <strong>you cannot publish vegetable listings to the public marketplace</strong>.
            </p>

            {!inline && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #fef3c7',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8125rem',
                  color: '#92400e',
                  lineHeight: 1.45,
                  marginTop: '0.5rem',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
                  What happens next?
                </div>
                <div>
                  • Administrator review typically completes within 24 to 48 hours.
                </div>
                <div>
                  • Once approved, the ability to add and publish vegetable listings will automatically unlock.
                </div>
                <div>
                  • In the meantime, you can review inventory formats and platform guidelines.
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>Need expedited verification? Contact support:</span>
              <a
                href="mailto:support@vegetablejoint.ng"
                style={{
                  color: '#92400e',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                support@vegetablejoint.ng
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Rejected State (ADM-03)
  if (status === SELLER_STATUS.REJECTED) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="seller-approval-notice"
        data-status="rejected"
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: inline ? '8px' : '12px',
          padding: inline ? '0.875rem 1rem' : '1.25rem 1.5rem',
          boxShadow: inline ? 'none' : '0 2px 8px -2px rgba(220, 38, 38, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <span
            style={{
              fontSize: inline ? '1.35rem' : '1.75rem',
              lineHeight: 1,
              marginTop: '0.1rem',
            }}
            aria-hidden="true"
          >
            ⚠️
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap',
                marginBottom: '0.35rem',
              }}
            >
              <h2
                style={{
                  fontSize: inline ? '0.95rem' : '1.1rem',
                  fontWeight: 700,
                  color: '#991b1b',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Seller Account Application Rejected (ADM-03)
              </h2>
              <SellerStatusBadge status={status} size="sm" />
            </div>

            <p
              style={{
                color: '#7f1d1d',
                fontSize: '0.875rem',
                margin: '0 0 0.5rem 0',
                lineHeight: 1.5,
              }}
            >
              Your seller account application was not approved by platform administrators.{' '}
              <strong>You cannot publish vegetable listings or receive buyer orders.</strong>
            </p>

            {rejectionReason && (
              <div
                data-testid="seller-rejection-reason"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #fee2e2',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.8125rem',
                  color: '#991b1b',
                  margin: '0.5rem 0',
                }}
              >
                <strong>Reason provided:</strong> {rejectionReason}
              </div>
            )}

            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#991b1b',
              }}
            >
              If you have updated business credentials or wish to appeal this decision,
              please reach out to{' '}
              <a
                href="mailto:support@vegetablejoint.ng"
                style={{
                  color: '#7f1d1d',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                support@vegetablejoint.ng
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Suspended State (ADM-03, AUTH-12)
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="seller-approval-notice"
      data-status="suspended"
      style={{
        backgroundColor: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: inline ? '8px' : '12px',
        padding: inline ? '0.875rem 1rem' : '1.25rem 1.5rem',
        boxShadow: inline ? 'none' : '0 2px 8px -2px rgba(225, 29, 72, 0.12)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <span
          style={{
            fontSize: inline ? '1.35rem' : '1.75rem',
            lineHeight: 1,
            marginTop: '0.1rem',
          }}
          aria-hidden="true"
        >
          🚫
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flexWrap: 'wrap',
              marginBottom: '0.35rem',
            }}
          >
            <h2
              style={{
                fontSize: inline ? '0.95rem' : '1.1rem',
                fontWeight: 700,
                color: '#b91c1c',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Seller Account Suspended (AUTH-12, ADM-03)
            </h2>
            <SellerStatusBadge status={status} size="sm" />
          </div>

          <p
            style={{
              color: '#881337',
              fontSize: '0.875rem',
              margin: '0 0 0.5rem 0',
              lineHeight: 1.5,
            }}
          >
            Your seller privileges have been suspended by an administrator (ADM-03).
            All of your product listings are hidden from the marketplace, and{' '}
            <strong>publishing new listings is disabled</strong>.
          </p>

          <p
            style={{
              color: '#9f1239',
              fontSize: '0.8125rem',
              margin: '0 0 0.5rem 0',
            }}
          >
            Note: Open orders previously placed by buyers remain visible in your orders
            panel for delivery completion.
          </p>

          <div
            style={{
              fontSize: '0.75rem',
              color: '#9f1239',
            }}
          >
            To request account reactivation or inquire about your suspension, please
            contact{' '}
            <a
              href="mailto:support@vegetablejoint.ng"
              style={{
                color: '#881337',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              support@vegetablejoint.ng
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

SellerApprovalNotice.propTypes = {
  status: PropTypes.string,
  reason: PropTypes.string,
  inline: PropTypes.bool,
};

export default SellerApprovalNotice;
