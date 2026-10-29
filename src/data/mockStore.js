import { mockCategories } from './mockCategories.js';
import { mockUsers } from './mockUsers.js';
import { mockSellers } from './mockSellers.js';
import { mockProducts } from './mockProducts.js';
import { mockOrders } from './mockOrders.js';
import { mockSettings } from './mockSettings.js';
import { mockAuditLogs } from './mockAuditLogs.js';
import { createPaginationMeta } from './index.js';
import { ApiError, ERROR_CODES } from '../services/apiErrors.js';
import { STRINGS } from '../constants/index.js';
import { hashPassword, verifyPassword } from '../utils/passwordHash.js';
import { PHONE_REGEX } from '../utils/validation.js';
import { generateUUID } from '../utils/uuid.js';
import { validateProductImage } from '../utils/image.js';

/**
 * Shared demo password for every seeded mock account. It is hashed on load so
 * the plaintext value is never persisted on the seeded user records.
 */
const MOCK_DEMO_PASSWORD = 'password123';

// SRS AUTH-06: password-reset links are time-limited and single-use.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes

// SRS AUTH-09 / NFR-SEC-07: failed-login throttling limits.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60 * 1000;

/**
 * Removes credential material from a user object before it is returned by any
 * service method (SRS NFR-SEC-01: passwords/hashes never appear in responses).
 *
 * @param {Object|null|undefined} user
 * @returns {Object|null}
 */
function sanitizeUser(user) {
  if (!user) return user;
  if (!Object.prototype.hasOwnProperty.call(user, 'password_hash')) {
    return { ...user };
  }
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * In-memory Mock Data Store for interactive mock sessions and testing.
 * Provides full stateful emulation of database operations without backend server.
 */
class MockStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.categories = JSON.parse(JSON.stringify(mockCategories));
    this.users = JSON.parse(JSON.stringify(mockUsers)).map((user) => ({
      ...user,
      password_hash: hashPassword(MOCK_DEMO_PASSWORD),
    }));
    this.sellers = JSON.parse(JSON.stringify(mockSellers));
    this.products = JSON.parse(JSON.stringify(mockProducts));
    this.orders = JSON.parse(JSON.stringify(mockOrders));
    this.settings = JSON.parse(JSON.stringify(mockSettings));
    this.auditLogs = JSON.parse(JSON.stringify(mockAuditLogs));
    this.currentUser = this.users.find((u) => u.id === 6) || null; // Amina Bello (Buyer)
    this.serverCarts = {};
    // AUTH-09: per-email failed-login timestamps used for throttling.
    this.loginAttempts = {};
    // AUTH-06: issued password-reset tokens keyed by token string.
    this.resetTokens = {};
  }

  // --- Auth & Users ---
  findUserByEmail(email) {
    if (!email) return null;
    return (
      this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ||
      null
    );
  }

  findUserById(id) {
    return this.users.find((u) => u.id === Number(id)) || null;
  }

  registerUser(payload) {
    const errors = {};

    if (!payload?.name || !String(payload.name).trim()) {
      errors.name = ['Full name is required.'];
    }

    const email = String(payload?.email || '')
      .trim()
      .toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = ['Email address is required.'];
    } else if (!emailRegex.test(email)) {
      errors.email = ['Please enter a valid email address.'];
    } else if (this.findUserByEmail(email)) {
      errors.email = ['The email has already been taken.'];
    }

    const password = String(payload?.password || '');
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasDigits = /\d/.test(password);
    if (!password) {
      errors.password = ['Password is required.'];
    } else if (password.length < 8) {
      errors.password = ['Password must be at least 8 characters.'];
    } else if (!hasLetters || !hasDigits) {
      errors.password = ['Password must contain both letters and digits.'];
    }

    if (payload?.role === 'seller') {
      if (!payload?.business_name || !String(payload.business_name).trim()) {
        errors.business_name = ['Business or Farm name is required.'];
      }
      if (!payload?.location || !String(payload.location).trim()) {
        errors.location = ['Farm or stall location is required.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError({
        message: 'The given data was invalid.',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    const nextUserId = Math.max(0, ...this.users.map((u) => u.id)) + 1;
    const newUser = {
      id: nextUserId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || '+2348000000000',
      role: payload.role || 'buyer',
      status: 'active',
      password_hash: hashPassword(payload.password),
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.push(newUser);

    let sellerProfile = null;
    if (payload.role === 'seller') {
      const nextSellerId = Math.max(0, ...this.sellers.map((s) => s.id)) + 1;
      sellerProfile = {
        id: nextSellerId,
        user_id: nextUserId,
        business_name: payload.business_name || `${payload.name}'s Farm`,
        description: payload.description || 'Vegetable seller profile',
        location: payload.location || 'Lagos',
        phone: newUser.phone,
        approval_status: 'pending',
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
        average_rating: 0,
        rating_count: 0,
        total_products: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.sellers.push(sellerProfile);
    }

    const token = `mock-token-${Date.now()}-${nextUserId}`;
    this.currentUser = newUser;
    return {
      user: {
        ...sanitizeUser(newUser),
        seller_profile: sellerProfile,
      },
      token,
    };
  }

  loginUser(credentials) {
    const email = String(credentials?.email || '')
      .trim()
      .toLowerCase();

    // AUTH-09: throttle repeated failed logins (5 per minute) BEFORE credential checks.
    const retryAfter = this.getLoginRetryAfter(email);
    if (retryAfter > 0) {
      throw new ApiError({
        message: STRINGS.AUTH.TOO_MANY_ATTEMPTS_WAIT(retryAfter),
        status: 429,
        code: ERROR_CODES.RATE_LIMITED,
        retryAfter,
      });
    }

    const user = this.findUserByEmail(email);

    // AUTH-09: never reveal whether an email exists. Unknown accounts and
    // incorrect passwords both return the same generic 401 message.
    if (!user || !verifyPassword(credentials?.password, user.password_hash)) {
      this.recordFailedLogin(email);
      throw new ApiError({
        message: STRINGS.ERRORS.INVALID_CREDENTIALS,
        status: 401,
        code: ERROR_CODES.UNAUTHORIZED,
      });
    }

    const sellerProfile =
      this.sellers.find((s) => s.user_id === user.id) || null;

    // AUTH-12 / ADM-03 / TC-30: suspended or deactivated users (including
    // suspended sellers) are blocked from logging in with a friendly message.
    if (user.status === 'suspended') {
      throw new ApiError({
        message: STRINGS.AUTH.ACCOUNT_SUSPENDED_MESSAGE,
        status: 403,
        code: ERROR_CODES.FORBIDDEN,
      });
    }
    if (user.status === 'deactivated' || user.status === 'inactive') {
      throw new ApiError({
        message: STRINGS.AUTH.ACCOUNT_DEACTIVATED_MESSAGE,
        status: 403,
        code: ERROR_CODES.FORBIDDEN,
      });
    }
    if (sellerProfile?.approval_status === 'suspended') {
      throw new ApiError({
        message: STRINGS.AUTH.SELLER_ACCOUNT_SUSPENDED_MESSAGE,
        status: 403,
        code: ERROR_CODES.FORBIDDEN,
      });
    }

    // Successful login clears any prior failed-attempt throttle for this email.
    delete this.loginAttempts[email];

    const token = `mock-token-${Date.now()}-${user.id}`;
    this.currentUser = user;

    return {
      user: {
        ...sanitizeUser(user),
        seller_profile: sellerProfile,
      },
      token,
    };
  }

  /**
   * Records a failed login attempt for throttling (AUTH-09).
   * @param {string} email
   */
  recordFailedLogin(email) {
    if (!email) return;
    const now = Date.now();
    const windowStart = now - LOGIN_WINDOW_MS;
    const recent = (this.loginAttempts[email] || []).filter(
      (ts) => ts > windowStart
    );
    recent.push(now);
    this.loginAttempts[email] = recent;
  }

  /**
   * Returns remaining cooldown seconds (0 when under the limit).
   * AUTH-09: 5 failed attempts per 60-second window.
   * @param {string} email
   * @returns {number}
   */
  getLoginRetryAfter(email) {
    if (!email) return 0;
    const now = Date.now();
    const windowStart = now - LOGIN_WINDOW_MS;
    const recent = (this.loginAttempts[email] || []).filter(
      (ts) => ts > windowStart
    );
    if (recent.length < MAX_LOGIN_ATTEMPTS) return 0;
    const oldest = Math.min(...recent);
    const elapsed = now - oldest;
    const remainingMs = LOGIN_WINDOW_MS - elapsed;
    return remainingMs > 0 ? Math.max(1, Math.ceil(remainingMs / 1000)) : 0;
  }

  logoutUser() {
    this.currentUser = null;
  }

  /**
   * Issues a time-limited, single-use password-reset token (SRS AUTH-06).
   *
   * Prepends a random component so tokens are not guessable. To avoid email
   * enumeration the response shape is identical whether or not the account
   * exists. In mock mode the token is returned so the in-browser demo can
   * complete the flow; a real backend delivers it by email only.
   *
   * @param {{ email?: string }} payload
   * @returns {{ message: string, reset_token?: string, expires_at?: string }}
   */
  forgotPassword(payload) {
    const email = String(payload?.email || '')
      .trim()
      .toLowerCase();
    const response = { message: STRINGS.AUTH.FORGOT_SUCCESS };

    const user = this.findUserByEmail(email);
    if (!user) {
      return response;
    }

    // Only the newest link should work: invalidate this email's unused tokens.
    for (const [token, entry] of Object.entries(this.resetTokens)) {
      if (entry.email === email && !entry.used_at) {
        delete this.resetTokens[token];
      }
    }

    const token = this.generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    this.resetTokens[token] = {
      email,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      used_at: null,
    };

    return { ...response, reset_token: token, expires_at: expiresAt };
  }

  /**
   * Generates an opaque mock reset token.
   * @returns {string}
   */
  generateResetToken() {
    const rand = Math.random().toString(36).slice(2, 10);
    return `mock-reset-${Date.now().toString(36)}-${rand}`;
  }

  /**
   * Sets a new password using a valid, unused, unexpired reset token
   * (SRS AUTH-06).
   *
   * @param {{
   *   token?: string,
   *   email?: string,
   *   password?: string,
   *   password_confirmation?: string
   * }} payload
   * @returns {{ message: string }}
   */
  resetPassword(payload) {
    const token = String(payload?.token || '').trim();
    const entry = token ? this.resetTokens[token] : null;

    const throwInvalid = (reason, message) => {
      const friendly = message || STRINGS.AUTH.RESET_TOKEN_INVALID;
      throw new ApiError({
        message: friendly,
        status: 422,
        code: ERROR_CODES.INVALID_RESET_TOKEN,
        errors: { token: [friendly] },
        data: { reason },
      });
    };

    if (!entry) throwInvalid('invalid');
    if (entry.used_at) throwInvalid('used', STRINGS.AUTH.RESET_TOKEN_USED);
    if (Date.now() > new Date(entry.expires_at).getTime()) {
      throwInvalid('expired', STRINGS.AUTH.RESET_TOKEN_EXPIRED);
    }

    // When an email is supplied it must match the token's owner.
    const email = String(payload?.email || '')
      .trim()
      .toLowerCase();
    if (email && email !== entry.email) throwInvalid('invalid');

    const errors = {};
    const password = String(payload?.password ?? '');
    const confirmation = String(payload?.password_confirmation ?? '');
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasDigits = /\d/.test(password);
    if (!password) {
      errors.password = ['Password is required.'];
    } else if (password.length < 8) {
      errors.password = ['Password must be at least 8 characters.'];
    } else if (!hasLetters || !hasDigits) {
      errors.password = ['Password must contain both letters and digits.'];
    }
    if (!confirmation) {
      errors.password_confirmation = ['Please confirm your password.'];
    } else if (password !== confirmation) {
      errors.password_confirmation = ['Passwords do not match.'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError({
        message: 'The given data was invalid.',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    const user = this.findUserByEmail(entry.email);
    if (!user) throwInvalid('invalid');

    user.password_hash = hashPassword(password);
    user.updated_at = new Date().toISOString();

    // AUTH-06: the link is single-use.
    entry.used_at = new Date().toISOString();
    // Clear any failed-login throttle for the account.
    delete this.loginAttempts[entry.email];
    // NFR-SEC-03: changing the password revokes the active session.
    if (this.currentUser && this.currentUser.id === user.id) {
      this.currentUser = null;
    }

    return { message: STRINGS.AUTH.RESET_SUCCESS };
  }

  getCurrentProfile() {
    if (!this.currentUser) {
      // Default to guest/demo buyer
      return sanitizeUser(this.users.find((u) => u.id === 6));
    }
    const seller = this.sellers.find((s) => s.user_id === this.currentUser.id);
    return {
      ...sanitizeUser(this.currentUser),
      seller_profile: seller || null,
    };
  }

  /**
   * Update the authenticated user's profile (SRS AUTH-11).
   *
   * Updates account fields (name, phone) and, for sellers, the linked
   * business details (business name, location, description). Email and role
   * are intentionally immutable here.
   *
   * @param {Object} data
   * @returns {Object} the updated profile (user + seller_profile)
   */
  updateProfile(data = {}) {
    const user = this.currentUser;
    if (!user) {
      throw new ApiError({
        message: STRINGS.ERRORS.INVALID_CREDENTIALS,
        status: 401,
        code: ERROR_CODES.UNAUTHORIZED,
      });
    }

    const errors = {};

    const name = data.name !== undefined ? String(data.name).trim() : user.name;
    if (!name) {
      errors.name = ['Full name is required.'];
    } else if (name.length < 2) {
      errors.name = ['Full name must be at least 2 characters.'];
    }

    const phone =
      data.phone !== undefined ? String(data.phone).trim() : user.phone;
    if (!phone) {
      errors.phone = ['Phone number is required.'];
    } else {
      const digits = phone.replace(/[^0-9]/g, '');
      if (!PHONE_REGEX.test(phone) || digits.length < 10) {
        errors.phone = [
          'Please enter a valid phone number (at least 10 digits).',
        ];
      }
    }

    const seller = this.sellers.find((s) => s.user_id === user.id) || null;

    let businessName = null;
    let location = null;
    let description = null;
    if (seller) {
      businessName =
        data.business_name !== undefined
          ? String(data.business_name).trim()
          : seller.business_name;
      if (!businessName) {
        errors.business_name = ['Business or Farm name is required.'];
      } else if (businessName.length > 150) {
        errors.business_name = ['Business name cannot exceed 150 characters.'];
      }

      location =
        data.location !== undefined
          ? String(data.location).trim()
          : seller.location;
      if (!location) {
        errors.location = ['Farm or stall location is required.'];
      } else if (location.length > 150) {
        errors.location = ['Location cannot exceed 150 characters.'];
      }

      description =
        data.description !== undefined
          ? String(data.description)
          : seller.description;
      if (description && description.length > 1000) {
        errors.description = ['Description cannot exceed 1000 characters.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError({
        message: 'The given data was invalid.',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    user.name = name;
    user.phone = phone;
    user.updated_at = new Date().toISOString();

    if (seller) {
      seller.business_name = businessName;
      seller.location = location;
      seller.description = description;
      if (data.phone !== undefined) seller.phone = phone;
      seller.updated_at = new Date().toISOString();
    }

    return {
      ...sanitizeUser(user),
      seller_profile: seller || null,
    };
  }

  /**
   * Change the authenticated user's password (SRS AUTH-11, AUTH-08).
   *
   * Requires the correct current password, enforces the password policy on the
   * new password and confirmation, and rejects reusing the current password.
   *
   * @param {{ current_password?: string, password?: string, password_confirmation?: string }} payload
   * @returns {{ message: string }}
   */
  changePassword(payload = {}) {
    const user = this.currentUser;
    if (!user) {
      throw new ApiError({
        message: STRINGS.ERRORS.INVALID_CREDENTIALS,
        status: 401,
        code: ERROR_CODES.UNAUTHORIZED,
      });
    }

    const errors = {};

    const currentPassword = String(payload.current_password ?? '');
    if (!currentPassword) {
      errors.current_password = [STRINGS.PROFILE.CURRENT_PASSWORD_REQUIRED];
    } else if (!verifyPassword(currentPassword, user.password_hash)) {
      errors.current_password = [STRINGS.PROFILE.CURRENT_PASSWORD_INCORRECT];
    }

    const password = String(payload.password ?? '');
    const confirmation = String(payload.password_confirmation ?? '');
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasDigits = /\d/.test(password);
    if (!password) {
      errors.password = ['New password is required.'];
    } else if (password.length < 8) {
      errors.password = ['Password must be at least 8 characters.'];
    } else if (!hasLetters || !hasDigits) {
      errors.password = ['Password must contain both letters and digits.'];
    } else if (currentPassword && password === currentPassword) {
      errors.password = [STRINGS.PROFILE.PASSWORD_SAME_AS_CURRENT];
    }

    if (!confirmation) {
      errors.password_confirmation = ['Please confirm your new password.'];
    } else if (password !== confirmation) {
      errors.password_confirmation = ['Passwords do not match.'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError({
        message: 'The given data was invalid.',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    user.password_hash = hashPassword(password);
    user.updated_at = new Date().toISOString();
    // A successful password change clears any failed-login throttle.
    delete this.loginAttempts[user.email];

    return { message: STRINGS.PROFILE.PASSWORD_SUCCESS };
  }

  // --- Products ---
  getProducts(params = {}) {
    const {
      q,
      category,
      min_price,
      max_price,
      availability,
      seller,
      location,
      sort = 'newest',
      page = 1,
      // MKT-03: the public catalogue defaults to 12 listings per page.
      // Other list endpoints retain their own API defaults.
      per_page = 12,
    } = params;

    // MKT-04: Public listings shall show only products that are published,
    // not deleted, belong to an approved and active seller, and belong to an active category.
    let results = this.products.filter((p) => {
      if (p.deleted_at) return false;
      if (p.is_published === false || p.status === 'draft') return false;

      // Verify seller is approved and active
      const sellerId = p.seller_id || p.seller?.id;
      if (sellerId) {
        const sellerObj = this.sellers.find((s) => s.id === Number(sellerId));
        if (sellerObj && sellerObj.approval_status !== 'approved') return false;
      }

      // Verify category is active
      const catId = p.category_id || p.category?.id;
      if (catId) {
        const catObj = this.categories.find((c) => c.id === Number(catId));
        if (
          catObj &&
          (catObj.is_active === false || catObj.status === 'inactive')
        ) {
          return false;
        }
      }

      return true;
    });

    const searchTerm = (q || params.search || '').trim().toLowerCase();
    if (searchTerm) {
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm) ||
          p.description?.toLowerCase().includes(searchTerm) ||
          p.seller?.business_name.toLowerCase().includes(searchTerm) ||
          p.category?.name.toLowerCase().includes(searchTerm)
      );
    }

    if (category) {
      results = results.filter((p) => {
        if (typeof category === 'number' || !isNaN(Number(category))) {
          return p.category_id === Number(category);
        }
        return (
          p.category?.slug === category ||
          p.category?.name.toLowerCase() === String(category).toLowerCase()
        );
      });
    }

    if (min_price !== undefined && min_price !== '') {
      results = results.filter((p) => p.price >= Number(min_price));
    }
    if (max_price !== undefined && max_price !== '') {
      results = results.filter((p) => p.price <= Number(max_price));
    }

    if (availability && availability !== 'all') {
      results = results.filter((p) => p.availability === availability);
    }

    if (seller) {
      results = results.filter(
        (p) =>
          p.seller_id === Number(seller) ||
          p.seller?.business_name.toLowerCase() === String(seller).toLowerCase()
      );
    }

    if (location && location !== 'all') {
      results = results.filter((p) =>
        p.seller?.location
          ?.toLowerCase()
          .includes(String(location).toLowerCase())
      );
    }

    switch (sort) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort(
          (a, b) => (b.average_rating || 0) - (a.average_rating || 0)
        );
        break;
      case 'popularity':
        results.sort(
          (a, b) =>
            (b.rating_count || 0) * (b.average_rating || 0) -
            (a.rating_count || 0) * (a.average_rating || 0)
        );
        break;
      case 'newest':
      default:
        results.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    const meta = createPaginationMeta(results.length, page, per_page);
    const offset = (meta.current_page - 1) * meta.per_page;
    const paginated = results.slice(offset, offset + meta.per_page);

    return {
      data: paginated,
      meta,
      links: {
        first: '?page=1',
        last: `?page=${meta.last_page}`,
        prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
        next:
          meta.current_page < meta.last_page
            ? `?page=${meta.current_page + 1}`
            : null,
      },
    };
  }

  getProductById(id) {
    const product = this.products.find(
      (p) => p.id === Number(id) && !p.deleted_at
    );
    if (!product) {
      throw new ApiError({
        message: STRINGS.ERRORS.PRODUCT_NOT_FOUND,
        status: 404,
        code: 'NOT_FOUND',
      });
    }
    return product;
  }

  createProduct(data) {
    const nextId = Math.max(0, ...this.products.map((p) => p.id)) + 1;
    const categoryId = Number(data.category_id || data.categoryId) || 1;
    const category =
      this.categories.find((c) => c.id === categoryId) || this.categories[0];
    const sellerId = Number(data.seller_id || data.sellerId) || 1;
    const seller =
      this.sellers.find((s) => s.id === sellerId) || this.sellers[0];

    if (seller && seller.approval_status !== 'approved') {
      let detail = `seller account status is ${seller.approval_status}`;
      if (seller.approval_status === 'pending') {
        detail =
          'seller account status is pending: pending administrator approval (AUTH-03)';
      } else if (seller.approval_status === 'rejected') {
        detail =
          'seller account status is rejected: seller application was rejected (ADM-03)';
      } else if (seller.approval_status === 'suspended') {
        detail =
          'seller account status is suspended: seller account is suspended (ADM-03)';
      }
      throw new ApiError({
        message: `Cannot publish product: ${detail}.`,
        status: 403,
        code: 'FORBIDDEN',
      });
    }

    const newProduct = {
      id: nextId,
      seller_id: sellerId,
      category_id: categoryId,
      name: data.name || 'New Vegetable',
      description: data.description || '',
      price: Number(data.price) || 0,
      unit: data.unit || 'basket',
      quantity: Number(data.quantity) || 0,
      low_stock_threshold: Number(data.low_stock_threshold) || 5,
      image:
        data.image ||
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      availability:
        data.availability === 'unavailable' || data.availability === false
          ? 'unavailable'
          : Number(data.quantity) > 0
            ? Number(data.quantity) <= (Number(data.low_stock_threshold) || 5)
              ? 'low_stock'
              : 'in_stock'
            : 'out_of_stock',
      average_rating: 0,
      rating_count: 0,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      seller: {
        id: seller.id,
        business_name: seller.business_name,
        location: seller.location,
        phone: seller.phone,
      },
    };

    this.products.unshift(newProduct);
    return newProduct;
  }

  /**
   * Uploads a product image with simulated progress (SEL-05, A-08).
   *
   * @param {File|Blob} file
   * @param {Function} [onProgress] - ({ loaded, total, percent })
   * @returns {Promise<{ url: string, filename: string, size: number, type: string }>}
   */
  async uploadImage(file, onProgress) {
    if (!file) {
      throw new ApiError({
        message: 'No image file provided for upload.',
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const validationError = validateProductImage(file);
    if (validationError) {
      throw new ApiError({
        message: validationError,
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const totalBytes = file.size || 100000;

    if (typeof onProgress === 'function') {
      const steps = [
        { percent: 25, loaded: Math.round(totalBytes * 0.25) },
        { percent: 60, loaded: Math.round(totalBytes * 0.6) },
        { percent: 90, loaded: Math.round(totalBytes * 0.9) },
        { percent: 100, loaded: totalBytes },
      ];
      for (const step of steps) {
        onProgress({
          loaded: step.loaded,
          total: totalBytes,
          percent: step.percent,
        });
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    let url = '';
    if (
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function'
    ) {
      try {
        url = URL.createObjectURL(file);
      } catch {
        url =
          'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
      }
    } else {
      url =
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
    }

    return {
      url,
      filename: file.name || 'product-image.jpg',
      size: file.size || 0,
      type: file.type || 'image/jpeg',
    };
  }

  updateProduct(id, data) {
    const product = this.getProductById(id);

    const currentSellerId =
      this.currentUser?.seller_id ??
      this.sellers.find((s) => s.user_id === this.currentUser?.id)?.id;

    if (
      this.currentUser &&
      this.currentUser.role === 'seller' &&
      currentSellerId &&
      product.seller_id !== currentSellerId
    ) {
      throw new ApiError({
        message:
          'You are not authorized to update another seller’s product (SEL-14).',
        status: 403,
        code: 'FORBIDDEN',
      });
    }

    const seller =
      this.sellers.find((s) => s.id === product.seller_id) || this.sellers[0];

    if (seller && seller.approval_status !== 'approved') {
      throw new ApiError({
        message: `Cannot edit product: seller account status is ${seller.approval_status} (AUTH-03, ADM-03).`,
        status: 403,
        code: 'FORBIDDEN',
      });
    }

    // Category update
    if (data.category_id !== undefined) {
      const categoryId = Number(data.category_id);
      const cat = this.categories.find((c) => c.id === categoryId);
      if (cat) {
        product.category_id = categoryId;
        product.category = { id: cat.id, name: cat.name, slug: cat.slug };
      }
    }

    // Numeric and text fields
    if (data.name !== undefined) {
      product.name = data.name;
    }
    if (data.description !== undefined) {
      product.description = data.description;
    }
    if (data.unit !== undefined) {
      product.unit = data.unit;
    }
    if (data.image !== undefined) {
      product.image = data.image;
    }
    if (data.price !== undefined) {
      product.price = Number(data.price);
    }
    if (data.quantity !== undefined) {
      product.quantity = Number(data.quantity);
    }
    if (data.low_stock_threshold !== undefined) {
      product.low_stock_threshold = Number(data.low_stock_threshold);
    }

    // Availability derivation (SEL-07, BR-01)
    if (data.availability === 'unavailable' || data.availability === false) {
      product.availability = 'unavailable';
    } else {
      const qty = product.quantity;
      const threshold = product.low_stock_threshold || 5;
      product.availability =
        qty <= 0 ? 'out_of_stock' : qty <= threshold ? 'low_stock' : 'in_stock';
    }

    product.updated_at = new Date().toISOString();
    return product;
  }

  deleteProduct(id) {
    const product = this.getProductById(id);
    const currentSellerId =
      this.currentUser?.seller_id ??
      this.sellers.find((s) => s.user_id === this.currentUser?.id)?.id;
    if (
      this.currentUser &&
      this.currentUser.role === 'seller' &&
      currentSellerId &&
      product.seller_id !== currentSellerId
    ) {
      throw new ApiError({
        message:
          'You are not authorized to delete another seller’s product (SEL-14).',
        status: 403,
        code: 'FORBIDDEN',
      });
    }
    product.deleted_at = new Date().toISOString();
    return { message: 'Product deleted successfully.' };
  }

  getSellerProducts(params = {}) {
    const {
      q,
      search,
      category,
      availability,
      sort = 'newest',
      page = 1,
      per_page = 10,
      seller_id,
      seller,
    } = params;

    const resolvedSellerId =
      seller_id ??
      seller ??
      this.currentUser?.seller_id ??
      this.sellers.find((s) => s.user_id === this.currentUser?.id)?.id ??
      this.sellers[0]?.id ??
      1;

    // Filter to authenticated seller and exclude soft-deleted items (SEL-04, SEL-14)
    let results = this.products.filter(
      (p) => p.seller_id === Number(resolvedSellerId) && !p.deleted_at
    );

    // Search query: name, description, category
    const searchTerm = (q || search || '').trim().toLowerCase();
    if (searchTerm) {
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm) ||
          p.description?.toLowerCase().includes(searchTerm) ||
          p.category?.name?.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (category && category !== 'all') {
      results = results.filter((p) => {
        if (typeof category === 'number' || !isNaN(Number(category))) {
          return p.category_id === Number(category);
        }
        return (
          p.category?.slug === category ||
          p.category?.name?.toLowerCase() === String(category).toLowerCase()
        );
      });
    }

    // Availability filter (SEL-07, BR-01)
    if (availability && availability !== 'all') {
      results = results.filter((p) => {
        const isManuallyUnavailable =
          p.availability === false ||
          p.availability === 'unavailable' ||
          p.is_available === false;

        if (availability === 'unavailable') {
          return isManuallyUnavailable;
        }
        if (isManuallyUnavailable) {
          return false;
        }

        const stock = Number(p.quantity || 0);
        const threshold = Number(p.low_stock_threshold || 5);

        if (availability === 'out_of_stock') {
          return stock === 0;
        }
        if (availability === 'low_stock') {
          return stock > 0 && stock <= threshold;
        }
        if (availability === 'in_stock' || availability === 'available') {
          return stock > threshold;
        }
        return p.availability === availability;
      });
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'stock_asc':
        results.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
        break;
      case 'stock_desc':
        results.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
        break;
      case 'name_asc':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        results.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'oldest':
        results.sort(
          (a, b) =>
            new Date(a.created_at || a.updated_at || 0).getTime() -
            new Date(b.created_at || b.updated_at || 0).getTime()
        );
        break;
      case 'newest':
      default:
        results.sort(
          (a, b) =>
            new Date(b.created_at || b.updated_at || 0).getTime() -
            new Date(a.created_at || a.updated_at || 0).getTime()
        );
        break;
    }

    const meta = createPaginationMeta(results.length, page, per_page);
    const offset = (meta.current_page - 1) * meta.per_page;
    const paginated = results.slice(offset, offset + meta.per_page);

    return {
      data: paginated,
      meta,
      links: {
        first: '?page=1',
        last: `?page=${meta.last_page}`,
        prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
        next:
          meta.current_page < meta.last_page
            ? `?page=${meta.current_page + 1}`
            : null,
      },
    };
  }

  // --- Cart Management & Server-side Sync (CART-08, CART-10) ---
  getServerCart(userId) {
    if (!userId) {
      return { items: [], updated_at: null };
    }
    const cart = this.serverCarts[userId] || [];
    return {
      items: JSON.parse(JSON.stringify(cart)),
      updated_at: cart._updatedAt || new Date().toISOString(),
    };
  }

  syncServerCart(userId, items = []) {
    if (!userId) {
      return { items: [], updated_at: new Date().toISOString() };
    }
    const cleanItems = JSON.parse(JSON.stringify(items));
    cleanItems._updatedAt = new Date().toISOString();
    this.serverCarts[userId] = cleanItems;
    return {
      items: JSON.parse(JSON.stringify(cleanItems)),
      updated_at: cleanItems._updatedAt,
    };
  }

  clearServerCart(userId) {
    if (userId && this.serverCarts[userId]) {
      delete this.serverCarts[userId];
    }
    return { success: true };
  }

  validateCart(items = []) {
    let hasPriceChanges = false;
    let hasStockIssues = false;
    let hasUnavailable = false;
    const changes = [];

    const validatedItems = items.map((item) => {
      const productId = Number(item.product_id ?? item.id);
      const product = this.products.find((p) => p.id === productId);

      if (!product || product.deleted_at || product.is_active === false) {
        hasStockIssues = true;
        hasUnavailable = true;
        changes.push({
          product_id: productId,
          name: item.name || 'Product',
          type: 'unavailable',
          message: `"${item.name || 'Product'}" is currently unavailable and has been removed from your cart.`,
        });
        return {
          ...item,
          product_id: productId,
          is_available: false,
          current_stock: 0,
          error: STRINGS.ERRORS.PRODUCT_UNAVAILABLE,
        };
      }

      // Check seller status (CART-08: current price, stock, availability and seller status)
      const seller =
        product.seller ||
        (product.seller_id
          ? this.users.find((u) => u.id === product.seller_id)
          : null);
      if (
        seller &&
        (seller.is_active === false ||
          seller.status === 'suspended' ||
          seller.approval_status === 'suspended')
      ) {
        hasStockIssues = true;
        hasUnavailable = true;
        changes.push({
          product_id: productId,
          name: item.name || product.name,
          type: 'seller_suspended',
          message: `Seller for "${item.name || product.name}" is currently unavailable. Item removed from cart.`,
        });
        return {
          ...item,
          product_id: productId,
          is_available: false,
          current_stock: 0,
          error: 'Seller is currently unavailable.',
        };
      }

      const availableStock =
        typeof product.quantity === 'number' ? product.quantity : 0;
      if (
        availableStock <= 0 ||
        product.availability === 'out_of_stock' ||
        product.availability === 'unavailable'
      ) {
        hasStockIssues = true;
        hasUnavailable = true;
        changes.push({
          product_id: productId,
          name: item.name || product.name,
          type: 'unavailable',
          message: `"${item.name || product.name}" is out of stock and has been removed from your cart.`,
        });
        return {
          ...item,
          product_id: productId,
          is_available: false,
          current_stock: 0,
          error: 'Out of stock.',
        };
      }

      const priceChanged = Number(product.price) !== Number(item.price);
      const stockIssue = availableStock < Number(item.quantity);
      if (priceChanged) {
        hasPriceChanges = true;
        changes.push({
          product_id: productId,
          name: item.name || product.name,
          type: 'price_changed',
          old_price: Number(item.price),
          new_price: Number(product.price),
          message: `Price for "${item.name || product.name}" changed from ₦${Number(item.price).toLocaleString()} to ₦${Number(product.price).toLocaleString()}.`,
        });
      }
      if (stockIssue) {
        hasStockIssues = true;
        changes.push({
          product_id: productId,
          name: item.name || product.name,
          type: 'stock_reduced',
          old_quantity: Number(item.quantity),
          new_quantity: availableStock,
          message: `Available stock for "${item.name || product.name}" is now ${availableStock} (reduced from ${item.quantity}).`,
        });
      }

      return {
        ...item,
        product_id: productId,
        current_price: product.price,
        current_stock: availableStock,
        is_available: true,
        price_changed: priceChanged,
        stock_issue: stockIssue,
      };
    });

    return {
      is_valid: !hasPriceChanges && !hasStockIssues && !hasUnavailable,
      items: validatedItems,
      changes,
      has_price_changes: hasPriceChanges,
      has_stock_issues: hasStockIssues,
      has_unavailable: hasUnavailable,
    };
  }

  // --- Categories ---
  getCategories(params = {}) {
    if (params.all) {
      return [...this.categories];
    }
    return this.categories.filter((c) => c.is_active);
  }

  getCategoryById(id) {
    const category = this.categories.find((c) => c.id === Number(id));
    if (!category) {
      throw new ApiError({
        message: 'Category not found.',
        status: 404,
        code: 'NOT_FOUND',
      });
    }
    return category;
  }

  createCategory(data) {
    const nextId = Math.max(0, ...this.categories.map((c) => c.id)) + 1;
    const newCategory = {
      id: nextId,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      description: data.description || '',
      is_active: data.is_active !== false,
      products_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  updateCategory(id, data) {
    const category = this.getCategoryById(id);
    Object.assign(category, data, { updated_at: new Date().toISOString() });
    return category;
  }

  deleteCategory(id) {
    const category = this.getCategoryById(id);
    const hasProducts = this.products.some(
      (p) => p.category_id === category.id && !p.deleted_at
    );
    if (hasProducts) {
      throw new ApiError({
        message:
          'Cannot delete category that contains active products (BR-09). You may deactivate it instead.',
        status: 409,
        code: 'CONFLICT',
      });
    }
    this.categories = this.categories.filter((c) => c.id !== category.id);
    return { message: 'Category deleted successfully.' };
  }

  // --- Orders ---
  getOrders(params = {}, userContext = null) {
    const user = userContext || this.currentUser || { role: 'buyer', id: 6 };
    const { status, search, page = 1, per_page = 20 } = params;

    let results = [...this.orders];

    if (user.role === 'buyer') {
      results = results.filter((o) => o.buyer_id === user.id);
    } else if (user.role === 'seller') {
      const seller = this.sellers.find((s) => s.user_id === user.id);
      const sellerId = seller ? seller.id : user.id;
      results = results.filter((o) => o.seller_id === sellerId);
    }

    if (status && status !== 'all') {
      results = results.filter((o) => o.status === status);
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter(
        (o) =>
          (o.order_number && o.order_number.toLowerCase().includes(term)) ||
          (o.checkout_ref && o.checkout_ref.toLowerCase().includes(term)) ||
          (o.delivery_name && o.delivery_name.toLowerCase().includes(term)) ||
          (o.seller?.business_name &&
            o.seller.business_name.toLowerCase().includes(term)) ||
          (Array.isArray(o.items) &&
            o.items.some(
              (it) =>
                (it.product_name &&
                  it.product_name.toLowerCase().includes(term)) ||
                (it.name && it.name.toLowerCase().includes(term))
            ))
      );
    }

    results.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const meta = createPaginationMeta(results.length, page, per_page);
    const offset = (meta.current_page - 1) * meta.per_page;

    return {
      data: results.slice(offset, offset + meta.per_page),
      meta,
      links: {
        first: '?page=1',
        last: `?page=${meta.last_page}`,
        prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
        next:
          meta.current_page < meta.last_page
            ? `?page=${meta.current_page + 1}`
            : null,
      },
    };
  }

  getOrderById(id) {
    const order = this.orders.find((o) => o.id === Number(id));
    if (!order) {
      throw new ApiError({
        message: 'Order not found.',
        status: 404,
        code: 'NOT_FOUND',
      });
    }
    return order;
  }

  getOrdersByRef(ref) {
    if (!ref) return [];
    const term = String(ref).trim().toLowerCase();
    return this.orders.filter(
      (o) =>
        (o.checkout_ref && o.checkout_ref.toLowerCase() === term) ||
        (o.order_number && o.order_number.toLowerCase() === term) ||
        String(o.id) === term
    );
  }

  createOrder(payload = {}) {
    const checkoutRef = payload.checkout_ref || generateUUID();

    // Idempotent retry check (NFR-REL-04, CHK-05, vegetable_joint_schema.sql 9.1):
    // A duplicate (checkout_ref, seller_id) raises error 1062 in MySQL -> treated as an idempotent retry.
    if (payload.checkout_ref) {
      const existingOrders = this.orders.filter(
        (o) => o.checkout_ref === payload.checkout_ref
      );
      if (existingOrders.length > 0) {
        return {
          checkout_ref: payload.checkout_ref,
          orders: existingOrders,
          idempotent: true,
          is_duplicate: true,
        };
      }
    }

    const items = payload.items || [];
    if (!items.length) {
      throw new ApiError({
        message: STRINGS.ERRORS.CART_EMPTY,
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const buyer = this.currentUser || this.users.find((u) => u.id === 6);

    // Server-side validation of checkout fields (CHK-02, CHK-04, 422)
    const deliveryName = (payload.delivery_name ?? buyer?.name ?? '').trim();
    const deliveryPhone = (payload.delivery_phone ?? buyer?.phone ?? '').trim();
    const deliveryAddress = (
      payload.delivery_address ?? (buyer ? 'Lagos, Nigeria' : '')
    ).trim();

    const fieldErrors = {};
    if (!deliveryName) {
      fieldErrors.delivery_name = ['The recipient name is required.'];
    }
    if (!deliveryPhone) {
      fieldErrors.delivery_phone = ['The delivery phone number is required.'];
    }
    if (!deliveryAddress) {
      fieldErrors.delivery_address = ['The delivery address is required.'];
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError({
        message:
          'Checkout validation failed. Please provide all required delivery details (CHK-02, CHK-04).',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: fieldErrors,
        data: {
          message:
            'Checkout validation failed. Please provide all required delivery details (CHK-02, CHK-04).',
          errors: fieldErrors,
        },
      });
    }

    // Server-side validation of stock, availability, and prices (CHK-04, TC-17, TC-18, ERR-01)
    const stockErrors = {};
    const failedStockItems = [];
    const stockChanges = [];

    const priceErrors = {};
    const failedPriceItems = [];
    const priceChanges = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const productId = Number(item.product_id ?? item.id);
      const product = this.products.find((p) => p.id === productId);
      const itemKey = `items.${i}`;
      const itemName = item.name || product?.name || `Product #${productId}`;

      if (
        !product ||
        product.deleted_at ||
        product.is_active === false ||
        product.availability === 'unavailable'
      ) {
        const msg = `"${itemName}" is currently unavailable (ERR-01).`;
        stockErrors[itemKey] = [msg];
        stockErrors[String(productId)] = [msg];
        failedStockItems.push({
          product_id: productId,
          name: itemName,
          type: 'unavailable',
          message: msg,
        });
        stockChanges.push({
          product_id: productId,
          name: itemName,
          type: 'unavailable',
          message: msg,
        });
        continue;
      }

      const availableStock =
        typeof product.quantity === 'number' ? product.quantity : 0;
      const requestedQty = Number(item.quantity);

      if (availableStock <= 0 || product.availability === 'out_of_stock') {
        const msg = `"${product.name}" is out of stock (CHK-04).`;
        stockErrors[itemKey] = [msg];
        stockErrors[String(productId)] = [msg];
        failedStockItems.push({
          product_id: productId,
          name: product.name,
          type: 'out_of_stock',
          available_stock: 0,
          requested_quantity: requestedQty,
          message: msg,
        });
        stockChanges.push({
          product_id: productId,
          name: product.name,
          type: 'unavailable',
          message: msg,
        });
      } else if (availableStock < requestedQty) {
        const msg = `Insufficient stock for "${product.name}". Requested ${requestedQty}, but only ${availableStock} is available (CHK-04).`;
        stockErrors[itemKey] = [msg];
        stockErrors[String(productId)] = [msg];
        failedStockItems.push({
          product_id: productId,
          name: product.name,
          type: 'insufficient_stock',
          available_stock: availableStock,
          requested_quantity: requestedQty,
          message: msg,
        });
        stockChanges.push({
          product_id: productId,
          name: product.name,
          type: 'stock_reduced',
          old_quantity: requestedQty,
          new_quantity: availableStock,
          message: msg,
        });
      }

      // Price validation (TC-18 / CART-08)
      if (
        item.price !== undefined &&
        Number(product.price) !== Number(item.price)
      ) {
        const msg = `Price for "${product.name}" has changed from ₦${Number(item.price).toLocaleString()} to ₦${Number(product.price).toLocaleString()} (ERR-01).`;
        priceErrors[itemKey] = [msg];
        priceErrors[String(productId)] = [msg];
        failedPriceItems.push({
          product_id: productId,
          name: product.name,
          type: 'price_changed',
          old_price: Number(item.price),
          new_price: Number(product.price),
          message: msg,
        });
        priceChanges.push({
          product_id: productId,
          name: product.name,
          type: 'price_changed',
          old_price: Number(item.price),
          new_price: Number(product.price),
          message: msg,
        });
      }
    }

    // Reject on stock/availability conflicts (CHK-04, TC-17, UC-02 4a) -> HTTP 409 CONFLICT
    if (failedStockItems.length > 0) {
      const summaryMsg =
        failedStockItems.length === 1
          ? failedStockItems[0].message
          : 'One or more items in your cart have insufficient stock or are unavailable (CHK-04).';

      throw new ApiError({
        message: summaryMsg,
        status: 409,
        code: 'CONFLICT',
        errors: stockErrors,
        data: {
          message: summaryMsg,
          code: 'ORDER_CONFLICT',
          status: 409,
          items: failedStockItems,
          failed_items: failedStockItems,
          changes: stockChanges,
          errors: stockErrors,
        },
      });
    }

    // Reject on price changes (TC-18, CART-08, UC-02 1a) -> HTTP 422 VALIDATION_ERROR
    if (failedPriceItems.length > 0) {
      const summaryMsg =
        failedPriceItems.length === 1
          ? failedPriceItems[0].message
          : 'Price for one or more items has changed since you added them to your cart (ERR-01).';

      throw new ApiError({
        message: summaryMsg,
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: priceErrors,
        data: {
          message: summaryMsg,
          status: 422,
          code: 'VALIDATION_ERROR',
          items: failedPriceItems,
          failed_items: failedPriceItems,
          changes: priceChanges,
          errors: priceErrors,
        },
      });
    }

    // Group items by seller (CHK-05: one order per seller)
    const itemsBySeller = new Map();
    for (const item of items) {
      const product = this.products.find(
        (p) => p.id === Number(item.product_id)
      );
      if (!product) continue;
      const sellerId = product.seller_id;
      if (!itemsBySeller.has(sellerId)) {
        itemsBySeller.set(sellerId, []);
      }
      itemsBySeller.get(sellerId).push({
        ...item,
        product,
      });
    }

    const createdOrders = [];
    for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
      const seller = this.sellers.find((s) => s.id === sellerId);
      const nextOrderId = Math.max(0, ...this.orders.map((o) => o.id)) + 1;
      const orderNumber = `VJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextOrderId).padStart(3, '0')}`;

      let totalAmount = 0;
      const orderItems = sellerItems.map((si, idx) => {
        const subtotal = si.product.price * si.quantity;
        totalAmount += subtotal;

        // Decrement product stock (CHK-07)
        si.product.quantity = Math.max(0, si.product.quantity - si.quantity);
        if (si.product.quantity === 0) {
          si.product.availability = 'out_of_stock';
        } else if (si.product.quantity <= si.product.low_stock_threshold) {
          si.product.availability = 'low_stock';
        }

        return {
          id: idx + 1,
          order_id: nextOrderId,
          product_id: si.product.id,
          product_name: si.product.name,
          unit: si.product.unit,
          quantity: si.quantity,
          price: si.product.price,
          subtotal,
        };
      });

      const newOrder = {
        id: nextOrderId,
        order_number: orderNumber,
        checkout_ref: checkoutRef,
        buyer_id: buyer.id,
        seller_id: sellerId,
        total_amount: totalAmount,
        status: 'pending',
        payment_method: payload.payment_method || 'cash_on_delivery',
        delivery_name: payload.delivery_name || buyer.name,
        delivery_phone: payload.delivery_phone || buyer.phone,
        delivery_address: payload.delivery_address || 'Lagos, Nigeria',
        notes: payload.notes || '',
        cancel_reason: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        buyer: {
          id: buyer.id,
          name: buyer.name,
          email: buyer.email,
          phone: buyer.phone,
        },
        seller: {
          id: seller?.id || sellerId,
          business_name: seller?.business_name || 'Seller',
          location: seller?.location || 'Nigeria',
        },
        items: orderItems,
        status_history: [
          {
            id: 1,
            order_id: nextOrderId,
            from_status: null,
            to_status: 'pending',
            changed_by: buyer.id,
            note: 'Order placed by buyer (CHK-03)',
            created_at: new Date().toISOString(),
          },
        ],
      };

      this.orders.unshift(newOrder);
      createdOrders.push(newOrder);
    }

    return {
      checkout_ref: checkoutRef,
      orders: createdOrders,
    };
  }

  updateOrderStatus(id, newStatus, note = '') {
    const order = this.getOrderById(id);
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['ready', 'cancelled'],
      ready: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new ApiError({
        message: `Invalid order status transition from '${order.status}' to '${newStatus}'.`,
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const oldStatus = order.status;
    order.status = newStatus;
    order.updated_at = new Date().toISOString();
    if (newStatus === 'completed') {
      order.completed_at = new Date().toISOString();
    }

    order.status_history.push({
      id: order.status_history.length + 1,
      order_id: order.id,
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: this.currentUser?.id || 1,
      note: note || `Status changed from ${oldStatus} to ${newStatus}`,
      created_at: new Date().toISOString(),
    });

    return order;
  }

  cancelOrder(id, reason = '') {
    const order = this.getOrderById(id);
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new ApiError({
        message: `Order cannot be cancelled in '${order.status}' state.`,
        status: 409,
        code: 'CONFLICT',
      });
    }

    // Restore stock (ORD-03)
    for (const item of order.items) {
      const product = this.products.find((p) => p.id === item.product_id);
      if (product) {
        product.quantity += item.quantity;
        if (product.quantity > product.low_stock_threshold) {
          product.availability = 'in_stock';
        } else if (product.quantity > 0) {
          product.availability = 'low_stock';
        }
      }
    }

    const oldStatus = order.status;
    order.status = 'cancelled';
    order.cancel_reason = reason;
    order.updated_at = new Date().toISOString();

    order.status_history.push({
      id: order.status_history.length + 1,
      order_id: order.id,
      from_status: oldStatus,
      to_status: 'cancelled',
      changed_by: this.currentUser?.id || 1,
      note: reason
        ? `Cancelled: ${reason}`
        : 'Cancelled by user. Stock restored.',
      created_at: new Date().toISOString(),
    });

    return order;
  }

  // --- Sellers ---
  getPublicSellers(params = {}) {
    const { location, search, page = 1, per_page = 20 } = params;
    let results = this.sellers.filter((s) => s.approval_status === 'approved');

    if (location && location !== 'all') {
      results = results.filter((s) =>
        s.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter(
        (s) =>
          s.business_name.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term)
      );
    }

    const meta = createPaginationMeta(results.length, page, per_page);
    const offset = (meta.current_page - 1) * meta.per_page;

    return {
      data: results.slice(offset, offset + meta.per_page),
      meta,
      links: {
        first: '?page=1',
        last: `?page=${meta.last_page}`,
        prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
        next:
          meta.current_page < meta.last_page
            ? `?page=${meta.current_page + 1}`
            : null,
      },
    };
  }

  getPublicSellerById(id) {
    const seller = this.sellers.find((s) => s.id === Number(id));
    if (!seller) {
      throw new ApiError({
        message: 'Seller not found.',
        status: 404,
        code: 'NOT_FOUND',
      });
    }

    const products = this.products.filter(
      (p) => p.seller_id === seller.id && !p.deleted_at
    );

    return {
      ...seller,
      products,
    };
  }

  getSellerDashboard(sellerId = null) {
    const resolvedSellerId =
      sellerId ??
      this.currentUser?.seller_id ??
      this.sellers.find((s) => s.user_id === this.currentUser?.id)?.id ??
      this.sellers[0]?.id ??
      1;

    const seller =
      this.sellers.find((s) => s.id === resolvedSellerId) || this.sellers[0];
    const sellerProducts = this.products.filter(
      (p) => p.seller_id === resolvedSellerId && !p.deleted_at
    );
    const sellerOrders = this.orders.filter(
      (o) => o.seller_id === resolvedSellerId
    );

    const pendingOrders = sellerOrders.filter(
      (o) => (o.status || '').toLowerCase() === 'pending'
    );
    const completedOrders = sellerOrders.filter(
      (o) => (o.status || '').toLowerCase() === 'completed'
    );
    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0
    );

    const lowStockThreshold = 5;
    const lowStockProducts = sellerProducts.filter(
      (p) =>
        (typeof p.quantity === 'number' && p.quantity <= lowStockThreshold) ||
        p.availability === 'out_of_stock' ||
        p.availability === 'low_stock'
    );

    const totalProductsSold = completedOrders.reduce((acc, order) => {
      const itemsCount = (order.items || []).reduce(
        (iSum, it) => iSum + Number(it.quantity || 0),
        0
      );
      return acc + itemsCount;
    }, 0);

    return {
      seller_id: resolvedSellerId,
      seller_name: seller?.business_name || 'My Vegetable Store',
      active_listings_count: sellerProducts.length,
      total_products_count: sellerProducts.length,
      pending_orders_count: pendingOrders.length,
      completed_orders_count: completedOrders.length,
      total_revenue: totalRevenue,
      total_products_sold: totalProductsSold,
      low_stock_count: lowStockProducts.length,
      low_stock_threshold: lowStockThreshold,
      pending_orders: pendingOrders.slice(0, 5),
      recent_orders: sellerOrders.slice(0, 5),
      low_stock_products: lowStockProducts.slice(0, 5),
      latest_sales: completedOrders.slice(0, 5),
    };
  }

  // --- Admin ---
  getUsers(params = {}) {
    const { role, status, search, page = 1, per_page = 20 } = params;
    let results = [...this.users];

    if (role && role !== 'all') {
      results = results.filter((u) => u.role === role);
    }
    if (status && status !== 'all') {
      results = results.filter((u) => u.status === status);
    }
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.phone.includes(term)
      );
    }

    const meta = createPaginationMeta(results.length, page, per_page);
    const offset = (meta.current_page - 1) * meta.per_page;

    return {
      data: results
        .slice(offset, offset + meta.per_page)
        .map((u) => sanitizeUser(u)),
      meta,
      links: {
        first: '?page=1',
        last: `?page=${meta.last_page}`,
        prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
        next:
          meta.current_page < meta.last_page
            ? `?page=${meta.current_page + 1}`
            : null,
      },
    };
  }

  updateUserStatus(id, status) {
    const user = this.findUserById(id);
    if (!user) {
      throw new ApiError({
        message: 'User not found.',
        status: 404,
        code: 'NOT_FOUND',
      });
    }
    user.status = status;
    user.updated_at = new Date().toISOString();
    return sanitizeUser(user);
  }

  getAdminSellers(params = {}) {
    const { approval_status, search, page = 1, per_page = 20 } = params;
    let results = [...this.sellers];

    if (approval_status && approval_status !== 'all') {
      results = results.filter((s) => s.approval_status === approval_status);
    }
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter(
        (s) =>
          s.business_name.toLowerCase().includes(term) ||
          s.location.toLowerCase().includes(term)
      );
    }

    const meta = createPaginationMeta(results.length, page, per_page);
    const offset = (meta.current_page - 1) * meta.per_page;

    return {
      data: results.slice(offset, offset + meta.per_page),
      meta,
      links: {
        first: '?page=1',
        last: `?page=${meta.last_page}`,
        prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
        next:
          meta.current_page < meta.last_page
            ? `?page=${meta.current_page + 1}`
            : null,
      },
    };
  }

  updateSellerStatus(id, approvalStatus, rejectionReason = '') {
    const seller = this.sellers.find((s) => s.id === Number(id));
    if (!seller) {
      throw new ApiError({
        message: 'Seller not found.',
        status: 404,
        code: 'NOT_FOUND',
      });
    }
    seller.approval_status = approvalStatus;
    seller.rejection_reason = rejectionReason || null;
    seller.reviewed_by = 1;
    seller.reviewed_at = new Date().toISOString();
    seller.updated_at = new Date().toISOString();

    this.auditLogs.unshift({
      id: this.auditLogs.length + 1,
      user_id: 1,
      action: `seller.${approvalStatus}`,
      entity_type: 'seller_profile',
      entity_id: seller.id,
      ip_address: '127.0.0.1',
      metadata: { business_name: seller.business_name },
      created_at: new Date().toISOString(),
    });

    return seller;
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(data) {
    Object.assign(this.settings, data, {
      updated_at: new Date().toISOString(),
    });
    return { ...this.settings };
  }

  getAuditLogs(params = {}) {
    const { user_id, action, page = 1, per_page = 20 } = params;
    let results = [...this.auditLogs];

    if (user_id) {
      results = results.filter((l) => l.user_id === Number(user_id));
    }
    if (action) {
      results = results.filter((l) => l.action.includes(action));
    }

    const meta = createPaginationMeta(results.length, page, per_page);
    const offset = (meta.current_page - 1) * meta.per_page;

    return {
      data: results.slice(offset, offset + meta.per_page),
      meta,
      links: {
        first: '?page=1',
        last: `?page=${meta.last_page}`,
        prev: meta.current_page > 1 ? `?page=${meta.current_page - 1}` : null,
        next:
          meta.current_page < meta.last_page
            ? `?page=${meta.current_page + 1}`
            : null,
      },
    };
  }

  getAdminStats() {
    const totalRevenue = this.orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.total_amount, 0);

    return {
      total_users: this.users.length,
      total_sellers: this.sellers.filter(
        (s) => s.approval_status === 'approved'
      ).length,
      pending_seller_approvals: this.sellers.filter(
        (s) => s.approval_status === 'pending'
      ).length,
      active_products: this.products.filter((p) => !p.deleted_at).length,
      total_orders: this.orders.length,
      platform_gmv: totalRevenue,
    };
  }
}

export const mockStore = new MockStore();
export default mockStore;
