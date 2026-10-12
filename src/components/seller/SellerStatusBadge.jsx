import PropTypes from 'prop-types';
import {
  getSellerStatusMeta,
  getSellerApprovalStatus,
} from '../../utils/sellerStatus.js';

/**
 * SellerStatusBadge
 *
 * Visual & accessible badge indicator for Seller Approval Status.
 * Adheres to:
 * - SRS: AUTH-03, ADM-03
 * - Figma Section 17: "Use clear visual distinctions and accessible text labels, not color alone."
 *
 * @param {Object} props
 * @param {string} [props.status] - Explicit status string ('pending' | 'approved' | 'rejected' | 'suspended')
 * @param {Object} [props.user] - Optional user object to resolve status from
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Badge size
 */
export function SellerStatusBadge({ status, user, size = 'md' }) {
  const resolvedStatus = status || getSellerApprovalStatus(user);
  if (!resolvedStatus) return null;

  const meta = getSellerStatusMeta(resolvedStatus);
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const padding = isSm
    ? '0.15rem 0.5rem'
    : isLg
      ? '0.35rem 0.85rem'
      : '0.25rem 0.65rem';
  const fontSize = isSm ? '0.75rem' : isLg ? '0.875rem' : '0.8125rem';

  return (
    <span
      data-testid="seller-status-badge"
      data-status={resolvedStatus}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '0.25rem' : '0.35rem',
        padding,
        borderRadius: '9999px',
        fontSize,
        fontWeight: 600,
        backgroundColor: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border}`,
        lineHeight: 1.25,
      }}
      role="status"
      aria-label={`Seller status: ${meta.badgeText}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.badgeText}</span>
    </span>
  );
}

SellerStatusBadge.propTypes = {
  status: PropTypes.string,
  user: PropTypes.object,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default SellerStatusBadge;
