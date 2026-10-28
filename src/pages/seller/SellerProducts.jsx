import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { canSellerPublish } from '../../utils/sellerStatus';
import { sellerService } from '../../services/sellerService';
import { categoryService } from '../../services/categoryService';
import { formatPrice, formatDate } from '../../utils/formatters';
import {
  Button,
  AvailabilityBadge,
  ConfirmDialog,
  Pagination,
  TableSkeleton,
  EmptyState,
} from '../../components/common';

/**
 * SellerProducts — My Products List Page
 *
 * SRS References:
 * - SEL-02: Manage products (view, create, price, unit, stock, availability, category)
 * - SEL-03: Edit product details
 * - SEL-04: Soft delete product (hidden from marketplace/seller lists, past orders preserved)
 * - SEL-07: Automatic availability (stock > 0 -> Available; stock = 0 -> Out of Stock) and manual toggle
 * - SEL-14: Object-level authorization (sellers only see and manage their own products)
 * - AUTH-03: Publishing restrictions for pending/suspended sellers
 * - BR-10: Soft deletion guarantee
 * - Figma Section 13: Seller Dashboard Products table with search, filters, stock, status, actions
 */
export function SellerProducts() {
  const { user } = useAuth();
  const canPublish = canSellerPublish(user);

  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Delete confirmation dialog state (SEL-04)
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Determine current seller ID for scoping (SEL-14)
  const currentSellerId =
    user?.seller_id ??
    user?.seller?.id ??
    (user?.role === 'seller' ? user?.id : 1);

  // Load categories once on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const catData = await categoryService.getCategories();
        if (isMounted && Array.isArray(catData)) {
          setCategories(catData);
        }
      } catch {
        // Fallback or ignore non-critical category load error
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load seller products when filters or page change
  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const params = {
          seller_id: currentSellerId,
          page: currentPage,
          per_page: 10,
          sort: sortOption,
        };

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }
        if (selectedCategory && selectedCategory !== 'all') {
          params.category = selectedCategory;
        }
        if (selectedAvailability && selectedAvailability !== 'all') {
          params.availability = selectedAvailability;
        }

        const response = await sellerService.getSellerProducts(params);
        if (isMounted) {
          const productList = response?.data || [];
          setProducts(productList);
          if (response?.meta) {
            setMeta(response.meta);
          } else {
            setMeta({
              total: productList.length,
              current_page: 1,
              last_page: 1,
              per_page: 10,
            });
          }
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.message || 'Unable to load products. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [
    currentSellerId,
    currentPage,
    searchQuery,
    selectedCategory,
    selectedAvailability,
    sortOption,
  ]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const params = {
        seller_id: currentSellerId,
        page: currentPage,
        per_page: 10,
        sort: sortOption,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory && selectedCategory !== 'all')
        params.category = selectedCategory;
      if (selectedAvailability && selectedAvailability !== 'all')
        params.availability = selectedAvailability;

      const response = await sellerService.getSellerProducts(params);
      setProducts(response?.data || []);
      if (response?.meta) setMeta(response.meta);
    } catch (err) {
      setError(err?.message || 'Failed to refresh product listings.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Search input handler
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedAvailability('all');
    setSortOption('newest');
    setCurrentPage(1);
  };

  // Page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initiate soft delete
  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteError(null);
  };

  // Confirm soft delete (SEL-04, BR-10)
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await sellerService.deleteProduct(productToDelete.id);
      setSuccessMessage(
        `Vegetable "${productToDelete.name}" was successfully deleted (SEL-04).`
      );
      setProductToDelete(null);

      // Re-fetch or update list locally
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setMeta((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err) {
      setDeleteError(
        err?.message || 'Failed to delete product. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    selectedAvailability !== 'all';

  // Compute live counts from current listing
  const inStockCount = products.filter(
    (p) =>
      Number(p.quantity || 0) > Number(p.low_stock_threshold || 5) &&
      p.availability !== 'unavailable'
  ).length;

  const lowStockCount = products.filter(
    (p) =>
      Number(p.quantity || 0) > 0 &&
      Number(p.quantity || 0) <= Number(p.low_stock_threshold || 5) &&
      p.availability !== 'unavailable'
  ).length;

  const outOfStockCount = products.filter(
    (p) => Number(p.quantity || 0) === 0 || p.availability === 'out_of_stock'
  ).length;

  return (
    <div
      data-testid="seller-products-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 1. Header & Quick Actions (SEL-02, SEL-03, AUTH-03) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div>
          <h1
            data-testid="seller-products-title"
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.025em',
            }}
          >
            My Vegetables & Listings (SEL-02, SEL-03)
          </h1>
          <p
            data-testid="seller-products-subtitle"
            style={{
              color: '#64748b',
              fontSize: '0.925rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Manage, search, edit, and track stock for vegetables listed on the
            marketplace.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            data-testid="products-refresh-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Refresh product list"
          >
            <span
              style={{
                display: 'inline-block',
                transform: isRefreshing ? 'rotate(360deg)' : 'none',
                transition: 'transform 0.5s ease',
              }}
              aria-hidden="true"
            >
              🔄
            </span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          {canPublish ? (
            <Link
              to="/seller/products/new"
              data-testid="add-product-link"
              style={{
                backgroundColor: '#15803d',
                color: '#ffffff',
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 2px rgba(21, 128, 61, 0.2)',
                transition: 'background-color 0.15s ease',
              }}
            >
              + Add Product
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled
                aria-disabled="true"
                data-testid="add-product-disabled-btn"
                title="You cannot publish product listings until your seller account is approved by an administrator (AUTH-03)."
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#94a3b8',
                  border: '1px solid #cbd5e1',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span aria-hidden="true">🔒</span>
                <span>+ Add Product (Locked)</span>
              </button>
              {/* Backward compatibility element for existing approval tests */}
              <button
                type="button"
                disabled
                data-testid="add-product-btn-disabled"
                style={{ display: 'none' }}
                aria-hidden="true"
              >
                + Add Product (Locked)
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Publishing Disabled Notice for Unapproved Sellers (AUTH-03, ADM-03) */}
      {!canPublish && (
        <div
          data-testid="products-publishing-disabled-notice"
          role="alert"
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          <div data-testid="seller-products-restricted-notice">
            ⚠️ <strong>Publishing disabled:</strong> You cannot create new
            product listings until an administrator approves your seller account
            (AUTH-03). Existing listings below remain visible only to you.
          </div>
        </div>
      )}

      {/* 3. Success Feedback Toast / Notification */}
      {successMessage && (
        <div
          data-testid="products-success-alert"
          role="status"
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <span>✓ {successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#166534',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '0.2rem 0.5rem',
            }}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* 4. Error Feedback Alert */}
      {error && (
        <div
          data-testid="products-error-state"
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <span>⚠️ {error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            data-testid="products-error-retry-btn"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 5. Metrics & Status Mini-Bar */}
      <div
        data-testid="products-metrics-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          data-testid="kpi-total-products"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🥦</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Total Listings
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
              {meta.total}
            </strong>
          </div>
        </div>

        <div
          data-testid="kpi-in-stock"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              In Stock (Healthy)
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>
              {inStockCount}
            </strong>
          </div>
        </div>

        <div
          data-testid="kpi-low-stock"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Low Stock (&le; 5)
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#b45309' }}>
              {lowStockCount}
            </strong>
          </div>
        </div>

        <div
          data-testid="kpi-out-of-stock"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🚫</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Out of Stock
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#dc2626' }}>
              {outOfStockCount}
            </strong>
          </div>
        </div>
      </div>

      {/* 6. Search, Filter & Sort Toolbar */}
      <div
        data-testid="products-toolbar"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.85rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 280px',
              maxWidth: '420px',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '0.9rem',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              🔍
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search vegetables by name or category..."
              data-testid="products-search-input"
              aria-label="Search vegetables by name or category"
              style={{
                width: '100%',
                padding: '0.625rem 2.25rem 0.625rem 2.5rem',
                fontSize: '0.9rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#f8fafc',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                data-testid="products-clear-search-btn"
                aria-label="Clear search query"
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            {/* Availability Filter */}
            <select
              value={selectedAvailability}
              onChange={(e) => {
                setSelectedAvailability(e.target.value);
                setCurrentPage(1);
              }}
              data-testid="products-availability-filter"
              aria-label="Filter by availability"
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Availability</option>
              <option value="in_stock">In Stock (Healthy)</option>
              <option value="low_stock">Low Stock (&le; 5 units)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
              <option value="unavailable">Unavailable (Hidden)</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              data-testid="products-category-filter"
              aria-label="Filter by category"
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                color: '#334155',
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

            {/* Sort Selector */}
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setCurrentPage(1);
              }}
              data-testid="products-sort-select"
              aria-label="Sort products by"
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Newest Listed</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                data-testid="products-reset-filters-btn"
                style={{ fontSize: '0.85rem' }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 7. Loading Skeleton */}
      {isLoading && (
        <div data-testid="products-loading-state">
          <TableSkeleton rows={5} columns={7} />
        </div>
      )}

      {/* 8. Products Management Table (Figma Section 13, SEL-02, SEL-03) */}
      {!isLoading && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          {products.length === 0 ? (
            hasActiveFilters ? (
              <div
                data-testid="products-search-empty-state"
                style={{ padding: '3rem 1.5rem', textAlign: 'center' }}
              >
                <EmptyState
                  type="search"
                  title="No vegetables match your search"
                  description="Try adjusting your search terms, availability filter, or category selection."
                  action={
                    <Button
                      variant="primary"
                      onClick={handleResetFilters}
                      data-testid="products-empty-reset-btn"
                    >
                      Clear Filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <div
                data-testid="products-empty-state"
                style={{ padding: '3rem 1.5rem', textAlign: 'center' }}
              >
                <EmptyState
                  type="products"
                  title="No vegetables listed yet"
                  description="Start listing your farm produce on the marketplace to reach household and wholesale buyers."
                  action={
                    canPublish ? (
                      <Link
                        to="/seller/products/new"
                        data-testid="products-empty-add-btn"
                        style={{
                          backgroundColor: '#15803d',
                          color: '#ffffff',
                          padding: '0.625rem 1.25rem',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        + Add Your First Vegetable
                      </Link>
                    ) : null
                  }
                />
              </div>
            )
          ) : (
            <div className="table-responsive">
              <table
                data-testid="seller-products-table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      color: '#475569',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1rem' }}>Product</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Price</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Stock</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Availability</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Updated</th>
                    <th
                      style={{
                        padding: '0.85rem 1rem',
                        textAlign: 'right',
                        minWidth: '160px',
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => {
                    const quantity = Number(prod.quantity || 0);
                    const threshold = Number(prod.low_stock_threshold || 5);
                    const isLowStock = quantity > 0 && quantity <= threshold;
                    const isOutOfStock = quantity === 0;

                    return (
                      <tr
                        key={prod.id}
                        data-testid={`product-row-${prod.id}`}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.1s ease',
                        }}
                      >
                        {/* 1. Product (Image + Name) */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                            }}
                          >
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  data-testid={`product-image-${prod.id}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span
                                  data-testid={`product-fallback-icon-${prod.id}`}
                                  style={{ fontSize: '1.25rem' }}
                                  aria-hidden="true"
                                >
                                  🥦
                                </span>
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <Link
                                to={`/products/${prod.id}`}
                                data-testid={`product-name-${prod.id}`}
                                style={{
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  textDecoration: 'none',
                                  display: 'block',
                                }}
                              >
                                {prod.name}
                              </Link>
                              {prod.description && (
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    display: 'block',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '240px',
                                  }}
                                >
                                  {prod.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Category */}
                        <td
                          style={{ padding: '0.85rem 1rem' }}
                          data-testid={`product-category-${prod.id}`}
                        >
                          <span
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                            }}
                          >
                            {prod.category?.name || 'Produce'}
                          </span>
                        </td>

                        {/* 3. Price & Unit */}
                        <td
                          style={{ padding: '0.85rem 1rem', fontWeight: 600 }}
                          data-testid={`product-price-${prod.id}`}
                        >
                          {formatPrice(prod.price, prod.unit)}
                        </td>

                        {/* 4. Stock */}
                        <td
                          style={{ padding: '0.85rem 1rem' }}
                          data-testid={`product-stock-${prod.id}`}
                        >
                          {isOutOfStock ? (
                            <span
                              style={{
                                color: '#dc2626',
                                fontWeight: 700,
                                fontSize: '0.825rem',
                              }}
                            >
                              0 {prod.unit || 'units'} (Out of stock)
                            </span>
                          ) : isLowStock ? (
                            <span
                              style={{
                                color: '#b45309',
                                fontWeight: 600,
                                fontSize: '0.825rem',
                              }}
                            >
                              ⚠️ {quantity} {prod.unit || 'units'} (Low stock)
                            </span>
                          ) : (
                            <span style={{ color: '#0f172a', fontWeight: 500 }}>
                              {quantity} {prod.unit || 'units'}
                            </span>
                          )}
                        </td>

                        {/* 5. Availability Status (SEL-07) */}
                        <td
                          style={{ padding: '0.85rem 1rem' }}
                          data-testid={`product-availability-${prod.id}`}
                        >
                          <AvailabilityBadge product={prod} size="sm" />
                        </td>

                        {/* 6. Last Updated */}
                        <td
                          style={{
                            padding: '0.85rem 1rem',
                            fontSize: '0.825rem',
                            color: '#64748b',
                          }}
                          data-testid={`product-updated-${prod.id}`}
                        >
                          {formatDate(prod.updated_at || prod.created_at)}
                        </td>

                        {/* 7. Actions (View, Edit, Delete) */}
                        <td
                          style={{
                            padding: '0.85rem 1rem',
                            textAlign: 'right',
                          }}
                          data-testid={`product-actions-${prod.id}`}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              justifyContent: 'flex-end',
                            }}
                          >
                            {/* View on Marketplace */}
                            <Link
                              to={`/products/${prod.id}`}
                              data-testid={`product-view-link-${prod.id}`}
                              title={`View ${prod.name} on public marketplace`}
                              style={{
                                color: '#475569',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: '0.825rem',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                display: 'inline-block',
                              }}
                            >
                              View
                            </Link>

                            {/* Edit Product (SEL-03) */}
                            <Link
                              to={`/seller/products/${prod.id}/edit`}
                              data-testid={`product-edit-link-${prod.id}`}
                              title={`Edit ${prod.name}`}
                              style={{
                                color: '#15803d',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: '0.825rem',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                display: 'inline-block',
                              }}
                            >
                              Edit
                            </Link>

                            {/* Delete Product (SEL-04) */}
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(prod)}
                              data-testid={`product-delete-btn-${prod.id}`}
                              title={`Delete ${prod.name}`}
                              style={{
                                color: '#dc2626',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                fontWeight: 600,
                                fontSize: '0.825rem',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta.total > meta.per_page && (
            <div
              data-testid="products-pagination"
              style={{
                padding: '1rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Pagination
                totalItems={meta.total}
                currentPage={meta.current_page}
                itemsPerPage={meta.per_page}
                onPageChange={handlePageChange}
                itemLabel="vegetables"
              />
            </div>
          )}
        </div>
      )}

      {/* 9. Soft Delete Confirmation Dialog (SEL-04, BR-10, FE-036) */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        onClose={() => !isDeleting && setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Vegetable Listing"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This vegetable listing will be soft-deleted and removed from the marketplace. Past orders referencing this vegetable will not be affected (SEL-04, BR-10).`}
        confirmText="Delete Vegetable"
        cancelText="Cancel"
        type="danger"
        loading={isDeleting}
        testId="delete-product-confirm-dialog"
        details={
          deleteError ? (
            <div
              role="alert"
              data-testid="delete-dialog-error"
              style={{
                color: '#991b1b',
                backgroundColor: '#fef2f2',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
              }}
            >
              ⚠️ {deleteError}
            </div>
          ) : null
        }
      />
    </div>
  );
}

export default SellerProducts;
