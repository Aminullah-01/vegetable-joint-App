import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { ToastContext } from '../../context/toastContextDef';
import { canSellerPublish } from '../../utils/sellerStatus';
import { sellerService } from '../../services/sellerService';
import { categoryService } from '../../services/categoryService';
import { formatPrice, formatDate, formatStock } from '../../utils/formatters';
import {
  Button,
  AvailabilityBadge,
  Toggle,
  Pagination,
  TableSkeleton,
  EmptyState,
  LowStockIndicator,
} from '../../components/common';

/**
 * SellerInventory — Seller Inventory Management Page
 *
 * SRS References:
 * - SEL-08: The Inventory view shall list the seller’s products with current stock, unit, price,
 *           availability and last-updated time, and allow quick stock updates.
 * - SEL-09: The Inventory view shall flag low stock (default threshold 5 units, configurable per product).
 * - SEL-07: Automatic availability derivation (stock > 0 -> Available; stock = 0 -> Out of Stock) and manual toggle.
 * - SEL-14: Object-level authorization (sellers only see and update their own produce).
 * - AUTH-03, ADM-03: Publishing and inventory update restrictions for pending/suspended sellers.
 * - TC-21: Seller updates stock to 0 -> Product shows "Out of Stock"; Add to Cart disabled.
 * - Figma Section 13: Seller Dashboard Inventory view with quick stock editing and low-stock highlights.
 */
export function SellerInventory() {
  const { user } = useAuth();
  const toast = useContext(ToastContext);
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

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState('all');
  const [sortOption, setSortOption] = useState('stock_asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Inline stock editing states (SEL-08)
  const [editingStockId, setEditingStockId] = useState(null);
  const [stockInputValue, setStockInputValue] = useState('');
  const [stockInputError, setStockInputError] = useState(null);
  const [isSavingStock, setIsSavingStock] = useState(false);

  // In-flight availability toggle tracking (SEL-07)
  const [togglingAvailId, setTogglingAvailId] = useState(null);

  // Resolved seller ID (SEL-14)
  const currentSellerId =
    user?.seller_id ??
    user?.seller?.id ??
    (user?.role === 'seller' ? user?.id : 1);

  // Load categories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const catData = await categoryService.getCategories();
        if (isMounted && Array.isArray(catData)) {
          setCategories(catData);
        }
      } catch {
        if (isMounted) setCategories([]);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch inventory listings
  useEffect(() => {
    let isMounted = true;

    async function fetchInventory() {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
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
        if (selectedStockFilter && selectedStockFilter !== 'all') {
          params.availability = selectedStockFilter;
        }

        const response = await sellerService.getSellerProducts(params);
        if (isMounted) {
          setProducts(response?.data || []);
          if (response?.meta) {
            setMeta(response.meta);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.message ||
              'Unable to load your inventory. Please check your network connection.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchInventory();

    return () => {
      isMounted = false;
    };
  }, [
    currentSellerId,
    currentPage,
    searchQuery,
    selectedCategory,
    selectedStockFilter,
    sortOption,
  ]);

  // Refresh handler
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const params = {
        page: currentPage,
        per_page: 10,
        sort: sortOption,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory && selectedCategory !== 'all')
        params.category = selectedCategory;
      if (selectedStockFilter && selectedStockFilter !== 'all')
        params.availability = selectedStockFilter;

      const response = await sellerService.getSellerProducts(params);
      setProducts(response?.data || []);
      if (response?.meta) setMeta(response.meta);
      toast?.success?.('Inventory refreshed successfully.');
    } catch (err) {
      setError(err?.message || 'Failed to refresh inventory.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStockFilter('all');
    setSortOption('stock_asc');
    setCurrentPage(1);
  };

  // Quick inline stock edit initiation (SEL-08)
  const handleStartStockEdit = (product) => {
    if (!canPublish) {
      toast?.error?.(
        'Stock updates are disabled until your seller account is approved (AUTH-03, ADM-03).'
      );
      return;
    }
    setEditingStockId(product.id);
    setStockInputValue(String(product.quantity ?? '0'));
    setStockInputError(null);
  };

  // Cancel inline stock edit
  const handleCancelStockEdit = () => {
    setEditingStockId(null);
    setStockInputValue('');
    setStockInputError(null);
  };

  // Save inline stock update (SEL-08, TC-21)
  const handleSaveStock = async (product) => {
    const rawVal = String(stockInputValue).trim();
    if (rawVal === '') {
      setStockInputError('Stock quantity is required.');
      return;
    }

    const newQty = Number(rawVal);
    if (isNaN(newQty) || newQty < 0 || !Number.isInteger(newQty)) {
      setStockInputError('Stock must be a whole number ≥ 0 (A-10).');
      return;
    }

    setIsSavingStock(true);
    setStockInputError(null);

    const prevQty = product.quantity;
    const prevAvail = product.availability;

    // Optimistically update product in local state
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === product.id) {
          const threshold = Number(p.low_stock_threshold || 5);
          const nextAvail =
            p.availability === 'unavailable'
              ? 'unavailable'
              : newQty <= 0
                ? 'out_of_stock'
                : newQty <= threshold
                  ? 'low_stock'
                  : 'in_stock';
          return {
            ...p,
            quantity: newQty,
            availability: nextAvail,
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    try {
      await sellerService.updateProductStock(product.id, {
        quantity: newQty,
      });

      let feedbackMsg;
      if (newQty === 0) {
        feedbackMsg = `Stock for "${product.name}" updated to 0. Product is now automatically Out of Stock (SEL-08, SEL-07, TC-21).`;
      } else {
        feedbackMsg = `Stock for "${product.name}" updated to ${newQty} ${product.unit || 'units'} successfully (SEL-08).`;
      }

      setSuccessMessage(feedbackMsg);
      toast?.success?.(feedbackMsg);
      setEditingStockId(null);
    } catch (err) {
      // Rollback on failure
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, quantity: prevQty, availability: prevAvail }
            : p
        )
      );
      const errMsg =
        err?.message || 'Failed to update stock quantity. Please try again.';
      setStockInputError(errMsg);
      toast?.error?.(errMsg);
    } finally {
      setIsSavingStock(false);
    }
  };

  // Quick availability toggle (SEL-07)
  const handleToggleAvailability = async (product, newChecked) => {
    if (!canPublish) {
      toast?.error?.(
        'Availability cannot be toggled until your seller account is approved (AUTH-03, ADM-03).'
      );
      return;
    }

    const prevAvail = product.availability;
    const targetAvail = newChecked ? 'available' : 'unavailable';

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === product.id) {
          const qty = Number(p.quantity || 0);
          const threshold = Number(p.low_stock_threshold || 5);
          const next =
            targetAvail === 'unavailable'
              ? 'unavailable'
              : qty <= 0
                ? 'out_of_stock'
                : qty <= threshold
                  ? 'low_stock'
                  : 'in_stock';
          return {
            ...p,
            availability: next,
            is_available: next !== 'unavailable' && qty > 0,
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    setTogglingAvailId(product.id);

    try {
      await sellerService.updateProductStock(product.id, {
        availability: targetAvail,
      });

      const qty = Number(product.quantity || 0);
      let msg;
      if (targetAvail === 'unavailable') {
        msg = `Vegetable "${product.name}" marked Unavailable (hidden from buyers) (SEL-07).`;
      } else if (qty === 0) {
        msg = `Vegetable "${product.name}" turned ON, but is automatically Out of Stock (0 units) (SEL-07, BR-01).`;
      } else {
        msg = `Vegetable "${product.name}" is now Available for purchase (SEL-07).`;
      }

      setSuccessMessage(msg);
      toast?.success?.(msg);
    } catch (err) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, availability: prevAvail } : p
        )
      );
      const errorMsg =
        err?.message || 'Failed to update availability. Please try again.';
      toast?.error?.(errorMsg);
    } finally {
      setTogglingAvailId(null);
    }
  };

  // Live KPI metrics computation (SEL-08, SEL-09)
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

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    selectedStockFilter !== 'all';

  return (
    <div
      data-testid="seller-inventory-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 1. Header Section */}
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
            data-testid="inventory-title"
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.025em',
            }}
          >
            Inventory Management (SEL-08, SEL-09)
          </h1>
          <p
            data-testid="inventory-subtitle"
            style={{
              color: '#64748b',
              fontSize: '0.925rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Real-time stock tracking, low-stock warnings, and quick inline stock
            updates.
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
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            data-testid="inventory-refresh-btn"
            title="Refresh inventory listings"
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                transform: isRefreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.5s ease',
              }}
            >
              🔄
            </span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Link
            to="/seller/products/new"
            data-testid="inventory-add-product-link"
            style={{
              backgroundColor: canPublish ? '#15803d' : '#94a3b8',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              pointerEvents: canPublish ? 'auto' : 'none',
              opacity: canPublish ? 1 : 0.7,
            }}
          >
            + Add Produce
          </Link>
        </div>
      </div>

      {/* 2. Access Notice for Pending/Unapproved Sellers (AUTH-03, ADM-03) */}
      {!canPublish && (
        <div
          data-testid="inventory-restricted-notice"
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
          ⚠️ <strong>Restricted Access:</strong> Stock updates are disabled
          until your seller account is approved by an administrator (AUTH-03,
          ADM-03).
        </div>
      )}

      {/* 3. Success Notification Banner */}
      {successMessage && (
        <div
          role="status"
          data-testid="inventory-success-alert"
          style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#065f46',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. KPI Summary Cards (SEL-08, SEL-09) */}
      <div
        data-testid="inventory-kpi-bar"
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
          <span style={{ fontSize: '1.5rem' }}>📋</span>
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
              Low Stock (≤ 5 units)
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
              Out of Stock (0 units)
            </div>
            <strong style={{ fontSize: '1.25rem', color: '#dc2626' }}>
              {outOfStockCount}
            </strong>
          </div>
        </div>
      </div>

      {/* 5. Filter & Search Controls Bar */}
      <div
        data-testid="inventory-filter-bar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by vegetable name or category..."
            aria-label="Search inventory by vegetable name or category"
            data-testid="inventory-search-input"
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="inventory-category-filter"
            aria-label="Filter inventory by category"
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
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug || cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Stock / Availability Filter */}
          <select
            value={selectedStockFilter}
            onChange={(e) => {
              setSelectedStockFilter(e.target.value);
              setCurrentPage(1);
            }}
            data-testid="inventory-stock-filter"
            aria-label="Filter inventory by stock status"
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
            <option value="all">All Stock Levels</option>
            <option value="in_stock">In Stock (Healthy)</option>
            <option value="low_stock">Low Stock (≤ 5 units)</option>
            <option value="out_of_stock">Out of Stock (0 units)</option>
            <option value="unavailable">Unavailable (Hidden)</option>
          </select>

          {/* Sort Selector */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            data-testid="inventory-sort-select"
            aria-label="Sort inventory listings"
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
            <option value="stock_asc">Stock: Low to High</option>
            <option value="stock_desc">Stock: High to Low</option>
            <option value="newest">Recently Listed</option>
            <option value="name_asc">Vegetable Name A-Z</option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              data-testid="inventory-reset-filters-btn"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* 6. Inventory Data Table */}
      {isLoading ? (
        <div
          data-testid="inventory-loading-skeleton"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <TableSkeleton rows={6} cols={6} />
        </div>
      ) : error ? (
        <div
          data-testid="inventory-error-state"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #fecaca',
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', color: '#991b1b', margin: 0 }}>
            Unable to Load Inventory
          </h2>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: '0.5rem 0 1.5rem 0',
            }}
          >
            {error}
          </p>
          <Button
            variant="primary"
            onClick={handleRefresh}
            data-testid="inventory-retry-btn"
          >
            Retry Connection
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '3rem 1.5rem',
            textAlign: 'center',
          }}
        >
          {hasActiveFilters ? (
            <div data-testid="inventory-search-empty">
              <EmptyState
                type="search"
                title="No produce match your filter criteria"
                description="Try adjusting your search query, category selection, or stock level filter."
                action={
                  <Button
                    variant="primary"
                    onClick={handleResetFilters}
                    data-testid="inventory-search-empty-reset"
                  >
                    Clear All Filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div data-testid="inventory-empty-state">
              <EmptyState
                type="products"
                title="Your inventory is empty"
                description="Start listing fresh vegetables from your farm to manage stock and sell to buyers."
                action={
                  canPublish ? (
                    <Link
                      to="/seller/products/new"
                      data-testid="inventory-empty-add-btn"
                      style={{
                        backgroundColor: '#15803d',
                        color: '#ffffff',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        display: 'inline-block',
                      }}
                    >
                      + Add Your First Vegetable
                    </Link>
                  ) : null
                }
              />
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div className="table-responsive">
            <table
              data-testid="inventory-table"
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
                    fontSize: '0.785rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem' }}>Produce / Name</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Unit Price</th>
                  <th style={{ padding: '0.85rem 1rem' }}>
                    Current Stock (SEL-08)
                  </th>
                  <th style={{ padding: '0.85rem 1rem' }}>Unit</th>
                  <th style={{ padding: '0.85rem 1rem' }}>
                    Availability (SEL-07)
                  </th>
                  <th style={{ padding: '0.85rem 1rem' }}>Last Updated</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const qty = Number(prod.quantity || 0);
                  const threshold = Number(prod.low_stock_threshold || 5);
                  const isLowStock =
                    qty > 0 &&
                    qty <= threshold &&
                    prod.availability !== 'unavailable';
                  const isOutOfStock =
                    qty === 0 || prod.availability === 'out_of_stock';
                  const isEditingThis = editingStockId === prod.id;

                  return (
                    <tr
                      key={prod.id}
                      data-testid={`inventory-row-${prod.id}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isOutOfStock
                          ? '#fffdfd'
                          : isLowStock
                            ? '#fffefc'
                            : '#ffffff',
                      }}
                    >
                      {/* 1. Vegetable Produce Info */}
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
                              fontSize: '1.25rem',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              '🥦'
                            )}
                          </div>
                          <div>
                            <strong
                              data-testid={`inventory-product-name-${prod.id}`}
                              style={{
                                color: '#1e293b',
                                display: 'block',
                                fontSize: '0.9rem',
                              }}
                            >
                              {prod.name}
                            </strong>
                            <span
                              style={{
                                color: '#64748b',
                                fontSize: '0.75rem',
                                textTransform: 'capitalize',
                              }}
                            >
                              {prod.category?.name || 'Produce'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Unit Price */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                        data-testid={`inventory-price-${prod.id}`}
                      >
                        {formatPrice(prod.price)}
                      </td>

                      {/* 3. Current Stock & Quick Inline Editor (SEL-08, SEL-09) */}
                      <td
                        style={{ padding: '0.85rem 1rem' }}
                        data-testid={`inventory-stock-cell-${prod.id}`}
                      >
                        {isEditingThis ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const currentVal =
                                    Number(stockInputValue) || 0;
                                  setStockInputValue(
                                    String(Math.max(0, currentVal - 1))
                                  );
                                }}
                                data-testid={`inline-stock-decrement-${prod.id}`}
                                title="Decrease stock"
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  background: '#f8fafc',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                }}
                              >
                                -
                              </button>

                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={stockInputValue}
                                onChange={(e) =>
                                  setStockInputValue(e.target.value)
                                }
                                data-testid={`inline-stock-input-${prod.id}`}
                                aria-label={`Update stock quantity for ${prod.name}`}
                                style={{
                                  width: '75px',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  textAlign: 'center',
                                }}
                                autoFocus
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const currentVal =
                                    Number(stockInputValue) || 0;
                                  setStockInputValue(String(currentVal + 1));
                                }}
                                data-testid={`inline-stock-increment-${prod.id}`}
                                title="Increase stock"
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  background: '#f8fafc',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                }}
                              >
                                +
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSaveStock(prod)}
                                disabled={isSavingStock}
                                data-testid={`save-stock-btn-${prod.id}`}
                                title="Save stock quantity"
                                style={{
                                  backgroundColor: '#15803d',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.65rem',
                                  cursor: isSavingStock
                                    ? 'not-allowed'
                                    : 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                }}
                              >
                                {isSavingStock ? '...' : '✓ Save'}
                              </button>

                              <button
                                type="button"
                                onClick={handleCancelStockEdit}
                                disabled={isSavingStock}
                                data-testid={`cancel-stock-btn-${prod.id}`}
                                title="Cancel stock edit"
                                style={{
                                  backgroundColor: '#f1f5f9',
                                  color: '#64748b',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.55rem',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                }}
                              >
                                ✕
                              </button>
                            </div>

                            {stockInputError && (
                              <span
                                data-testid={`inline-stock-error-${prod.id}`}
                                role="alert"
                                style={{
                                  color: '#dc2626',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                }}
                              >
                                ⚠️ {stockInputError}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <span
                              data-testid={`inventory-stock-amount-${prod.id}`}
                              style={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                color: isOutOfStock
                                  ? '#dc2626'
                                  : isLowStock
                                    ? '#b45309'
                                    : '#1e293b',
                              }}
                            >
                              {formatStock(prod.quantity, '')}
                            </span>

                            {/* Low Stock Flag (SEL-09) */}
                            {isLowStock && (
                              <LowStockIndicator
                                quantity={prod.quantity}
                                threshold={threshold}
                                unit={prod.unit}
                                availability={prod.availability}
                                testId={`inventory-low-stock-warning-${prod.id}`}
                              />
                            )}

                            {/* Out of Stock Flag (SEL-07, BR-01) */}
                            {isOutOfStock && (
                              <LowStockIndicator
                                quantity={prod.quantity}
                                threshold={threshold}
                                unit={prod.unit}
                                availability={prod.availability}
                                testId={`inventory-out-of-stock-warning-${prod.id}`}
                              />
                            )}

                            {/* Inline Edit Trigger (SEL-08) */}
                            <button
                              type="button"
                              onClick={() => handleStartStockEdit(prod)}
                              disabled={!canPublish}
                              data-testid={`edit-stock-btn-${prod.id}`}
                              title={
                                !canPublish
                                  ? 'Stock updates locked until seller account is approved'
                                  : `Quick update stock for ${prod.name}`
                              }
                              style={{
                                background: 'none',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                color: !canPublish ? '#94a3b8' : '#15803d',
                                cursor: !canPublish ? 'not-allowed' : 'pointer',
                                padding: '0.2rem 0.4rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                marginLeft: '0.25rem',
                              }}
                            >
                              ✏️ Quick Edit
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 4. Unit */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          color: '#475569',
                          textTransform: 'lowercase',
                        }}
                        data-testid={`inventory-unit-${prod.id}`}
                      >
                        {prod.unit || 'units'}
                      </td>

                      {/* 5. Availability Status & Toggle (SEL-07) */}
                      <td
                        style={{ padding: '0.85rem 1rem' }}
                        data-testid={`inventory-availability-cell-${prod.id}`}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <Toggle
                            id={`inventory-avail-toggle-${prod.id}`}
                            testId={`inventory-availability-toggle-${prod.id}`}
                            checked={
                              prod.availability !== 'unavailable' &&
                              prod.availability !== false
                            }
                            onChange={(newChecked) =>
                              handleToggleAvailability(prod, newChecked)
                            }
                            disabled={
                              !canPublish || togglingAvailId === prod.id
                            }
                            loading={togglingAvailId === prod.id}
                            size="sm"
                            ariaLabel={`Toggle availability for ${prod.name}`}
                          />
                          <AvailabilityBadge product={prod} size="sm" />
                        </div>
                      </td>

                      {/* 6. Last Updated */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          fontSize: '0.8rem',
                          color: '#64748b',
                        }}
                        data-testid={`inventory-updated-${prod.id}`}
                      >
                        {formatDate(prod.updated_at || prod.created_at)}
                      </td>

                      {/* 7. Action Links */}
                      <td
                        style={{ padding: '0.85rem 1rem', textAlign: 'right' }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                          }}
                        >
                          <Link
                            to={`/products/${prod.id}`}
                            data-testid={`inventory-view-link-${prod.id}`}
                            style={{
                              color: '#64748b',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              padding: '0.25rem 0.5rem',
                            }}
                          >
                            View
                          </Link>

                          <Link
                            to={`/seller/products/${prod.id}/edit`}
                            data-testid={`inventory-edit-link-${prod.id}`}
                            style={{
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              padding: '0.25rem 0.55rem',
                            }}
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta.total > meta.per_page && (
            <div
              data-testid="inventory-pagination"
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
                onPageChange={(p) => {
                  setCurrentPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                itemLabel="vegetables"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SellerInventory;
