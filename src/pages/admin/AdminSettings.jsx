import { useState, useEffect, useContext, useMemo } from 'react';
import { adminService } from '../../services/adminService';
import { ToastContext } from '../../context/toastContextDef';
import { Button, Spinner, ErrorState } from '../../components/common';
import { formatDate } from '../../utils/formatters';

/**
 * Validate email address format.
 */
function isValidEmail(email) {
  if (!email) return true; // Optional field or empty
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * AdminSettings — Marketplace Settings Management Page (ADM-08, Figma Section 14)
 *
 * SRS Reference:
 * - ADM-08: Admins shall be able to maintain marketplace information:
 *   site name, contact email/phone, support text and footer content.
 * - Endpoint: GET /admin/settings, PUT /admin/settings
 * - Data table: site_settings conforming to vegetable_joint_schema.sql
 */
export function AdminSettings() {
  const toast = useContext(ToastContext);

  // Data states
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    site_name: '',
    site_tagline: '',
    contact_email: '',
    contact_phone: '',
    support_text: '',
    footer_text: '',
    default_currency: 'NGN',
    currency_symbol: '₦',
    order_cancellation_window_hours: 24,
    max_image_upload_size_mb: 5,
  });

  // UI & Action states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  // Load settings from backend/mock service
  useEffect(() => {
    let isMounted = true;

    async function fetchSettings() {
      try {
        setFetchError(null);
        const data = await adminService.getSettings();
        if (!isMounted) return;

        const loaded = data || {};
        setSettings(loaded);
        setFormData({
          site_name: loaded.site_name || '',
          site_tagline: loaded.site_tagline || '',
          contact_email: loaded.contact_email || '',
          contact_phone: loaded.contact_phone || '',
          support_text: loaded.support_text || '',
          footer_text: loaded.footer_text || '',
          default_currency: loaded.default_currency || 'NGN',
          currency_symbol: loaded.currency_symbol || '₦',
          order_cancellation_window_hours:
            loaded.order_cancellation_window_hours ?? 24,
          max_image_upload_size_mb: loaded.max_image_upload_size_mb ?? 5,
        });
        setErrors({});
        setSaveError(null);
      } catch (err) {
        if (!isMounted) return;
        setFetchError(
          err?.message ||
            'Failed to load marketplace settings. Please check your connection and retry.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setFetchError(null);
    setRefreshKey((k) => k + 1);
  };

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      (formData.site_name || '') !== (settings.site_name || '') ||
      (formData.site_tagline || '') !== (settings.site_tagline || '') ||
      (formData.contact_email || '') !== (settings.contact_email || '') ||
      (formData.contact_phone || '') !== (settings.contact_phone || '') ||
      (formData.support_text || '') !== (settings.support_text || '') ||
      (formData.footer_text || '') !== (settings.footer_text || '') ||
      (formData.default_currency || '') !== (settings.default_currency || '') ||
      (formData.currency_symbol || '') !== (settings.currency_symbol || '') ||
      Number(formData.order_cancellation_window_hours) !==
        Number(settings.order_cancellation_window_hours ?? 24) ||
      Number(formData.max_image_upload_size_mb) !==
        Number(settings.max_image_upload_size_mb ?? 5)
    );
  }, [formData, settings]);

  // Handle field change
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccess(false);

    // Clear error on edit
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Revert / Reset unsaved changes
  const handleReset = () => {
    if (!settings) return;
    setFormData({
      site_name: settings.site_name || '',
      site_tagline: settings.site_tagline || '',
      contact_email: settings.contact_email || '',
      contact_phone: settings.contact_phone || '',
      support_text: settings.support_text || '',
      footer_text: settings.footer_text || '',
      default_currency: settings.default_currency || 'NGN',
      currency_symbol: settings.currency_symbol || '₦',
      order_cancellation_window_hours:
        settings.order_cancellation_window_hours ?? 24,
      max_image_upload_size_mb: settings.max_image_upload_size_mb ?? 5,
    });
    setErrors({});
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    const trimmedSiteName = formData.site_name.trim();
    if (!trimmedSiteName) {
      newErrors.site_name = 'Marketplace site name is required.';
    } else if (trimmedSiteName.length > 100) {
      newErrors.site_name = 'Site name must not exceed 100 characters.';
    }

    if (formData.contact_email && !isValidEmail(formData.contact_email)) {
      newErrors.contact_email =
        'Please enter a valid contact email address (e.g., support@example.com).';
    }

    if (formData.contact_phone && formData.contact_phone.trim().length > 30) {
      newErrors.contact_phone = 'Phone number is too long (max 30 characters).';
    }

    if (formData.support_text && formData.support_text.length > 500) {
      newErrors.support_text = 'Support text must not exceed 500 characters.';
    }

    if (formData.footer_text && formData.footer_text.length > 400) {
      newErrors.footer_text = 'Footer content must not exceed 400 characters.';
    }

    if (
      formData.order_cancellation_window_hours !== undefined &&
      (Number(formData.order_cancellation_window_hours) < 0 ||
        isNaN(Number(formData.order_cancellation_window_hours)))
    ) {
      newErrors.order_cancellation_window_hours =
        'Cancellation window must be a valid positive number.';
    }

    if (
      formData.max_image_upload_size_mb !== undefined &&
      (Number(formData.max_image_upload_size_mb) <= 0 ||
        isNaN(Number(formData.max_image_upload_size_mb)))
    ) {
      newErrors.max_image_upload_size_mb =
        'Max upload size must be greater than 0 MB.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit and save settings
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const payload = {
        site_name: formData.site_name.trim(),
        site_tagline: formData.site_tagline.trim(),
        contact_email: formData.contact_email.trim(),
        contact_phone: formData.contact_phone.trim(),
        support_text: formData.support_text.trim(),
        footer_text: formData.footer_text.trim(),
        default_currency: formData.default_currency.trim() || 'NGN',
        currency_symbol: formData.currency_symbol.trim() || '₦',
        order_cancellation_window_hours: Number(
          formData.order_cancellation_window_hours
        ),
        max_image_upload_size_mb: Number(formData.max_image_upload_size_mb),
      };

      const updated = await adminService.updateSettings(payload);
      setSettings(updated);
      setSaveSuccess(true);

      if (toast?.showSuccess) {
        toast.showSuccess('Marketplace settings updated successfully.');
      } else if (toast?.addToast) {
        toast.addToast('Marketplace settings updated successfully.', 'success');
      }
    } catch (err) {
      const errMsg =
        err?.message ||
        'Failed to save marketplace settings. Please review inputs and try again.';
      setSaveError(errMsg);
      if (toast?.showError) {
        toast.showError(errMsg);
      } else if (toast?.addToast) {
        toast.addToast(errMsg, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="settings-loading-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '380px',
          gap: '1rem',
          padding: '2rem',
        }}
      >
        <Spinner size="lg" center />
        <span style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Loading marketplace settings...
        </span>
      </div>
    );
  }

  // Initial fetch error state
  if (fetchError && !settings) {
    return (
      <div
        data-testid="settings-fetch-error-state"
        style={{ padding: '1rem 0' }}
      >
        <ErrorState
          title="Marketplace Settings Unavailable"
          message={fetchError}
          onRetry={handleRetry}
          retryLabel="Retry Loading Settings"
        />
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div
      data-testid="admin-settings-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        width: '100%',
        maxWidth: '1280px',
      }}
    >
      {/* Page Header */}
      <div
        data-testid="admin-settings-header"
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
              fontSize: '0.85rem',
              color: '#64748b',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Admin</span>
            <span>/</span>
            <span style={{ color: '#15803d', fontWeight: '600' }}>
              Settings
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Marketplace Settings
          </h1>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.95rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Maintain marketplace information: site name, contact email/phone,
            support text, and footer content (ADM-08).
          </p>
        </div>

        {/* Top Header Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {settings?.updated_at && (
            <span
              data-testid="settings-last-updated"
              style={{
                fontSize: '0.8rem',
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              Updated:{' '}
              {formatDate(settings.updated_at, {
                format: 'dateTime',
                includeTimezone: true,
              })}
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isSaving}
            data-testid="refresh-settings-button"
            style={{ minHeight: '38px' }}
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty || isSaving}
            data-testid="reset-settings-button"
            style={{ minHeight: '38px' }}
          >
            Discard Changes
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSaving || !isDirty}
            data-testid="save-settings-button"
            style={{
              backgroundColor: '#15803d',
              borderColor: '#15803d',
              minHeight: '38px',
              fontWeight: '600',
            }}
          >
            {isSaving ? 'Saving Settings...' : '💾 Save Settings'}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {isDirty && (
        <div
          data-testid="unsaved-changes-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            color: '#92400e',
            fontSize: '0.9rem',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}
          >
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span>
              <strong>Unsaved Changes:</strong> You have modified marketplace
              configuration settings. Click <strong>Save Settings</strong> to
              apply these changes platform-wide.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <Button
              variant="secondary"
              size="xs"
              onClick={handleReset}
              disabled={isSaving}
              data-testid="banner-reset-button"
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={handleSubmit}
              disabled={isSaving}
              data-testid="banner-save-button"
              style={{ backgroundColor: '#b45309', borderColor: '#b45309' }}
            >
              {isSaving ? 'Saving...' : 'Save Now'}
            </Button>
          </div>
        </div>
      )}

      {/* Save Success Alert Banner */}
      {saveSuccess && !isDirty && (
        <div
          data-testid="settings-success-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#166534',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ fontSize: '1.15rem' }}>✅</span>
          <span>
            <strong>Success:</strong> Marketplace configuration settings have
            been saved and published successfully.
          </span>
        </div>
      )}

      {/* Save Error Alert Banner */}
      {saveError && (
        <div
          data-testid="settings-error-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ fontSize: '1.15rem' }}>❌</span>
          <span>
            <strong>Error:</strong> {saveError}
          </span>
        </div>
      )}

      {/* Main Two-Column Layout: Settings Form on Left, Live Preview on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.75rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Form Cards */}
        <form
          onSubmit={handleSubmit}
          data-testid="settings-form"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* Card 1: Brand & Marketplace Identity (ADM-08) */}
          <div
            data-testid="settings-section-brand"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              <span
                style={{
                  fontSize: '1.35rem',
                  backgroundColor: '#f0fdf4',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '8px',
                }}
              >
                🏪
              </span>
              <div>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Marketplace Brand & Identity
                </h2>
                <p
                  style={{
                    fontSize: '0.825rem',
                    color: '#64748b',
                    margin: '0.15rem 0 0 0',
                  }}
                >
                  Configure site name and marketplace tagline rendered in
                  navigation and document headers.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* Site Name (ADM-08) */}
              <div>
                <label
                  htmlFor="input-site-name"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '0.35rem',
                  }}
                >
                  Site Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="input-site-name"
                  name="site_name"
                  type="text"
                  value={formData.site_name}
                  onChange={(e) => handleChange('site_name', e.target.value)}
                  placeholder="e.g. Vegetable Joint"
                  data-testid="input-site-name"
                  aria-invalid={!!errors.site_name}
                  aria-describedby={
                    errors.site_name ? 'error-site-name' : 'hint-site-name'
                  }
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${errors.site_name ? '#dc2626' : '#cbd5e1'}`,
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.15s ease',
                  }}
                />
                {errors.site_name ? (
                  <span
                    id="error-site-name"
                    data-testid="error-site-name"
                    style={{
                      display: 'block',
                      color: '#dc2626',
                      fontSize: '0.8rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    {errors.site_name}
                  </span>
                ) : (
                  <span
                    id="hint-site-name"
                    style={{
                      display: 'block',
                      color: '#94a3b8',
                      fontSize: '0.775rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    The official marketplace platform name.
                  </span>
                )}
              </div>

              {/* Tagline / Subtitle */}
              <div>
                <label
                  htmlFor="input-site-tagline"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '0.35rem',
                  }}
                >
                  Marketplace Tagline
                </label>
                <input
                  id="input-site-tagline"
                  name="site_tagline"
                  type="text"
                  value={formData.site_tagline}
                  onChange={(e) => handleChange('site_tagline', e.target.value)}
                  placeholder="e.g. Digital Vegetable Marketplace"
                  data-testid="input-site-tagline"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                  }}
                />
                <span
                  style={{
                    display: 'block',
                    color: '#94a3b8',
                    fontSize: '0.775rem',
                    marginTop: '0.35rem',
                  }}
                >
                  Short slogan or descriptive subtitle displayed beneath the
                  logo.
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Contact Details & Support Text (ADM-08) */}
          <div
            data-testid="settings-section-contact"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              <span
                style={{
                  fontSize: '1.35rem',
                  backgroundColor: '#eff6ff',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '8px',
                }}
              >
                📞
              </span>
              <div>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Contact Details & Support Text
                </h2>
                <p
                  style={{
                    fontSize: '0.825rem',
                    color: '#64748b',
                    margin: '0.15rem 0 0 0',
                  }}
                >
                  Customer care contact information and support banner message
                  for buyers and sellers.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* Contact Email & Phone Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}
              >
                {/* Contact Email (ADM-08) */}
                <div>
                  <label
                    htmlFor="input-contact-email"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Contact Email
                  </label>
                  <input
                    id="input-contact-email"
                    name="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      handleChange('contact_email', e.target.value)
                    }
                    placeholder="support@vegetablejoint.ng"
                    data-testid="input-contact-email"
                    aria-invalid={!!errors.contact_email}
                    aria-describedby={
                      errors.contact_email
                        ? 'error-contact-email'
                        : 'hint-contact-email'
                    }
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: `1px solid ${
                        errors.contact_email ? '#dc2626' : '#cbd5e1'
                      }`,
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  {errors.contact_email ? (
                    <span
                      id="error-contact-email"
                      data-testid="error-contact-email"
                      style={{
                        display: 'block',
                        color: '#dc2626',
                        fontSize: '0.8rem',
                        marginTop: '0.35rem',
                      }}
                    >
                      {errors.contact_email}
                    </span>
                  ) : (
                    <span
                      id="hint-contact-email"
                      style={{
                        display: 'block',
                        color: '#94a3b8',
                        fontSize: '0.775rem',
                        marginTop: '0.35rem',
                      }}
                    >
                      Public helpdesk inbox for marketplace inquiries.
                    </span>
                  )}
                </div>

                {/* Contact Phone (ADM-08) */}
                <div>
                  <label
                    htmlFor="input-contact-phone"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Contact Phone
                  </label>
                  <input
                    id="input-contact-phone"
                    name="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      handleChange('contact_phone', e.target.value)
                    }
                    placeholder="+234 800 000 0000"
                    data-testid="input-contact-phone"
                    aria-invalid={!!errors.contact_phone}
                    aria-describedby={
                      errors.contact_phone
                        ? 'error-contact-phone'
                        : 'hint-contact-phone'
                    }
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: `1px solid ${
                        errors.contact_phone ? '#dc2626' : '#cbd5e1'
                      }`,
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff',
                    }}
                  />
                  {errors.contact_phone ? (
                    <span
                      id="error-contact-phone"
                      data-testid="error-contact-phone"
                      style={{
                        display: 'block',
                        color: '#dc2626',
                        fontSize: '0.8rem',
                        marginTop: '0.35rem',
                      }}
                    >
                      {errors.contact_phone}
                    </span>
                  ) : (
                    <span
                      id="hint-contact-phone"
                      style={{
                        display: 'block',
                        color: '#94a3b8',
                        fontSize: '0.775rem',
                        marginTop: '0.35rem',
                      }}
                    >
                      Helpline or WhatsApp contact number.
                    </span>
                  )}
                </div>
              </div>

              {/* Support Text (ADM-08) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.35rem',
                  }}
                >
                  <label
                    htmlFor="textarea-support-text"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#334155',
                    }}
                  >
                    Support Guidance Text
                  </label>
                  <span
                    data-testid="support-text-char-count"
                    style={{
                      fontSize: '0.75rem',
                      color:
                        formData.support_text.length > 500
                          ? '#dc2626'
                          : '#94a3b8',
                    }}
                  >
                    {formData.support_text.length}/500
                  </span>
                </div>
                <textarea
                  id="textarea-support-text"
                  name="support_text"
                  rows={3}
                  value={formData.support_text}
                  onChange={(e) => handleChange('support_text', e.target.value)}
                  placeholder="Need help? Contact us and our support team will get back to you."
                  data-testid="textarea-support-text"
                  aria-invalid={!!errors.support_text}
                  aria-describedby={
                    errors.support_text
                      ? 'error-support-text'
                      : 'hint-support-text'
                  }
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${
                      errors.support_text ? '#dc2626' : '#cbd5e1'
                    }`,
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
                {errors.support_text ? (
                  <span
                    id="error-support-text"
                    data-testid="error-support-text"
                    style={{
                      display: 'block',
                      color: '#dc2626',
                      fontSize: '0.8rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    {errors.support_text}
                  </span>
                ) : (
                  <span
                    id="hint-support-text"
                    style={{
                      display: 'block',
                      color: '#94a3b8',
                      fontSize: '0.775rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    Informational message presented in customer support sections
                    and order help prompts.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Footer Content & Legal Notice (ADM-08) */}
          <div
            data-testid="settings-section-footer"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              <span
                style={{
                  fontSize: '1.35rem',
                  backgroundColor: '#f8fafc',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '8px',
                }}
              >
                📄
              </span>
              <div>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Footer Content & Copyright Notice
                </h2>
                <p
                  style={{
                    fontSize: '0.825rem',
                    color: '#64748b',
                    margin: '0.15rem 0 0 0',
                  }}
                >
                  Legal copyright attribution, credits, and disclaimer rendered
                  in the marketplace footer.
                </p>
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.35rem',
                }}
              >
                <label
                  htmlFor="textarea-footer-text"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#334155',
                  }}
                >
                  Footer Content Text
                </label>
                <span
                  data-testid="footer-text-char-count"
                  style={{
                    fontSize: '0.75rem',
                    color:
                      formData.footer_text.length > 400 ? '#dc2626' : '#94a3b8',
                  }}
                >
                  {formData.footer_text.length}/400
                </span>
              </div>
              <textarea
                id="textarea-footer-text"
                name="footer_text"
                rows={2}
                value={formData.footer_text}
                onChange={(e) => handleChange('footer_text', e.target.value)}
                placeholder="© Vegetable Joint — TriNova Technologies. All rights reserved."
                data-testid="textarea-footer-text"
                aria-invalid={!!errors.footer_text}
                aria-describedby={
                  errors.footer_text ? 'error-footer-text' : 'hint-footer-text'
                }
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${
                    errors.footer_text ? '#dc2626' : '#cbd5e1'
                  }`,
                  outline: 'none',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              {errors.footer_text ? (
                <span
                  id="error-footer-text"
                  data-testid="error-footer-text"
                  style={{
                    display: 'block',
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    marginTop: '0.35rem',
                  }}
                >
                  {errors.footer_text}
                </span>
              ) : (
                <span
                  id="hint-footer-text"
                  style={{
                    display: 'block',
                    color: '#94a3b8',
                    fontSize: '0.775rem',
                    marginTop: '0.35rem',
                  }}
                >
                  Displays at the bottom of public pages. Tip: Year updates
                  dynamically if written with &copy;.
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Operational Platform Defaults (Collapsible) */}
          <div
            data-testid="settings-section-operational"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setShowAdvanced((prev) => !prev)}
              data-testid="toggle-advanced-settings"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setShowAdvanced((prev) => !prev);
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <span
                  style={{
                    fontSize: '1.35rem',
                    backgroundColor: '#f1f5f9',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '8px',
                  }}
                >
                  ⚙️
                </span>
                <div>
                  <h2
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Operational Platform Defaults
                  </h2>
                  <p
                    style={{
                      fontSize: '0.825rem',
                      color: '#64748b',
                      margin: '0.15rem 0 0 0',
                    }}
                  >
                    Currency codes, order cancellation window, and upload
                    limits.
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '1.25rem', color: '#64748b' }}>
                {showAdvanced ? '▲' : '▼'}
              </span>
            </div>

            {showAdvanced && (
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div>
                  <label
                    htmlFor="input-default-currency"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Default Currency Code
                  </label>
                  <input
                    id="input-default-currency"
                    type="text"
                    value={formData.default_currency}
                    onChange={(e) =>
                      handleChange('default_currency', e.target.value)
                    }
                    data-testid="input-default-currency"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-currency-symbol"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Currency Symbol
                  </label>
                  <input
                    id="input-currency-symbol"
                    type="text"
                    value={formData.currency_symbol}
                    onChange={(e) =>
                      handleChange('currency_symbol', e.target.value)
                    }
                    data-testid="input-currency-symbol"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-cancellation-window"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Cancellation Window (Hours)
                  </label>
                  <input
                    id="input-cancellation-window"
                    type="number"
                    min="0"
                    value={formData.order_cancellation_window_hours}
                    onChange={(e) =>
                      handleChange(
                        'order_cancellation_window_hours',
                        e.target.value
                      )
                    }
                    data-testid="input-cancellation-window"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: `1px solid ${
                        errors.order_cancellation_window_hours
                          ? '#dc2626'
                          : '#cbd5e1'
                      }`,
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.order_cancellation_window_hours && (
                    <span
                      style={{
                        color: '#dc2626',
                        fontSize: '0.75rem',
                        marginTop: '0.25rem',
                        display: 'block',
                      }}
                    >
                      {errors.order_cancellation_window_hours}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="input-max-upload"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Max Upload Size (MB)
                  </label>
                  <input
                    id="input-max-upload"
                    type="number"
                    min="1"
                    value={formData.max_image_upload_size_mb}
                    onChange={(e) =>
                      handleChange('max_image_upload_size_mb', e.target.value)
                    }
                    data-testid="input-max-upload"
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: `1px solid ${
                        errors.max_image_upload_size_mb ? '#dc2626' : '#cbd5e1'
                      }`,
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.max_image_upload_size_mb && (
                    <span
                      style={{
                        color: '#dc2626',
                        fontSize: '0.75rem',
                        marginTop: '0.25rem',
                        display: 'block',
                      }}
                    >
                      {errors.max_image_upload_size_mb}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              padding: '1.25rem 0',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={!isDirty || isSaving}
              data-testid="bottom-reset-button"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving || !isDirty}
              data-testid="bottom-save-button"
              style={{
                backgroundColor: '#15803d',
                borderColor: '#15803d',
                fontWeight: '600',
                padding: '0.65rem 1.5rem',
              }}
            >
              {isSaving ? 'Saving Changes...' : 'Save Settings'}
            </Button>
          </div>
        </form>

        {/* Right Column: Live Marketplace Preview Panel */}
        <div
          data-testid="settings-live-preview"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'sticky',
            top: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span style={{ fontSize: '1.2rem' }}>👁️</span>
                <div>
                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    Live Marketplace Preview
                  </h3>
                  <p
                    style={{
                      fontSize: '0.775rem',
                      color: '#64748b',
                      margin: '0.1rem 0 0 0',
                    }}
                  >
                    Real-time preview of public components
                  </p>
                </div>
              </div>

              {/* Device view switcher */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '6px',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  data-testid="preview-device-desktop"
                  style={{
                    backgroundColor:
                      previewDevice === 'desktop' ? '#ffffff' : 'transparent',
                    color: previewDevice === 'desktop' ? '#0f172a' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: previewDevice === 'desktop' ? '600' : '400',
                    cursor: 'pointer',
                    boxShadow:
                      previewDevice === 'desktop'
                        ? '0 1px 2px rgba(0,0,0,0.05)'
                        : 'none',
                  }}
                >
                  🖥️ Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  data-testid="preview-device-mobile"
                  style={{
                    backgroundColor:
                      previewDevice === 'mobile' ? '#ffffff' : 'transparent',
                    color: previewDevice === 'mobile' ? '#0f172a' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: previewDevice === 'mobile' ? '600' : '400',
                    cursor: 'pointer',
                    boxShadow:
                      previewDevice === 'mobile'
                        ? '0 1px 2px rgba(0,0,0,0.05)'
                        : 'none',
                  }}
                >
                  📱 Mobile
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxWidth: previewDevice === 'mobile' ? '320px' : '100%',
                margin: previewDevice === 'mobile' ? '0 auto' : '0',
                transition: 'max-width 0.25s ease',
              }}
            >
              {/* Preview 1: Header Brand Preview */}
              <div
                data-testid="preview-header-card"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.725rem',
                    fontWeight: '600',
                    color: '#64748b',
                    borderBottom: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Header Navigation Preview
                </div>
                <div
                  style={{
                    backgroundColor: '#15803d',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>🥦</span>
                    <div>
                      <div
                        data-testid="preview-site-name"
                        style={{
                          fontWeight: '700',
                          fontSize: '1rem',
                          lineHeight: '1.2',
                        }}
                      >
                        {formData.site_name || 'Vegetable Joint'}
                      </div>
                      <div
                        data-testid="preview-site-tagline"
                        style={{
                          fontSize: '0.7rem',
                          opacity: 0.85,
                          lineHeight: '1.2',
                        }}
                      >
                        {formData.site_tagline ||
                          'Digital Vegetable Marketplace'}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    Cart (0)
                  </div>
                </div>
              </div>

              {/* Preview 2: Support & Contact Help Banner */}
              <div
                data-testid="preview-support-card"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.725rem',
                    fontWeight: '600',
                    color: '#64748b',
                    borderBottom: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Support Box Preview
                </div>
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    borderLeft: '4px solid #15803d',
                    padding: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#166534',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <span>💬</span>
                    <span>Customer Assistance</span>
                  </div>
                  <p
                    data-testid="preview-support-text"
                    style={{
                      fontSize: '0.8rem',
                      color: '#334155',
                      margin: '0 0 0.65rem 0',
                      lineHeight: '1.4',
                    }}
                  >
                    {formData.support_text ||
                      'Need help? Contact us and our support team will get back to you.'}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      fontSize: '0.775rem',
                      color: '#475569',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>✉️</span>
                      <strong data-testid="preview-contact-email">
                        {formData.contact_email || 'support@vegetablejoint.ng'}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>📞</span>
                      <strong data-testid="preview-contact-phone">
                        {formData.contact_phone || '+234 800 000 0000'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview 3: Footer Preview */}
              <div
                data-testid="preview-footer-card"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.725rem',
                    fontWeight: '600',
                    color: '#64748b',
                    borderBottom: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Marketplace Footer Preview
                </div>
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    padding: '1rem',
                    fontSize: '0.775rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.85rem',
                      borderBottom: '1px solid #1e293b',
                      paddingBottom: '0.65rem',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                        }}
                      >
                        {formData.site_name || 'Vegetable Joint'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Fresh agricultural marketplace
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.7rem' }}>
                      <div style={{ color: '#22c55e', fontWeight: '600' }}>
                        Helpline
                      </div>
                      <div>{formData.contact_phone || '+234 800 000 0000'}</div>
                    </div>
                  </div>
                  <div
                    data-testid="preview-footer-text"
                    style={{
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '0.725rem',
                      lineHeight: '1.4',
                    }}
                  >
                    {formData.footer_text
                      ? formData.footer_text.includes(String(currentYear))
                        ? formData.footer_text
                        : formData.footer_text.replace('©', `© ${currentYear}`)
                      : `© ${currentYear} ${
                          formData.site_name || 'Vegetable Joint'
                        } — TriNova Technologies. All rights reserved.`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
