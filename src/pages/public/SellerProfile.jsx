import { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useParams, Link } from 'react-router-dom';
import { sellerService, productService } from '../../services';
import { STRINGS } from '../../constants';
import { CartContext } from '../../context/cartContextDef.js';
import { ToastContext } from '../../context/toastContextDef.js';
import {
  RatingDisplay,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  ProductGridSkeleton,
  LazyImage,
  ProductCard,
} from '../../components/common';

/**
 * Format ISO date string to readable "Month Year" format
 * e.g., "January 2026"
 */
function formatMemberSince(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

/**
 * SellerProfile — Public Seller Profile & Catalog Page
 *
 * SRS References:
 * - MKT-07: Public seller profile page showing business name, description,
 *   location, and that seller's available products.
 * - MKT-04: Only approved sellers and active listings are publicly visible.
 * - REV-01: Rating display with numeric average or "No ratings yet".
 * - CART-01: Add to Cart functionality directly from seller product cards.
 * - Figma Section 7: Responsive seller hero (avatar/logo, name, verified badge,
 *   location, contact, description, rating) + catalog search/filter + responsive product grid.
 * - ERR-01: Standardized error messages and clean 404 handling.
 * - NFR-USAB-01 to 04: Accessible markup, touch targets >= 44x44px, WCAG AA contrast.
 */
export function SellerProfile({
  sellerId: propSellerId,
  onAddToCart: propOnAddToCart,
  className = '',
  style = {},
}) {
  const { id: routeId } = useParams();
  const resolvedId = propSellerId ?? routeId;

  // Contexts
  const cartContext = useContext(CartContext);
  const toastContext = useContext(ToastContext);

  // Data State
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // In-page search and filter state for seller's catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // Synchronize loading state when resolvedId or retryCount changes
  const currentKey = `${resolvedId ?? ''}-${retryCount}`;
  const [prevKey, setPrevKey] = useState(currentKey);
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setLoading(true);
  }

  // Fetch Seller Profile and Products
  useEffect(() => {
    let isMounted = true;

    async function fetchSellerProfile() {
      if (!resolvedId) {
        if (isMounted) {
          setError({ status: 404, message: 'Seller not found.' });
          setLoading(false);
        }
        return;
      }

      try {
        const sellerData = await sellerService.getPublicSellerById(resolvedId);
        if (!isMounted) return;

        if (!sellerData) {
          setError({ status: 404, message: 'Seller not found.' });
          setLoading(false);
          return;
        }

        setSeller(sellerData);
        setError(null);

        // Extract products if returned with seller profile, or fetch from productService
        if (
          Array.isArray(sellerData.products) &&
          sellerData.products.length > 0
        ) {
          setProducts(sellerData.products);
          setLoading(false);
        } else {
          try {
            const prodRes = await productService.getProducts({
              seller: resolvedId,
            });
            if (isMounted) {
              const items = Array.isArray(prodRes?.data)
                ? prodRes.data
                : Array.isArray(prodRes)
                  ? prodRes
                  : [];
              setProducts(items);
            }
          } catch {
            if (isMounted) {
              setProducts([]);
            }
          } finally {
            if (isMounted) {
              setLoading(false);
            }
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const status = err?.status || err?.response?.status || 500;
        const message =
          err?.message ||
          (status === 404
            ? 'Seller not found.'
            : STRINGS.ERRORS.UNABLE_TO_LOAD);
        setError({ status, message });
        setLoading(false);
      }
    }

    fetchSellerProfile();

    return () => {
      isMounted = false;
    };
  }, [resolvedId, retryCount]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryCount((prev) => prev + 1);
  }, []);

  // Handle Add to Cart
  const handleAddToCart = useCallback(
    (product) => {
      if (propOnAddToCart) {
        propOnAddToCart(product);
        return;
      }
      if (cartContext?.addItem) {
        cartContext.addItem(product, 1);
      }
      if (toastContext?.success) {
        toastContext.success(`Added ${product.name} to cart!`);
      }
    },
    [cartContext, propOnAddToCart, toastContext]
  );

  // Available categories derived dynamically from seller's active products
  const availableCategories = useMemo(() => {
    if (!products || !products.length) return [];
    const map = new Map();
    for (const p of products) {
      if (p.category && p.category.name) {
        const catKey = String(
          p.category.slug || p.category.id || p.category.name
        );
        if (!map.has(catKey)) {
          map.set(catKey, {
            id: p.category.id,
            slug: p.category.slug || catKey,
            name: p.category.name,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Exclude soft-deleted or unpublished listings
    list = list.filter(
      (p) => !p.deleted_at && p.is_published !== false && p.status !== 'draft'
    );

    // Keyword search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      const catTarget = String(selectedCategory).toLowerCase();
      list = list.filter((p) => {
        const catId = String(p.category_id || p.category?.id || '');
        const catSlug = String(p.category?.slug || '').toLowerCase();
        const catName = String(p.category?.name || '').toLowerCase();
        return (
          catId === catTarget || catSlug === catTarget || catName === catTarget
        );
      });
    }

    // In-stock only filter
    if (inStockOnly) {
      list = list.filter(
        (p) =>
          p.availability !== 'out_of_stock' &&
          p.availability !== 'unavailable' &&
          (p.quantity === undefined || p.quantity > 0)
      );
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case 'price_desc':
        list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case 'rating':
        list.sort(
          (a, b) =>
            Number(b.average_rating || b.rating || 0) -
            Number(a.average_rating || a.rating || 0)
        );
        break;
      case 'name':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'newest':
      default:
        list.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return list;
  }, [products, searchQuery, selectedCategory, inStockOnly, sortBy]);

  // Reset filters handler
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setInStockOnly(false);
    setSortBy('newest');
  }, []);

  // 1. Loading State
  if (loading) {
    return (
      <div
        className={`seller-profile-page ${className}`.trim()}
        data-testid="seller-profile-loading"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        {/* Breadcrumb Skeleton */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Skeleton width="60px" height="16px" variant="text" />
          <span>/</span>
          <Skeleton width="80px" height="16px" variant="text" />
          <span>/</span>
          <Skeleton width="120px" height="16px" variant="text" />
        </div>

        {/* Hero Card Skeleton */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <Skeleton width="80px" height="80px" variant="circular" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                flex: 1,
              }}
            >
              <Skeleton width="50%" height="2rem" variant="text" />
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Skeleton width="120px" height="20px" variant="text" />
                <Skeleton width="100px" height="20px" variant="text" />
                <Skeleton width="140px" height="20px" variant="text" />
              </div>
            </div>
          </div>
          <Skeleton width="100%" height="16px" variant="text" />
          <Skeleton width="85%" height="16px" variant="text" />
        </div>

        {/* Catalog Skeleton */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}
          >
            <Skeleton width="220px" height="28px" variant="text" />
            <Skeleton width="160px" height="38px" variant="rounded" />
          </div>
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    );
  }

  // 2. Error / 404 State
  if (error || !seller) {
    const isNotFound =
      error?.status === 404 ||
      error?.message?.toLowerCase().includes('not found');

    if (isNotFound) {
      return (
        <div
          className={`seller-profile-page ${className}`.trim()}
          data-testid="seller-not-found"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem 1rem',
            boxSizing: 'border-box',
            ...style,
          }}
        >
          <EmptyState
            type="sellers"
            title="Seller Not Found"
            description="The seller profile you are looking for does not exist or may have been removed."
            action={
              <Button to="/products" variant="primary" size="md">
                Browse Marketplace Vegetables
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div
        className={`seller-profile-page ${className}`.trim()}
        data-testid="seller-error-state"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1rem',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <ErrorState
          title="Unable to Load Seller Profile"
          message={error.message || STRINGS.ERRORS.UNABLE_TO_LOAD}
          onRetry={handleRetry}
          secondaryAction={
            <Button to="/products" variant="outline" size="md">
              Browse Marketplace
            </Button>
          }
        />
      </div>
    );
  }

  // Seller Details
  const businessName = seller.business_name || 'Vegetable Seller';
  const location = seller.location || 'Nigeria';
  const description = seller.description || '';
  const phone = seller.phone || '';
  const memberSince = formatMemberSince(seller.created_at);
  const isVerified = seller.approval_status === 'approved';
  const sellerImage =
    seller.image_url || seller.logo_url || seller.avatar_url || seller.image;
  const ratingValue = seller.average_rating ?? seller.rating ?? null;
  const ratingCount = seller.rating_count ?? seller.review_count ?? 0;

  // Has active filters
  const isFiltered =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    inStockOnly ||
    sortBy !== 'newest';

  return (
    <div
      className={`seller-profile-page ${className}`.trim()}
      data-testid="seller-profile-page"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem 1rem 3rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* 1. Breadcrumbs Navigation */}
      <nav
        aria-label="Breadcrumb"
        style={{
          fontSize: '0.875rem',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/"
          style={{
            color: '#15803d',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to="/products"
          style={{
            color: '#15803d',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Marketplace
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }} aria-current="page">
          {businessName}
        </span>
      </nav>

      {/* 2. Seller Hero Header (SRS MKT-07, Figma Section 7) */}
      <header
        className="seller-hero-card card"
        data-testid="seller-hero-header"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Avatar / Logo with fallback */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#f0fdf4',
              border: '2px solid #bbf7d0',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {sellerImage ? (
              <LazyImage
                src={sellerImage}
                alt={businessName}
                aspectRatio="1/1"
                width="80px"
                height="80px"
                fit="cover"
                borderRadius="50%"
                fallback={
                  <span aria-hidden="true" style={{ lineHeight: 1 }}>
                    👨‍🌾
                  </span>
                }
              />
            ) : (
              <span aria-hidden="true" style={{ lineHeight: 1 }}>
                👨‍🌾
              </span>
            )}
          </div>

          {/* Business Info Header */}
          <div
            style={{
              flex: 1,
              minWidth: '260px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
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
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.25,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {businessName}
              </h1>

              {/* Verified Seller Badge (SRS MKT-04, MKT-07) */}
              {isVerified && (
                <span
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  data-testid="verified-seller-badge"
                >
                  <span aria-hidden="true">✓</span>
                  {STRINGS.SELLERS.VERIFIED_SELLER}
                </span>
              )}
            </div>

            {/* Rating Display (REV-01) */}
            <div style={{ marginTop: '0.125rem' }}>
              <RatingDisplay
                rating={ratingValue}
                ratingCount={ratingCount}
                size="md"
              />
            </div>

            {/* Location & Metadata Row (MKT-07, Figma Section 7) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                flexWrap: 'wrap',
                fontSize: '0.875rem',
                color: '#64748b',
                marginTop: '0.25rem',
              }}
            >
              {/* Location */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 500,
                }}
              >
                <span aria-hidden="true">📍</span>
                <span>{location}</span>
              </div>

              {/* Phone / Contact */}
              {phone && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span aria-hidden="true">📞</span>
                  <a
                    href={`tel:${phone}`}
                    style={{
                      color: '#15803d',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                    aria-label={`Call ${businessName} at ${phone}`}
                  >
                    {phone}
                  </a>
                </div>
              )}

              {/* Member Since */}
              {memberSince && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span aria-hidden="true">📅</span>
                  <span>Member since {memberSince}</span>
                </div>
              )}

              {/* Product Count */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#15803d',
                  fontWeight: 600,
                }}
              >
                <span aria-hidden="true">🧺</span>
                <span>{STRINGS.SELLERS.PRODUCTS_LABEL(products.length)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Description (SRS MKT-07) */}
        {description && (
          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '1.25rem',
            }}
          >
            <h2
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
              }}
            >
              About this Seller
            </h2>
            <p
              style={{
                color: '#475569',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                margin: 0,
                maxWidth: '900px',
              }}
            >
              {description}
            </p>
          </div>
        )}
      </header>

      {/* 3. Seller's Product Catalog Section (SRS MKT-07, Figma Section 7) */}
      <section
        className="seller-catalog-section"
        aria-labelledby="seller-catalog-heading"
        data-testid="seller-catalog-section"
      >
        {/* Catalog Section Header & Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <h2
                id="seller-catalog-heading"
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                Vegetables Listed by {businessName}
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  margin: '0.25rem 0 0',
                }}
              >
                Fresh produce available directly from this verified seller
              </p>
            </div>

            {/* Product count summary */}
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              {filteredProducts.length === products.length
                ? `${products.length} vegetables available`
                : `Showing ${filteredProducts.length} of ${products.length} vegetables`}
            </div>
          </div>

          {/* Search, Filter & Sort Controls (Figma Section 7) */}
          {products.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Keyword Search Input */}
              <div
                style={{
                  position: 'relative',
                  flex: '1 1 240px',
                  minWidth: '200px',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    fontSize: '0.9rem',
                  }}
                  aria-hidden="true"
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search seller's vegetables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search vegetables by this seller"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '44px',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      fontSize: '1rem',
                      padding: '0.25rem',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Filter Dropdown (if seller has multiple categories) */}
              {availableCategories.length > 1 && (
                <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
                  <label
                    htmlFor="seller-cat-select"
                    className="sr-only"
                    style={{
                      position: 'absolute',
                      width: '1px',
                      height: '1px',
                      padding: 0,
                      margin: '-1px',
                      overflow: 'hidden',
                      clip: 'rect(0, 0, 0, 0)',
                      border: 0,
                    }}
                  >
                    Filter by category
                  </label>
                  <select
                    id="seller-cat-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      minHeight: '44px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map((cat) => (
                      <option
                        key={cat.slug || cat.id}
                        value={cat.slug || cat.id}
                      >
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* In-Stock Only Toggle */}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#334155',
                  cursor: 'pointer',
                  userSelect: 'none',
                  minHeight: '44px',
                  padding: '0 0.25rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#15803d',
                    cursor: 'pointer',
                  }}
                />
                <span>In-stock only</span>
              </label>

              {/* Sort By Dropdown */}
              <div style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
                <label
                  htmlFor="seller-sort-select"
                  className="sr-only"
                  style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    border: 0,
                  }}
                >
                  Sort vegetables
                </label>
                <select
                  id="seller-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    minHeight: '44px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>

              {/* Clear Filters Button if any filter active */}
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#15803d',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0.5rem',
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. Products Grid or Empty State */}
        {products.length === 0 ? (
          /* Entire seller catalog is empty */
          <EmptyState
            type="products"
            title="No Vegetables Listed Yet"
            description={`${businessName} currently has no vegetables available for sale.`}
            action={
              <Button to="/products" variant="primary" size="md">
                Browse Marketplace Vegetables
              </Button>
            }
          />
        ) : filteredProducts.length === 0 ? (
          /* Search or filter yielded 0 products */
          <EmptyState
            type="search"
            title="No Matching Vegetables"
            description={`No vegetables listed by ${businessName} match your current search or filter criteria.`}
            action={
              <Button variant="outline" size="md" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            }
          />
        ) : (
          /* Responsive Product Grid with ProductCards */
          <div
            className="seller-products-grid"
            data-testid="seller-products-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.5rem',
              boxSizing: 'border-box',
            }}
          >
            {filteredProducts.map((prod) => {
              // Ensure normalized seller reference on product card
              const normalizedProduct = {
                ...prod,
                seller: prod.seller || {
                  id: seller.id,
                  business_name: businessName,
                  location: location,
                  phone: phone,
                },
              };

              return (
                <ProductCard
                  key={prod.id}
                  product={normalizedProduct}
                  onAddToCart={handleAddToCart}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

SellerProfile.propTypes = {
  sellerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onAddToCart: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default SellerProfile;
