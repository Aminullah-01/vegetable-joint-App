import { useState, useId } from 'react';
import PropTypes from 'prop-types';
import { useInRouterContext, useSearchParams } from 'react-router-dom';
import { STRINGS } from '../../constants';
import {
  SORT_OPTIONS,
  DEFAULT_SORT,
  isValidSortOption,
} from '../../utils/sorting';

const SIZE_STYLES = {
  sm: {
    minHeight: '38px',
    fontSize: '0.8125rem',
    padding: '0.25rem 2rem 0.25rem 0.625rem',
    labelFontSize: '0.75rem',
  },
  md: {
    minHeight: '44px',
    fontSize: '0.875rem',
    padding: '0.5rem 2.25rem 0.5rem 0.75rem',
    labelFontSize: '0.875rem',
  },
  lg: {
    minHeight: '48px',
    fontSize: '1rem',
    padding: '0.625rem 2.5rem 0.625rem 1rem',
    labelFontSize: '0.9375rem',
  },
};

/**
 * Presentational view for the sort dropdown selector.
 */
function SortDropdownView({
  id: propId,
  value,
  onChange,
  options = SORT_OPTIONS,
  label = STRINGS.SORT.LABEL,
  ariaLabel = STRINGS.SORT.ARIA_LABEL,
  showLabel = true,
  size = 'md',
  disabled = false,
  className = '',
  style = {},
}) {
  const generatedId = useId();
  const selectId = propId || `sort-dropdown-${generatedId}`;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <div
      className={`sort-dropdown-container ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        ...style,
      }}
    >
      {showLabel && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: sizeStyle.labelFontSize,
            fontWeight: 600,
            color: '#475569',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={!showLabel ? ariaLabel : undefined}
          style={{
            minHeight: sizeStyle.minHeight,
            minWidth: '160px',
            padding: sizeStyle.padding,
            fontSize: sizeStyle.fontSize,
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            boxSizing: 'border-box',
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Dropdown Chevron Icon */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#64748b',
            fontSize: '0.8125rem',
            lineHeight: 1,
          }}
        >
          ▾
        </span>
      </div>
    </div>
  );
}

SortDropdownView.propTypes = {
  id: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  label: PropTypes.string,
  ariaLabel: PropTypes.string,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Router-aware wrapper that synchronizes sort with URL search parameters (SRCH-06).
 */
function UrlSortDropdownInner({
  paramName = 'sort',
  value: propValue,
  defaultValue = DEFAULT_SORT,
  onSortChange,
  options = SORT_OPTIONS,
  includePopularity = true,
  includeRating = true,
  ...rest
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter options based on includePopularity / includeRating flags
  const effectiveOptions = options.filter((opt) => {
    if (opt.value === 'popularity' && !includePopularity) return false;
    if (opt.value === 'rating' && !includeRating) return false;
    return true;
  });

  const urlSort = searchParams.get(paramName);
  const currentSort =
    propValue ||
    (urlSort && isValidSortOption(urlSort) ? urlSort : defaultValue);

  const handleChange = (newSort) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(paramName, newSort);
    // Reset pagination page on sort change
    nextParams.delete('page');

    setSearchParams(nextParams);
    onSortChange?.(newSort);
  };

  return (
    <SortDropdownView
      {...rest}
      value={currentSort}
      onChange={handleChange}
      options={effectiveOptions}
    />
  );
}

UrlSortDropdownInner.propTypes = {
  paramName: PropTypes.string,
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  onSortChange: PropTypes.func,
  options: PropTypes.array,
  includePopularity: PropTypes.bool,
  includeRating: PropTypes.bool,
};

/**
 * Standalone wrapper for controlled/uncontrolled usage without URL sync.
 */
function StandaloneSortDropdown({
  value: propValue,
  defaultValue = DEFAULT_SORT,
  onSortChange,
  options = SORT_OPTIONS,
  includePopularity = true,
  includeRating = true,
  ...rest
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const effectiveOptions = options.filter((opt) => {
    if (opt.value === 'popularity' && !includePopularity) return false;
    if (opt.value === 'rating' && !includeRating) return false;
    return true;
  });

  const isControlled = propValue !== undefined && propValue !== null;
  const currentSort = isControlled ? propValue : internalValue;

  const handleChange = (newSort) => {
    if (!isControlled) {
      setInternalValue(newSort);
    }
    onSortChange?.(newSort);
  };

  return (
    <SortDropdownView
      {...rest}
      value={currentSort}
      onChange={handleChange}
      options={effectiveOptions}
    />
  );
}

StandaloneSortDropdown.propTypes = UrlSortDropdownInner.propTypes;

/**
 * SortDropdown — Product Sorting Selector
 *
 * SRS References:
 * - SRCH-04: Price low→high, price high→low, newest
 * - SRCH-05: Popularity and rating
 * - SRCH-06: Combinable with search & filters and reflected in URL
 * - NFR-USAB-03: Touch target dimensions ≥ 44×44px
 * - FE-035: Price low→high, high→low, newest (popularity/rating when available).
 */
export function SortDropdown(props) {
  const inRouter = useInRouterContext();
  const shouldTieToUrl = props.tieToUrl !== false && inRouter;

  if (shouldTieToUrl) {
    return <UrlSortDropdownInner {...props} />;
  }

  return <StandaloneSortDropdown {...props} />;
}

SortDropdown.propTypes = {
  id: PropTypes.string,
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  onSortChange: PropTypes.func,
  tieToUrl: PropTypes.bool,
  paramName: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  includePopularity: PropTypes.bool,
  includeRating: PropTypes.bool,
  label: PropTypes.string,
  ariaLabel: PropTypes.string,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default SortDropdown;
