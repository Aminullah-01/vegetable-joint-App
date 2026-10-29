import { useState, useEffect, useContext, useMemo } from 'react';
import { categoryService } from '../../services/categoryService';
import { ToastContext } from '../../context/toastContextDef';
import {
  Button,
  Modal,
  ConfirmDialog,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from '../../components/common';

/**
 * Helper to display category emoji based on name
 */
function getCategoryEmoji(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('tomato')) return '🍅';
  if (
    lower.includes('pepper') ||
    lower.includes('rodo') ||
    lower.includes('tatashe')
  )
    return '🌶️';
  if (lower.includes('onion')) return '🧅';
  if (lower.includes('carrot')) return '🥕';
  if (lower.includes('cabbage')) return '🥬';
  if (
    lower.includes('spinach') ||
    lower.includes('leaf') ||
    lower.includes('green') ||
    lower.includes('ugwu')
  )
    return '🌿';
  if (lower.includes('lettuce') || lower.includes('salad')) return '🥗';
  if (lower.includes('cucumber')) return '🥒';
  if (lower.includes('potato') || lower.includes('yam')) return '🥔';
  return '📁';
}

/**
 * AdminCategories — Categories Management Page (ADM-05, BR-09, TC-31, Figma Section 14)
 *
 * Requirements:
 * - ADM-05: Admins shall be able to create, rename, describe, deactivate and (only if unused) delete product categories.
 * - BR-09: A category that has products cannot be deleted; it can be deactivated.
 * - TC-31: Admin deletes category in use -> Blocked; option to deactivate.
 * - Figma Section 14: Category management with Add, Edit, Deactivate, Delete only when unused.
 */
export function AdminCategories() {
  const toast = useContext(ToastContext);

  // Data states
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [usageFilter, setUsageFilter] = useState('all'); // 'all' | 'in-use' | 'unused'

  // Modal states: Create / Edit Category
  const [categoryModalState, setCategoryModalState] = useState(null); // null | { mode: 'create'|'edit', category?: Object }
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Deletion guard & Dialog states (BR-09, TC-31)
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [blockedCategory, setBlockedCategory] = useState(null); // When category is in use
  const [isDeleting, setIsDeleting] = useState(false);

  // Deactivation confirmation
  const [categoryToDeactivate, setCategoryToDeactivate] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Fetch all categories (including inactive ones)
  useEffect(() => {
    let isMounted = true;

    async function fetchCategories() {
      try {
        setIsLoading(true);
        setError(null);
        // Include inactive categories for admin management
        const list = await categoryService.getCategories({ all: true });
        if (!isMounted) return;
        setCategories(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.message ||
            'Unable to load product categories. Please check your network and try again.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setUsageFilter('all');
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = cat.name?.toLowerCase().includes(query);
        const matchesSlug = cat.slug?.toLowerCase().includes(query);
        const matchesDesc = cat.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesSlug && !matchesDesc) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'active' && !cat.is_active) {
        return false;
      }
      if (statusFilter === 'inactive' && cat.is_active) {
        return false;
      }

      // Usage filter
      const productCount = Number(cat.products_count || 0);
      if (usageFilter === 'in-use' && productCount === 0) {
        return false;
      }
      if (usageFilter === 'unused' && productCount > 0) {
        return false;
      }

      return true;
    });
  }, [categories, searchQuery, statusFilter, usageFilter]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'all' ||
    usageFilter !== 'all';

  // Counts summary
  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.is_active).length;
  const inactiveCount = totalCount - activeCount;

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      is_active: true,
    });
    setFormErrors({});
    setCategoryModalState({ mode: 'create' });
  };

  // Open Edit Modal
  const openEditModal = (cat) => {
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      is_active: cat.is_active !== false,
    });
    setFormErrors({});
    setCategoryModalState({ mode: 'edit', category: cat });
  };

  // Close Create/Edit Modal
  const closeCategoryModal = () => {
    setCategoryModalState(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      is_active: true,
    });
    setFormErrors({});
  };

  // Handle Form Submit (Create / Edit)
  const handleCategorySubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Category name is required.';
    } else if (formData.name.trim().length > 80) {
      errors.name = 'Category name must not exceed 80 characters.';
    }

    // Check duplicate name within other categories
    const isEditing = categoryModalState?.mode === 'edit';
    const currentId = isEditing ? categoryModalState.category.id : null;
    const isDuplicate = categories.some(
      (c) =>
        c.id !== currentId &&
        c.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
    );

    if (isDuplicate) {
      errors.name = 'A category with this name already exists.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmittingForm(true);
      setFormErrors({});

      const payload = {
        name: formData.name.trim(),
        slug:
          formData.slug.trim() ||
          formData.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        description: formData.description.trim(),
        is_active: formData.is_active,
      };

      if (isEditing) {
        const updated = await categoryService.updateCategory(
          currentId,
          payload
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === currentId ? { ...c, ...updated } : c))
        );
        toast?.success?.(`Category "${payload.name}" updated successfully.`);
      } else {
        const created = await categoryService.createCategory(payload);
        setCategories((prev) => [...prev, created]);
        toast?.success?.(`Category "${payload.name}" created successfully.`);
      }

      closeCategoryModal();
    } catch (err) {
      const errMsg =
        err?.message ||
        `Failed to ${isEditing ? 'update' : 'create'} category. Please try again.`;
      setFormErrors({ submit: errMsg });
      toast?.error?.(errMsg);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Toggle Category Active Status (Deactivate / Reactivate)
  const handleToggleActiveStatus = async (cat) => {
    if (cat.is_active) {
      // Prompt confirmation before deactivating
      setCategoryToDeactivate(cat);
    } else {
      // Reactivate directly
      try {
        setIsTogglingStatus(true);
        const updated = await categoryService.reactivateCategory(cat.id);
        setCategories((prev) =>
          prev.map((c) =>
            c.id === cat.id ? { ...c, ...updated, is_active: true } : c
          )
        );
        toast?.success?.(`Category "${cat.name}" has been activated.`);
      } catch (err) {
        toast?.error?.(
          err?.message || `Failed to activate category "${cat.name}".`
        );
      } finally {
        setIsTogglingStatus(false);
      }
    }
  };

  // Confirm Deactivation
  const handleConfirmDeactivate = async () => {
    if (!categoryToDeactivate) return;

    try {
      setIsTogglingStatus(true);
      const updated = await categoryService.deactivateCategory(
        categoryToDeactivate.id
      );
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryToDeactivate.id
            ? { ...c, ...updated, is_active: false }
            : c
        )
      );
      toast?.success?.(
        `Category "${categoryToDeactivate.name}" has been deactivated (ADM-05, BR-09).`
      );
      setCategoryToDeactivate(null);
    } catch (err) {
      toast?.error?.(
        err?.message ||
          `Failed to deactivate category "${categoryToDeactivate.name}".`
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Prompt Deletion (BR-09, TC-31 Guard)
  const promptDeleteCategory = (cat) => {
    const productCount = Number(cat.products_count || 0);

    // If category has active products, block deletion per BR-09 & TC-31
    if (productCount > 0) {
      setBlockedCategory(cat);
      return;
    }

    // Category is unused (0 products), allow deletion confirmation
    setCategoryToDelete(cat);
  };

  // Confirm Permanent Deletion (Only if unused)
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setIsDeleting(true);
      await categoryService.deleteCategory(categoryToDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      toast?.success?.(
        `Category "${categoryToDelete.name}" was permanently deleted.`
      );
      setCategoryToDelete(null);
    } catch (err) {
      // If server returned 409 conflict (e.g. products exist)
      if (
        err?.status === 409 ||
        err?.code === 'CONFLICT' ||
        err?.message?.includes('BR-09')
      ) {
        const cat = categoryToDelete;
        setCategoryToDelete(null);
        setBlockedCategory({
          ...cat,
          products_count: cat.products_count || 1,
        });
      } else {
        toast?.error?.(
          err?.message ||
            `Failed to delete category "${categoryToDelete.name}".`
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Deactivate from Blocked Modal CTA (TC-31: Option to deactivate)
  const handleDeactivateFromBlockedModal = async () => {
    if (!blockedCategory) return;

    try {
      setIsTogglingStatus(true);
      const updated = await categoryService.deactivateCategory(
        blockedCategory.id
      );
      setCategories((prev) =>
        prev.map((c) =>
          c.id === blockedCategory.id
            ? { ...c, ...updated, is_active: false }
            : c
        )
      );
      toast?.success?.(
        `Category "${blockedCategory.name}" has been deactivated instead of deleted (BR-09, TC-31).`
      );
      setBlockedCategory(null);
    } catch (err) {
      toast?.error?.(
        err?.message ||
          `Failed to deactivate category "${blockedCategory.name}".`
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div
      data-testid="admin-categories-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
      }}
    >
      {/* Header & Metric Badges */}
      <div
        data-testid="admin-categories-header"
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
              Category Management
            </h1>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span
                data-testid="categories-total-badge"
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
                {totalCount} {totalCount === 1 ? 'category' : 'categories'}
              </span>
              <span
                data-testid="categories-active-badge"
                style={{
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  border: '1px solid #bbf7d0',
                }}
              >
                {activeCount} active
              </span>
              {inactiveCount > 0 && (
                <span
                  data-testid="categories-inactive-badge"
                  style={{
                    backgroundColor: '#fffbeb',
                    color: '#92400e',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    border: '1px solid #fde68a',
                  }}
                >
                  {inactiveCount} inactive
                </span>
              )}
            </div>
          </div>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Create, edit, and deactivate vegetable categories (ADM-05). In-use
            categories are protected from deletion (BR-09, TC-31).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="refresh-categories-btn"
            aria-label="Refresh categories"
          >
            <span
              style={{ display: 'inline-block', marginRight: '0.35rem' }}
              aria-hidden="true"
            >
              🔄
            </span>
            Refresh
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            data-testid="add-category-btn"
          >
            <span
              style={{ display: 'inline-block', marginRight: '0.35rem' }}
              aria-hidden="true"
            >
              +
            </span>
            Add Category
          </Button>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div
        data-testid="categories-filters-toolbar"
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
            placeholder="Search categories by name, slug, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-categories-input"
            aria-label="Search categories"
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

        {/* Status Dropdown */}
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
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="filter-status-select"
            aria-label="Filter by status"
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
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Usage Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            htmlFor="filter-usage"
            style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}
          >
            Usage:
          </label>
          <select
            id="filter-usage"
            value={usageFilter}
            onChange={(e) => setUsageFilter(e.target.value)}
            data-testid="filter-usage-select"
            aria-label="Filter by usage"
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
            <option value="in-use">In Use (&gt;0 products)</option>
            <option value="unused">Unused (0 products)</option>
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

      {/* Main Table / State Views */}
      {isLoading ? (
        <div
          data-testid="categories-loading-state"
          style={{ padding: '1rem 0' }}
        >
          <TableSkeleton rows={5} columns={6} />
        </div>
      ) : error ? (
        <div data-testid="categories-error-state" style={{ padding: '1rem 0' }}>
          <ErrorState
            title="Failed to Load Categories"
            message={error}
            onRetry={handleRefresh}
            retryLabel="Retry"
          />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div data-testid="categories-empty-state">
          <EmptyState
            title={
              hasActiveFilters
                ? 'No Matching Categories'
                : 'No Categories Found'
            }
            message={
              hasActiveFilters
                ? 'No categories match your search or filter criteria. Try adjusting or clearing your filters.'
                : 'There are currently no product categories created in the platform.'
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
              ) : (
                <Button variant="primary" size="sm" onClick={openCreateModal}>
                  Create First Category
                </Button>
              )
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
              data-testid="categories-table"
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
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Slug</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Description</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Products</th>
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
                {filteredCategories.map((cat) => {
                  const productCount = Number(cat.products_count || 0);
                  const isUnused = productCount === 0;
                  const isActive = Boolean(cat.is_active);

                  return (
                    <tr
                      key={cat.id}
                      data-testid={`category-row-${cat.id}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.1s ease',
                        opacity: isActive ? 1 : 0.75,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Name & Emoji */}
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
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.25rem',
                              border: '1px solid #e2e8f0',
                            }}
                            aria-hidden="true"
                          >
                            {getCategoryEmoji(cat.name)}
                          </div>
                          <div>
                            <strong
                              data-testid={`category-name-${cat.id}`}
                              style={{
                                display: 'block',
                                color: '#0f172a',
                                fontWeight: '600',
                              }}
                            >
                              {cat.name}
                            </strong>
                            <span
                              style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                            >
                              ID: #{cat.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <code
                          data-testid={`category-slug-${cat.id}`}
                          style={{
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            color: '#0f766e',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                          }}
                        >
                          {cat.slug ||
                            cat.name.toLowerCase().replace(/\s+/g, '-')}
                        </code>
                      </td>

                      {/* Description */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          maxWidth: '280px',
                          color: '#475569',
                        }}
                      >
                        <span
                          data-testid={`category-desc-${cat.id}`}
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '0.825rem',
                            lineHeight: '1.4',
                          }}
                        >
                          {cat.description || '—'}
                        </span>
                      </td>

                      {/* Products Count */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`category-products-count-${cat.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: isUnused ? '#f1f5f9' : '#e0f2fe',
                            color: isUnused ? '#64748b' : '#0369a1',
                            border: `1px solid ${
                              isUnused ? '#e2e8f0' : '#bae6fd'
                            }`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                          }}
                        >
                          {productCount}{' '}
                          {productCount === 1 ? 'product' : 'products'}
                          {isUnused && ' (Unused)'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          data-testid={`category-status-badge-${cat.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: isActive ? '#dcfce7' : '#fef3c7',
                            color: isActive ? '#166534' : '#92400e',
                            border: `1px solid ${
                              isActive ? '#bbf7d0' : '#fde68a'
                            }`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                          }}
                        >
                          <span aria-hidden="true">{isActive ? '✓' : '⏸'}</span>
                          {isActive ? 'Active' : 'Inactive'}
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
                          {/* Edit Action */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`edit-category-btn-${cat.id}`}
                            onClick={() => openEditModal(cat)}
                            aria-label={`Edit ${cat.name}`}
                          >
                            Edit
                          </Button>

                          {/* Deactivate / Reactivate Toggle Action (ADM-05, BR-09) */}
                          {isActive ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`deactivate-category-btn-${cat.id}`}
                              onClick={() => handleToggleActiveStatus(cat)}
                              style={{
                                color: '#b45309',
                                borderColor: '#fde68a',
                                backgroundColor: '#fffbeb',
                              }}
                              aria-label={`Deactivate ${cat.name}`}
                              disabled={isTogglingStatus}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`reactivate-category-btn-${cat.id}`}
                              onClick={() => handleToggleActiveStatus(cat)}
                              style={{
                                color: '#16a34a',
                                borderColor: '#86efac',
                                backgroundColor: '#f0fdf4',
                              }}
                              aria-label={`Reactivate ${cat.name}`}
                              disabled={isTogglingStatus}
                            >
                              Reactivate
                            </Button>
                          )}

                          {/* Delete Action (Protected by BR-09 & TC-31) */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`delete-category-btn-${cat.id}`}
                            onClick={() => promptDeleteCategory(cat)}
                            style={{
                              color: isUnused ? '#dc2626' : '#94a3b8',
                              borderColor: isUnused ? '#fca5a5' : '#cbd5e1',
                              backgroundColor: isUnused ? '#fff5f5' : '#f8fafc',
                            }}
                            aria-label={`Delete ${cat.name}`}
                            title={
                              isUnused
                                ? 'Delete unused category'
                                : 'Category is in use (protected by BR-09)'
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Category Modal (ADM-05) */}
      {categoryModalState && (
        <Modal
          isOpen={Boolean(categoryModalState)}
          onClose={closeCategoryModal}
          title={
            categoryModalState.mode === 'create'
              ? 'Add New Category'
              : 'Edit Category'
          }
          description="Product categories help buyers browse and filter produce across the marketplace (ADM-05)."
          size="md"
          testId="category-modal"
          footer={
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                width: '100%',
              }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeCategoryModal}
                disabled={isSubmittingForm}
                data-testid="category-modal-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                onClick={handleCategorySubmit}
                disabled={isSubmittingForm}
                data-testid="category-modal-save-btn"
              >
                {isSubmittingForm
                  ? 'Saving...'
                  : categoryModalState.mode === 'create'
                    ? 'Create Category'
                    : 'Save Changes'}
              </Button>
            </div>
          }
        >
          <form
            onSubmit={handleCategorySubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {formErrors.submit && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                }}
              >
                {formErrors.submit}
              </div>
            )}

            {/* Name Field */}
            <div>
              <label
                htmlFor="category-name-input"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '0.35rem',
                }}
              >
                Category Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="category-name-input"
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name: val,
                    // Auto-slugify if create mode and slug hasn't been manually diverged
                    slug:
                      categoryModalState.mode === 'create' &&
                      (!prev.slug ||
                        prev.slug ===
                          prev.name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, ''))
                        ? val
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        : prev.slug,
                  }));
                  if (formErrors.name) {
                    setFormErrors((prev) => ({ ...prev, name: null }));
                  }
                }}
                maxLength={80}
                placeholder="e.g. Fresh Tomatoes, Root Vegetables"
                data-testid="category-name-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${formErrors.name ? '#ef4444' : '#cbd5e1'}`,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
                required
              />
              {formErrors.name && (
                <p
                  data-testid="category-name-error"
                  style={{
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    margin: '0.25rem 0 0 0',
                  }}
                >
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Slug Field */}
            <div>
              <label
                htmlFor="category-slug-input"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '0.35rem',
                }}
              >
                URL Slug
              </label>
              <input
                id="category-slug-input"
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="e.g. fresh-tomatoes"
                data-testid="category-slug-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Identifier used in URLs. Generated automatically from name if
                empty.
              </span>
            </div>

            {/* Description Field */}
            <div>
              <label
                htmlFor="category-description-input"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '0.35rem',
                }}
              >
                Description
              </label>
              <textarea
                id="category-description-input"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Brief description of the vegetable types included in this category..."
                data-testid="category-description-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Active Status Checkbox */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginTop: '0.25rem',
              }}
            >
              <input
                id="category-active-checkbox"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
                data-testid="category-active-checkbox"
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label
                htmlFor="category-active-checkbox"
                style={{
                  fontSize: '0.875rem',
                  color: '#1e293b',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Category is active (visible for buyers and available in seller
                product listings)
              </label>
            </div>
          </form>
        </Modal>
      )}

      {/* Blocked Deletion Modal (TC-31, BR-09) */}
      {blockedCategory && (
        <Modal
          isOpen={Boolean(blockedCategory)}
          onClose={() => setBlockedCategory(null)}
          title="Cannot Delete Category in Use"
          description="Business rule enforcement (BR-09, TC-31)"
          size="md"
          testId="blocked-delete-modal"
          footer={
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                {blockedCategory.is_active && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleDeactivateFromBlockedModal}
                    disabled={isTogglingStatus}
                    data-testid="deactivate-instead-btn"
                  >
                    Deactivate Category Instead
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBlockedCategory(null)}
                data-testid="blocked-delete-close-btn"
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
              gap: '1rem',
            }}
          >
            {/* Warning banner */}
            <div
              data-testid="blocked-delete-notice"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '1rem',
                color: '#92400e',
              }}
            >
              <span
                style={{ fontSize: '1.5rem', lineHeight: 1 }}
                aria-hidden="true"
              >
                ⚠️
              </span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                  Category &quot;{blockedCategory.name}&quot; has active
                  products
                </strong>
                <p
                  style={{
                    margin: '0.35rem 0 0',
                    fontSize: '0.875rem',
                    lineHeight: '1.45',
                  }}
                >
                  This category currently contains{' '}
                  <strong>{blockedCategory.products_count} product(s)</strong>{' '}
                  in the marketplace catalog.
                </p>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: '#475569',
                fontSize: '0.9rem',
                lineHeight: '1.5',
              }}
            >
              Under marketplace business rule <strong>BR-09</strong> and test
              condition <strong>TC-31</strong>, categories that have products
              cannot be deleted in order to prevent orphaned product records and
              preserve transaction history.
            </p>

            <p
              style={{
                margin: 0,
                color: '#475569',
                fontSize: '0.9rem',
                lineHeight: '1.5',
              }}
            >
              You may <strong>deactivate</strong> this category instead.
              Deactivating hides the category from public marketplace navigation
              and stops sellers from selecting it for new listings, without
              affecting existing produce records.
            </p>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog (Allowed ONLY if Unused, ADM-05, BR-09) */}
      {categoryToDelete && (
        <ConfirmDialog
          isOpen={Boolean(categoryToDelete)}
          onClose={() => setCategoryToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Category"
          message={`Are you sure you want to permanently delete category "${categoryToDelete.name}"? This category is currently unused (0 products) and this action cannot be undone.`}
          type="danger"
          confirmText="Delete Category"
          cancelText="Cancel"
          loading={isDeleting}
          testId="delete-category-confirm-dialog"
        />
      )}

      {/* Deactivate Confirmation Dialog (ADM-05, BR-09) */}
      {categoryToDeactivate && (
        <ConfirmDialog
          isOpen={Boolean(categoryToDeactivate)}
          onClose={() => setCategoryToDeactivate(null)}
          onConfirm={handleConfirmDeactivate}
          title="Deactivate Category"
          message={`Are you sure you want to deactivate "${categoryToDeactivate.name}"? The category will be hidden from buyers in marketplace navigation and unavailable for new seller listings (ADM-05, BR-09).`}
          type="warning"
          confirmText="Deactivate"
          cancelText="Cancel"
          loading={isTogglingStatus}
          testId="deactivate-category-confirm-dialog"
        />
      )}
    </div>
  );
}

export default AdminCategories;
