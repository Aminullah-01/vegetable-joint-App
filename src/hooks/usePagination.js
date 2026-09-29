import { useState, useCallback, useMemo } from 'react';
import {
  DEFAULT_ITEMS_PER_PAGE,
  MAX_ITEMS_PER_PAGE,
  calculatePaginationMeta,
} from '../utils/pagination.js';

/**
 * Custom hook for calculating and managing pagination state (MKT-03, FE-029).
 *
 * @param {Object} [options={}]
 * @param {number} [options.totalItems=0] - Total count of items.
 * @param {number} [options.initialPage=1] - Starting page number.
 * @param {number} [options.page] - Controlled page number.
 * @param {number} [options.itemsPerPage=DEFAULT_ITEMS_PER_PAGE] - Items per page (default 12).
 * @param {Function} [options.onPageChange] - Callback invoked when page changes.
 * @returns {Object} Pagination metadata and navigation handlers.
 */
export function usePagination({
  totalItems = 0,
  initialPage = 1,
  page: controlledPage,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  onPageChange,
} = {}) {
  const [internalPage, setInternalPage] = useState(initialPage);
  const [internalPerPage, setInternalPerPage] = useState(itemsPerPage);

  const isControlled = controlledPage !== undefined && controlledPage !== null;
  const rawPage = isControlled ? Number(controlledPage) : internalPage;

  const currentPerPage = Math.min(
    Math.max(1, Number(internalPerPage) || DEFAULT_ITEMS_PER_PAGE),
    MAX_ITEMS_PER_PAGE
  );

  const meta = useMemo(
    () => calculatePaginationMeta(totalItems, rawPage, currentPerPage),
    [totalItems, rawPage, currentPerPage]
  );

  const setPage = useCallback(
    (targetPage) => {
      const safePage = Math.min(
        Math.max(1, Number(targetPage) || 1),
        meta.totalPages
      );

      if (!isControlled) {
        setInternalPage(safePage);
      }

      onPageChange?.(safePage);
    },
    [meta.totalPages, isControlled, onPageChange]
  );

  const setPerPage = useCallback(
    (targetPerPage) => {
      const safePerPage = Math.min(
        Math.max(1, Number(targetPerPage) || DEFAULT_ITEMS_PER_PAGE),
        MAX_ITEMS_PER_PAGE
      );
      setInternalPerPage(safePerPage);
      if (!isControlled) {
        setInternalPage(1);
      }
      onPageChange?.(1);
    },
    [isControlled, onPageChange]
  );

  const nextPage = useCallback(() => {
    if (meta.hasNextPage) {
      setPage(meta.currentPage + 1);
    }
  }, [meta.hasNextPage, meta.currentPage, setPage]);

  const prevPage = useCallback(() => {
    if (meta.hasPrevPage) {
      setPage(meta.currentPage - 1);
    }
  }, [meta.hasPrevPage, meta.currentPage, setPage]);

  return {
    ...meta,
    page: meta.currentPage,
    setPage,
    setPerPage,
    nextPage,
    prevPage,
  };
}

export default usePagination;
