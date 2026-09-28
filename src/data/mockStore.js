import { mockCategories } from './mockCategories.js';
import { mockUsers } from './mockUsers.js';
import { mockSellers } from './mockSellers.js';
import { mockProducts } from './mockProducts.js';
import { mockOrders } from './mockOrders.js';
import { mockSettings } from './mockSettings.js';
import { mockAuditLogs } from './mockAuditLogs.js';
import { createPaginationMeta } from './index.js';
import { ApiError } from '../services/apiErrors.js';
import { STRINGS } from '../constants/index.js';

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
    this.users = JSON.parse(JSON.stringify(mockUsers));
    this.sellers = JSON.parse(JSON.stringify(mockSellers));
    this.products = JSON.parse(JSON.stringify(mockProducts));
    this.orders = JSON.parse(JSON.stringify(mockOrders));
    this.settings = JSON.parse(JSON.stringify(mockSettings));
    this.auditLogs = JSON.parse(JSON.stringify(mockAuditLogs));
    this.currentUser = this.users.find((u) => u.id === 6) || null; // Amina Bello (Buyer)
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
    const existing = this.findUserByEmail(payload.email);
    if (existing) {
      throw new ApiError({
        message: 'The given data was invalid.',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: { email: ['The email has already been taken.'] },
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
        ...newUser,
        seller_profile: sellerProfile,
      },
      token,
    };
  }

  loginUser(credentials) {
    const user = this.findUserByEmail(credentials.email);
    if (!user) {
      throw new ApiError({
        message: STRINGS.ERRORS.INVALID_CREDENTIALS,
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }

    if (user.status === 'suspended') {
      throw new ApiError({
        message:
          'Your account has been suspended. Please contact administrator.',
        status: 403,
        code: 'FORBIDDEN',
      });
    }

    const sellerProfile =
      this.sellers.find((s) => s.user_id === user.id) || null;
    const token = `mock-token-${Date.now()}-${user.id}`;
    this.currentUser = user;

    return {
      user: {
        ...user,
        seller_profile: sellerProfile,
      },
      token,
    };
  }

  logoutUser() {
    this.currentUser = null;
  }

  getCurrentProfile() {
    if (!this.currentUser) {
      // Default to guest/demo buyer
      return this.users.find((u) => u.id === 6);
    }
    const seller = this.sellers.find((s) => s.user_id === this.currentUser.id);
    return {
      ...this.currentUser,
      seller_profile: seller || null,
    };
  }

  updateProfile(data) {
    const user = this.currentUser || this.users[0];
    Object.assign(user, data, { updated_at: new Date().toISOString() });
    return user;
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
      per_page = 20,
    } = params;

    let results = this.products.filter((p) => !p.deleted_at);

    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.seller?.business_name.toLowerCase().includes(term) ||
          p.category?.name.toLowerCase().includes(term)
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
          .toLowerCase()
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
      availability: Number(data.quantity) > 0 ? 'in_stock' : 'out_of_stock',
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

  updateProduct(id, data) {
    const product = this.getProductById(id);
    Object.assign(product, data, { updated_at: new Date().toISOString() });
    if (data.quantity !== undefined) {
      product.availability =
        Number(data.quantity) > 0 ? 'in_stock' : 'out_of_stock';
    }
    return product;
  }

  deleteProduct(id) {
    const product = this.getProductById(id);
    product.deleted_at = new Date().toISOString();
    return { message: 'Product deleted successfully.' };
  }

  validateCart(items = []) {
    let hasPriceChanges = false;
    let hasStockIssues = false;

    const validatedItems = items.map((item) => {
      const product = this.products.find(
        (p) => p.id === Number(item.product_id)
      );
      if (!product || product.deleted_at) {
        hasStockIssues = true;
        return {
          ...item,
          is_available: false,
          error: STRINGS.ERRORS.PRODUCT_UNAVAILABLE,
        };
      }

      const priceChanged = product.price !== item.price;
      const stockIssue = product.quantity < item.quantity;
      if (priceChanged) hasPriceChanges = true;
      if (stockIssue) hasStockIssues = true;

      return {
        ...item,
        current_price: product.price,
        current_stock: product.quantity,
        is_available: product.quantity > 0,
        price_changed: priceChanged,
        stock_issue: stockIssue,
      };
    });

    return {
      is_valid: !hasPriceChanges && !hasStockIssues,
      items: validatedItems,
      has_price_changes: hasPriceChanges,
      has_stock_issues: hasStockIssues,
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
          o.order_number.toLowerCase().includes(term) ||
          o.checkout_ref.toLowerCase().includes(term) ||
          o.delivery_name.toLowerCase().includes(term)
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

  createOrder(payload) {
    const items = payload.items || [];
    if (!items.length) {
      throw new ApiError({
        message: STRINGS.ERRORS.CART_EMPTY,
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    }

    const checkoutRef = `chk_${Date.now()}`;
    const buyer = this.currentUser || this.users.find((u) => u.id === 6);

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

  getSellerDashboard() {
    const seller = this.sellers[0];
    const sellerProducts = this.products.filter(
      (p) => p.seller_id === seller.id && !p.deleted_at
    );
    const sellerOrders = this.orders.filter((o) => o.seller_id === seller.id);

    const pendingOrders = sellerOrders.filter((o) => o.status === 'pending');
    const completedOrders = sellerOrders.filter(
      (o) => o.status === 'completed'
    );
    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + o.total_amount,
      0
    );

    return {
      active_listings_count: sellerProducts.length,
      pending_orders_count: pendingOrders.length,
      completed_orders_count: completedOrders.length,
      total_revenue: totalRevenue,
      recent_orders: sellerOrders.slice(0, 5),
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
    return user;
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
