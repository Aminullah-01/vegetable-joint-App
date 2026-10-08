import { useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { STRINGS } from '../../constants';
import { ROUTES } from '../../routes/routeConfig';

const SIZE_STYLES = {
  sm: {
    minHeight: '38px',
    fontSize: '0.8125rem',
    submitPadding: '0.25rem 0.625rem',
    submitFontSize: '0.75rem',
    submitMinHeight: '30px',
  },
  md: {
    minHeight: '44px',
    fontSize: '0.875rem',
    submitPadding: '0.375rem 0.75rem',
    submitFontSize: '0.8125rem',
    submitMinHeight: '36px',
  },
  lg: {
    minHeight: '48px',
    fontSize: '1rem',
    submitPadding: '0.5rem 1rem',
    submitFontSize: '0.875rem',
    submitMinHeight: '40px',
  },
};

// NFR-USAB-03: touch targets stay at or above 44x44px for the default size.
const CLEAR_MIN_WIDTH = '44px';

/**
 * SearchBar — Reusable marketplace keyword search.
 *
 * SRS References: SRCH-01 (case-insensitive partial match on product name,
 * category name and seller name), SRCH-06 (active criteria reflected in the
 * URL so results can be bookmarked and shared), UI-01 (search in the navbar),
 * MKT-01 (search box in the hero), NFR-USAB-02 (WCAG 2.1 AA labelling),
 * NFR-USAB-03 (touch targets ≥ 44×44px).
 *
 * Acceptance Criteria (FE-033):
 * - Keyword search with submit.
 * - One shared component used in the navbar and the homepage hero.
 * - Submitting reflects the trimmed keyword in `?search=` on the products route;
 *   an empty keyword returns to the unfiltered catalogue.
 * - The input stays in sync with the `search` URL parameter, so the navbar and
 *   the hero always show the criteria that produced the current results.
 */
export function SearchBar({
  initialValue,
  onSearch,
  navigateOnSubmit = true,
  placeholder = STRINGS.SEARCH.PLACEHOLDER,
  ariaLabel = STRINGS.SEARCH.INPUT_LABEL,
  submitLabel = STRINGS.SEARCH.SUBMIT_LABEL,
  submitText = STRINGS.SEARCH.SUBMIT_TEXT,
  clearLabel = STRINGS.SEARCH.CLEAR_LABEL,
  showClear = true,
  size = 'md',
  autoFocus = false,
  className = '',
  style = {},
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // Active keyword from the URL (SRCH-06) — the source of truth for results.
  const searchParamsObj = new URLSearchParams(location.search);
  const urlQuery =
    searchParamsObj.get('search') || searchParamsObj.get('q') || '';
  const [query, setQuery] = useState(initialValue ?? urlQuery);

  // Keep the field in step with the URL, e.g. after the hero or navbar submits.
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (prevUrlQuery !== urlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const sizeStyles = SIZE_STYLES[size] || SIZE_STYLES.md;

  const handleSubmit = (event) => {
    event.preventDefault();
    const term = query.trim();

    // A caller-supplied handler owns the result routing.
    if (onSearch) {
      onSearch(term);
      return;
    }

    if (navigateOnSubmit) {
      navigate(
        term
          ? `${ROUTES.PRODUCTS}?search=${encodeURIComponent(term)}`
          : ROUTES.PRODUCTS
      );
    }
  };

  const handleClear = () => {
    setQuery('');

    // A caller-supplied handler owns the result routing.
    if (onSearch) {
      onSearch('');
      return;
    }

    // Drop the criterion from the URL so the visible results match the field.
    if (urlQuery) {
      const params = new URLSearchParams(location.search);
      params.delete('search');
      params.delete('q');
      params.delete('page');
      const remaining = params.toString();
      navigate(
        remaining ? `${location.pathname}?${remaining}` : location.pathname
      );
    }
  };

  return (
    <div
      className={`search-bar search-bar-${size} ${className}`.trim()}
      style={{ minHeight: sizeStyles.minHeight, ...style }}
    >
      <span aria-hidden="true" style={{ lineHeight: 1 }}>
        🔍
      </span>

      <form
        role="search"
        onSubmit={handleSubmit}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <input
          type="search"
          className="search-bar-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          autoFocus={autoFocus}
          style={{
            height: sizeStyles.minHeight,
            fontSize: sizeStyles.fontSize,
          }}
        />

        {showClear && query && (
          <button
            type="button"
            className="search-bar-clear"
            onClick={handleClear}
            aria-label={clearLabel}
            style={{
              minWidth: CLEAR_MIN_WIDTH,
              minHeight: sizeStyles.minHeight,
            }}
          >
            ✕
          </button>
        )}

        <button
          type="submit"
          className="search-bar-submit"
          aria-label={submitLabel}
          style={{
            padding: sizeStyles.submitPadding,
            fontSize: sizeStyles.submitFontSize,
            minHeight: sizeStyles.submitMinHeight,
          }}
        >
          {submitText}
        </button>
      </form>
    </div>
  );
}

SearchBar.propTypes = {
  initialValue: PropTypes.string,
  onSearch: PropTypes.func,
  navigateOnSubmit: PropTypes.bool,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
  submitLabel: PropTypes.string,
  submitText: PropTypes.string,
  clearLabel: PropTypes.string,
  showClear: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default SearchBar;
