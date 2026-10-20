/**
 * Checkout domain constants (CHK-02).
 *
 * `NIGERIAN_STATES` backs the delivery address "State" field on the checkout
 * delivery details form. `DELIVERY_DETAILS_STORAGE_KEY` persists the buyer's
 * delivery details locally so returning buyers do not have to re-enter their
 * address (mirrors the cart persistence approach, ASSUMPTION A-05).
 */

export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT (Abuja)',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

export const DELIVERY_DETAILS_STORAGE_KEY = 'vegetable_joint_delivery_details';

/**
 * Canonical 4-step checkout journey (CHK-10, Figma Section 10).
 * Cart → Delivery details → Review → Confirmation in no more than four steps.
 */
export const CHECKOUT_STEPS = [
  {
    step: 1,
    key: 'cart',
    label: 'Cart',
    path: '/cart',
    description: 'Review your items and quantities',
  },
  {
    step: 2,
    key: 'delivery',
    label: 'Delivery Details',
    path: '/checkout',
    description: 'Provide address and recipient contact',
  },
  {
    step: 3,
    key: 'review',
    label: 'Review & Confirm',
    shortLabel: 'Review',
    path: null,
    description: 'Verify items, seller orders, and payment terms',
  },
  {
    step: 4,
    key: 'confirmation',
    label: 'Confirmation',
    path: null,
    description: 'Order placed with seller',
  },
];

export default {
  NIGERIAN_STATES,
  DELIVERY_DETAILS_STORAGE_KEY,
  CHECKOUT_STEPS,
};
