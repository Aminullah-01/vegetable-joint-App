import { useState, useEffect, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { useParams, Link } from 'react-router-dom';
import { productService } from '../../services';
import { STRINGS } from '../../constants';
import { formatPrice } from '../../utils';
import { CartContext } from '../../context/cartContextDef.js';
import { ToastContext } from '../../context/toastContextDef.js';
import { AvailabilityBadge } from '../../components/common/AvailabilityBadge';
import { RatingDisplay } from '../../components/common/RatingDisplay';
import { QuantitySelector } from '../../components/common/QuantitySelector';
import { LazyImage } from '../../components/common/LazyImage';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { ProductDetailSkeleton } from '../../components/common/Skeleton';
import { ProductCard } from '../../components/products/ProductCard';

/**
 * ProductDetails — Marketplace Vegetable Detail Page
 *
 * SRS References:
 * - MKT-05: Product detail page displaying name, image, description, price, unit,
 *   available quantity, seller name and location, availability status, and rating.
 * - MKT-06: Quantity selector bounded by available stock; disabled with "Out of Stock" when unavailable.
 * - REV-01: Rating display with numeric average or "No ratings yet".
 * - Figma Section 6: Desktop 2-column layout (gallery left, specs right) with
 *   below-the-fold description, seller preview CTA, and related products grid.
 * - ERR-01: Standardized error message "Product not found." for 404 responses.
 * - NFR-USAB-01 to 04: Accessible markup, WCAG AA color contrast, touch targets ≥ 44×44px.
 */
export function ProductDetails({
  productId: propProductId,
  onAddToCart,
  className = '',
  style = {},
}) {
  const { id: routeId } = useParams();
  const resolvedId = propProductId ?? routeId;

  // Global Contexts
  const cartContext = useContext(CartContext);
  const toastContext = useContext(ToastContext);

  // Component State
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Synchronize loading state during render when resolvedId or retryCount changes
  const currentKey = `${resolvedId ?? ''}-${retryCount}`;
  const [prevKey, setPrevKey] = useState(currentKey);
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setLoading(true);
  }

  // Fetch product data and related items
  useEffect(() => {
    let isMounted = true;

    async function fetchDetails() {
      if (!resolvedId) {
        if (isMounted) {
          setError({ status: 404, message: STRINGS.ERRORS.PRODUCT_NOT_FOUND });
          setLoading(false);
        }
        return;
      }

      try {
        const data = await productService.getProductById(resolvedId);
        if (!isMounted) return;

        if (!data) {
          setError({ status: 404, message: STRINGS.ERRORS.PRODUCT_NOT_FOUND });
        } else {
          setProduct(data);
          setQuantity(1);
          setError(null);

          // Fetch related products from same category
          try {
            const categoryParam = data.category_id || data.category?.id;
            const relatedRes = await productService.getProducts({
              category: categoryParam,
              per_page: 5,
            });

            const list = Array.isArray(relatedRes?.data)
              ? relatedRes.data
              : Array.isArray(relatedRes)
                ? relatedRes
                : [];

            if (isMounted) {
              setRelatedProducts(
                list.filter((p) => Number(p.id) !== Number(data.id)).slice(0, 4)
              );
            }
          } catch {
            if (isMounted) {
              setRelatedProducts([]);
            }
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const is404 =
          err?.status === 404 ||
          err?.statusCode === 404 ||
          err?.response?.status === 404 ||
          err?.code === 'NOT_FOUND' ||
          err?.message === STRINGS.ERRORS.PRODUCT_NOT_FOUND ||
          err?.message?.toLowerCase().includes('not found');

        setError({
          status: is404 ? 404 : 500,
          message: is404
            ? STRINGS.ERRORS.PRODUCT_NOT_FOUND
            : err?.message || STRINGS.ERRORS.UNABLE_TO_LOAD,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [resolvedId, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  // Loading Skeleton State
  if (loading) {
    return (
      <div
        className={`product-details-page ${className}`.trim()}
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <ProductDetailSkeleton />
      </div>
    );
  }

  // Not Found (404) Empty State
  if (error?.status === 404 || (!product && !error)) {
    return (
      <div
        className={`product-details-page ${className}`.trim()}
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1rem',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to="/products"
            style={{
              color: '#15803d',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {STRINGS.PRODUCTS.BACK_TO_PRODUCTS}
          </Link>
        </div>
        <EmptyState
          type="products"
          title={STRINGS.ERRORS.PRODUCT_NOT_FOUND}
          description="The vegetable listing you are looking for does not exist, has been removed, or is currently unpublished."
          action={
            <Button to="/products" variant="primary">
              Browse Vegetables
            </Button>
          }
        />
      </div>
    );
  }

  // Server / Network Error State
  if (error) {
    return (
      <div
        className={`product-details-page ${className}`.trim()}
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1rem',
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to="/products"
            style={{
              color: '#15803d',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {STRINGS.PRODUCTS.BACK_TO_PRODUCTS}
          </Link>
        </div>
        <ErrorState
          title="Unable to load product"
          message={error.message || STRINGS.ERRORS.UNABLE_TO_LOAD}
          onRetry={handleRetry}
          secondaryAction={
            <Button to="/products" variant="outline">
              Back to Catalog
            </Button>
          }
        />
      </div>
    );
  }

  // Stock and Availability calculations (MKT-05, MKT-06, SEL-07)
  const isOutOfStock =
    product.availability === 'out_of_stock' ||
    product.availability === 'unavailable' ||
    product.availability === false ||
    product.quantity === 0 ||
    Number(product.quantity) <= 0;

  const sellerName = product.seller?.business_name || 'Verified Seller';
  const sellerId = product.seller?.id || product.seller_id;
  const sellerLocation =
    product.seller?.location || product.location || 'Nigeria';
  const sellerUrl = sellerId ? `/sellers/${sellerId}` : null;

  const ratingValue = product.average_rating ?? product.rating;
  const ratingCount = product.rating_count ?? product.review_count;

  const categoryName = product.category?.name;
  const categorySlug = product.category?.slug || product.category_id;
  const productImage = product.image_url || product.image;

  // Add to Cart handler (MKT-06, CART-01, CART-02)
  const handleAddToCart = () => {
    if (isOutOfStock) return;

    const added = cartContext?.addItem
      ? cartContext.addItem(product, quantity)
      : true;

    if (added !== false) {
      const unitLabel = product.unit
        ? quantity > 1 && !product.unit.endsWith('s')
          ? ` ${product.unit}s`
          : ` ${product.unit}`
        : '';
      const feedbackMessage = `Added ${quantity}${unitLabel} of ${product.name} to cart!`;
      toastContext?.success?.(feedbackMessage);
      onAddToCart?.(product, quantity);
    }
  };

  return (
    <div
      className={`product-details-page ${className}`.trim()}
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* 1. Breadcrumbs & Back Navigation */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.875rem' }}>
          <Link
            to="/products"
            style={{
              color: '#15803d',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            {STRINGS.PRODUCTS.BACK_TO_PRODUCTS}
          </Link>
        </div>

        <nav aria-label="Breadcrumb">
          <ol
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: '0.85rem',
              color: '#64748b',
            }}
          >
            <li>
              <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                to="/products"
                style={{ color: '#64748b', textDecoration: 'none' }}
              >
                Vegetables
              </Link>
            </li>
            {categoryName && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    to={`/products?category=${categorySlug}`}
                    style={{ color: '#64748b', textDecoration: 'none' }}
                  >
                    {categoryName}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li
              aria-current="page"
              style={{
                color: '#0f172a',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '260px',
              }}
            >
              {product.name}
            </li>
          </ol>
        </nav>
      </div>

      {/* 2. Main Product Specifications Card (MKT-05, Figma Section 6) */}
      <article
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Column: Large Product Image Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            data-testid="product-image"
            style={{
              position: 'relative',
              width: '100%',
              paddingTop: '80%', // 5:4 aspect ratio
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #f1f5f9',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <LazyImage
                src={productImage}
                alt={product.name}
                priority
                width="100%"
                height="100%"
                fit="cover"
                fallbackLabel={product.name}
                fallback={
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f0fdf4',
                      fontSize: '4.5rem',
                    }}
                  >
                    🥬
                  </div>
                }
              />
            </div>

            {/* Availability Badge Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                zIndex: 2,
              }}
            >
              <AvailabilityBadge product={product} size="md" />
            </div>
          </div>
        </div>

        {/* Right Column: Details, Metadata & Add to Cart Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxSizing: 'border-box',
          }}
        >
          {/* Category Tag */}
          {categoryName && (
            <Link
              to={`/products?category=${categorySlug}`}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {categoryName}
            </Link>
          )}

          {/* Product Name Title */}
          <h1
            data-testid="product-name"
            style={{
              fontSize: '1.875rem',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.25,
              margin: 0,
            }}
          >
            {product.name}
          </h1>

          {/* Rating Display (REV-01, MKT-05) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <RatingDisplay
              rating={ratingValue}
              ratingCount={ratingCount}
              size="md"
              variant="stars"
            />
          </div>

          {/* Seller Business Name & Location */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
              fontSize: '0.875rem',
              color: '#64748b',
              padding: '0.75rem 0',
              borderTop: '1px solid #f1f5f9',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <span aria-hidden="true">🌾</span>
              <span>{STRINGS.PRODUCTS.SELLER_LABEL}:</span>
              {sellerUrl ? (
                <Link
                  to={sellerUrl}
                  data-testid="product-seller"
                  style={{
                    color: '#15803d',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {sellerName}
                </Link>
              ) : (
                <strong
                  data-testid="product-seller"
                  style={{ color: '#334155', fontWeight: 600 }}
                >
                  {sellerName}
                </strong>
              )}
            </div>

            <div
              data-testid="product-location"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span aria-hidden="true">📍</span>
              <span>{sellerLocation}</span>
            </div>
          </div>

          {/* Price, Unit & Stock Availability Panel */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span
                data-testid="product-price"
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#15803d',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatPrice(product.price, product.unit)}
              </span>
              {product.unit && (
                <span
                  data-testid="product-unit"
                  style={{
                    fontSize: '1rem',
                    color: '#64748b',
                    fontWeight: 500,
                  }}
                >
                  / {product.unit}
                </span>
              )}
            </div>

            <div
              data-testid="product-stock"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isOutOfStock ? '#b91c1c' : '#166534',
              }}
            >
              {isOutOfStock
                ? STRINGS.PRODUCTS.OUT_OF_STOCK
                : STRINGS.PRODUCTS.AVAILABLE_STOCK(product.quantity)}
            </div>
          </div>

          {/* Quantity Selector & Add to Cart Action (MKT-06, CART-01) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginTop: '0.25rem',
            }}
          >
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={Math.max(1, Number(product.quantity) || 1)}
              availableStock={product.quantity}
              availability={product.availability}
              disabled={isOutOfStock}
              showStock={false}
            />

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="primary"
                size="lg"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                data-testid="add-to-cart-button"
                style={{
                  flex: 1,
                  minHeight: '48px',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                {isOutOfStock
                  ? STRINGS.PRODUCTS.OUT_OF_STOCK
                  : STRINGS.PRODUCTS.ADD_TO_CART}
              </Button>

              <Button
                to="/cart"
                variant="outline"
                size="lg"
                style={{ minHeight: '48px' }}
              >
                View Cart
              </Button>
            </div>
          </div>

          {/* Delivery Note */}
          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.8125rem',
              color: '#64748b',
            }}
          >
            🚚 {STRINGS.PRODUCTS.DELIVERY_AVAILABLE}
          </p>
        </div>
      </article>

      {/* 3. Product Description Section */}
      <section
        aria-labelledby="product-description-heading"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <h2
          id="product-description-heading"
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
          }}
        >
          Product Description
        </h2>
        <div
          data-testid="product-description"
          style={{
            color: '#334155',
            fontSize: '1rem',
            lineHeight: 1.7,
            whiteSpace: 'pre-line',
          }}
        >
          {product.description ||
            'No detailed description provided for this vegetable listing.'}
        </div>
      </section>

      {/* 4. Seller Information Preview Card (Figma Section 6) */}
      <section
        aria-labelledby="seller-info-heading"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                border: '1px solid #bbf7d0',
                flexShrink: 0,
              }}
            >
              🌾
            </div>
            <div>
              <h2
                id="seller-info-heading"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 0.25rem 0',
                }}
              >
                {sellerName}
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: '#64748b',
                }}
              >
                <span>📍 {sellerLocation}</span>
                {product.seller?.phone && (
                  <span>📞 {product.seller.phone}</span>
                )}
              </div>
            </div>
          </div>

          {sellerUrl && (
            <Button to={sellerUrl} variant="outline" size="md">
              View Seller Profile →
            </Button>
          )}
        </div>
      </section>

      {/* 5. Related Products Section (Figma Section 6) */}
      {relatedProducts.length > 0 && (
        <section
          aria-labelledby="related-products-heading"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div>
            <h2
              id="related-products-heading"
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 0.25rem 0',
              }}
            >
              Related Fresh Produce
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
              Discover more farm-fresh vegetables from our marketplace.
            </p>
          </div>

          <div
            data-testid="related-products-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {relatedProducts.map((relProduct) => (
              <ProductCard
                key={relProduct.id}
                product={relProduct}
                onAddToCart={(p) => {
                  cartContext?.addItem?.(p, 1);
                  toastContext?.success?.(`Added ${p.name} to cart!`);
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

ProductDetails.propTypes = {
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onAddToCart: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ProductDetails;
