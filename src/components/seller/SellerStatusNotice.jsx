import PropTypes from 'prop-types';
import { useAuth } from '../../hooks';
import {
  SELLER_APPROVAL_STATUSES,
  SELLER_STATUS_CONFIG,
  getSellerApprovalStatus,
  getSellerRejectionReason,
} from '../../utils/sellerStatus';

/**
 * SellerStatusNotice — Banner and status notice for seller accounts.
 *
 * SRS References:
 * - AUTH-03: Newly registered seller accounts have status "Pending approval" and cannot publish listings.
 * - ADM-03: Admin manages seller approvals, rejections, suspensions, and reactivations.
 * - BR-11: Unapproved or suspended seller products are hidden from the marketplace and cannot be ordered.
 * - Figma Section 8: "Your seller account is pending approval.", seller pending approval, suspended account states.
 */
export function SellerStatusNotice({
  user: propUser,
  status: propStatus,
  rejectionReason: propReason,
  compact = false,
  showWhenApproved = false,
  className = '',
  style = {},
}) {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;

  const currentStatus = propStatus || getSellerApprovalStatus(user);
  const rejectionReason = propReason || getSellerRejectionReason(user);

  if (
    currentStatus === SELLER_APPROVAL_STATUSES.APPROVED &&
    !showWhenApproved
  ) {
    return null;
  }

  const config =
    SELLER_STATUS_CONFIG[currentStatus] ||
    SELLER_STATUS_CONFIG[SELLER_APPROVAL_STATUSES.PENDING];

  const roleAttr =
    currentStatus === SELLER_APPROVAL_STATUSES.APPROVED ? 'status' : 'alert';

  if (compact) {
    return (
      <div
        role={roleAttr}
        data-testid="seller-status-notice"
        data-testid-status={`seller-status-${currentStatus}`}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          backgroundColor: config.badgeBg,
          color: config.badgeTextCol,
          border: `1px solid ${config.border}`,
          fontSize: '0.8rem',
          fontWeight: 600,
          ...style,
        }}
      >
        <span aria-hidden="true">{config.icon}</span>
        <span data-testid="seller-status-badge">{config.badgeText}</span>
      </div>
    );
  }

  return (
    <div
      role={roleAttr}
      data-testid="seller-status-notice"
      data-status={currentStatus}
      className={className}
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{ fontSize: '1.4rem', lineHeight: 1 }}
            aria-hidden="true"
          >
            {config.icon}
          </span>
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              margin: 0,
              color: config.text,
            }}
          >
            {config.heading}
          </h2>
        </div>

        <span
          data-testid="seller-status-badge"
          style={{
            backgroundColor: config.badgeBg,
            color: config.badgeTextCol,
            border: `1px solid ${config.border}`,
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          {config.badgeText}
        </span>
      </div>

      <p
        style={{
          fontSize: '0.875rem',
          lineHeight: 1.5,
          margin: 0,
          color: config.text,
          opacity: 0.95,
        }}
      >
        {config.description}
      </p>

      {/* Specific content for Pending status (AUTH-03, BR-11) */}
      {currentStatus === SELLER_APPROVAL_STATUSES.PENDING && (
        <div
          data-testid="seller-status-pending"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: `1px solid ${config.border}`,
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
            What this means for your seller account:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <li>
              <strong>Publishing Disabled:</strong> You cannot create or publish
              new vegetable listings until an administrator approves your
              account (AUTH-03).
            </li>
            <li>
              <strong>Marketplace Visibility:</strong> Your products are not
              visible to buyers on the public marketplace during review (BR-11).
            </li>
            <li>
              <strong>Fast Verification:</strong> Platform administrators review
              new farm and vendor accounts promptly to verify produce quality
              and seller details.
            </li>
          </ul>
        </div>
      )}

      {/* Specific content for Rejected status (ADM-03) */}
      {currentStatus === SELLER_APPROVAL_STATUSES.REJECTED && (
        <div
          data-testid="seller-status-rejected"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: `1px solid ${config.border}`,
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
            Application Status Details:
          </div>
          {rejectionReason ? (
            <div
              data-testid="seller-rejection-reason"
              style={{
                backgroundColor: '#fff1f2',
                color: '#9f1239',
                border: '1px solid #fecdd3',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              <strong>Reason from Administrator:</strong> {rejectionReason}
            </div>
          ) : (
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Your account details did not meet our verification criteria.
            </p>
          )}
          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
            🔒 Product creation and marketplace publishing are disabled for
            unapproved accounts.
          </div>
        </div>
      )}

      {/* Specific content for Suspended status (ADM-03, AUTH-12) */}
      {currentStatus === SELLER_APPROVAL_STATUSES.SUSPENDED && (
        <div
          data-testid="seller-status-suspended"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: `1px solid ${config.border}`,
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
            Account Suspension Notice (ADM-03):
          </div>
          {rejectionReason && (
            <div
              data-testid="seller-suspension-reason"
              style={{
                backgroundColor: '#fff1f2',
                color: '#9f1239',
                border: '1px solid #fecdd3',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              <strong>Suspension Note:</strong> {rejectionReason}
            </div>
          )}
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <li>All your product listings have been hidden from buyers.</li>
            <li>
              Publishing new products or editing existing listings is locked.
            </li>
            <li>
              Existing orders remain accessible for you to fulfill and
              coordinate delivery with buyers.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

SellerStatusNotice.propTypes = {
  user: PropTypes.object,
  status: PropTypes.oneOf(['pending', 'approved', 'rejected', 'suspended']),
  rejectionReason: PropTypes.string,
  compact: PropTypes.bool,
  showWhenApproved: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default SellerStatusNotice;
