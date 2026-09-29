/**
 * Pagination constants and helper functions (MKT-03, IF-04, FE-029)
 *
 * SRS References:
 * - MKT-03: Product listings shall be paginated (default 12 per page) or lazy-loaded.
 * - IF-04: List endpoints support pagination (page, per_page, capped at 50) and return total counts.
 */

export const DEFAULT_ITEMS_PER_PAGE = 12;
export const MAX_ITEMS_PER_PAGE = 50;
export const DEFAULT_PER_PAGE_OPTIONS = [12, 24, 36, 48];

/**
 * Calculates page numbers to display with smart ellipsis for long ranges.
 *
 * @param {number} currentPage - Current active page (1-indexed).
 * @param {number} totalPages - Total number of pages.
 * @param {number} [siblingCount=1] - Number of siblings on each side of active page.
 * @returns {Array<number|string>} Array of page numbers and '...' strings.
 */
export function getPaginationRange(currentPage, totalPages, siblingCount = 1) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const safeCurrent = Math.min(
    Math.max(1, Number(currentPage) || 1),
    safeTotal
  );

  // Total slots: 1 (first) + 1 (last) + 1 (current) + 2*siblings + 2*dots
  const totalSlots = siblingCount * 2 + 5;

  // Case 1: Total pages less than available slots -> show all pages
  if (safeTotal <= totalSlots) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(safeCurrent - siblingCount, 1);
  const rightSiblingIndex = Math.min(safeCurrent + siblingCount, safeTotal);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < safeTotal - 2;

  const firstPageIndex = 1;
  const lastPageIndex = safeTotal;

  // Case 2: Only right dots
  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', lastPageIndex];
  }

  // Case 3: Only left dots
  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => safeTotal - rightItemCount + i + 1
    );
    return [firstPageIndex, '...', ...rightRange];
  }

  // Case 4: Both left and right dots
  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
  }

  return Array.from({ length: safeTotal }, (_, i) => i + 1);
}

/**
 * Calculates pagination metadata from total items, current page, and page size.
 *
 * @param {number} totalItems - Total count of items.
 * @param {number} [page=1] - Current page number.
 * @param {number} [perPage=DEFAULT_ITEMS_PER_PAGE] - Items per page.
 * @returns {{ currentPage: number, perPage: number, totalItems: number, totalPages: number, from: number, to: number, hasNextPage: boolean, hasPrevPage: boolean }}
 */
export function calculatePaginationMeta(
  totalItems = 0,
  page = 1,
  perPage = DEFAULT_ITEMS_PER_PAGE
) {
  const safeTotal = Math.max(0, Number(totalItems) || 0);
  const safePerPage = Math.min(
    Math.max(1, Number(perPage) || DEFAULT_ITEMS_PER_PAGE),
    MAX_ITEMS_PER_PAGE
  );
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePerPage));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);

  const from = safeTotal === 0 ? 0 : (currentPage - 1) * safePerPage + 1;
  const to = Math.min(currentPage * safePerPage, safeTotal);

  return {
    currentPage,
    perPage: safePerPage,
    totalItems: safeTotal,
    totalPages,
    from,
    to,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
