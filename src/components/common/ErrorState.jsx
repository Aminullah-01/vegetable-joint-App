import PropTypes from 'prop-types';
import { STRINGS } from '../../constants';

/**
 * Reusable Error State Component
 * Strictly satisfies SRS MKT-10 and ERR-01:
 * - Shows "Unable to load..." with a clear retry action
 * - Never exposes raw technical details or stack traces to users
 * - Works as an embedded block, compact alert, or full section
 */
export function ErrorState({
  title = 'Unable to load content',
  message = STRINGS.ERRORS.UNABLE_TO_LOAD_PRODUCTS,
  onRetry,
  retryLabel = STRINGS.BUTTONS.RETRY,
  secondaryAction,
  icon = '⚠️',
  compact = false,
  fullPage = false,
  className = '',
  style = {},
}) {
  if (compact) {
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '0.875rem',
          gap: '1rem',
          flexWrap: 'wrap',
          ...style,
        }}
        className={className}
        data-testid="error-state-compact"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.25rem' }} aria-hidden="true">
            {icon}
          </span>
          <div>
            <strong>{title}:</strong> {message}
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  const content = (
    <div
      role="alert"
      style={{
        maxWidth: '480px',
        margin: fullPage ? '0 auto' : '2.5rem auto',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #fee2e2',
        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.05)',
        ...style,
      }}
      className={className}
      data-testid="error-state"
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          margin: '0 auto 1.25rem auto',
        }}
        aria-hidden="true"
      >
        {icon}
      </div>

      <h3
        style={{
          fontSize: '1.25rem',
          color: '#1e293b',
          marginBottom: '0.5rem',
          fontWeight: '700',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          color: '#64748b',
          fontSize: '0.9rem',
          lineHeight: 1.5,
          marginBottom: onRetry || secondaryAction ? '1.5rem' : '0',
          maxWidth: '360px',
          marginRight: 'auto',
          marginLeft: 'auto',
        }}
      >
        {message}
      </p>

      {(onRetry || secondaryAction) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>🔄</span>
              <span>{retryLabel}</span>
            </button>
          )}

          {secondaryAction}
        </div>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
        }}
        data-testid="error-state-fullpage"
      >
        {content}
      </div>
    );
  }

  return content;
}

ErrorState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  onRetry: PropTypes.func,
  retryLabel: PropTypes.string,
  secondaryAction: PropTypes.node,
  icon: PropTypes.node,
  compact: PropTypes.bool,
  fullPage: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ErrorState;
