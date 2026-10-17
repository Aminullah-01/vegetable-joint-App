import { useState } from 'react';
import { useAuth, useToast } from '../../hooks';
import { STRINGS } from '../../constants';
import {
  validateName,
  validatePhone,
  validateBusinessName,
  validateLocation,
  validateDescription,
  validatePassword,
  validateConfirmPassword,
  getPasswordCriteria,
} from '../../utils';

const EMPTY_PASSWORD_FORM = {
  current_password: '',
  password: '',
  password_confirmation: '',
};

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '0.65rem 0.8rem',
  borderRadius: '6px',
  border: `1px solid ${hasError ? '#fca5a5' : '#cbd5e1'}`,
  boxSizing: 'border-box',
  fontSize: '0.9rem',
  backgroundColor: '#ffffff',
});

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '500',
  marginBottom: '0.25rem',
  color: '#334155',
};

const fieldErrorStyle = {
  color: '#b91c1c',
  fontSize: '0.75rem',
  margin: '0.25rem 0 0 0',
};

const sectionCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '1.75rem',
};

const sectionHeadingStyle = {
  fontSize: '1.05rem',
  color: '#1e293b',
  margin: '0 0 1rem 0',
  fontWeight: '700',
};

const primaryButtonStyle = (disabled) => ({
  backgroundColor: '#15803d',
  color: '#ffffff',
  padding: '0.7rem 1.25rem',
  borderRadius: '6px',
  border: 'none',
  fontWeight: '600',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.9rem',
  alignSelf: 'flex-start',
  opacity: disabled ? 0.7 : 1,
});

/**
 * Account Profile page (SRS AUTH-11).
 *
 * Lets any authenticated user view and update their name and phone, lets
 * sellers also manage their business details (name, location, description),
 * and provides a change-password form.
 */
export function Profile() {
  const { user, role, updateProfile, changePassword } = useAuth();
  const toast = useToast();
  const isSeller = role === 'seller';

  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    phone: user?.phone || '',
    business_name: user?.seller_profile?.business_name || '',
    location: user?.seller_profile?.location || '',
    description: user?.seller_profile?.description || '',
  }));
  const [profileErrors, setProfileErrors] = useState({});
  const [profileTouched, setProfileTouched] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordTouched, setPasswordTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordCriteria = getPasswordCriteria(passwordForm.password);

  const validateProfileField = (field, value) => {
    switch (field) {
      case 'name':
        return validateName(value);
      case 'phone':
        return validatePhone(value);
      case 'business_name':
        return validateBusinessName(value);
      case 'location':
        return validateLocation(value);
      case 'description':
        return validateDescription(value);
      default:
        return null;
    }
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (profileTouched[field]) {
      const error = validateProfileField(field, value);
      setProfileErrors((prev) => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }
  };

  const handleProfileBlur = (field) => {
    setProfileTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateProfileField(field, form[field]);
    setProfileErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    const fields = ['name', 'phone'];
    if (isSeller) fields.push('business_name', 'location', 'description');

    const errors = {};
    const touched = {};
    fields.forEach((field) => {
      touched[field] = true;
      const error = validateProfileField(field, form[field]);
      if (error) errors[field] = error;
    });

    setProfileTouched((prev) => ({ ...prev, ...touched }));

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setIsSaving(true);
    setProfileErrors({});

    const payload = { name: form.name, phone: form.phone };
    if (isSeller) {
      payload.business_name = form.business_name;
      payload.location = form.location;
      payload.description = form.description;
    }

    try {
      await updateProfile(payload);
      toast.success(STRINGS.PROFILE.SAVE_SUCCESS);
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
        if (firstError) toast.error(firstError);
      } else {
        toast.error(err?.message || STRINGS.ERRORS.UNABLE_TO_LOAD);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const validatePasswordField = (field, value, nextForm) => {
    const data = nextForm || passwordForm;
    if (field === 'current_password') {
      return value ? null : STRINGS.PROFILE.CURRENT_PASSWORD_REQUIRED;
    }
    if (field === 'password') {
      return (
        validatePassword(value) ||
        (value && value === data.current_password
          ? STRINGS.PROFILE.PASSWORD_SAME_AS_CURRENT
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

    const fields = ['current_password', 'password', 'password_confirmation'];
    const errors = {};
    const touched = {};
    fields.forEach((field) => {
      touched[field] = true;
      const error = validatePasswordField(field, passwordForm[field]);
      if (error) errors[field] = error;
    });

    setPasswordTouched((prev) => ({ ...prev, ...touched }));

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});

    try {
      const response = await changePassword({
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });
      toast.success(response?.message || STRINGS.PROFILE.PASSWORD_SUCCESS);
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
        if (firstError) toast.error(firstError);
      } else {
        toast.error(err?.message || STRINGS.ERRORS.UNABLE_TO_LOAD);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div
      data-testid="profile-page"
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.75rem', color: '#15803d', margin: 0 }}>
          {STRINGS.PROFILE.TITLE}
        </h1>
        <p
          style={{
            color: '#64748b',
            fontSize: '0.9rem',
            margin: '0.35rem 0 0',
          }}
        >
          {STRINGS.PROFILE.SUBTITLE}
        </p>
      </div>

      {/* Account & business details */}
      <div style={sectionCardStyle}>
        <h2 style={sectionHeadingStyle}>{STRINGS.PROFILE.ACCOUNT_SECTION}</h2>
        <form
          noValidate
          onSubmit={handleProfileSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div>
            <label htmlFor="profile-name" style={labelStyle}>
              {STRINGS.AUTH.FULL_NAME_LABEL}
            </label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              onBlur={() => handleProfileBlur('name')}
              disabled={isSaving}
              autoComplete="name"
              data-testid="profile-name-input"
              aria-invalid={profileErrors.name ? 'true' : 'false'}
              style={inputStyle(profileErrors.name)}
            />
            {profileErrors.name && (
              <p data-testid="profile-name-error" style={fieldErrorStyle}>
                {profileErrors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="profile-email" style={labelStyle}>
              {STRINGS.AUTH.EMAIL_LABEL}
            </label>
            <input
              id="profile-email"
              type="email"
              value={user.email || ''}
              readOnly
              disabled
              data-testid="profile-email-input"
              style={{ ...inputStyle(false), backgroundColor: '#f1f5f9' }}
            />
            <p style={{ ...fieldErrorStyle, color: '#64748b' }}>
              {STRINGS.PROFILE.EMAIL_READONLY_HINT}
            </p>
          </div>

          <div>
            <label htmlFor="profile-phone" style={labelStyle}>
              {STRINGS.AUTH.PHONE_LABEL}
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleFormChange('phone', e.target.value)}
              onBlur={() => handleProfileBlur('phone')}
              disabled={isSaving}
              autoComplete="tel"
              data-testid="profile-phone-input"
              aria-invalid={profileErrors.phone ? 'true' : 'false'}
              style={inputStyle(profileErrors.phone)}
            />
            {profileErrors.phone && (
              <p data-testid="profile-phone-error" style={fieldErrorStyle}>
                {profileErrors.phone}
              </p>
            )}
          </div>

          {isSeller && (
            <div
              data-testid="profile-business-section"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1.25rem',
                marginTop: '0.25rem',
              }}
            >
              <h3
                style={{
                  ...sectionHeadingStyle,
                  fontSize: '0.95rem',
                  margin: 0,
                }}
              >
                {STRINGS.PROFILE.BUSINESS_SECTION}
              </h3>

              <div>
                <label htmlFor="profile-business-name" style={labelStyle}>
                  {STRINGS.AUTH.BUSINESS_NAME_LABEL}
                </label>
                <input
                  id="profile-business-name"
                  type="text"
                  value={form.business_name}
                  onChange={(e) =>
                    handleFormChange('business_name', e.target.value)
                  }
                  onBlur={() => handleProfileBlur('business_name')}
                  disabled={isSaving}
                  data-testid="profile-business-name-input"
                  aria-invalid={profileErrors.business_name ? 'true' : 'false'}
                  style={inputStyle(profileErrors.business_name)}
                />
                {profileErrors.business_name && (
                  <p
                    data-testid="profile-business-name-error"
                    style={fieldErrorStyle}
                  >
                    {profileErrors.business_name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="profile-location" style={labelStyle}>
                  {STRINGS.AUTH.LOCATION_LABEL}
                </label>
                <input
                  id="profile-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  onBlur={() => handleProfileBlur('location')}
                  disabled={isSaving}
                  data-testid="profile-location-input"
                  aria-invalid={profileErrors.location ? 'true' : 'false'}
                  style={inputStyle(profileErrors.location)}
                />
                {profileErrors.location && (
                  <p
                    data-testid="profile-location-error"
                    style={fieldErrorStyle}
                  >
                    {profileErrors.location}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="profile-description" style={labelStyle}>
                  {STRINGS.AUTH.DESCRIPTION_LABEL}
                </label>
                <textarea
                  id="profile-description"
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    handleFormChange('description', e.target.value)
                  }
                  onBlur={() => handleProfileBlur('description')}
                  disabled={isSaving}
                  data-testid="profile-description-input"
                  aria-invalid={profileErrors.description ? 'true' : 'false'}
                  style={{
                    ...inputStyle(profileErrors.description),
                    resize: 'vertical',
                  }}
                />
                {profileErrors.description && (
                  <p
                    data-testid="profile-description-error"
                    style={fieldErrorStyle}
                  >
                    {profileErrors.description}
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            data-testid="profile-save-btn"
            style={primaryButtonStyle(isSaving)}
          >
            {isSaving ? STRINGS.PROFILE.SAVING_BTN : STRINGS.PROFILE.SAVE_BTN}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div style={sectionCardStyle}>
        <h2 style={sectionHeadingStyle}>{STRINGS.PROFILE.PASSWORD_SECTION}</h2>
        <form
          noValidate
          onSubmit={handlePasswordSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div>
            <label htmlFor="current-password" style={labelStyle}>
              {STRINGS.PROFILE.CURRENT_PASSWORD_LABEL}
            </label>
            <input
              id="current-password"
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.current_password}
              onChange={(e) =>
                handlePasswordChange('current_password', e.target.value)
              }
              onBlur={() => handlePasswordBlur('current_password')}
              disabled={isChangingPassword}
              autoComplete="current-password"
              placeholder={STRINGS.PROFILE.CURRENT_PASSWORD_PLACEHOLDER}
              data-testid="profile-password-current-input"
              aria-invalid={passwordErrors.current_password ? 'true' : 'false'}
              style={inputStyle(passwordErrors.current_password)}
            />
            {passwordErrors.current_password && (
              <p
                data-testid="profile-password-current-error"
                style={fieldErrorStyle}
              >
                {passwordErrors.current_password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-password" style={labelStyle}>
              {STRINGS.PROFILE.NEW_PASSWORD_LABEL}
            </label>
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.password}
              onChange={(e) => handlePasswordChange('password', e.target.value)}
              onBlur={() => handlePasswordBlur('password')}
              disabled={isChangingPassword}
              autoComplete="new-password"
              placeholder={STRINGS.AUTH.PASSWORD_PLACEHOLDER}
              data-testid="profile-password-new-input"
              aria-invalid={passwordErrors.password ? 'true' : 'false'}
              style={inputStyle(passwordErrors.password)}
            />
            {passwordErrors.password && (
              <p
                data-testid="profile-password-new-error"
                style={fieldErrorStyle}
              >
                {passwordErrors.password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirm-new-password" style={labelStyle}>
              {STRINGS.PROFILE.CONFIRM_PASSWORD_LABEL}
            </label>
            <input
              id="confirm-new-password"
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.password_confirmation}
              onChange={(e) =>
                handlePasswordChange('password_confirmation', e.target.value)
              }
              onBlur={() => handlePasswordBlur('password_confirmation')}
              disabled={isChangingPassword}
              autoComplete="new-password"
              placeholder={STRINGS.AUTH.CONFIRM_PASSWORD_PLACEHOLDER}
              data-testid="profile-password-confirm-input"
              aria-invalid={
                passwordErrors.password_confirmation ? 'true' : 'false'
              }
              style={inputStyle(passwordErrors.password_confirmation)}
            />
            {passwordErrors.password_confirmation && (
              <p
                data-testid="profile-password-confirm-error"
                style={fieldErrorStyle}
              >
                {passwordErrors.password_confirmation}
              </p>
            )}
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              color: '#475569',
            }}
          >
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              data-testid="profile-password-show-toggle"
            />
            {showPassword
              ? STRINGS.PROFILE.PASSWORD_HIDE
              : STRINGS.PROFILE.PASSWORD_SHOW}
          </label>

          <ul
            data-testid="profile-password-criteria"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
            }}
          >
            <li
              style={{
                color: passwordCriteria.hasMinLength ? '#16a34a' : '#64748b',
              }}
            >
              {passwordCriteria.hasMinLength ? '✓' : '○'}{' '}
              {STRINGS.AUTH.PASSWORD_RULE_LENGTH}
            </li>
            <li
              style={{
                color: passwordCriteria.hasLetter ? '#16a34a' : '#64748b',
              }}
            >
              {passwordCriteria.hasLetter ? '✓' : '○'}{' '}
              {STRINGS.AUTH.PASSWORD_RULE_LETTERS}
            </li>
            <li
              style={{
                color: passwordCriteria.hasDigit ? '#16a34a' : '#64748b',
              }}
            >
              {passwordCriteria.hasDigit ? '✓' : '○'}{' '}
              {STRINGS.AUTH.PASSWORD_RULE_NUMBERS}
            </li>
          </ul>

          <button
            type="submit"
            disabled={isChangingPassword}
            data-testid="profile-password-submit-btn"
            style={primaryButtonStyle(isChangingPassword)}
          >
            {isChangingPassword
              ? STRINGS.PROFILE.UPDATING_PASSWORD_BTN
              : STRINGS.PROFILE.UPDATE_PASSWORD_BTN}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
