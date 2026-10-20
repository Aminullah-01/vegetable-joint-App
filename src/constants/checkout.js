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

export default {
  NIGERIAN_STATES,
  DELIVERY_DETAILS_STORAGE_KEY,
};
