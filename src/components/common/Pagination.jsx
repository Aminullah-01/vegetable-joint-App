import { useState } from 'react';
import PropTypes from 'prop-types';
import { useInRouterContext, useSearchParams } from 'react-router-dom';
import {
  DEFAULT_ITEMS_PER_PAGE,
  DEFAULT_PER_PAGE_OPTIONS,
  getPaginationRange,
} from '../../utils/pagination.js';

/**
 * Pure Presentational View for Pagination Controls.
 */
function PaginationView({
  totalItems = 0,
  currentPage,
  page,
  itemsPerPage,
  perPage,
  onPageChange,
  showSummary = true,
  itemLabel = 'items',
  showControls = true,
  showItemsPerPage = false,
  perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
  onPerPageChange,
  siblingCount = 1,
  disabled = false,
  hideOnSinglePage = false,
  className = '',
  style = {},
}) {
  const safeTotal = Math.max(0, Number(totalItems) || 0);
  const effectivePerPage = Math.max(
    1,
    Number(itemsPerPage ?? perPage ?? DEFAULT_ITEMS_PER_PAGE) ||
      DEFAULT_ITEMS_PER_PAGE
  );
  const totalPages = Math.max(1, Math.ceil(safeTotal / effectivePerPage));
  const activePage = Math.min(
    Math.max(1, Number(currentPage ?? page ?? 1) || 1),
    totalPages
  );

  if (hideOnSinglePage && totalPages <= 1) {
    return null;
  }

  const from = safeTotal === 0 ? 0 : (activePage - 1) * effectivePerPage + 1;
  const to = Math.min(activePage * effectivePerPage, safeTotal);
  const pageRange = getPaginationRange(activePage, totalPages, siblingCount);

  const handlePageClick = (targetPage) => {
    if (disabled || targetPage === activePage) return;
    onPageChange?.(targetPage);
  };

  const handlePerPageSelect = (e) => {
    const val = Number(e.target.value);
    onPerPageChange?.(val);
  };

  const baseButtonStyles = {
    minWidth: '40px',
    minHeight: '40px',
    padding: '0.375rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    userSelect: 'none',
    boxSizing: 'border-box',
  };

  return (
    <nav
      className={`pagination ${className}`.trim()}
      aria-label="Pagination Navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.75rem 0',
        ...style,
      }}
    >
      {/* 1. Results Summary Text */}
      {showSummary && (
        <div
          className="pagination-summary"
          role="status"
          style={{
            fontSize: '0.875rem',
            color: '#64748b',
          }}
        >
          {safeTotal === 0 ? (
            <>Showing 0 of 0 {itemLabel}</>
          ) : (
            <>
              Showing{' '}
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{from}</span>–
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{to}</span> of{' '}
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {safeTotal}
              </span>{' '}
              {itemLabel}
            </>
          )}
        </div>
      )}

      {/* 2. Controls Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginLeft: showSummary ? 'auto' : undefined,
        }}
      >
        {/* Optional Items Per Page Selector */}
        {showItemsPerPage && (
          <div
            className="pagination-per-page"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.875rem',
              color: '#64748b',
            }}
          >
            <label htmlFor="pagination-per-page-select">Per page:</label>
            <select
              id="pagination-per-page-select"
              value={effectivePerPage}
              onChange={handlePerPageSelect}
              disabled={disabled}
              style={{
                padding: '0.375rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Buttons List */}
        <ul
          className="pagination-list"
          style={{
            display: 'flex',
            alignItems: 'center',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            gap: '0.375rem',
          }}
        >
          {/* Previous Page Button */}
          {showControls && (
            <li>
              <button
                type="button"
                className="pagination-btn pagination-prev"
                onClick={() => handlePageClick(activePage - 1)}
                disabled={disabled || activePage <= 1}
                aria-label="Go to previous page"
                style={{
                  ...baseButtonStyles,
                  opacity: disabled || activePage <= 1 ? 0.5 : 1,
                  cursor:
                    disabled || activePage <= 1 ? 'not-allowed' : 'pointer',
                  backgroundColor:
                    disabled || activePage <= 1 ? '#f8fafc' : '#ffffff',
                }}
              >
                ← Previous
              </button>
            </li>
          )}

          {/* Numbered Page Buttons & Ellipsis */}
          {pageRange.map((pageItem, index) => {
            if (pageItem === '...') {
              return (
                <li key={`ellipsis-${index}`}>
                  <span
                    className="pagination-ellipsis"
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '32px',
                      minHeight: '40px',
                      color: '#94a3b8',
                      fontWeight: 600,
                    }}
                  >
                    …
                  </span>
                </li>
              );
            }

            const isPageActive = pageItem === activePage;

            return (
              <li key={pageItem}>
                <button
                  type="button"
                  className={`pagination-btn pagination-page ${
                    isPageActive ? 'active' : ''
                  }`.trim()}
                  onClick={() => handlePageClick(pageItem)}
                  disabled={disabled}
                  aria-current={isPageActive ? 'page' : undefined}
                  aria-label={
                    isPageActive
                      ? `Page ${pageItem}, current page`
                      : `Go to page ${pageItem}`
                  }
                  style={{
                    ...baseButtonStyles,
                    backgroundColor: isPageActive ? '#15803d' : '#ffffff',
                    color: isPageActive ? '#ffffff' : '#334155',
                    borderColor: isPageActive ? '#15803d' : '#e2e8f0',
                    fontWeight: isPageActive ? 700 : 500,
                  }}
                >
                  {pageItem}
                </button>
              </li>
            );
          })}

          {/* Next Page Button */}
          {showControls && (
            <li>
              <button
                type="button"
                className="pagination-btn pagination-next"
                onClick={() => handlePageClick(activePage + 1)}
                disabled={disabled || activePage >= totalPages}
                aria-label="Go to next page"
                style={{
                  ...baseButtonStyles,
                  opacity: disabled || activePage >= totalPages ? 0.5 : 1,
                  cursor:
                    disabled || activePage >= totalPages
                      ? 'not-allowed'
                      : 'pointer',
                  backgroundColor:
                    disabled || activePage >= totalPages
                      ? '#f8fafc'
                      : '#ffffff',
                }}
              >
                Next →
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

PaginationView.propTypes = {
  totalItems: PropTypes.number,
  currentPage: PropTypes.number,
  page: PropTypes.number,
  itemsPerPage: PropTypes.number,
  perPage: PropTypes.number,
  onPageChange: PropTypes.func,
  showSummary: PropTypes.bool,
  itemLabel: PropTypes.string,
  showControls: PropTypes.bool,
  showItemsPerPage: PropTypes.bool,
  perPageOptions: PropTypes.arrayOf(PropTypes.number),
  onPerPageChange: PropTypes.func,
  siblingCount: PropTypes.number,
  disabled: PropTypes.bool,
  hideOnSinglePage: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

/**
 * Router-aware wrapper that synchronizes page and perPage with URL search parameters.
 */
function UrlPaginationInner({
  pageParam = 'page',
  perPageParam = 'per_page',
  currentPage: propCurrentPage,
  page: propPage,
  itemsPerPage: propItemsPerPage,
  perPage: propPerPage,
  onPageChange,
  onPerPageChange,
  scrollToTop = false,
  ...rest
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read page from URL or fallback to prop
  const urlPageStr = searchParams.get(pageParam);
  const parsedUrlPage = urlPageStr ? parseInt(urlPageStr, 10) : NaN;
  const activePage =
    propCurrentPage ??
    propPage ??
    (!isNaN(parsedUrlPage) && parsedUrlPage >= 1 ? parsedUrlPage : 1);

  // Read per_page from URL or fallback to prop
  const urlPerPageStr = searchParams.get(perPageParam);
  const parsedUrlPerPage = urlPerPageStr ? parseInt(urlPerPageStr, 10) : NaN;
  const effectivePerPage =
    propItemsPerPage ??
    propPerPage ??
    (!isNaN(parsedUrlPerPage) && parsedUrlPerPage >= 1
      ? parsedUrlPerPage
      : DEFAULT_ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(pageParam, String(newPage));
    setSearchParams(nextParams);

    onPageChange?.(newPage);

    if (
      scrollToTop &&
      typeof window !== 'undefined' &&
      typeof window.scrollTo === 'function'
    ) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePerPageChange = (newPerPage) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(perPageParam, String(newPerPage));
    nextParams.set(pageParam, '1');
    setSearchParams(nextParams);

    onPerPageChange?.(newPerPage);
    onPageChange?.(1);
  };

  return (
    <PaginationView
      {...rest}
      currentPage={activePage}
      itemsPerPage={effectivePerPage}
      onPageChange={handlePageChange}
      onPerPageChange={handlePerPageChange}
    />
  );
}

UrlPaginationInner.propTypes = {
  ...PaginationView.propTypes,
  pageParam: PropTypes.string,
  perPageParam: PropTypes.string,
  scrollToTop: PropTypes.bool,
};

/**
 * Standalone wrapper for controlled/uncontrolled usage outside Router.
 */
function StandalonePagination({
  currentPage: propCurrentPage,
  page: propPage,
  itemsPerPage: propItemsPerPage,
  perPage: propPerPage,
  onPageChange,
  onPerPageChange,
  ...rest
}) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalPerPage, setInternalPerPage] = useState(
    DEFAULT_ITEMS_PER_PAGE
  );

  const isControlledPage =
    propCurrentPage !== undefined || propPage !== undefined;
  const activePage = isControlledPage
    ? (propCurrentPage ?? propPage)
    : internalPage;

  const isControlledPerPage =
    propItemsPerPage !== undefined || propPerPage !== undefined;
  const effectivePerPage = isControlledPerPage
    ? (propItemsPerPage ?? propPerPage)
    : internalPerPage;

  const handlePageChange = (newPage) => {
    if (!isControlledPage) {
      setInternalPage(newPage);
    }
    onPageChange?.(newPage);
  };

  const handlePerPageChange = (newPerPage) => {
    if (!isControlledPerPage) {
      setInternalPerPage(newPerPage);
      setInternalPage(1);
    }
    onPerPageChange?.(newPerPage);
    onPageChange?.(1);
  };

  return (
    <PaginationView
      {...rest}
      currentPage={activePage}
      itemsPerPage={effectivePerPage}
      onPageChange={handlePageChange}
      onPerPageChange={handlePerPageChange}
    />
  );
}

StandalonePagination.propTypes = PaginationView.propTypes;

/**
 * Pagination — Shared Marketplace Pagination Component
 * SRS References: MKT-03 (12 per page default), IF-04 (meta & per_page limits), FE-029 (tied to URL)
 *
 * Acceptance Criteria (FE-029):
 * - Page controls tied to URL (default).
 * - Default 12 items per page.
 * - Previous/Next and smart windowed numeric buttons.
 * - Screen reader accessible with informative aria-labels and touch targets >= 44x44px.
 */
export function Pagination(props) {
  const inRouter = useInRouterContext();
  const shouldTieToUrl = props.tieToUrl !== false && inRouter;

  if (shouldTieToUrl) {
    return <UrlPaginationInner {...props} />;
  }

  return <StandalonePagination {...props} />;
}

Pagination.propTypes = {
  totalItems: PropTypes.number.isRequired,
  currentPage: PropTypes.number,
  page: PropTypes.number,
  itemsPerPage: PropTypes.number,
  perPage: PropTypes.number,
  onPageChange: PropTypes.func,
  tieToUrl: PropTypes.bool,
  pageParam: PropTypes.string,
  perPageParam: PropTypes.string,
  showSummary: PropTypes.bool,
  itemLabel: PropTypes.string,
  showControls: PropTypes.bool,
  showItemsPerPage: PropTypes.bool,
  perPageOptions: PropTypes.arrayOf(PropTypes.number),
  onPerPageChange: PropTypes.func,
  siblingCount: PropTypes.number,
  scrollToTop: PropTypes.bool,
  disabled: PropTypes.bool,
  hideOnSinglePage: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Pagination;
