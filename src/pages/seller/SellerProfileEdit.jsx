import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { ToastContext } from '../../context/toastContextDef';
import { sellerService } from '../../services/sellerService';
import { authService } from '../../services/authService';
import { SellerApprovalNotice } from '../../components/seller/SellerApprovalNotice';
import { SellerStatusBadge } from '../../components/seller/SellerStatusBadge';
import { Button, Spinner } from '../../components/common';
import {
  validateName,
  validatePhone,
  validateBusinessName,
  validateLocation,
  validateDescription,
  validatePassword,
  validateConfirmPassword,
  getPasswordCriteria,
} from '../../utils/validation';

const EMPTY_PASSWORD_FORM = {
  current_password: '',
  password: '',
  password_confirmation: '',
};

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '8px',
  border: `1px solid ${hasError ? '#ef4444' : '#cbd5e1'}`,
  boxSizing: 'border-box',
  fontSize: '0.9rem',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none',
  transition: 'border-color 0.15s ease',
});

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '600',
  marginBottom: '0.35rem',
  color: '#334155',
};

const helperStyle = {
  fontSize: '0.75rem',
  color: '#64748b',
  margin: '0.25rem 0 0 0',
};

const fieldErrorStyle = {
  color: '#dc2626',
  fontSize: '0.775rem',
  margin: '0.35rem 0 0 0',
  fontWeight: '500',
};

const sectionCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '1.75rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
};

/**
 * SellerProfileEdit — Dedicated Seller Profile & Business Settings Page
 *
 * SRS References:
 * - FE-094: Seller profile edit: Edit business name, location, description, phone.
 * - AUTH-11: User view & update profile (name, phone, and for Sellers: business name,
 *   location, description) and change password.
 * - SEL-01: Seller dashboard navigation sections including Profile.
 * - SEL-14 / BR-08: Object-level authorization: seller only modifies own store profile.
 * - Figma Section 13: Seller Profile edit form (business name, location, description,
 *   phone, account info) with storefront preview.
 */
export function SellerProfileEdit() {
  const { user, updateProfile, changePassword } = useAuth();
  const toast = useContext(ToastContext);

  // Resolved seller identity
  const sellerId =
    user?.seller_id ??
    user?.seller_profile?.id ??
    user?.seller?.id ??
    (user?.role === 'seller' ? user?.id : 1);

  const approvalStatus =
    user?.approval_status ??
    user?.seller_profile?.approval_status ??
    user?.seller?.approval_status ??
    'approved';

  // Initial values helper
  const getInitialFormValues = (sourceUser) => ({
    name: sourceUser?.name || '',
    phone:
      sourceUser?.seller_profile?.phone ||
      sourceUser?.seller?.phone ||
      sourceUser?.phone ||
      '',
    business_name:
      sourceUser?.seller_profile?.business_name ||
      sourceUser?.seller?.business_name ||
      '',
    location:
      sourceUser?.seller_profile?.location ||
      sourceUser?.seller?.location ||
      '',
    description:
      sourceUser?.seller_profile?.description ||
      sourceUser?.seller?.description ||
      '',
  });

  const [form, setForm] = useState(() => getInitialFormValues(user));
  const [initialSavedForm, setInitialSavedForm] = useState(() =>
    getInitialFormValues(user)
  );
  const [profileErrors, setProfileErrors] = useState({});
  const [profileTouched, setProfileTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Password change state
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');

  // Sync with user from auth context or fetch fresh profile if needed
  useEffect(() => {
    if (user) {
      const initial = getInitialFormValues(user);
      setForm(initial);
      setInitialSavedForm(initial);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadFreshProfile() {
      try {
        const fresh = await sellerService.getSellerProfile();
        const freshSeller = fresh?.seller_profile || fresh?.seller;
        if (isMounted && fresh && freshSeller) {
          const freshValues = getInitialFormValues(fresh);
          setForm(freshValues);
          setInitialSavedForm(freshValues);
        }
      } catch {
        // Keep auth context values if network fetch is not available
      }
    }

    if (!user?.seller_profile && !user?.seller) {
      loadFreshProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Validation mapper
  const validateField = (field, value) => {
    switch (field) {
      case 'business_name':
        return validateBusinessName(value);
      case 'location':
        return validateLocation(value);
      case 'description':
        return validateDescription(value);
      case 'phone':
        return validatePhone(value);
      case 'name':
        return validateName(value);
      default:
        return null;
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setServerError(null);

    if (profileTouched[field]) {
      const error = validateField(field, value);
      setProfileErrors((prev) => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }
  };

  const handleFieldBlur = (field) => {
    setProfileTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setProfileErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  // Submit Profile Changes (FE-094 / AUTH-11)
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const fields = [
      'business_name',
      'location',
      'description',
      'phone',
      'name',
    ];
    const errors = {};
    const touched = {};

    fields.forEach((field) => {
      touched[field] = true;
      const err = validateField(field, form[field]);
      if (err) errors[field] = err;
    });

    setProfileTouched((prev) => ({ ...prev, ...touched }));

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      const firstError = Object.values(errors)[0];
      toast?.error?.(firstError);
      return;
    }

    setIsSaving(true);
    setProfileErrors({});

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      business_name: form.business_name.trim(),
      location: form.location.trim(),
      description: form.description ? form.description.trim() : '',
    };

    try {
      if (typeof updateProfile === 'function') {
        await updateProfile(payload);
      } else {
        await sellerService.updateSellerProfile(payload);
      }

      setInitialSavedForm({ ...form });
      toast?.success?.('Seller business profile updated successfully.');
    } catch (err) {
      if (err?.errors && Object.keys(err.errors).length > 0) {
        const mapped = {};
        fields.forEach((field) => {
          if (err.errors[field]) {
            mapped[field] = [err.errors[field]].flat()[0];
          }
        });
        setProfileErrors(mapped);
        const firstError = Object.values(mapped)[0] || err?.message;
        setServerError(firstError);
        toast?.error?.(firstError);
      } else {
        const errMsg =
          err?.message ||
          'Unable to update profile. Please check your network connection.';
        setServerError(errMsg);
        toast?.error?.(errMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    setForm({ ...initialSavedForm });
    setProfileErrors({});
    setProfileTouched({});
    setServerError(null);
    toast?.success?.('Changes discarded. Restored last saved profile.');
  };

  // Password Validation
  const validatePasswordField = (field, value, nextForm) => {
    const data = nextForm || passwordForm;
    if (field === 'current_password') {
      return value ? null : 'Current password is required.';
    }
    if (field === 'password') {
      return (
        validatePassword(value) ||
        (value && value === data.current_password
          ? 'New password cannot be the same as your current password.'
          : null)
      );
    }
    if (field === 'password_confirmation') {
      return validateConfirmPassword(data.password, value);
    }
    return null;
  };

  const handlePasswordChange = (field, value) => {
    const nextForm = { ...passwordForm, [field]: value };
    setPasswordForm(nextForm);
    setPasswordSuccessMessage('');

    if (passwordTouched[field]) {
      const error = validatePasswordField(field, value, nextForm);
      setPasswordErrors((prev) => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }
  };

  const handlePasswordBlur = (field) => {
    setPasswordTouched((prev) => ({ ...prev, [field]: true }));
    const error = validatePasswordField(field, passwordForm[field]);
    setPasswordErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccessMessage('');

    const fields = ['current_password', 'password', 'password_confirmation'];
    const errors = {};
    const touched = {};

    fields.forEach((field) => {
      touched[field] = true;
      const err = validatePasswordField(field, passwordForm[field]);
      if (err) errors[field] = err;
    });

    setPasswordTouched((prev) => ({ ...prev, ...touched }));

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      const firstError = Object.values(errors)[0];
      toast?.error?.(firstError);
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});

    try {
      const payload = {
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      };

      let response;
      if (typeof changePassword === 'function') {
        response = await changePassword(payload);
      } else {
        response = await authService.changePassword(payload);
      }

      const msg = response?.message || 'Password changed successfully.';
      setPasswordSuccessMessage(msg);
      toast?.success?.(msg);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordTouched({});
    } catch (err) {
      if (err?.errors && Object.keys(err.errors).length > 0) {
        const mapped = {};
        fields.forEach((field) => {
          if (err.errors[field]) {
            mapped[field] = [err.errors[field]].flat()[0];
          }
        });
        setPasswordErrors(mapped);
        const firstError = Object.values(mapped)[0] || err?.message;
        toast?.error?.(firstError);
      } else {
        toast?.error?.(err?.message || 'Failed to change password.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const passwordCriteria = getPasswordCriteria(passwordForm.password);

  return (
    <div
      data-testid="seller-profile-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Seller Approval Status Notice if not approved (AUTH-03, ADM-03) */}
      <SellerApprovalNotice user={user} />

      {/* Header with Title, Status Badge, and Public Storefront Link */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
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
              data-testid="seller-profile-title"
              style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: '#0f172a',
                margin: 0,
              }}
            >
              Seller Profile & Settings
            </h1>
            <SellerStatusBadge status={approvalStatus} />
          </div>
          <p
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              margin: '0.35rem 0 0 0',
            }}
          >
            Update business details, farm location, contact phone, and public
            store presentation (AUTH-11, SEL-01).
          </p>
        </div>

        <div>
          <Link
            to={`/sellers/${sellerId}`}
            data-testid="view-storefront-link"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#15803d',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🏪</span>
            <span>View Public Storefront ↗</span>
          </Link>
        </div>
      </div>

      {/* Server Error Alert (ERR-01) */}
      {serverError && (
        <div
          role="alert"
          data-testid="seller-profile-server-error"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⚠️</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* Main Grid: Form (Left) + Live Storefront Preview (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Business & Contact Edit Form */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* Business Details Form Card */}
          <div style={sectionCardStyle}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                Business & Contact Details (FE-094)
              </h2>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '0.85rem',
                  margin: '0.25rem 0 0 0',
                }}
              >
                Buyers see your business name, location, and phone when ordering
                fresh vegetables.
              </p>
            </div>

            <form
              noValidate
              onSubmit={handleProfileSubmit}
              data-testid="seller-profile-form"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem',
              }}
            >
              {/* 1. Business Name (FE-094, AUTH-11) */}
              <div>
                <label htmlFor="business-name" style={labelStyle}>
                  Business / Farm Name{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="business-name"
                  type="text"
                  data-testid="profile-business-name-input"
                  placeholder="e.g. Arewa Fresh Farms"
                  value={form.business_name}
                  onChange={(e) =>
                    handleFieldChange('business_name', e.target.value)
                  }
                  onBlur={() => handleFieldBlur('business_name')}
                  disabled={isSaving}
                  aria-invalid={profileErrors.business_name ? 'true' : 'false'}
                  style={inputStyle(profileErrors.business_name)}
                />
                <p style={helperStyle}>
                  Your registered trade name or farm identity shown to buyers in
                  search results.
                </p>
                {profileErrors.business_name && (
                  <p
                    role="alert"
                    data-testid="profile-business-name-error"
                    style={fieldErrorStyle}
                  >
                    {profileErrors.business_name}
                  </p>
                )}
              </div>

              {/* 2. Farm / Stall Location (FE-094, AUTH-11, SRCH-03) */}
              <div>
                <label htmlFor="location" style={labelStyle}>
                  Farm / Stall Location (Town, State){' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="location"
                  type="text"
                  data-testid="profile-location-input"
                  placeholder="e.g. Gombe Market, Gombe"
                  value={form.location}
                  onChange={(e) =>
                    handleFieldChange('location', e.target.value)
                  }
                  onBlur={() => handleFieldBlur('location')}
                  disabled={isSaving}
                  aria-invalid={profileErrors.location ? 'true' : 'false'}
                  style={inputStyle(profileErrors.location)}
                />
                <p style={helperStyle}>
                  Used by buyers to filter local producers and estimate delivery
                  proximity (SRCH-03).
                </p>
                {profileErrors.location && (
                  <p
                    role="alert"
                    data-testid="profile-location-error"
                    style={fieldErrorStyle}
                  >
                    {profileErrors.location}
                  </p>
                )}
              </div>

              {/* 3. Description (FE-094, AUTH-11) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <label htmlFor="description" style={labelStyle}>
                    Store / Farm Description{' '}
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      (Optional)
                    </span>
                  </label>
                  <span
                    data-testid="description-char-counter"
                    style={{
                      fontSize: '0.75rem',
                      color:
                        form.description.length > 1000 ? '#dc2626' : '#64748b',
                    }}
                  >
                    {form.description.length} / 1000
                  </span>
                </div>
                <textarea
                  id="description"
                  rows={4}
                  data-testid="profile-description-input"
                  placeholder="Share details about your vegetable varieties, farm harvest schedules, organic or chemical-free practices..."
                  value={form.description}
                  onChange={(e) =>
                    handleFieldChange('description', e.target.value)
                  }
                  onBlur={() => handleFieldBlur('description')}
                  disabled={isSaving}
                  aria-invalid={profileErrors.description ? 'true' : 'false'}
                  style={{
                    ...inputStyle(profileErrors.description),
                    resize: 'vertical',
                    minHeight: '90px',
                  }}
                />
                <p style={helperStyle}>
                  Maximum 1000 characters. Appears prominently on your public
                  seller store page.
                </p>
                {profileErrors.description && (
                  <p
                    role="alert"
                    data-testid="profile-description-error"
                    style={fieldErrorStyle}
                  >
                    {profileErrors.description}
                  </p>
                )}
              </div>

              {/* 4. Contact Phone Number (FE-094, AUTH-11) */}
              <div>
                <label htmlFor="phone" style={labelStyle}>
                  Contact Phone Number{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  data-testid="profile-phone-input"
                  placeholder="e.g. 08031234567 or +2348031234567"
                  value={form.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  onBlur={() => handleFieldBlur('phone')}
                  disabled={isSaving}
                  autoComplete="tel"
                  aria-invalid={profileErrors.phone ? 'true' : 'false'}
                  style={inputStyle(profileErrors.phone)}
                />
                <p style={helperStyle}>
                  Used for buyer order inquiries, dispatch notifications, and
                  logistics coordination.
                </p>
                {profileErrors.phone && (
                  <p
                    role="alert"
                    data-testid="profile-phone-error"
                    style={fieldErrorStyle}
                  >
                    {profileErrors.phone}
                  </p>
                )}
              </div>

              {/* 5. Contact Person / Manager Name (AUTH-11) */}
              <div>
                <label htmlFor="name" style={labelStyle}>
                  Contact Person Full Name{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  data-testid="profile-name-input"
                  placeholder="e.g. Ibrahim Danladi"
                  value={form.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  disabled={isSaving}
                  autoComplete="name"
                  aria-invalid={profileErrors.name ? 'true' : 'false'}
                  style={inputStyle(profileErrors.name)}
                />
                {profileErrors.name && (
                  <p
                    role="alert"
                    data-testid="profile-name-error"
                    style={fieldErrorStyle}
                  >
                    {profileErrors.name}
                  </p>
                )}
              </div>

              {/* 6. Account Email (Read-Only) */}
              <div>
                <label htmlFor="email" style={labelStyle}>
                  Account Email Address{' '}
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    (Read-Only)
                  </span>
                </label>
                <input
                  id="email"
                  type="email"
                  data-testid="profile-email-input"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  style={{
                    ...inputStyle(false),
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    cursor: 'not-allowed',
                  }}
                />
                <p style={helperStyle}>
                  Email is locked to your account credentials and cannot be
                  edited.
                </p>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSaving}
                  data-testid="profile-save-btn"
                >
                  {isSaving ? (
                    <>
                      <Spinner size="sm" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleDiscardChanges}
                  disabled={isSaving}
                  data-testid="profile-reset-btn"
                >
                  Discard Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Card 2: Security & Change Password (AUTH-11) */}
          <div style={sectionCardStyle}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                Change Password (AUTH-11)
              </h2>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '0.85rem',
                  margin: '0.25rem 0 0 0',
                }}
              >
                Ensure your account uses a secure password (minimum 8 characters
                with letters and numbers).
              </p>
            </div>

            {passwordSuccessMessage && (
              <div
                role="status"
                data-testid="password-success-message"
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  fontWeight: '500',
                }}
              >
                ✓ {passwordSuccessMessage}
              </div>
            )}

            <form
              noValidate
              onSubmit={handlePasswordSubmit}
              data-testid="password-change-form"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label htmlFor="current-password" style={labelStyle}>
                  Current Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="current-password"
                  type="password"
                  data-testid="current-password-input"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    handlePasswordChange('current_password', e.target.value)
                  }
                  onBlur={() => handlePasswordBlur('current_password')}
                  disabled={isChangingPassword}
                  aria-invalid={
                    passwordErrors.current_password ? 'true' : 'false'
                  }
                  style={inputStyle(passwordErrors.current_password)}
                />
                {passwordErrors.current_password && (
                  <p
                    role="alert"
                    data-testid="current-password-error"
                    style={fieldErrorStyle}
                  >
                    {passwordErrors.current_password}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="new-password" style={labelStyle}>
                  New Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="new-password"
                  type="password"
                  data-testid="new-password-input"
                  value={passwordForm.password}
                  onChange={(e) =>
                    handlePasswordChange('password', e.target.value)
                  }
                  onBlur={() => handlePasswordBlur('password')}
                  disabled={isChangingPassword}
                  aria-invalid={passwordErrors.password ? 'true' : 'false'}
                  style={inputStyle(passwordErrors.password)}
                />
                {/* Password Criteria checklist */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginTop: '0.35rem',
                    fontSize: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      color: passwordCriteria.hasMinLength
                        ? '#16a34a'
                        : '#64748b',
                    }}
                  >
                    {passwordCriteria.hasMinLength ? '✓' : '•'} 8+ characters
                  </span>
                  <span
                    style={{
                      color: passwordCriteria.hasLetter ? '#16a34a' : '#64748b',
                    }}
                  >
                    {passwordCriteria.hasLetter ? '✓' : '•'} Letters
                  </span>
                  <span
                    style={{
                      color: passwordCriteria.hasDigit ? '#16a34a' : '#64748b',
                    }}
                  >
                    {passwordCriteria.hasDigit ? '✓' : '•'} Digits
                  </span>
                </div>
                {passwordErrors.password && (
                  <p
                    role="alert"
                    data-testid="new-password-error"
                    style={fieldErrorStyle}
                  >
                    {passwordErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirm-password" style={labelStyle}>
                  Confirm New Password{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  data-testid="confirm-password-input"
                  value={passwordForm.password_confirmation}
                  onChange={(e) =>
                    handlePasswordChange(
                      'password_confirmation',
                      e.target.value
                    )
                  }
                  onBlur={() => handlePasswordBlur('password_confirmation')}
                  disabled={isChangingPassword}
                  aria-invalid={
                    passwordErrors.password_confirmation ? 'true' : 'false'
                  }
                  style={inputStyle(passwordErrors.password_confirmation)}
                />
                {passwordErrors.password_confirmation && (
                  <p
                    role="alert"
                    data-testid="confirm-password-error"
                    style={fieldErrorStyle}
                  >
                    {passwordErrors.password_confirmation}
                  </p>
                )}
              </div>

              <div style={{ paddingTop: '0.5rem' }}>
                <Button
                  type="submit"
                  variant="outline"
                  size="md"
                  disabled={isChangingPassword}
                  data-testid="update-password-btn"
                >
                  {isChangingPassword ? (
                    <>
                      <Spinner size="sm" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Storefront Card Preview (Figma Section 13) */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div style={sectionCardStyle}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span style={{ fontSize: '1.2rem' }}>👁️</span>
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Live Storefront Preview
                </h2>
              </div>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '0.85rem',
                  margin: '0.25rem 0 0 0',
                }}
              >
                How your produce shop appears to buyers on the marketplace.
              </p>
            </div>

            {/* Storefront Card Preview */}
            <div
              data-testid="storefront-preview-card"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              }}
            >
              {/* Header inside card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {form.business_name
                    ? form.business_name.charAt(0).toUpperCase()
                    : 'V'}
                </div>
                <div>
                  <h3
                    data-testid="preview-business-name"
                    style={{
                      margin: 0,
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: '#0f172a',
                    }}
                  >
                    {form.business_name || 'Your Business Name'}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginTop: '0.2rem',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem' }}>📍</span>
                    <span
                      data-testid="preview-location"
                      style={{
                        fontSize: '0.85rem',
                        color: '#64748b',
                        fontWeight: '500',
                      }}
                    >
                      {form.location || 'Location not set'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & rating pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    borderRadius: '9999px',
                    padding: '0.15rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}
                >
                  ★ 4.8 Seller Rating
                </span>
                <span
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    borderRadius: '9999px',
                    padding: '0.15rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                  }}
                >
                  Fresh Produce Direct
                </span>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}
                >
                  About the Farm
                </span>
                <p
                  data-testid="preview-description"
                  style={{
                    fontSize: '0.85rem',
                    color: '#334155',
                    lineHeight: '1.5',
                    margin: 0,
                    fontStyle: form.description ? 'normal' : 'italic',
                  }}
                >
                  {form.description ||
                    'Add a store description to tell buyers about your fresh vegetables, harvesting schedule, and location.'}
                </p>
              </div>

              {/* Phone display */}
              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: '#64748b' }}>Store Hotline:</span>
                <span
                  data-testid="preview-phone"
                  style={{ fontWeight: '600', color: '#0f172a' }}
                >
                  {form.phone || 'Phone not set'}
                </span>
              </div>

              {/* View store link */}
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Link
                  to={`/sellers/${sellerId}`}
                  style={{
                    fontSize: '0.85rem',
                    color: '#16a34a',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  Browse Store Vegetables →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SellerProfileEdit;
