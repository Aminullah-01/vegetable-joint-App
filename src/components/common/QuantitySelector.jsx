import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { STRINGS } from '../../constants';

function toWholeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function clampQuantity(value, minimum, maximum) {
  return Math.min(Math.max(toWholeNumber(value, minimum), minimum), maximum);
}

/**
 * QuantitySelector — Accessible stock-bounded quantity control.
 *
 * SRS: MKT-06, CART-02, BR-01 and BR-04. A cart line must stay between one
 * and the product's currently available stock; removing an item is a separate
 * cart action, so this control never emits zero.
 */
export function QuantitySelector({
  value,
  defaultValue = 1,
  min = 1,
  max,
  availableStock,
  availability,
  isAvailable = true,
  disabled = false,
  onChange,
  label = STRINGS.CART.QUANTITY,
  showStock = true,
  className = '',
  style = {},
}) {
  const minimum = Math.max(1, toWholeNumber(min, 1));
  const stock = Math.max(0, toWholeNumber(availableStock ?? max, 0));
  const isOutOfStock =
    stock < minimum ||
    !isAvailable ||
    availability === false ||
    availability === 'out_of_stock' ||
    availability === 'unavailable';
  const isDisabled = disabled || isOutOfStock;
  const [internalValue, setInternalValue] = useState(() =>
    clampQuantity(defaultValue, minimum, Math.max(stock, minimum))
  );
  const isControlled = value !== undefined;
  const selectedValue = clampQuantity(
    isControlled ? value : internalValue,
    minimum,
    Math.max(stock, minimum)
  );
  const availabilityId = useId();

  const updateQuantity = (nextValue) => {
    if (isDisabled) return;

    const nextQuantity = clampQuantity(nextValue, minimum, stock);
    if (!isControlled) {
      setInternalValue(nextQuantity);
    }
    onChange?.(nextQuantity);
  };

  return (
    <div
      className={`quantity-selector ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        ...style,
      }}
    >
      <span style={{ color: '#334155', fontSize: '0.875rem', fontWeight: 600 }}>
        {label}
      </span>
      <div
        aria-label={label}
        aria-describedby={showStock ? availabilityId : undefined}
        role="group"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          alignSelf: 'flex-start',
        }}
      >
        <button
          type="button"
          aria-label={STRINGS.PRODUCTS.DECREASE_QUANTITY}
          disabled={isDisabled || selectedValue <= minimum}
          onClick={() => updateQuantity(selectedValue - 1)}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px 0 0 8px',
            backgroundColor: '#ffffff',
            color: '#15803d',
            cursor:
              isDisabled || selectedValue <= minimum
                ? 'not-allowed'
                : 'pointer',
            fontSize: '1.25rem',
            fontWeight: 700,
            opacity: isDisabled || selectedValue <= minimum ? 0.5 : 1,
          }}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={minimum}
          max={stock}
          step="1"
          value={isOutOfStock ? 0 : selectedValue}
          aria-label={`${label} amount`}
          disabled={isDisabled}
          onChange={(event) => updateQuantity(event.target.value)}
          style={{
            width: '56px',
            minHeight: '44px',
            border: '1px solid #cbd5e1',
            borderLeft: 'none',
            borderRight: 'none',
            borderRadius: 0,
            textAlign: 'center',
            color: '#0f172a',
            backgroundColor: isDisabled ? '#f8fafc' : '#ffffff',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        />
        <button
          type="button"
          aria-label={STRINGS.PRODUCTS.INCREASE_QUANTITY}
          disabled={isDisabled || selectedValue >= stock}
          onClick={() => updateQuantity(selectedValue + 1)}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            border: '1px solid #cbd5e1',
            borderRadius: '0 8px 8px 0',
            backgroundColor: '#ffffff',
            color: '#15803d',
            cursor:
              isDisabled || selectedValue >= stock ? 'not-allowed' : 'pointer',
            fontSize: '1.25rem',
            fontWeight: 700,
            opacity: isDisabled || selectedValue >= stock ? 0.5 : 1,
          }}
        >
          +
        </button>
      </div>
      {showStock && (
        <span
          id={availabilityId}
          aria-live="polite"
          style={{
            color: isOutOfStock ? '#b91c1c' : '#64748b',
            fontSize: '0.75rem',
          }}
        >
          {isOutOfStock
            ? STRINGS.PRODUCTS.OUT_OF_STOCK
            : STRINGS.PRODUCTS.AVAILABLE_STOCK(stock)}
        </span>
      )}
    </div>
  );
}

QuantitySelector.propTypes = {
  value: PropTypes.number,
  defaultValue: PropTypes.number,
  min: PropTypes.number,
  max: PropTypes.number,
  availableStock: PropTypes.number,
  availability: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  isAvailable: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  label: PropTypes.string,
  showStock: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default QuantitySelector;
