import { useState } from 'react';
import PropTypes from 'prop-types';
import { Input, Select, Textarea, Button } from '../common';
import { STRINGS, NIGERIAN_STATES } from '../../constants';
import {
  validateName,
  validatePhone,
  validateStreetAddress,
  validateTownArea,
  validateState,
  validateDeliveryNotes,
} from '../../utils';

const FIELD_VALIDATORS = {
  name: validateName,
  phone: validatePhone,
  street: validateStreetAddress,
  town: validateTownArea,
  state: validateState,
  notes: validateDeliveryNotes,
};

const ALL_FIELDS = ['name', 'phone', 'street', 'town', 'state', 'notes'];

function normalizeDeliveryDetails(initialValues) {
  return ALL_FIELDS.reduce((acc, field) => {
    const value = initialValues?.[field];
    acc[field] = value == null ? '' : String(value);
    return acc;
  }, {});
}

/**
 * DeliveryDetailsForm — Checkout delivery details form (CHK-02).
 *
 * Collects recipient name, phone number, street/landmark, town/area, state and
 * optional delivery notes. Fields are pre-filled from the values supplied by the
 * parent (typically the buyer profile plus any previously saved address) and are
 * validated inline with accessible, per-field error messages. Delivery notes are
 * optional and capped at 500 characters.
 *
 * SRS References: CHK-02, CHK-10, UI-05, NFR-USAB-02, NFR-USAB-03.
 */
export function DeliveryDetailsForm({
  initialValues,
  onChange,
  onSubmit,
  disabled = false,
  showSubmit = true,
  submitLabel = STRINGS.CHECKOUT.CONTINUE_TO_REVIEW_BTN,
  submitTestId = 'delivery-details-submit',
  title,
  hint,
}) {
  const [values, setValues] = useState(() =>
    normalizeDeliveryDetails(initialValues)
  );
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field, value) => {
    const validator = FIELD_VALIDATORS[field];
    return validator ? validator(value) : null;
  };

  const handleChange = (field, value) => {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    if (touched[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        const error = validateField(field, value);
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }

    if (onChange) onChange(nextValues);
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      const error = validateField(field, values[field]);
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nextErrors = {};
    const nextTouched = {};
    ALL_FIELDS.forEach((field) => {
      nextTouched[field] = true;
      const error = validateField(field, values[field]);
      if (error) nextErrors[field] = error;
    });

    setTouched(nextTouched);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return false;
    }

    if (onSubmit) onSubmit(values);
    return true;
  };

  return (
    <form
      noValidate
      data-testid="delivery-details-form"
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
    >
      {title && (
        <h2
          style={{ fontSize: '1.15rem', color: '#1e293b', margin: 0 }}
          data-testid="delivery-details-heading"
        >
          {title}
        </h2>
      )}

      {hint && (
        <p
          style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}
          data-testid="delivery-details-hint"
        >
          {hint}
        </p>
      )}

      <Input
        id="delivery-recipient-name"
        name="name"
        type="text"
        label={STRINGS.CHECKOUT.RECIPIENT_NAME_LABEL}
        placeholder={STRINGS.CHECKOUT.RECIPIENT_NAME_PLACEHOLDER}
        value={values.name}
        onChange={(e) => handleChange('name', e.target.value)}
        onBlur={() => handleBlur('name')}
        autoComplete="name"
        required
        disabled={disabled}
        error={errors.name}
        data-testid="delivery-recipient-name-input"
      />

      <Input
        id="delivery-phone"
        name="phone"
        type="tel"
        label={STRINGS.CHECKOUT.PHONE_NUMBER}
        placeholder={STRINGS.CHECKOUT.PHONE_NUMBER_PLACEHOLDER}
        value={values.phone}
        onChange={(e) => handleChange('phone', e.target.value)}
        onBlur={() => handleBlur('phone')}
        autoComplete="tel"
        required
        disabled={disabled}
        error={errors.phone}
        data-testid="delivery-phone-input"
      />

      <Input
        id="delivery-street"
        name="street"
        type="text"
        label={STRINGS.CHECKOUT.STREET_LABEL}
        placeholder={STRINGS.CHECKOUT.STREET_PLACEHOLDER}
        value={values.street}
        onChange={(e) => handleChange('street', e.target.value)}
        onBlur={() => handleBlur('street')}
        autoComplete="street-address"
        required
        disabled={disabled}
        error={errors.street}
        data-testid="delivery-street-input"
      />

      <Input
        id="delivery-town"
        name="town"
        type="text"
        label={STRINGS.CHECKOUT.TOWN_LABEL}
        placeholder={STRINGS.CHECKOUT.TOWN_PLACEHOLDER}
        value={values.town}
        onChange={(e) => handleChange('town', e.target.value)}
        onBlur={() => handleBlur('town')}
        autoComplete="address-level2"
        required
        disabled={disabled}
        error={errors.town}
        data-testid="delivery-town-input"
      />

      <Select
        id="delivery-state"
        name="state"
        label={STRINGS.CHECKOUT.STATE_LABEL}
        placeholder={STRINGS.CHECKOUT.STATE_PLACEHOLDER}
        options={NIGERIAN_STATES}
        value={values.state}
        onChange={(e) => handleChange('state', e.target.value)}
        onBlur={() => handleBlur('state')}
        autoComplete="address-level1"
        required
        disabled={disabled}
        error={errors.state}
        data-testid="delivery-state-select"
      />

      <Textarea
        id="delivery-notes"
        name="notes"
        label={STRINGS.CHECKOUT.DELIVERY_NOTES_LABEL}
        placeholder={STRINGS.CHECKOUT.DELIVERY_NOTES_PLACEHOLDER}
        helperText={STRINGS.CHECKOUT.DELIVERY_NOTES_HINT}
        value={values.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        onBlur={() => handleBlur('notes')}
        rows={3}
        maxLength={500}
        showCount
        optional
        disabled={disabled}
        error={errors.notes}
        data-testid="delivery-notes-input"
      />

      {showSubmit && (
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={disabled}
          data-testid={submitTestId}
          style={{ marginTop: '0.25rem' }}
        >
          {submitLabel}
        </Button>
      )}
    </form>
  );
}

DeliveryDetailsForm.propTypes = {
  initialValues: PropTypes.shape({
    name: PropTypes.string,
    phone: PropTypes.string,
    street: PropTypes.string,
    town: PropTypes.string,
    state: PropTypes.string,
    notes: PropTypes.string,
  }),
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  disabled: PropTypes.bool,
  showSubmit: PropTypes.bool,
  submitLabel: PropTypes.string,
  submitTestId: PropTypes.string,
  title: PropTypes.node,
  hint: PropTypes.node,
};

export default DeliveryDetailsForm;
