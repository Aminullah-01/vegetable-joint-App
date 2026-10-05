/**
 * Centralized UI Strings & Constants
 * SRS References: NFR-LOC-01 (Localization readiness), ERR-01 (Standard error messages), ERR-04
 *
 * Rules:
 * - All user-facing text is kept in this single dictionary so translations (Hausa, Yoruba, Igbo, Pidgin)
 *   can be added without altering component logic.
 * - Standard error messages match ERR-01 verbatim.
 */

export const STRINGS = {
  // Application Metadata
  APP: {
    NAME: 'Vegetable Joint',
    TAGLINE: 'Digital Vegetable Marketplace',
    DESCRIPTION:
      'Connecting vegetable sellers, farmers, and consumers across Nigeria with fresh farm produce.',
    COPYRIGHT: (year = new Date().getFullYear()) =>
      `Vegetable Joint © ${year} — TriNova Technologies`,
  },

  // Navigation Links
  NAV: {
    HOME: 'Home',
    BROWSE_VEGETABLES: 'Browse Vegetables',
    CART: 'Cart',
    MY_ORDERS: 'My Orders',
    PROFILE: 'My Profile',
    SELLER_PORTAL: 'Seller Portal',
    ADMIN_PORTAL: 'Admin',
    SIGN_IN: 'Sign In',
    REGISTER: 'Register',
    LOGOUT: 'Sign Out',
    VIEW_MARKETPLACE: 'View Marketplace',
  },

  // Public Homepage & Hero
  HOME: {
    HERO_HEADLINE: 'Fresh Vegetables. Trusted Sellers. Simple Shopping.',
    HERO_TITLE: 'Fresh Vegetables, Directly from Verified Sellers',
    HERO_SUBTITLE:
      'Discover fresh vegetables from local farmers and vendors across Nigeria, compare transparent prices in Naira (₦), and order what you need.',
    SHOP_VEGETABLES: 'Browse Vegetables',
    EXPLORE_VEGETABLES: 'Explore Vegetables',
    BECOME_SELLER: 'Become a Seller',
    START_SELLING: 'Start Selling',
    SEARCH_PLACEHOLDER: 'Search vegetables, categories, or sellers...',
    POPULAR_SEARCHES: 'Popular Searches:',
    QUICK_TAGS: ['Tomatoes', 'Peppers', 'Onions', 'Leafy Greens', 'Carrots'],
    BENEFIT_FRESH: '100% Fresh Farm Produce',
    BENEFIT_VERIFIED: 'Verified Local Sellers',
    BENEFIT_PRICING: 'Direct Farm Pricing (₦)',
    BENEFIT_PAYMENT: 'Pay on Delivery / Direct Deal',
    FEATURED_PRODUCTS_BADGE: 'Fresh From the Farm',
    FEATURED_PRODUCTS_TITLE: 'Featured Fresh Produce',
    FEATURED_PRODUCTS_SUBTITLE:
      'Top quality vegetables freshly harvested from our verified farmers and sellers.',
    VIEW_ALL_PRODUCTS: 'View All Vegetables',
    FEATURED_ERROR_MESSAGE:
      'Unable to load featured produce. Please try again.',
    CATEGORIES_BADGE: 'Vegetable Varieties',
    CATEGORIES_TITLE: 'Browse by Vegetable Category',
    CATEGORIES_SUBTITLE:
      'Find exactly what you need by exploring our farm-fresh vegetable varieties.',
    VIEW_ALL_CATEGORIES: 'View All Categories',
    CATEGORIES_ERROR_MESSAGE:
      'Unable to load vegetable categories. Please try again.',
    FEATURED_SELLERS_BADGE: 'Verified Farmers & Vendors',
    FEATURED_SELLERS_TITLE: 'Featured Sellers',
    FEATURED_SELLERS_SUBTITLE:
      'Connect directly with trusted local farmers and vegetable vendors across Nigeria.',
    VIEW_ALL_SELLERS: 'View All Sellers',
    FEATURED_SELLERS_ERROR_MESSAGE:
      'Unable to load featured sellers. Please try again.',
    HOW_IT_WORKS_BADGE: 'Simple 4-Step Process',
    HOW_IT_WORKS_TITLE: 'How Vegetable Joint Works',
    HOW_IT_WORKS_SUBTITLE:
      'Buy fresh vegetables directly from local farmers and vendors in four simple steps.',
    HOW_IT_WORKS_STEPS: [
      {
        number: 1,
        title: 'Discover',
        description:
          'Browse farm-fresh vegetables, categories, and verified local sellers across Nigeria.',
        icon: '🔍',
      },
      {
        number: 2,
        title: 'Compare',
        description:
          'Compare transparent prices in Naira (₦), quantities, seller ratings, and harvest locations.',
        icon: '⚖️',
      },
      {
        number: 3,
        title: 'Order',
        description:
          'Add fresh produce to your cart and place your order with verified contact & delivery details.',
        icon: '🛒',
      },
      {
        number: 4,
        title: 'Receive',
        description:
          'Coordinate delivery or pickup directly with the seller and inspect fresh produce on arrival.',
        icon: '🚚',
      },
    ],
    BENEFITS_BADGE: 'Why Vegetable Joint',
    BENEFITS_TITLE: 'Freshness, Trust & Transparency',
    BENEFITS_SUBTITLE:
      'Experience a modernized vegetable marketplace designed for Nigerian buyers and farmers.',
    BENEFITS_ITEMS: [
      {
        title: 'Fresh vegetable marketplace',
        description:
          'Access 100% farm-fresh vegetables harvested directly by verified local growers.',
        icon: '🌿',
      },
      {
        title: 'Multiple trusted sellers',
        description:
          'Connect with vetted, approved vegetable farmers and vendor cooperatives nationwide.',
        icon: '👨‍🌾',
      },
      {
        title: 'Easy product discovery',
        description:
          'Find exactly what you need with keyword search, variety categories, and price filters.',
        icon: '🔎',
      },
      {
        title: 'Simple ordering',
        description:
          'Intuitive cart and checkout flow with live stock indicators and no complicated procedures.',
        icon: '⚡',
      },
      {
        title: 'Transparent pricing',
        description:
          'Clear pricing in Nigerian Naira (₦) with standardized units (baskets, bunches, kg) and zero hidden fees.',
        icon: '🏷️',
      },
      {
        title: 'Convenient delivery details',
        description:
          'Coordinate direct drop-off or local hub pickup across Lagos and major Nigerian hubs.',
        icon: '📍',
      },
    ],
    CTA_TITLE: 'Ready to find fresh vegetables?',
    CTA_SUBTITLE:
      'Join thousands of happy consumers and businesses sourcing high quality vegetables directly from Nigerian farms.',
    CTA_PRIMARY: 'Start Shopping',
    CTA_SECONDARY: 'Sell on Vegetable Joint',
    ROUTE_DIRECTORY_TITLE: 'Interactive Route Directory (SRS 4.1.2)',
    ROUTE_DIRECTORY_SUBTITLE:
      'Full page inventory implemented with client-side React Router navigation.',
    DESIGN_TOKENS_TITLE: 'Design Tokens & Global Styles (UI-02)',
    DESIGN_TOKENS_SUBTITLE:
      'Colours, typography hierarchy, 8px spacing, and responsive breakpoints defined once and shared across all user roles.',
  },

  // Products Catalog & Details
  PRODUCTS: {
    CATALOG_TITLE: 'Marketplace Vegetables',
    CATALOG_SUBTITLE:
      'Browse, search, and filter fresh produce from verified sellers.',
    SEARCH_PLACEHOLDER: 'Search spinach, tomatoes, onions...',
    FILTER_ALL: 'All Vegetables',
    IN_STOCK: 'In Stock',
    LOW_STOCK: 'Low Stock',
    OUT_OF_STOCK: 'Out of Stock',
    AVAILABLE_STOCK: (quantity) => `${quantity} available`,
    DECREASE_QUANTITY: 'Decrease quantity',
    INCREASE_QUANTITY: 'Increase quantity',
    BROWSE_CATEGORY: (name) => `Browse ${name}`,
    CATEGORY_PRODUCTS: (count) => `${count} products`,
    SELLER_LABEL: 'Seller',
    VIEW_DETAILS: 'View Details',
    ADD_TO_CART: 'Add to Cart 🛒',
    BACK_TO_PRODUCTS: '← Back to Vegetables',
    DELIVERY_AVAILABLE: 'Delivery within Lagos & major hubs available.',
  },

  // Keyword Search (SRCH-01) — shared by the navbar and the homepage hero
  SEARCH: {
    PLACEHOLDER: 'Search vegetables, categories, or sellers...',
    NAVBAR_PLACEHOLDER: 'Search fresh vegetables, sellers...',
    INPUT_LABEL: 'Search vegetables, categories, and sellers',
    SUBMIT_LABEL: 'Submit search',
    SUBMIT_TEXT: 'Go',
    CLEAR_LABEL: 'Clear search query',
    MOBILE_INPUT_LABEL: 'Search vegetables and sellers (mobile)',
    MOBILE_SUBMIT_LABEL: 'Submit mobile search',
    MOBILE_CLEAR_LABEL: 'Clear mobile search query',
  },

  // Filters Panel (SRCH-02, SRCH-03, SRCH-06, SRCH-08, FE-034)
  FILTERS: {
    TITLE: 'Filters',
    CLEAR_ALL: 'Clear All',
    APPLY: 'Apply Filters',
    CATEGORY_LABEL: 'Category',
    ALL_CATEGORIES: 'All Categories',
    PRICE_RANGE_LABEL: 'Price Range (₦)',
    MIN_PRICE_LABEL: 'Min Price',
    MAX_PRICE_LABEL: 'Max Price',
    MIN_PRICE_PLACEHOLDER: '0',
    MAX_PRICE_PLACEHOLDER: '10,000',
    AVAILABILITY_LABEL: 'Availability',
    AVAILABILITY_ALL: 'All Statuses',
    AVAILABILITY_IN_STOCK: 'In Stock Only',
    AVAILABILITY_LOW_STOCK: 'Low Stock Only',
    AVAILABILITY_OUT_OF_STOCK: 'Out of Stock Only',
    SELLER_LABEL: 'Seller',
    ALL_SELLERS: 'All Sellers',
    LOCATION_LABEL: 'Location',
    ALL_LOCATIONS: 'All Locations',
    OPEN_MOBILE_FILTERS: 'Filters',
    CLOSE_MOBILE_FILTERS: 'Close Filters',
    ACTIVE_FILTERS: 'Active Filters',
  },

  // Sorting (SRCH-04, SRCH-05, FE-035)
  SORT: {
    LABEL: 'Sort by:',
    ARIA_LABEL: 'Sort products by',
    DEFAULT: 'newest',
    OPTIONS: {
      NEWEST: 'Newest First',
      PRICE_ASC: 'Price: Low to High',
      PRICE_DESC: 'Price: High to Low',
      POPULARITY: 'Popularity',
      RATING: 'Highest Rated',
    },
  },

  // Cart
  CART: {
    TITLE: 'Your Shopping Cart',
    EMPTY_TITLE: 'Your cart is empty.', // ERR-01
    EMPTY_SUBTITLE:
      'Explore fresh vegetables in our catalog to start shopping.',
    CONTINUE_SHOPPING: 'Continue Shopping',
    PROCEED_TO_CHECKOUT: 'Proceed to Checkout →',
    SUBTOTAL: 'Subtotal',
    TOTAL: 'Total',
    QUANTITY: 'Quantity',
    REMOVE: 'Remove',
    REVALIDATION_NOTICE:
      'Some items in your cart may have updated prices or stock availability.',
  },

  // Checkout & Orders
  CHECKOUT: {
    TITLE: 'Checkout & Delivery Details',
    DELIVERY_INFO_HEADING: 'Delivery Information',
    CONTACT_NAME: 'Contact Name',
    PHONE_NUMBER: 'Phone Number',
    DELIVERY_ADDRESS: 'Delivery Address',
    STATE_CITY: 'State / City',
    ORDER_SUMMARY_HEADING: 'Order Summary',
    ITEMS_LABEL: 'Items',
    DELIVERY_FEE_LABEL: 'Estimated Delivery',
    TOTAL_LABEL: 'Total Amount',
    PAYMENT_METHOD_TITLE: 'Payment Method',
    PAYMENT_METHOD_NOTICE:
      'Cash or Bank Transfer on Delivery (Arranged directly with seller — OI-01).',
    PLACE_ORDER_BTN: 'Place Order Now →',
    CONFIRMATION_TITLE: 'Order Confirmed!',
    CONFIRMATION_SUBTITLE:
      'Thank you for ordering with Vegetable Joint. Your order has been placed with the sellers.',
    ORDER_REFERENCE: 'Order Reference',
    VIEW_ORDERS_BTN: 'View My Orders',
  },

  // Order Status & History (ORD-02, ORD-05, ORD-06, ORD-07, FE-038)
  ORDER_STATUS: {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    READY: 'Ready for Delivery',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    UNKNOWN: 'Unknown',
    DESCRIPTIONS: {
      PENDING: 'Order placed by customer; awaiting seller confirmation.',
      CONFIRMED: 'Order confirmed by seller.',
      PROCESSING: 'Produce is being prepared and packed.',
      READY: 'Package is ready for courier delivery or customer pickup.',
      COMPLETED: 'Order successfully delivered and completed.',
      CANCELLED: 'Order cancelled.',
    },
    TIMELINE_TITLE: 'Status History & Timeline',
    NOTE_LABEL: 'Note',
    REASON_LABEL: 'Cancellation Reason',
    CHANGED_BY: (actor) => `Updated by ${actor}`,
    NO_HISTORY: 'No status history recorded yet.',
  },

  // Authentication & Accounts
  AUTH: {
    SIGN_IN_TITLE: 'Sign In to Vegetable Joint',
    SIGN_IN_SUBTITLE: 'Access buyer or seller dashboard',
    EMAIL_LABEL: 'Email Address',
    PASSWORD_LABEL: 'Password',
    CONFIRM_PASSWORD_LABEL: 'Confirm Password',
    NEW_PASSWORD_LABEL: 'New Password',
    FULL_NAME_LABEL: 'Full Name',
    ROLE_LABEL: 'I want to:',
    ROLE_BUYER_OPTION: 'Buy fresh vegetables (Buyer)',
    ROLE_SELLER_OPTION: 'Sell vegetables / Farm produce (Seller)',
    FORGOT_PASSWORD_LINK: 'Forgot password?',
    REMEMBER_ME: 'Remember me',
    SIGN_IN_BTN: 'Sign In',
    REGISTER_BTN: 'Create Account',
    NO_ACCOUNT_PROMPT: "Don't have an account?",
    REGISTER_NOW_LINK: 'Register now',
    HAVE_ACCOUNT_PROMPT: 'Already have an account?',
    SIGN_IN_LINK: 'Sign In',
    FORGOT_TITLE: 'Reset Password',
    FORGOT_SUBTITLE: 'Enter your email to receive a password reset link',
    SEND_RESET_LINK_BTN: 'Send Reset Link',
    RESET_TITLE: 'Set New Password',
    RESET_SUBTITLE: 'Enter your new password below',
    UPDATE_PASSWORD_BTN: 'Update Password',
    BACK_TO_SIGN_IN: '← Back to Sign In',
    SELLER_PENDING_APPROVAL:
      'Your seller registration is currently under review by administrators. You will receive access once approved.',
  },

  // Public Seller Discovery (MKT-01 featured sellers, MKT-07 seller profile)
  SELLERS: {
    FEATURED_TITLE: 'Featured Sellers',
    FEATURED_SUBTITLE:
      'Buy fresh produce directly from verified farmers and vegetable vendors across Nigeria.',
    VIEW_SELLER: 'View Seller',
    VERIFIED_SELLER: 'Verified Seller',
    LOCATION_LABEL: 'Location',
    PRODUCTS_LABEL: (count) =>
      `${count} ${Number(count) === 1 ? 'product' : 'products'}`,
    SELLER_PROFILE_LABEL: (name) => `View seller profile for ${name}`,
  },

  // Seller Dashboard
  SELLER: {
    PORTAL_TITLE: 'Seller Portal',
    OVERVIEW: 'Overview',
    MY_PRODUCTS: 'My Products',
    ADD_PRODUCT: '+ Add Product',
    EDIT_PRODUCT: 'Edit Product',
    INCOMING_ORDERS: 'Seller Orders',
    INVENTORY: 'Inventory',
    SALES_ANALYTICS: 'Sales & Revenue',
    ACTIVE_LISTINGS: 'Active Listings',
    PENDING_ORDERS: 'Pending Orders',
    TOTAL_REVENUE: 'Total Revenue',
    STOCK_AVAILABLE: 'Stock Quantity Available',
    PRICE_PER_UNIT: 'Price per Unit (₦)',
    UPDATE_STOCK: 'Update Stock',
    CONFIRM_ORDER: 'Confirm Order',
  },

  // Admin Dashboard
  ADMIN: {
    PORTAL_TITLE: 'Admin Portal',
    OVERVIEW: 'Admin Overview',
    USERS_MANAGEMENT: 'Users Management',
    SELLERS_MANAGEMENT: 'Seller Moderation',
    PRODUCTS_MODERATION: 'Product Moderation',
    CATEGORIES_MANAGEMENT: 'Categories',
    ORDERS_MONITORING: 'Orders Monitor',
    MARKETPLACE_SETTINGS: 'Settings',
    AUDIT_LOG: 'Audit Log',
    PENDING_APPROVALS: 'Pending Approvals',
    ACTIVE_PRODUCTS: 'Active Products',
    PLATFORM_GMV: 'Platform GMV',
  },

  // Standard Error Messages (Strictly satisfies ERR-01 and ERR-04)
  ERRORS: {
    // Mandated verbatim by ERR-01:
    PRODUCT_NOT_FOUND: 'Product not found.',
    UNABLE_TO_LOAD_PRODUCTS: 'Unable to load products. Please try again.',
    UNABLE_TO_LOAD: 'Unable to load content. Please try again.',
    CART_EMPTY: 'Your cart is empty.',
    INVALID_CREDENTIALS: 'Invalid login credentials.',
    PRODUCT_UNAVAILABLE: 'This product is currently unavailable.',

    // Friendly System Error Pages (ERR-04):
    FORBIDDEN_403_TITLE: '403 — Forbidden',
    FORBIDDEN_403_MESSAGE:
      'You do not have permission to access this page or administrative area.',
    NOT_FOUND_404_TITLE: '404 — Page Not Found',
    NOT_FOUND_404_MESSAGE:
      "The vegetable listing or page you were looking for doesn't exist or may have been moved.",
    SERVER_ERROR_500_TITLE: '500 — Server Error',
    SERVER_ERROR_500_MESSAGE:
      'Something unexpected happened while communicating with the service. Please try again shortly.',
    SESSION_EXPIRED:
      'Your session has expired. Please sign in again to continue.',

    // Form & Network Errors:
    REQUIRED_FIELD: 'This field is required.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    NETWORK_ERROR:
      'Unable to connect to the network. Please check your internet connection.',
  },

  // Empty UI States (Figma UI Section 16 & MKT-10)
  EMPTY: {
    CART_TITLE: 'Your cart is empty',
    CART_DESCRIPTION:
      'Explore our fresh farm produce and add vegetables to your basket.',
    ORDERS_TITLE: 'No orders yet',
    ORDERS_DESCRIPTION:
      'You have not placed any orders yet. Fresh farm vegetables are waiting for you.',
    PRODUCTS_TITLE: 'No vegetables found',
    PRODUCTS_DESCRIPTION:
      'There are no vegetables available matching your criteria at this moment.',
    SEARCH_TITLE: 'No matching vegetables found',
    SEARCH_DESCRIPTION:
      'Try adjusting your search terms or clearing selected filters to find produce.',
    SELLERS_TITLE: 'No sellers found',
    SELLERS_DESCRIPTION:
      'No verified vegetable sellers currently match your filter criteria.',
    DEFAULT_TITLE: 'Nothing here yet',
    DEFAULT_DESCRIPTION: 'No items or records to display at this moment.',
  },

  // Modal & Confirm Dialogs (SEL-04, ORD-07, FE-036)
  MODAL: {
    CLOSE: 'Close dialog',
    CONFIRM: 'Confirm',
    CANCEL: 'Cancel',
    DELETE: 'Delete',
    DELETE_TITLE: 'Confirm Deletion',
    DELETE_PRODUCT_TITLE: 'Delete Vegetable Listing',
    DELETE_PRODUCT_MESSAGE:
      'Are you sure you want to delete this vegetable listing? In accordance with marketplace rules (SEL-04), this will be a soft delete: the listing will be removed from the marketplace and active seller catalog, while past orders and history remain intact.',
    CANCEL_ORDER_TITLE: 'Cancel Order',
    CANCEL_ORDER_MESSAGE: 'Are you sure you want to cancel this order?',
    CANCELLATION_REASON_LABEL: 'Cancellation Reason',
    CANCELLATION_REASON_HINT:
      'A cancellation reason is required per marketplace rules (ORD-07) and will be visible to the customer.',
    CANCELLATION_REASON_PLACEHOLDER:
      'e.g. Produce out of stock, customer requested cancellation, unable to deliver to location...',
    CANCELLATION_REASON_REQUIRED_ERROR:
      'Please provide a cancellation reason before proceeding.',
    OVERRIDE_TITLE: 'Confirm Override',
    OVERRIDE_MESSAGE:
      'Are you sure you want to proceed with this administrative override? This action will immediately update marketplace state.',
  },

  // Data Table (NFR-USAB-06, FE-037)
  TABLE: {
    EMPTY_TITLE: 'No records found',
    EMPTY_DESCRIPTION: 'There are no items or data records to display.',
    VIEW_AS_CARDS: 'Card View',
    VIEW_AS_TABLE: 'Table View',
    TOGGLE_VIEW: 'Switch view mode',
    ACTIONS: 'Actions',
    LOADING: 'Loading data...',
  },

  // Common UI Button Labels
  BUTTONS: {
    SAVE: 'Save',
    CANCEL: 'Cancel',
    DELETE: 'Delete',
    EDIT: 'Edit',
    RETRY: 'Try Again',
    RELOAD: 'Reload Page',
    CLOSE: 'Close',
    BACK: 'Back',
  },
};

/**
 * Helper function to retrieve a localized string with optional placeholder replacements.
 * Example: t('APP.COPYRIGHT', 2026) or t('ERRORS.PRODUCT_NOT_FOUND')
 *
 * @param {string} path - Dot-separated path to string, e.g. "ERRORS.PRODUCT_NOT_FOUND".
 * @param {Record<string, string|number>} [params] - Replacement variables.
 * @returns {string} The localized string.
 */
export function t(path, params = {}) {
  const keys = path.split('.');
  let current = STRINGS;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // Fallback to path if not found
    }
  }

  if (typeof current === 'function') {
    return current(params);
  }

  if (typeof current === 'string' && Object.keys(params).length > 0) {
    return current.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  }

  return current ?? path;
}

export default STRINGS;
