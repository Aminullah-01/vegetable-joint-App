import { useState, useEffect, useContext } from 'react';
import { adminService } from '../../services/adminService';
import { categoryService } from '../../services/categoryService';
import { ToastContext } from '../../context/toastContextDef';
import {
  Button,
  Modal,
  ConfirmDialog,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
  AvailabilityBadge,
} from '../../components/common';
import { formatPrice, formatDate } from '../../utils/formatters';

/**
 * Return badge style based on product publication / moderation status
 */
function getProductStatusBadge(product) {
  if (product.deleted_at) {
    return {
      bg: '#fee2e2',
      color: '#991b1b',
      border: '#fecaca',
      label: 'Removed',
      icon: '🗑️',
    };
  }
  if (product.is_published === false || product.status === 'unpublished') {
    return {
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fde68a',
      label: 'Unpublished',
      icon: '⏸️',
    };
  }
  return {
    bg: '#dcfce7',
    color: '#166534',
    border: '#bbf7d0',
    label: 'Published',
    icon: '✓',
  };
}

/**
 * AdminProducts — Products Moderation Page (SRS ADM-04, Figma Section 14)
 *
 * Requirements:
 * - ADM-04: Admins shall be able to view all products and unpublish or remove products that violate marketplace rules.
 * - BR-10: Deleting a product is a soft delete; products referenced by orders are never physically removed.
 * - Figma Section 14: Searchable table (Product, Seller, Category, Price, Stock, Status, Actions: View, Unpublish, Remove).
 */
export function AdminProducts() {
  const toast = useContext(ToastContext);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal & Dialog states
  const [viewingProduct, setViewingProduct] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { product, action: 'unpublish'|'publish'|'remove' }
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);

  // Load active categories for filter dropdown once
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const catList = await categoryService.getCategories();
        if (isMounted && Array.isArray(catList)) {
          setCategories(catList);
        }
      } catch {
        // Non-blocking fallback
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch products on filter, search, page or refresh changes
  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          page: currentPage,
          per_page: itemsPerPage,
        };

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (categoryFilter !== 'all') {
          params.category = categoryFilter;
        }

        const response = await adminService.getProducts(params);

        if (!isMounted) return;

        const productList = Array.isArray(response)
          ? response
          : response?.data || [];
        setProducts(productList);
        setMeta(
          response?.meta || {
            total: productList.length,
            current_page: currentPage,
            last_page: Math.ceil(productList.length / itemsPerPage) || 1,
          }
        );
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.message ||
            'Unable to load products for moderation. Please try again.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, statusFilter, categoryFilter, currentPage, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  };

  const promptAction = (product, actionType) => {
    setConfirmAction({
      product,
      action: actionType, // 'unpublish' | 'publish' | 'remove'
    });
  };

  // Execute moderation action (Unpublish, Publish, Remove)
  const handleConfirmAction = async (moderationReason = '') => {
    if (!confirmAction) return;

    const { product: targetProduct, action } = confirmAction;
    setIsUpdatingStatus(true);
    setActionAlert(null);

    try {
      let updated;
      if (action === 'unpublish') {
        updated = await adminService.unpublishProduct(
          targetProduct.id,
          moderationReason
        );
      } else if (action === 'publish') {
        updated = await adminService.publishProduct(targetProduct.id);
      } else if (action === 'remove') {
        updated = await adminService.removeProduct(
          targetProduct.id,
          moderationReason
        );
      }

      // Update in local state
      setProducts((prev) =>
        prev.map((p) => (p.id === targetProduct.id ? { ...p, ...updated } : p))
      );

      // If viewing modal is open, update viewed item
      if (viewingProduct && viewingProduct.id === targetProduct.id) {
        setViewingProduct((prev) => ({ ...prev, ...updated }));
      }

      const actionLabels = {
        unpublish: 'unpublished from the marketplace',
        publish: 'published back to the marketplace',
        remove: 'removed and soft-deleted',
      };

      const successMsg = `Product "${targetProduct.name}" has been successfully ${
        actionLabels[action] || action
      }.`;

      if (toast?.success) {
        toast.success(successMsg);
      } else {
        setActionAlert({ type: 'success', message: successMsg });
      }

      setConfirmAction(null);
    } catch (err) {
      const errMsg =
        err?.message || `Failed to update product "${targetProduct.name}".`;
      if (toast?.error) {
        toast.error(errMsg);
      } else {
        setActionAlert({ type: 'error', message: errMsg });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all';

  return (
    <div
      data-testid="admin-products-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        data-testid="admin-products-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Product Moderation
            </h1>
            <span
              data-testid="products-total-badge"
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: '600',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid #e2e8f0',
              }}
            >
              {meta.total} {meta.total === 1 ? 'product' : 'products'}
            </span>
          </div>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Moderate marketplace vegetable listings, unpublish violating
            produce, and remove prohibited listings (ADM-04, BR-10).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="refresh-products-btn"
            aria-label="Refresh product moderation list"
          >
            <span
              style={{ display: 'inline-block', marginRight: '0.35rem' }}
              aria-hidden="true"
            >
              🔄
            </span>
            Refresh
          </Button>
        </div>
      </div>

      {/* Action Alert Banner */}
      {actionAlert && (
        <div
          role="alert"
          data-testid="products-action-alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            backgroundColor:
              actionAlert.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: actionAlert.type === 'error' ? '#991b1b' : '#166534',
            border: `1px solid ${
              actionAlert.type === 'error' ? '#fecaca' : '#bbf7d0'
            }`,
          }}
        >
          <span>{actionAlert.message}</span>
          <button
            type="button"
            onClick={() => setActionAlert(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 'bold',
            }}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div
        data-testid="products-filters-toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        {/* Search Input */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '1rem',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            placeholder="Search by product name, seller, or category..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="search-products-input"
            aria-label="Search products"
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Status Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="filter-status"
            style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}
          >
            Status:
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="filter-status-select"
            aria-label="Filter by publication status"
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Listings</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            <option value="removed">Removed / Deleted</option>
          </select>
        </div>

        {/* Category Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="filter-category"
            style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}
          >
            Category:
          </label>
          <select
            id="filter-category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="filter-category-select"
            aria-label="Filter by category"
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug || c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            data-testid="clear-filters-btn"
            style={{ color: '#64748b' }}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Main Table / State View */}
      {isLoading ? (
        <div data-testid="products-loading-state" style={{ padding: '1rem 0' }}>
          <TableSkeleton rows={6} columns={7} />
        </div>
      ) : error ? (
        <div data-testid="products-error-state" style={{ padding: '1rem 0' }}>
          <ErrorState
            title="Failed to Load Products"
            message={error}
            onRetry={handleRefresh}
            retryLabel="Retry"
          />
        </div>
      ) : products.length === 0 ? (
        <div data-testid="products-empty-state">
          <EmptyState
            title={
              hasActiveFilters ? 'No Matching Products' : 'No Products Found'
            }
            message={
              hasActiveFilters
                ? 'No vegetable listings match your search or filter criteria. Try adjusting or clearing your filters.'
                : 'There are currently no product listings on the marketplace.'
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear All Filters
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table
              data-testid="products-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem' }}>Product</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Seller</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Price</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Stock</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th
                    style={{
                      padding: '0.85rem 1rem',
                      textAlign: 'right',
                      minWidth: '220px',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const statusBadge = getProductStatusBadge(product);
                  const isDeleted = Boolean(product.deleted_at);
                  const isUnpublished =
                    product.is_published === false ||
                    product.status === 'unpublished';
                  const sellerName =
                    product.seller?.business_name ||
                    `Seller #${product.seller_id}`;
                  const categoryName = product.category?.name || 'Produce';

                  return (
                    <tr
                      key={product.id}
                      data-testid={`product-row-${product.id}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.1s ease',
                        opacity: isDeleted ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Product Thumbnail & Name */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                          }}
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#f1f5f9',
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                              }}
                              aria-hidden="true"
                            >
                              🥕
                            </div>
                          )}

                          <div>
                            <strong
                              data-testid={`product-name-${product.id}`}
                              style={{
                                display: 'block',
                                color: '#0f172a',
                                fontWeight: '600',
                              }}
                            >
                              {product.name}
                            </strong>
                            <span
                              style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                            >
                              ID: #{product.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Seller */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <span
                            data-testid={`product-seller-${product.id}`}
                            style={{
                              display: 'block',
                              color: '#1e293b',
                              fontWeight: '500',
                            }}
                          >
                            {sellerName}
                          </span>
                          <span
                            style={{ fontSize: '0.75rem', color: '#64748b' }}
                          >
                            {product.seller?.location || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`product-category-${product.id}`}
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.775rem',
                            fontWeight: '500',
                          }}
                        >
                          {categoryName}
                        </span>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`product-price-${product.id}`}
                          style={{ fontWeight: '600', color: '#0f172a' }}
                        >
                          {formatPrice(product.price, product.unit)}
                        </span>
                      </td>

                      {/* Stock & Availability */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>
                          <span
                            data-testid={`product-quantity-${product.id}`}
                            style={{
                              display: 'block',
                              fontWeight: '500',
                              color: '#1e293b',
                            }}
                          >
                            {product.quantity} {product.unit}
                            {product.quantity === 1 ? '' : 's'}
                          </span>
                          <AvailabilityBadge
                            quantity={product.quantity}
                            lowStockThreshold={product.low_stock_threshold || 5}
                            size="sm"
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`product-status-badge-${product.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                          }}
                        >
                          <span aria-hidden="true">{statusBadge.icon}</span>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'right',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: '0.4rem',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            flexWrap: 'wrap',
                          }}
                        >
                          {/* View Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`view-product-btn-${product.id}`}
                            onClick={() => setViewingProduct(product)}
                            aria-label={`View details for ${product.name}`}
                          >
                            View
                          </Button>

                          {/* Unpublish / Publish Action */}
                          {!isDeleted &&
                            (isUnpublished ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-testid={`publish-product-btn-${product.id}`}
                                onClick={() => promptAction(product, 'publish')}
                                style={{
                                  color: '#16a34a',
                                  borderColor: '#86efac',
                                  backgroundColor: '#f0fdf4',
                                }}
                                aria-label={`Publish ${product.name}`}
                              >
                                Publish
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-testid={`unpublish-product-btn-${product.id}`}
                                onClick={() =>
                                  promptAction(product, 'unpublish')
                                }
                                style={{
                                  color: '#b45309',
                                  borderColor: '#fde68a',
                                  backgroundColor: '#fffbeb',
                                }}
                                aria-label={`Unpublish ${product.name}`}
                              >
                                Unpublish
                              </Button>
                            ))}

                          {/* Remove Action */}
                          {!isDeleted && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`remove-product-btn-${product.id}`}
                              onClick={() => promptAction(product, 'remove')}
                              style={{
                                color: '#dc2626',
                                borderColor: '#fca5a5',
                                backgroundColor: '#fff5f5',
                              }}
                              aria-label={`Remove ${product.name}`}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.total > itemsPerPage && (
            <div
              data-testid="products-pagination"
              style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <Pagination
                totalItems={meta.total}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* View Product Details Modal (Figma Section 14) */}
      {viewingProduct && (
        <Modal
          isOpen={Boolean(viewingProduct)}
          onClose={() => setViewingProduct(null)}
          title="Product Listing & Moderation Details"
          description={`Full marketplace listing record for ${viewingProduct.name}`}
          size="md"
          testId="view-product-modal"
          footer={
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!viewingProduct.deleted_at &&
                  (viewingProduct.is_published === false ||
                  viewingProduct.status === 'unpublished' ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      data-testid="modal-publish-btn"
                      onClick={() => promptAction(viewingProduct, 'publish')}
                    >
                      Publish Listing
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="modal-unpublish-btn"
                      onClick={() => promptAction(viewingProduct, 'unpublish')}
                      style={{ color: '#b45309', borderColor: '#fde68a' }}
                    >
                      Unpublish Listing
                    </Button>
                  ))}

                {!viewingProduct.deleted_at && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    data-testid="modal-remove-btn"
                    onClick={() => promptAction(viewingProduct, 'remove')}
                  >
                    Remove Product
                  </Button>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingProduct(null)}
                data-testid="modal-close-btn"
              >
                Close
              </Button>
            </div>
          }
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Top Identity Block */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              {viewingProduct.image ? (
                <img
                  src={viewingProduct.image}
                  alt={viewingProduct.name}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    border: '1px solid #e2e8f0',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '10px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                  }}
                  aria-hidden="true"
                >
                  🥕
                </div>
              )}

              <div>
                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}
                  data-testid="modal-product-name"
                >
                  {viewingProduct.name}
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.35rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: getProductStatusBadge(viewingProduct).bg,
                      color: getProductStatusBadge(viewingProduct).color,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {getProductStatusBadge(viewingProduct).icon}{' '}
                    {getProductStatusBadge(viewingProduct).label}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Listing ID: #{viewingProduct.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Moderation Reason / Notice Box if applicable */}
            {viewingProduct.moderation_reason && (
              <div
                data-testid="modal-moderation-reason-block"
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  color: '#92400e',
                  fontSize: '0.875rem',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
                  Moderation Note:
                </strong>
                <p style={{ margin: 0 }}>{viewingProduct.moderation_reason}</p>
              </div>
            )}

            {/* Profile Detail Fields Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Selling Price
                </span>
                <p
                  data-testid="modal-product-price"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '700',
                    fontSize: '1.05rem',
                  }}
                >
                  {formatPrice(viewingProduct.price, viewingProduct.unit)}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Current Inventory
                </span>
                <p
                  data-testid="modal-product-stock"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingProduct.quantity} {viewingProduct.unit}
                  {viewingProduct.quantity === 1 ? '' : 's'}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Vendor / Seller
                </span>
                <p
                  data-testid="modal-product-seller"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingProduct.seller?.business_name ||
                    `Seller #${viewingProduct.seller_id}`}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Category
                </span>
                <p
                  data-testid="modal-product-category"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {viewingProduct.category?.name || 'Produce'}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Listed Date
                </span>
                <p
                  data-testid="modal-product-created"
                  style={{
                    margin: '0.2rem 0 0',
                    color: '#0f172a',
                    fontWeight: '500',
                  }}
                >
                  {formatDate(viewingProduct.created_at, {
                    format: 'dateTime',
                  }) || '—'}
                </p>
              </div>
            </div>

            {/* Description */}
            {viewingProduct.description && (
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  Listing Description
                </span>
                <p
                  data-testid="modal-product-description"
                  style={{
                    margin: '0.35rem 0 0',
                    color: '#334155',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                  }}
                >
                  {viewingProduct.description}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmation Dialogs for Moderation Actions (ADM-04) */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={Boolean(confirmAction)}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title={
            confirmAction.action === 'unpublish'
              ? 'Unpublish Product Listing'
              : confirmAction.action === 'publish'
                ? 'Re-publish Product Listing'
                : 'Remove Product Listing'
          }
          message={
            confirmAction.action === 'unpublish'
              ? `Are you sure you want to unpublish "${confirmAction.product.name}"? The listing will be immediately hidden from buyers on the marketplace (ADM-04).`
              : confirmAction.action === 'publish'
                ? `Are you sure you want to re-publish "${confirmAction.product.name}"? The listing will become visible and searchable by buyers.`
                : `Are you sure you want to remove "${confirmAction.product.name}"? This product will be soft-deleted and permanently removed from marketplace listings (ADM-04, BR-10).`
          }
          type={confirmAction.action === 'publish' ? 'primary' : 'danger'}
          confirmText={
            confirmAction.action === 'unpublish'
              ? 'Unpublish Listing'
              : confirmAction.action === 'publish'
                ? 'Publish Listing'
                : 'Remove Product'
          }
          cancelText="Cancel"
          requireReason={confirmAction.action === 'unpublish'}
          reasonLabel="Moderation Reason (Optional/Recommended)"
          reasonPlaceholder="e.g. Violating marketplace listing guidelines, inaccurate images or pricing"
          loading={isUpdatingStatus}
          testId="product-action-confirm-dialog"
        />
      )}
    </div>
  );
}

export default AdminProducts;
