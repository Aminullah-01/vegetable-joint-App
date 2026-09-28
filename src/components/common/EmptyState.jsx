import PropTypes from 'prop-types';
import { STRINGS } from '../../constants';

const PRESETS = {
  cart: {
    icon: '🛒',
    title: STRINGS.EMPTY.CART_TITLE,
    description: STRINGS.EMPTY.CART_DESCRIPTION,
  },
  orders: {
    icon: '📦',
    title: STRINGS.EMPTY.ORDERS_TITLE,
    description: STRINGS.EMPTY.ORDERS_DESCRIPTION,
  },
  products: {
    icon: '🥦',
    title: STRINGS.EMPTY.PRODUCTS_TITLE,
    description: STRINGS.EMPTY.PRODUCTS_DESCRIPTION,
  },
  search: {
    icon: '🔍',
    title: STRINGS.EMPTY.SEARCH_TITLE,
    description: STRINGS.EMPTY.SEARCH_DESCRIPTION,
  },
  sellers: {
    icon: '🌾',
    title: STRINGS.EMPTY.SELLERS_TITLE,
    description: STRINGS.EMPTY.SELLERS_DESCRIPTION,
  },
  default: {
    icon: '📋',
    title: STRINGS.EMPTY.DEFAULT_TITLE,
    description: STRINGS.EMPTY.DEFAULT_DESCRIPTION,
  },
};

/**
 * Reusable Empty State Component
 * Conforms to SRS MKT-10 and Figma UI Design System (Empty states):
 * - Supports presets for cart, orders, products, search, sellers, or full customization
 * - Polished produce-themed design with action slot
 */
export function EmptyState({
  type = 'default',
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = '',
  style = {},
}) {
  const preset = PRESETS[type] || PRESETS.default;

  const displayIcon = icon ?? preset.icon;
  const displayTitle = title ?? preset.title;
  const displayDescription = description ?? preset.description;

  return (
    <div
      role="status"
      style={{
        maxWidth: compact ? '420px' : '520px',
        margin: compact ? '1.5rem auto' : '3rem auto',
        padding: compact ? '1.5rem' : '2.5rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1',
        boxSizing: 'border-box',
        ...style,
      }}
      className={className}
      data-testid="empty-state"
    >
      <div
        style={{
          width: compact ? '52px' : '68px',
          height: compact ? '52px' : '68px',
          borderRadius: '50%',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: compact ? '1.75rem' : '2.25rem',
          margin: '0 auto 1.25rem auto',
        }}
        aria-hidden="true"
      >
        {displayIcon}
      </div>

      <h3
        style={{
          fontSize: compact ? '1.15rem' : '1.35rem',
          color: '#1e293b',
          marginBottom: '0.5rem',
          fontWeight: '700',
        }}
      >
        {displayTitle}
      </h3>

      <p
        style={{
          color: '#64748b',
          fontSize: compact ? '0.85rem' : '0.9rem',
          lineHeight: 1.5,
          marginBottom: action || secondaryAction ? '1.5rem' : '0',
          maxWidth: '380px',
          marginRight: 'auto',
          marginLeft: 'auto',
        }}
      >
        {displayDescription}
      </p>

      {(action || secondaryAction) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  type: PropTypes.oneOf([
    'cart',
    'orders',
    'products',
    'search',
    'sellers',
    'default',
  ]),
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  action: PropTypes.node,
  secondaryAction: PropTypes.node,
  compact: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default EmptyState;
