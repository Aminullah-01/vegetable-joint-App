import { useState, useEffect, useId } from 'react';
import PropTypes from 'prop-types';
import { useInRouterContext, useSearchParams } from 'react-router-dom';
import { STRINGS } from '../../constants';
import { mockCategories } from '../../data/mockCategories';
import { mockSellers } from '../../data/mockSellers';
import {
  DEFAULT_LOCATIONS,
  AVAILABILITY_OPTIONS,
  PRICE_PRESETS,
  extractFiltersFromParams,
  countActiveFilters,
} from '../../utils/filters';

/**
 * FilterFormContent — Renders the individual filter controls:
 * 1. Category (SRCH-02, MKT-08)
 * 2. Price Range (Min/Max in ₦) (SRCH-02)
 * 3. Availability (In Stock / Low Stock / Out of Stock) (SRCH-02)
 * 4. Seller (SRCH-03)
 * 5. Location (SRCH-03)
 */
function FilterFormContent({
  filters,
  onFilterChange,
  onClearFilters,
  categories = mockCategories,
  sellers = mockSellers,
  locations = DEFAULT_LOCATIONS,
  showActiveChips = true,
  showPricePresets = true,
  isMobileDrawer = false,
  onCloseMobile,
}) {
  const baseId = useId();
  const categoryId = `${baseId}-category`;
  const minPriceId = `${baseId}-min-price`;
  const maxPriceId = `${baseId}-max-price`;
  const availabilityId = `${baseId}-availability`;
  const sellerId = `${baseId}-seller`;
  const locationId = `${baseId}-location`;

  const activeCount = countActiveFilters(filters);

  // Price inputs local state to avoid firing on every keystroke before user finishes
  const [priceState, setPriceState] = useState({
    min: filters.min_price || '',
    max: filters.max_price || '',
    prevMin: filters.min_price || '',
    prevMax: filters.max_price || '',
  });

  // Adjust state during render when props change (official React pattern)
  if (
    (filters.min_price || '') !== priceState.prevMin ||
    (filters.max_price || '') !== priceState.prevMax
  ) {
    setPriceState({
      min: filters.min_price || '',
      max: filters.max_price || '',
      prevMin: filters.min_price || '',
      prevMax: filters.max_price || '',
    });
  }

  const minPriceInput = priceState.min;
  const maxPriceInput = priceState.max;

  const setMinPriceInput = (val) => {
    setPriceState((prev) => ({ ...prev, min: val }));
  };

  const setMaxPriceInput = (val) => {
    setPriceState((prev) => ({ ...prev, max: val }));
  };

  const handlePriceApply = (e) => {
    e?.preventDefault();
    onFilterChange({
      ...filters,
      min_price: minPriceInput.trim(),
      max_price: maxPriceInput.trim(),
    });
  };

  const handlePricePreset = (min, max) => {
    setMinPriceInput(min);
    setMaxPriceInput(max);
    onFilterChange({
      ...filters,
      min_price: min,
      max_price: max,
    });
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      category: val === 'all' ? '' : val,
    });
  };

  const handleAvailabilityChange = (e) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      availability: val === 'all' ? '' : val,
    });
  };

  const handleSellerChange = (e) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      seller: val === 'all' ? '' : val,
    });
  };

  const handleLocationChange = (e) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      location: val === 'all' ? '' : val,
    });
  };

  const getCategoryName = (val) => {
    if (!val) return '';
    const found = categories.find(
      (c) => String(c.slug || c.id) === String(val) || c.name === val
    );
    return found ? found.name : val;
  };

  const getSellerName = (val) => {
    if (!val) return '';
    const found = sellers.find(
      (s) => String(s.id) === String(val) || s.business_name === val
    );
    return found ? found.business_name : val;
  };

  const getAvailabilityLabel = (val) => {
    const found = AVAILABILITY_OPTIONS.find((a) => a.value === val);
    return found ? found.label : val;
  };

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '1.25rem',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const inputStyle = {
    width: '100%',
    minHeight: '44px',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: '0.9375rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* 1. Header with Active Filter Count & Clear All (SRCH-08) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}
          >
            {STRINGS.FILTERS.TITLE}
          </span>
          {activeCount > 0 && (
            <span
              className="filter-active-count"
              style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
              }}
            >
              {activeCount}
            </span>
          )}
        </div>

        <button
          type="button"
          className="filter-clear-all-btn"
          onClick={onClearFilters}
          disabled={activeCount === 0}
          aria-label={STRINGS.FILTERS.CLEAR_ALL}
          style={{
            background: 'none',
            border: 'none',
            color: activeCount > 0 ? '#15803d' : '#94a3b8',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: activeCount > 0 ? 'pointer' : 'not-allowed',
            padding: '0.5rem',
            minHeight: '44px',
            minWidth: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: activeCount > 0 ? 'underline' : 'none',
            textUnderlineOffset: '2px',
          }}
        >
          {STRINGS.FILTERS.CLEAR_ALL}
        </button>
      </div>

      {/* Active Filter Chips (SRCH-06, Figma prompt) */}
      {showActiveChips && activeCount > 0 && (
        <div
          className="filter-active-chips"
          aria-label={STRINGS.FILTERS.ACTIVE_FILTERS}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.375rem',
            paddingBottom: '0.5rem',
          }}
        >
          {filters.category && (
            <span
              className="filter-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Category: {getCategoryName(filters.category)}
              <button
                type="button"
                aria-label={`Remove category filter: ${getCategoryName(filters.category)}`}
                onClick={() => onFilterChange({ ...filters, category: '' })}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.875rem',
                  lineHeight: 1,
                  color: '#15803d',
                }}
              >
                ✕
              </button>
            </span>
          )}

          {(filters.min_price || filters.max_price) && (
            <span
              className="filter-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Price: ₦{filters.min_price || '0'} – ₦{filters.max_price || '∞'}
              <button
                type="button"
                aria-label="Remove price filter"
                onClick={() => {
                  setMinPriceInput('');
                  setMaxPriceInput('');
                  onFilterChange({ ...filters, min_price: '', max_price: '' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.875rem',
                  lineHeight: 1,
                  color: '#15803d',
                }}
              >
                ✕
              </button>
            </span>
          )}

          {filters.availability && filters.availability !== 'all' && (
            <span
              className="filter-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {getAvailabilityLabel(filters.availability)}
              <button
                type="button"
                aria-label="Remove availability filter"
                onClick={() => onFilterChange({ ...filters, availability: '' })}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.875rem',
                  lineHeight: 1,
                  color: '#15803d',
                }}
              >
                ✕
              </button>
            </span>
          )}

          {filters.seller && (
            <span
              className="filter-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Seller: {getSellerName(filters.seller)}
              <button
                type="button"
                aria-label="Remove seller filter"
                onClick={() => onFilterChange({ ...filters, seller: '' })}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.875rem',
                  lineHeight: 1,
                  color: '#15803d',
                }}
              >
                ✕
              </button>
            </span>
          )}

          {filters.location && (
            <span
              className="filter-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Location: {filters.location}
              <button
                type="button"
                aria-label="Remove location filter"
                onClick={() => onFilterChange({ ...filters, location: '' })}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.875rem',
                  lineHeight: 1,
                  color: '#15803d',
                }}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* 2. Category Filter (SRCH-02, MKT-08) */}
      <div className="filter-section filter-category" style={sectionStyle}>
        <label htmlFor={categoryId} style={labelStyle}>
          <span>{STRINGS.FILTERS.CATEGORY_LABEL}</span>
        </label>
        <select
          id={categoryId}
          value={filters.category || 'all'}
          onChange={handleCategoryChange}
          style={inputStyle}
          aria-label={STRINGS.FILTERS.CATEGORY_LABEL}
        >
          <option value="all">{STRINGS.FILTERS.ALL_CATEGORIES}</option>
          {categories.map((cat) => {
            const val = cat.slug || cat.id || cat;
            const name = cat.name || cat;
            return (
              <option key={val} value={val}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      {/* 3. Price Range Filter (SRCH-02) */}
      <div className="filter-section filter-price" style={sectionStyle}>
        <span style={labelStyle}>{STRINGS.FILTERS.PRICE_RANGE_LABEL}</span>

        {/* Quick Price Presets */}
        {showPricePresets && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.375rem',
              marginBottom: '0.25rem',
            }}
          >
            {PRICE_PRESETS.map((preset) => {
              const isSelected =
                filters.min_price === preset.min &&
                filters.max_price === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePricePreset(preset.min, preset.max)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    border: isSelected
                      ? '1px solid #15803d'
                      : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? '#15803d' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    minHeight: '36px',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        <form
          onSubmit={handlePriceApply}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <div style={{ flex: 1 }}>
            <label
              htmlFor={minPriceId}
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                display: 'block',
                marginBottom: '0.125rem',
              }}
            >
              {STRINGS.FILTERS.MIN_PRICE_LABEL}
            </label>
            <input
              type="number"
              id={minPriceId}
              placeholder={STRINGS.FILTERS.MIN_PRICE_PLACEHOLDER}
              min="0"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              style={inputStyle}
              aria-label={STRINGS.FILTERS.MIN_PRICE_LABEL}
            />
          </div>

          <span style={{ color: '#94a3b8', marginTop: '1.25rem' }}>–</span>

          <div style={{ flex: 1 }}>
            <label
              htmlFor={maxPriceId}
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                display: 'block',
                marginBottom: '0.125rem',
              }}
            >
              {STRINGS.FILTERS.MAX_PRICE_LABEL}
            </label>
            <input
              type="number"
              id={maxPriceId}
              placeholder={STRINGS.FILTERS.MAX_PRICE_PLACEHOLDER}
              min="0"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              style={inputStyle}
              aria-label={STRINGS.FILTERS.MAX_PRICE_LABEL}
            />
          </div>

          <button
            type="submit"
            aria-label="Apply price filter"
            style={{
              marginTop: '1.25rem',
              minHeight: '44px',
              minWidth: '44px',
              padding: '0 0.75rem',
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Go
          </button>
        </form>
      </div>

      {/* 4. Availability Filter (SRCH-02, SEL-07) */}
      <div className="filter-section filter-availability" style={sectionStyle}>
        <label htmlFor={availabilityId} style={labelStyle}>
          <span>{STRINGS.FILTERS.AVAILABILITY_LABEL}</span>
        </label>
        <select
          id={availabilityId}
          value={filters.availability || 'all'}
          onChange={handleAvailabilityChange}
          style={inputStyle}
          aria-label={STRINGS.FILTERS.AVAILABILITY_LABEL}
        >
          {AVAILABILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Seller Filter (SRCH-03) */}
      <div className="filter-section filter-seller" style={sectionStyle}>
        <label htmlFor={sellerId} style={labelStyle}>
          <span>{STRINGS.FILTERS.SELLER_LABEL}</span>
        </label>
        <select
          id={sellerId}
          value={filters.seller || 'all'}
          onChange={handleSellerChange}
          style={inputStyle}
          aria-label={STRINGS.FILTERS.SELLER_LABEL}
        >
          <option value="all">{STRINGS.FILTERS.ALL_SELLERS}</option>
          {sellers.map((s) => {
            const val = s.id || s.business_name || s;
            const name = s.business_name || s;
            return (
              <option key={val} value={val}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      {/* 6. Location Filter (SRCH-03) */}
      <div
        className="filter-section filter-location"
        style={{ ...sectionStyle, borderBottom: 'none' }}
      >
        <label htmlFor={locationId} style={labelStyle}>
          <span>{STRINGS.FILTERS.LOCATION_LABEL}</span>
        </label>
        <select
          id={locationId}
          value={filters.location || 'all'}
          onChange={handleLocationChange}
          style={inputStyle}
          aria-label={STRINGS.FILTERS.LOCATION_LABEL}
        >
          <option value="all">{STRINGS.FILTERS.ALL_LOCATIONS}</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile Drawer Footer Actions */}
      {isMobileDrawer && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={onClearFilters}
            disabled={activeCount === 0}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '0.625rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: activeCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            {STRINGS.FILTERS.CLEAR_ALL}
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '0.625rem',
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {STRINGS.FILTERS.APPLY}
          </button>
        </div>
      )}
    </div>
  );
}

FilterFormContent.propTypes = {
  filters: PropTypes.shape({
    category: PropTypes.string,
    min_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    max_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    availability: PropTypes.string,
    seller: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    location: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  categories: PropTypes.array,
  sellers: PropTypes.array,
  locations: PropTypes.arrayOf(PropTypes.string),
  showActiveChips: PropTypes.bool,
  showPricePresets: PropTypes.bool,
  isMobileDrawer: PropTypes.bool,
  onCloseMobile: PropTypes.func,
};

/**
 * Router-aware wrapper syncing filters with URL query string (SRCH-06).
 */
function UrlFilterPanelInner({
  onFilterChange: propOnFilterChange,
  onClearFilters: propOnClearFilters,
  categories,
  sellers,
  locations,
  showActiveChips,
  showPricePresets,
  collapsibleOnMobile,
  isOpen: propIsOpen,
  onToggleOpen,
  className,
  style,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = extractFiltersFromParams(searchParams);

  const [mobileOpen, setMobileOpen] = useState(false);
  const isDrawerOpen = propIsOpen !== undefined ? propIsOpen : mobileOpen;

  const handleToggle = (openState) => {
    const nextState =
      typeof openState === 'boolean' ? openState : !isDrawerOpen;
    setMobileOpen(nextState);
    onToggleOpen?.(nextState);
  };

  const handleFilterChange = (nextFilters) => {
    const nextParams = new URLSearchParams(searchParams);

    const keys = [
      'category',
      'min_price',
      'max_price',
      'availability',
      'seller',
      'location',
    ];
    keys.forEach((key) => {
      const val = nextFilters[key];
      if (
        val !== undefined &&
        val !== null &&
        String(val).trim() !== '' &&
        val !== 'all'
      ) {
        nextParams.set(key, String(val).trim());
      } else {
        nextParams.delete(key);
      }
    });

    // Reset pagination to page 1 on filter changes
    nextParams.delete('page');

    setSearchParams(nextParams);
    propOnFilterChange?.(extractFiltersFromParams(nextParams));
  };

  const handleClearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    [
      'category',
      'min_price',
      'max_price',
      'availability',
      'seller',
      'location',
      'page',
    ].forEach((k) => nextParams.delete(k));

    setSearchParams(nextParams);
    propOnClearFilters?.();
    propOnFilterChange?.({});
  };

  return (
    <FilterPanelView
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      categories={categories}
      sellers={sellers}
      locations={locations}
      showActiveChips={showActiveChips}
      showPricePresets={showPricePresets}
      collapsibleOnMobile={collapsibleOnMobile}
      isOpen={isDrawerOpen}
      onToggleOpen={handleToggle}
      className={className}
      style={style}
    />
  );
}

UrlFilterPanelInner.propTypes = {
  onFilterChange: PropTypes.func,
  onClearFilters: PropTypes.func,
  categories: PropTypes.array,
  sellers: PropTypes.array,
  locations: PropTypes.arrayOf(PropTypes.string),
  showActiveChips: PropTypes.bool,
  showPricePresets: PropTypes.bool,
  collapsibleOnMobile: PropTypes.bool,
  isOpen: PropTypes.bool,
  onToggleOpen: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Standalone wrapper for controlled/uncontrolled usage without URL sync.
 */
function StandaloneFilterPanel({
  filters: propFilters,
  onFilterChange: propOnFilterChange,
  onClearFilters: propOnClearFilters,
  categories,
  sellers,
  locations,
  showActiveChips,
  showPricePresets,
  collapsibleOnMobile,
  isOpen: propIsOpen,
  onToggleOpen,
  className,
  style,
}) {
  const [internalFilters, setInternalFilters] = useState({
    category: '',
    min_price: '',
    max_price: '',
    availability: '',
    seller: '',
    location: '',
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const isDrawerOpen = propIsOpen !== undefined ? propIsOpen : mobileOpen;

  const filters = propFilters
    ? extractFiltersFromParams(propFilters)
    : internalFilters;

  const handleToggle = (openState) => {
    const nextState =
      typeof openState === 'boolean' ? openState : !isDrawerOpen;
    setMobileOpen(nextState);
    onToggleOpen?.(nextState);
  };

  const handleFilterChange = (nextFilters) => {
    if (!propFilters) {
      setInternalFilters(nextFilters);
    }
    propOnFilterChange?.(nextFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      category: '',
      min_price: '',
      max_price: '',
      availability: '',
      seller: '',
      location: '',
    };
    if (!propFilters) {
      setInternalFilters(emptyFilters);
    }
    propOnClearFilters?.();
    propOnFilterChange?.(emptyFilters);
  };

  return (
    <FilterPanelView
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      categories={categories}
      sellers={sellers}
      locations={locations}
      showActiveChips={showActiveChips}
      showPricePresets={showPricePresets}
      collapsibleOnMobile={collapsibleOnMobile}
      isOpen={isDrawerOpen}
      onToggleOpen={handleToggle}
      className={className}
      style={style}
    />
  );
}

StandaloneFilterPanel.propTypes = UrlFilterPanelInner.propTypes;

/**
 * Presentational wrapper rendering sidebar on desktop and collapsible drawer on mobile.
 */
function FilterPanelView({
  filters,
  onFilterChange,
  onClearFilters,
  categories,
  sellers,
  locations,
  showActiveChips,
  showPricePresets,
  collapsibleOnMobile = true,
  isOpen = false,
  onToggleOpen,
  className = '',
  style = {},
}) {
  const activeCount = countActiveFilters(filters);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onToggleOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggleOpen]);

  return (
    <div className={`filter-panel-wrapper ${className}`.trim()} style={style}>
      {/* Mobile Toggle Button (Collapsible on Mobile — FE-034) */}
      {collapsibleOnMobile && (
        <div
          className="filter-mobile-toggle-container"
          style={{
            marginBottom: '1rem',
          }}
        >
          <button
            type="button"
            className="filter-mobile-toggle-btn"
            onClick={() => onToggleOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="filter-mobile-drawer"
            aria-label={`${STRINGS.FILTERS.OPEN_MOBILE_FILTERS} (${activeCount} active)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              minHeight: '44px',
              padding: '0.625rem 1rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: '#1e293b',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span>⚙️ {STRINGS.FILTERS.OPEN_MOBILE_FILTERS}</span>
            {activeCount > 0 && (
              <span
                style={{
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                }}
              >
                {activeCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Desktop Permanent Sidebar Panel (SRCH-02, SRCH-03) */}
      <aside
        className="filter-panel-desktop"
        aria-label="Product Filters"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <FilterFormContent
          filters={filters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          categories={categories}
          sellers={sellers}
          locations={locations}
          showActiveChips={showActiveChips}
          showPricePresets={showPricePresets}
        />
      </aside>

      {/* Mobile Drawer & Backdrop (Collapsible on Mobile — FE-034) */}
      {collapsibleOnMobile && isOpen && (
        <div
          className="filter-mobile-modal"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            className="filter-backdrop"
            onClick={() => onToggleOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Drawer content */}
          <div
            id="filter-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Product Filters"
            className="filter-drawer"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1051,
              boxSizing: 'border-box',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                {STRINGS.FILTERS.TITLE}
              </h2>
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                aria-label={STRINGS.FILTERS.CLOSE_MOBILE_FILTERS}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  color: '#64748b',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem',
              }}
            >
              <FilterFormContent
                filters={filters}
                onFilterChange={onFilterChange}
                onClearFilters={onClearFilters}
                categories={categories}
                sellers={sellers}
                locations={locations}
                showActiveChips={showActiveChips}
                showPricePresets={showPricePresets}
                isMobileDrawer
                onCloseMobile={() => onToggleOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

FilterPanelView.propTypes = {
  filters: PropTypes.object.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  categories: PropTypes.array,
  sellers: PropTypes.array,
  locations: PropTypes.arrayOf(PropTypes.string),
  showActiveChips: PropTypes.bool,
  showPricePresets: PropTypes.bool,
  collapsibleOnMobile: PropTypes.bool,
  isOpen: PropTypes.bool,
  onToggleOpen: PropTypes.func.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * FilterPanel — Marketplace Product Filter Sidebar & Mobile Drawer
 *
 * SRS References:
 * - SRCH-02: Category, Price Range (min/max), Availability
 * - SRCH-03: Seller, Location
 * - SRCH-06: Combinable filters reflected in page URL
 * - SRCH-08: Clear all filters in one action
 * - MKT-08: List categories in filter panel
 * - FE-034: Category, price range, availability, seller, location; collapsible on mobile.
 */
export function FilterPanel(props) {
  const inRouter = useInRouterContext();
  const shouldTieToUrl = props.tieToUrl !== false && inRouter;

  if (shouldTieToUrl) {
    return <UrlFilterPanelInner {...props} />;
  }

  return <StandaloneFilterPanel {...props} />;
}

FilterPanel.propTypes = {
  filters: PropTypes.object,
  onFilterChange: PropTypes.func,
  onClearFilters: PropTypes.func,
  categories: PropTypes.array,
  sellers: PropTypes.array,
  locations: PropTypes.arrayOf(PropTypes.string),
  tieToUrl: PropTypes.bool,
  collapsibleOnMobile: PropTypes.bool,
  isOpen: PropTypes.bool,
  onToggleOpen: PropTypes.func,
  showActiveChips: PropTypes.bool,
  showPricePresets: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default FilterPanel;
