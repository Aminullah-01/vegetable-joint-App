import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { productService, categoryService, sellerService } from '../../services';
import { STRINGS } from '../../constants';
import { ProductCard } from '../../components/products';
import {
  FilterPanel,
  SortDropdown,
  SearchBar,
  Pagination,
  ProductGridSkeleton,
  EmptyState,
  ErrorState,
  Button,
} from '../../components/common';
import { CartContext } from '../../context/cartContextDef.js';
import { ToastContext } from '../../context/toastContextDef.js';
import { mockCategories } from '../../data/mockCategories.js';
import {
  countActiveFilters,
  extractFiltersFromParams,
  resolveCategoryIcon,
} from '../../utils/filters.js';

const DEFAULT_PAGE_SIZE = 12; // MKT-03: default 12 per page

/**
 * Products — Marketplace Product Catalog Page
 *
 * SRS References:
 * - MKT-02: Product cards displaying image, name, price with unit, seller name, location, availability, View Product action.
 * - MKT-03: Paginated catalogue (default 12 per page) with lazy/windowed pagination.
 * - MKT-04: Public listings show only products that are published, not deleted, belong to an approved seller, and belong to an active category.
 * - SRCH-01 to SRCH-08: Case-insensitive search, filters (category, price min/max, availability, seller, location), sort options, active filter count, and clear all.
 * - Figma Section 5: Desktop 2-column layout (filter sidebar + product grid) and responsive mobile filter drawer.
 * - NFR-USAB-01 to NFR-USAB-04: Responsive viewports (360px–1280px+), WCAG AA color contrast, touch targets ≥ 44×44px.
 */
export function Products({
  pageSize = DEFAULT_PAGE_SIZE,
  className = '',
  style = {},
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Contexts (with safe fallbacks if rendered outside providers in isolation)
  const cartContext = useContext(CartContext);
  const toastContext = useContext(ToastContext);

  // Data state
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    per_page: pageSize,
    last_page: 1,
    from: 0,
    to: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Aux state for sidebar filters
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Parse parameters from current URL
  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const searchQuery = searchParams.get('search') || searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const activeFilters = useMemo(
    () => extractFiltersFromParams(searchParams),
    [searchParams]
  );
  const activeFilterCount = useMemo(
    () => countActiveFilters(activeFilters),
    [activeFilters]
  );

  // 1. Load categories and sellers for the filter sidebar on mount
  useEffect(() => {
    let isMounted = true;

    async function loadAuxData() {
      try {
        const [catsRes, sellersRes] = await Promise.allSettled([
          categoryService.getCategories(),
          sellerService.getPublicSellers(),
        ]);

        if (isMounted) {
          if (catsRes.status === 'fulfilled') {
            const catsList = Array.isArray(catsRes.value?.data)
              ? catsRes.value.data
              : Array.isArray(catsRes.value)
                ? catsRes.value
                : [];
            if (catsList.length > 0) {
              setCategories(catsList);
            }
          }
          if (sellersRes.status === 'fulfilled') {
            const sellersList = Array.isArray(sellersRes.value?.data)
              ? sellersRes.value.data
              : Array.isArray(sellersRes.value)
                ? sellersRes.value
                : [];
            if (sellersList.length > 0) {
              setSellers(sellersList);
            }
          }
        }
      } catch {
        // Aux data failure gracefully falls back to mock defaults inside FilterPanel
      }
    }

    loadAuxData();

    return () => {
      isMounted = false;
    };
  }, []);

  const [retryCount, setRetryCount] = useState(0);

  // Synchronize loading state during render when query params change
  const currentParamsKey = `${searchParams.toString()}-${pageSize}-${retryCount}`;
  const [prevParamsKey, setPrevParamsKey] = useState(currentParamsKey);
  if (currentParamsKey !== prevParamsKey) {
    setPrevParamsKey(currentParamsKey);
    setLoading(true);
  }

  // 2. Fetch products whenever search params change
  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      try {
        const queryParams = {
          page: currentPage,
          per_page: pageSize,
          q: searchQuery,
          search: searchQuery,
          category: activeFilters.category,
          min_price: activeFilters.min_price,
          max_price: activeFilters.max_price,
          availability: activeFilters.availability,
          seller: activeFilters.seller,
          location: activeFilters.location,
          sort: currentSort,
        };

        const response = await productService.getProducts(queryParams);
        if (!isMounted) return;

        const rawList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        // MKT-04: Defensive frontend filtering to ensure strictly public, non-deleted,
        // approved-seller, active-category products are rendered
        const publicList = rawList.filter((p) => {
          if (!p) return false;
          if (p.deleted_at) return false;
          if (p.is_published === false || p.status === 'draft') return false;
          if (
            p.seller &&
            p.seller.approval_status &&
            p.seller.approval_status !== 'approved'
          ) {
            return false;
          }
          if (
            p.category &&
            (p.category.is_active === false || p.category.status === 'inactive')
          ) {
            return false;
          }
          return true;
        });

        setProducts(publicList);
        setError(null);

        // Extract pagination metadata
        if (response?.meta) {
          setMeta({
            total: response.meta.total ?? publicList.length,
            current_page: response.meta.current_page ?? currentPage,
            per_page: response.meta.per_page ?? pageSize,
            last_page:
              response.meta.last_page ??
              Math.max(1, Math.ceil(publicList.length / pageSize)),
            from:
              response.meta.from ??
              (publicList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0),
            to:
              response.meta.to ??
              Math.min(
                currentPage * pageSize,
                response.meta.total ?? publicList.length
              ),
          });
        } else {
          const total = publicList.length;
          setMeta({
            total,
            current_page: currentPage,
            per_page: pageSize,
            last_page: Math.max(1, Math.ceil(total / pageSize)),
            from: total > 0 ? (currentPage - 1) * pageSize + 1 : 0,
            to: Math.min(currentPage * pageSize, total),
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || STRINGS.ERRORS.UNABLE_TO_LOAD_PRODUCTS);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    currentSort,
    activeFilters.category,
    activeFilters.min_price,
    activeFilters.max_price,
    activeFilters.availability,
    activeFilters.seller,
    activeFilters.location,
    retryCount,
  ]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  // Handle Search Submission (SRCH-01)
  const handleSearchSubmit = (keyword) => {
    const updated = new URLSearchParams(searchParams);
    if (keyword && keyword.trim()) {
      updated.set('search', keyword.trim());
    } else {
      updated.delete('search');
      updated.delete('q');
    }
    updated.set('page', '1');
    setSearchParams(updated);
  };

  // Handle Clear All Filters (SRCH-08)
  const handleClearAll = () => {
    const updated = new URLSearchParams();
    if (currentSort && currentSort !== 'newest') {
      updated.set('sort', currentSort);
    }
    setSearchParams(updated);
  };

  // Category resolution & quick browse (MKT-08, FE-049)
  const effectiveCategories = useMemo(
    () => (categories.length > 0 ? categories : mockCategories),
    [categories]
  );

  const selectedCat = useMemo(() => {
    const val = activeFilters.category;
    if (!val || val === 'all') return null;
    return effectiveCategories.find(
      (c) =>
        String(c.id) === String(val) ||
        String(c.slug) === String(val) ||
        c.name?.toLowerCase() === String(val).toLowerCase()
    );
  }, [activeFilters.category, effectiveCategories]);

  const handleCategorySelect = (catVal) => {
    const updated = new URLSearchParams(searchParams);
    const isCurrentlySelected =
      selectedCat &&
      (String(selectedCat.id) === String(catVal) ||
        String(selectedCat.slug) === String(catVal));

    if (!catVal || catVal === 'all' || isCurrentlySelected) {
      updated.delete('category');
    } else {
      updated.set('category', catVal);
    }
    updated.delete('page');
    setSearchParams(updated);
  };

  // Handle Add to Cart (CART-01, CART-02)
  const handleAddToCart = (product) => {
    if (cartContext?.addItem) {
      cartContext.addItem(product, 1);
    }
    if (toastContext?.success) {
      toastContext.success(`Added ${product.name} to cart!`);
    }
  };

  // Results summary text
  const resultsSummaryText = useMemo(() => {
    if (loading) return 'Loading vegetables...';
    if (meta.total === 0) return '0 vegetables found';
    if (meta.total === 1) return 'Showing 1 vegetable';
    const from = meta.from || (currentPage - 1) * pageSize + 1;
    const to = meta.to || Math.min(currentPage * pageSize, meta.total);
    return `Showing ${from}–${to} of ${meta.total} vegetables`;
  }, [loading, meta, currentPage, pageSize]);

  return (
    <div
      className={`products-page-container ${className}`.trim()}
      data-testid="products-page"
      style={style}
    >
      {/* 1. Header Banner & Keyword Search (SRS MKT-02, SRCH-01, Figma Section 5) */}
      <header
        className="products-header-banner"
        data-testid="products-header-banner"
      >
        <div>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 800,
              color: '#15803d',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.025em',
            }}
          >
            {STRINGS.PRODUCTS.CATALOG_TITLE}
          </h1>
          <p
            style={{
              color: '#475569',
              fontSize: '0.95rem',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {STRINGS.PRODUCTS.CATALOG_SUBTITLE}
          </p>
        </div>

        {/* Integrated Search Bar */}
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            flexShrink: 0,
          }}
        >
          <SearchBar
            initialValue={searchQuery}
            onSearch={handleSearchSubmit}
            navigateOnSubmit={false}
            placeholder={STRINGS.SEARCH.PLACEHOLDER}
            size="md"
          />
        </div>
      </header>

      {/* 2. Main Two-Column Layout (Figma Section 5: Filter Sidebar + Products Grid) */}
      <div className="products-page-layout">
        {/* Left Column: Filter Sidebar */}
        <aside className="products-sidebar" data-testid="products-sidebar">
          <FilterPanel
            categories={effectiveCategories}
            sellers={sellers}
            tieToUrl={true}
            collapsibleOnMobile={true}
            isOpen={isMobileFilterOpen}
            onToggleOpen={setIsMobileFilterOpen}
            showActiveChips={true}
            showPricePresets={true}
            onClearFilters={handleClearAll}
          />
        </aside>

        {/* Right Column: Marketplace Products Area */}
        <main
          className="products-main-content"
          aria-label="Marketplace Vegetables"
        >
          {/* Top Controls Toolbar: Mobile filter button, Results count & Sort Dropdown */}
          <div className="products-toolbar" data-testid="products-toolbar">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                className="filter-mobile-toggle-btn"
                onClick={() => setIsMobileFilterOpen(true)}
                aria-label={`Open filter panel${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  cursor: 'pointer',
                  minHeight: '40px',
                  boxSizing: 'border-box',
                }}
              >
                <span>⚙️ Filters</span>
                {activeFilterCount > 0 && (
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
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Results Count Summary */}
              <div
                data-testid="products-count-summary"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                {resultsSummaryText}
              </div>

              {/* Active Search/Filters Badge Indicator */}
              {(searchQuery || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  data-testid="products-clear-all-inline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Sort Dropdown Selector (SRCH-04, SRCH-05, FE-035) */}
            <div data-testid="products-sort-container">
              <SortDropdown
                value={currentSort}
                tieToUrl={true}
                size="md"
                includePopularity={true}
                includeRating={true}
              />
            </div>
          </div>

          {/* Quick Category Browsing Pills (MKT-08, FE-049) */}
          <div
            className="products-category-pills"
            data-testid="products-category-pills"
            role="navigation"
            aria-label="Vegetable varieties"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              marginBottom: '0.75rem',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            <button
              type="button"
              onClick={() => handleCategorySelect('all')}
              aria-label="All vegetable varieties"
              aria-pressed={!selectedCat}
              data-testid="category-pill-all"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.875rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                minHeight: '40px',
                cursor: 'pointer',
                border: !selectedCat
                  ? '1px solid #15803d'
                  : '1px solid #cbd5e1',
                backgroundColor: !selectedCat ? '#15803d' : '#ffffff',
                color: !selectedCat ? '#ffffff' : '#334155',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <span>🥗</span>
              <span>All</span>
            </button>
            {effectiveCategories.map((cat) => {
              const catVal = String(cat.slug || cat.id);
              const isSelected = selectedCat?.id === cat.id;
              return (
                <button
                  key={cat.id || cat.slug}
                  type="button"
                  onClick={() => handleCategorySelect(catVal)}
                  aria-label={`Show ${cat.name}`}
                  aria-pressed={isSelected}
                  data-testid={`category-pill-${cat.slug || cat.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.875rem',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    minHeight: '40px',
                    cursor: 'pointer',
                    border: isSelected
                      ? '1px solid #15803d'
                      : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#15803d' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{resolveCategoryIcon(cat)}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Products Grid Area with States (Loading, Error, Empty, or Populated) */}
          {loading ? (
            <ProductGridSkeleton count={pageSize} />
          ) : error ? (
            <ErrorState
              title="Unable to load vegetables"
              message={error}
              onRetry={handleRetry}
            />
          ) : products.length === 0 ? (
            /* Empty State (MKT-10, SRCH-07, SRCH-08) */
            <EmptyState
              type={
                searchQuery || activeFilterCount > 0 ? 'search' : 'products'
              }
              title={
                searchQuery || activeFilterCount > 0
                  ? 'No results found'
                  : 'No vegetables listed yet'
              }
              description={
                searchQuery || activeFilterCount > 0
                  ? 'No matching vegetables found. We could not find any produce matching your current search or filter criteria. Try adjusting your search terms or clearing selected filters.'
                  : 'There are currently no vegetables available in this category. Check back soon as local farmers harvest.'
              }
              action={
                searchQuery || activeFilterCount > 0 ? (
                  <Button
                    variant="outline"
                    onClick={handleClearAll}
                    data-testid="empty-clear-filters-btn"
                  >
                    Clear all filters
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              {/* Populated Paginated Grid of ProductCards (MKT-02, MKT-03, MKT-04) */}
              <div
                className="products-grid"
                data-testid="products-grid"
                role="region"
                aria-label="Vegetable Products"
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>

              {/* 4. Shared Pagination Controls (MKT-03, FE-029) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <Pagination
                  totalItems={meta.total}
                  currentPage={meta.current_page}
                  itemsPerPage={meta.per_page}
                  tieToUrl={true}
                  itemLabel="vegetables"
                  scrollToTop={true}
                  hideOnSinglePage={false}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

Products.propTypes = {
  pageSize: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Products;
