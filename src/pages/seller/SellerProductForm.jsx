import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../../hooks';
import { canSellerPublish } from '../../utils/sellerStatus';
import { sellerService } from '../../services/sellerService';
import { categoryService } from '../../services/categoryService';
import {
  Button,
  Input,
  Select,
  Textarea,
  ImageUploader,
} from '../../components/common';

const ALLOWED_UNITS = [
  { value: 'basket', label: 'per basket' },
  { value: 'kg', label: 'per kg' },
  { value: 'bag', label: 'per bag' },
  { value: 'bunch', label: 'per bunch' },
  { value: 'piece', label: 'per piece' },
  { value: 'crate', label: 'per crate' },
];

/**
 * SellerProductForm — Add / Edit Vegetable Listing Form
 *
 * SRS References:
 * - SEL-02: Create product (name, description, category, price > 0, unit, quantity >= 0, image, availability).
 *           Name, category, price (> 0), unit and quantity (>= 0) are mandatory.
 * - SEL-03: Edit product fields (including price and quantity).
 * - SEL-05: Product image upload (JPEG, PNG, WebP, max 2 MB); default placeholder when missing.
 * - SEL-07: Automatic availability derived (stock > 0 -> Available, stock = 0 -> Out of Stock) and manual Unavailable toggle.
 * - SEL-09: Low-stock indicator threshold (default 5).
 * - AUTH-03, ADM-03: Publishing restrictions for pending, suspended, or rejected sellers.
 * - UI-05, NFR-USAB-05: Simple form with inline validation, preserved inputs on error.
 */
export function SellerProductForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const canPublish = canSellerPublish(user);

  // Form input states
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    unit: 'basket',
    quantity: '10',
    low_stock_threshold: '5',
    description: '',
    availability: 'available', // 'available' (derived) or 'unavailable' (manual toggle)
    image: '',
    imagePreview: null,
  });

  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditing);
  const [serverError, setServerError] = useState(null);

  // Load available categories
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const catData = await categoryService.getCategories();
        if (isMounted && Array.isArray(catData)) {
          setCategories(catData);
          // Set initial default category if not editing
          if (!isEditing && catData.length > 0) {
            setFormData((prev) => ({
              ...prev,
              category_id: prev.category_id || String(catData[0].id),
            }));
          }
        }
      } catch {
        // Fallback default categories
        if (isMounted) {
          setCategories([
            { id: 1, name: 'Tomato', slug: 'tomato' },
            { id: 2, name: 'Pepper', slug: 'pepper' },
            { id: 3, name: 'Leafy Greens', slug: 'leafy-greens' },
            { id: 4, name: 'Onion', slug: 'onion' },
          ]);
        }
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, [isEditing]);

  // Load product data when in edit mode (FE-085 / SEL-03)
  useEffect(() => {
    if (!isEditing || !id) return;
    let isMounted = true;

    async function loadProduct() {
      try {
        setIsLoadingProduct(true);
        const prod = await sellerService.getProductById(id);
        if (isMounted && prod) {
          setFormData({
            name: prod.name || '',
            category_id: String(prod.category_id || prod.category?.id || ''),
            price: String(prod.price ?? ''),
            unit: prod.unit || 'basket',
            quantity: String(prod.quantity ?? '0'),
            low_stock_threshold: String(prod.low_stock_threshold ?? '5'),
            description: prod.description || '',
            availability:
              prod.availability === 'unavailable' ? 'unavailable' : 'available',
            image: prod.image || '',
            imagePreview: prod.image || null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setServerError(
            err?.message || 'Unable to load vegetable details for editing.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingProduct(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [isEditing, id]);

  // If seller cannot publish, render locked notice (AUTH-03, ADM-03)
  if (!canPublish) {
    return (
      <div
        data-testid="product-form-publishing-locked-container"
        style={{
          maxWidth: '650px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div>
          <Link
            to="/seller/products"
            style={{
              color: '#15803d',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            ← Back to My Products
          </Link>
          <h1
            style={{
              fontSize: '1.75rem',
              color: '#1e293b',
              margin: '0.5rem 0 0 0',
            }}
          >
            {isEditing
              ? `Edit Vegetable Listing #${id}`
              : 'Add New Vegetable Listing'}
          </h1>
        </div>

        {/* Publishing locked notice (FE-064 / AUTH-03 / ADM-03) */}
        <div
          data-testid="product-form-publishing-locked"
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              margin: 0,
            }}
          >
            🔒 Product publishing is disabled
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55 }}>
            Your seller account is not currently approved, so you cannot
            {isEditing
              ? ' edit or republish this listing'
              : ' create or publish new listings'}{' '}
            (AUTH-03, ADM-03). Product publishing becomes available as soon as a
            platform administrator approves your account.
          </p>
          <button
            type="button"
            disabled
            data-testid="save-product-submit-btn"
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#f1f5f9',
              color: '#94a3b8',
              border: '1px solid #cbd5e1',
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              cursor: 'not-allowed',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            🔒 Publishing Disabled (Pending Approval)
          </button>
          <Link
            to="/seller"
            data-testid="product-form-blocked-back-link"
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#15803d',
              color: '#ffffff',
              padding: '0.55rem 1.1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.875rem',
            }}
          >
            Return to Seller Overview
          </Link>
        </div>
      </div>
    );
  }

  // Field validation (SEL-02, UI-05)
  const validateField = (name, value) => {
    switch (name) {
      case 'name': {
        const trimmed = String(value || '').trim();
        if (!trimmed) {
          return 'Vegetable name is required (SEL-02).';
        }
        if (trimmed.length < 2) {
          return 'Vegetable name must be at least 2 characters.';
        }
        return null;
      }
      case 'category_id': {
        if (!value || value === 'all' || String(value).trim() === '') {
          return 'Please select a vegetable category (SEL-02).';
        }
        return null;
      }
      case 'price': {
        if (value === '' || value === undefined || value === null) {
          return 'Price is required (SEL-02).';
        }
        const num = Number(value);
        if (isNaN(num) || num <= 0) {
          return 'Price must be greater than ₦0 (SEL-02).';
        }
        return null;
      }
      case 'unit': {
        if (!value || String(value).trim() === '') {
          return 'Please select a selling unit (SEL-02).';
        }
        return null;
      }
      case 'quantity': {
        if (value === '' || value === undefined || value === null) {
          return 'Quantity is required (SEL-02).';
        }
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return 'Quantity cannot be negative (SEL-02).';
        }
        return null;
      }
      default:
        return null;
    }
  };

  const validateAll = () => {
    const newErrors = {};
    const nameErr = validateField('name', formData.name);
    if (nameErr) newErrors.name = nameErr;

    const catErr = validateField('category_id', formData.category_id);
    if (catErr) newErrors.category_id = catErr;

    const priceErr = validateField('price', formData.price);
    if (priceErr) newErrors.price = priceErr;

    const unitErr = validateField('unit', formData.unit);
    if (unitErr) newErrors.unit = unitErr;

    const qtyErr = validateField('quantity', formData.quantity);
    if (qtyErr) newErrors.quantity = qtyErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for field if valid
    if (errors[name]) {
      const fieldErr = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: fieldErr || undefined }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const fieldErr = validateField(name, value);
    if (fieldErr) {
      setErrors((prev) => ({ ...prev, [name]: fieldErr }));
    }
  };

  // Form submission handler (SEL-02, SEL-03)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const isValid = validateAll();
    if (!isValid) {
      // Focus first error field if any
      return;
    }

    setIsSubmitting(true);

    try {
      const currentSellerId =
        user?.seller_id ??
        user?.seller?.id ??
        (user?.role === 'seller' ? user?.id : 1);

      const payload = {
        seller_id: currentSellerId,
        name: formData.name.trim(),
        category_id: Number(formData.category_id),
        price: Number(formData.price),
        unit: formData.unit,
        quantity: Number(formData.quantity),
        low_stock_threshold: Number(formData.low_stock_threshold || 5),
        description: formData.description.trim(),
        availability:
          formData.availability === 'unavailable'
            ? 'unavailable'
            : Number(formData.quantity) > 0
              ? 'in_stock'
              : 'out_of_stock',
        image: formData.imagePreview || formData.image || '',
      };

      if (isEditing) {
        await sellerService.updateProduct(id, payload);
        toast?.success?.(
          `Vegetable listing "${payload.name}" updated successfully (SEL-03)!`
        );
      } else {
        await sellerService.createProduct(payload);
        toast?.success?.(
          `Vegetable listing "${payload.name}" created and published successfully (SEL-02)!`
        );
      }

      navigate('/seller/products');
    } catch (err) {
      setServerError(
        err?.message ||
          'Failed to save vegetable listing. Please check the fields and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill sample data for fast testing / demo
  const handleQuickFill = () => {
    setFormData({
      name: 'Farm Fresh Roma Tomatoes',
      category_id: categories[0]?.id ? String(categories[0].id) : '1',
      price: '2800',
      unit: 'basket',
      quantity: '25',
      low_stock_threshold: '5',
      description:
        'Crisp, vine-ripened red tomatoes directly harvested from Gombe farms. Firm, flavorful, and perfect for stews.',
      availability: 'available',
      image:
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      imagePreview:
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
    });
    setErrors({});
  };

  if (isLoadingProduct) {
    return (
      <div
        data-testid="product-form-loading"
        style={{ padding: '2rem', textAlign: 'center' }}
      >
        <p style={{ color: '#64748b' }}>Loading vegetable listing details...</p>
      </div>
    );
  }

  if (isEditing && serverError && !formData.name) {
    return (
      <div
        data-testid="product-not-found-state"
        style={{
          maxWidth: '650px',
          margin: '2rem auto',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          padding: '2.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🥦</div>
        <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>
          Listing Not Found
        </h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          {serverError ||
            'The requested vegetable listing could not be found or you do not have permission to view it.'}
        </p>
        <Link
          to="/seller/products"
          data-testid="product-error-back-link"
          style={{
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'inline-block',
          }}
        >
          ← Return to My Products
        </Link>
      </div>
    );
  }

  const quantityNum = Number(formData.quantity || 0);
  const derivedAvailability =
    formData.availability === 'unavailable'
      ? 'Unavailable (Hidden from buyers)'
      : quantityNum > 0
        ? 'Available (In Stock)'
        : 'Out of Stock (Automatic)';

  return (
    <div
      data-testid="seller-product-form-page"
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
      }}
    >
      {/* 1. Header & Navigation Back Link */}
      <div>
        <Link
          to="/seller/products"
          data-testid="product-form-back-link"
          style={{
            color: '#15803d',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            marginBottom: '0.5rem',
          }}
        >
          ← Back to My Products
        </Link>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h1
            data-testid="product-form-title"
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.025em',
            }}
          >
            {isEditing
              ? `Edit Vegetable Listing #${id}`
              : 'Add New Vegetable Listing'}{' '}
            (SEL-02, SEL-03)
          </h1>

          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleQuickFill}
              data-testid="product-quick-fill-btn"
              style={{ fontSize: '0.8rem' }}
            >
              ⚡ Quick Fill Sample Produce
            </Button>
          )}
        </div>
        <p
          data-testid="product-form-subtitle"
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.35rem 0 0 0',
          }}
        >
          {isEditing
            ? 'Update price, stock, category, or listing details for this vegetable.'
            : 'Publish a new vegetable listing with price, unit, and stock to the marketplace.'}
        </p>
      </div>

      {/* 2. Server Error Feedback Alert */}
      {serverError && (
        <div
          data-testid="product-form-error-alert"
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
          }}
        >
          ⚠️ {serverError}
        </div>
      )}

      {/* 3. Form Card Container */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          data-testid="seller-product-form"
        >
          {/* Vegetable Name Field (SEL-02 Mandatory) */}
          <Input
            id="prod-name"
            name="name"
            label="Vegetable Name *"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. Fresh Roma Tomatoes, Green Habanero, Spinach (Alayyahu)"
            error={errors.name}
            helperText="Provide a clear, recognizable produce name for marketplace buyers."
            data-testid="product-name-input"
            required
          />

          {/* Category Dropdown (SEL-02 Mandatory) */}
          <Select
            id="prod-category"
            name="category_id"
            label="Category *"
            value={formData.category_id}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.category_id}
            helperText="Assign to a produce classification (Tomato, Pepper, Leafy Greens, etc.)."
            data-testid="product-category-select"
            required
          >
            <option value="">-- Select a Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>

          {/* Price & Unit Grid (SEL-02 Mandatory: price > 0, unit) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <Input
              id="prod-price"
              name="price"
              type="number"
              min="1"
              step="any"
              label="Price (₦) *"
              value={formData.price}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 2500"
              prefix="₦"
              error={errors.price}
              helperText="Selling price in Nigerian Naira (> ₦0)."
              data-testid="product-price-input"
              required
            />

            <Select
              id="prod-unit"
              name="unit"
              label="Selling Unit *"
              value={formData.unit}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.unit}
              helperText="Standard produce measurement unit (SEL-02)."
              data-testid="product-unit-select"
              required
            >
              {ALLOWED_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Stock Quantity & Low-Stock Threshold Grid (SEL-02: quantity >= 0, SEL-09) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <Input
              id="prod-stock"
              name="quantity"
              type="number"
              min="0"
              step="1"
              label="Stock Quantity Available *"
              value={formData.quantity}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 15"
              error={errors.quantity}
              helperText="Available quantity in inventory (0 sets Out of Stock automatically)."
              data-testid="product-quantity-input"
              required
            />

            <Input
              id="prod-threshold"
              name="low_stock_threshold"
              type="number"
              min="1"
              step="1"
              label="Low-Stock Alert Threshold"
              value={formData.low_stock_threshold}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="5"
              helperText="Warns seller when stock reaches this level (default 5, SEL-09)."
              data-testid="product-threshold-input"
            />
          </div>

          {/* Availability Control (SEL-07: Auto derived + manual hide switch) */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
            data-testid="product-availability-section"
          >
            <label
              htmlFor="prod-availability"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              Availability Mode (SEL-07)
            </label>
            <select
              id="prod-availability"
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              data-testid="product-availability-select"
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '0.9rem',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <option value="available">
                Available / Automatic (Active on marketplace if stock &gt; 0)
              </option>
              <option value="unavailable">
                Unavailable (Manually hide listing from marketplace regardless
                of stock)
              </option>
            </select>
            <div
              style={{
                fontSize: '0.8rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>Current Status:</span>
              <strong
                data-testid="product-derived-availability-label"
                style={{
                  color:
                    formData.availability === 'unavailable'
                      ? '#64748b'
                      : quantityNum > 0
                        ? '#15803d'
                        : '#dc2626',
                }}
              >
                {derivedAvailability}
              </strong>
            </div>
          </div>

          {/* Description Field (SEL-02 Optional) */}
          <Textarea
            id="prod-description"
            name="description"
            label="Produce Description (Optional)"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide harvest details, freshness information, taste, origin farm, or storage instructions..."
            rows={3}
            helperText="Help buyers make confident produce purchases with rich details."
            data-testid="product-description-input"
          />

          {/* Product Image Upload, Preview & Progress (FE-084 / SEL-05) */}
          <ImageUploader
            id="prod-image-file"
            label="Product Image (SEL-05)"
            helperText="JPEG, PNG or WebP — Maximum 2 MB (A-08, SEL-05)"
            value={formData.imagePreview || formData.image}
            onChange={({ file, previewUrl, uploadedUrl }) => {
              setFormData((prev) => ({
                ...prev,
                imageFile: file || null,
                imagePreview: previewUrl || null,
                image:
                  uploadedUrl !== undefined ? uploadedUrl || '' : prev.image,
              }));
              if (errors.image) {
                setErrors((prev) => ({ ...prev, image: undefined }));
              }
            }}
            onRemove={() => {
              setFormData((prev) => ({
                ...prev,
                image: '',
                imageFile: null,
                imagePreview: null,
              }));
              setErrors((prev) => ({ ...prev, image: undefined }));
            }}
            onError={(errMsg) => {
              setErrors((prev) => ({ ...prev, image: errMsg }));
            }}
            externalError={errors.image}
            disabled={!canPublish || isSubmitting}
            autoUpload={true}
            testId="product-image"
          />

          {/* Form Actions (Save & Publish vs Cancel) */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              loadingText={isEditing ? 'Updating...' : 'Publishing...'}
              data-testid="save-product-submit-btn"
            >
              {isEditing ? 'Update Listing' : 'Save & Publish Listing'}
            </Button>

            <Link
              to="/seller/products"
              data-testid="product-cancel-link"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
                padding: '0.5rem 1rem',
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SellerProductForm;
