import React from 'react';
import PropTypes from 'prop-types';
import { STRINGS } from '../../constants';

/**
 * Global Error Boundary component
 * Catches uncaught render and lifecycle errors across the component tree.
 * Conforms to SRS ERR-04 and Figma guidelines:
 * - Shows friendly error interface
 * - Strictly avoids exposing raw stack traces, file paths, or SQL details
 * - Offers "Try Again", "Reload Page", and "Go to Home" recovery options
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Technical errors logged internally for development/monitoring
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught unhandled error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ reset: this.handleReset })
          : this.props.fallback;
      }

      return (
        <div
          style={{
            maxWidth: '540px',
            margin: '4rem auto',
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
          role="alert"
          aria-live="assertive"
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              margin: '0 auto 1.5rem auto',
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              color: '#1e293b',
              marginBottom: '0.75rem',
              fontWeight: '700',
            }}
          >
            {STRINGS.ERRORS.SERVER_ERROR_500_TITLE}
          </h1>

          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              marginBottom: '2rem',
              lineHeight: 1.6,
            }}
          >
            {STRINGS.ERRORS.SERVER_ERROR_500_MESSAGE}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                backgroundColor: '#15803d',
                color: '#ffffff',
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
            >
              {STRINGS.BUTTONS.RETRY}
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#f8fafc',
                color: '#334155',
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.9rem',
              }}
            >
              {STRINGS.BUTTONS.RELOAD}
            </button>

            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                color: '#334155',
                backgroundColor: '#ffffff',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.9rem',
              }}
            >
              {STRINGS.NAV.HOME}
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onReset: PropTypes.func,
};

export default ErrorBoundary;
