import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { productService } from '../productService.js';
import { apiClient } from '../apiClient.js';
import { mockSwitch } from '../mockSwitch.js';
import { mockStore } from '../../data/mockStore.js';
import { ApiError } from '../apiErrors.js';

describe('productService (FE-106 / SRS Section 4.4)', () => {
  beforeEach(() => {
    mockStore.reset();
    mockSwitch.reset();
    mockSwitch.setMockMode(true);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    mockSwitch.reset();
    vi.restoreAllMocks();
  });

  describe('Mock Mode Operations (mockSwitch: true)', () => {
    it('retrieves products with default pagination and structure', async () => {
      const result = await productService.getProducts();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.meta).toBeDefined();
      expect(result.meta.current_page).toBe(1);
      expect(result.links).toBeDefined();
    });

    it('filters products by query string (q)', async () => {
      const result = await productService.getProducts({ q: 'Spinach' });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((p) => {
        const matchesName = p.name.toLowerCase().includes('spinach');
        const matchesDesc = (p.description || '')
          .toLowerCase()
          .includes('spinach');
        expect(matchesName || matchesDesc).toBe(true);
      });
    });

    it('filters products by category ID', async () => {
      const result = await productService.getProducts({ category: 1 });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((p) => {
        expect(Number(p.category_id)).toBe(1);
      });
    });

    it('filters products by price range', async () => {
      const result = await productService.getProducts({
        min_price: 1500,
        max_price: 3000,
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((p) => {
        expect(p.price).toBeGreaterThanOrEqual(1500);
        expect(p.price).toBeLessThanOrEqual(3000);
      });
    });

    it('filters products by availability (in_stock)', async () => {
      const result = await productService.getProducts({
        availability: 'in_stock',
      });

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((p) => {
        expect(p.availability).toBe('in_stock');
        expect(p.quantity || p.stock_quantity).toBeGreaterThan(0);
      });
    });

    it('sorts products by price ascending and descending', async () => {
      const ascResult = await productService.getProducts({ sort: 'price_asc' });
      const pricesAsc = ascResult.data.map((p) => p.price);
      for (let i = 0; i < pricesAsc.length - 1; i++) {
        expect(pricesAsc[i]).toBeLessThanOrEqual(pricesAsc[i + 1]);
      }

      const descResult = await productService.getProducts({
        sort: 'price_desc',
      });
      const pricesDesc = descResult.data.map((p) => p.price);
      for (let i = 0; i < pricesDesc.length - 1; i++) {
        expect(pricesDesc[i]).toBeGreaterThanOrEqual(pricesDesc[i + 1]);
      }
    });

    it('retrieves single product detail by ID', async () => {
      const product = await productService.getProductById(1);

      expect(product).toBeDefined();
      expect(product.id).toBe(1);
      expect(product.name).toBeDefined();
      expect(product.price).toBeDefined();
    });

    it('throws ApiError 404 when product is not found in mock store', async () => {
      await expect(productService.getProductById(99999)).rejects.toThrow();
    });

    it('retrieves seller inventory via getSellerProducts', async () => {
      const result = await productService.getSellerProducts({ seller_id: 1 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
    });

    it('creates a new product in mockStore', async () => {
      const newProductPayload = {
        name: 'Fresh Organic Kale',
        category_id: 1,
        seller_id: 1,
        price: 350,
        unit: 'bunch',
        stock_quantity: 40,
        is_available: true,
        description: 'Locally grown crisp kale leaves.',
      };

      const created = await productService.createProduct(newProductPayload);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Fresh Organic Kale');
      expect(created.price).toBe(350);

      // Verify product is retrievable
      const fetched = await productService.getProductById(created.id);
      expect(fetched.name).toBe('Fresh Organic Kale');
    });

    it('updates an existing product in mockStore', async () => {
      const updated = await productService.updateProduct(1, {
        price: 890,
        description: 'Updated fresh tomatoes description.',
      });

      expect(updated.id).toBe(1);
      expect(updated.price).toBe(890);
      expect(updated.description).toBe('Updated fresh tomatoes description.');
    });

    it('soft-deletes a product in mockStore', async () => {
      const deleteResult = await productService.deleteProduct(1);

      expect(deleteResult).toBeDefined();
      expect(deleteResult.success).toBe(true);

      // Verifies product is no longer present in public listing
      const listing = await productService.getProducts();
      expect(listing.data.some((p) => p.id === 1)).toBe(false);
    });

    it('updates product stock via updateProductStock and updateStock alias', async () => {
      const updated = await productService.updateProductStock(2, {
        stock_quantity: 50,
        is_available: true,
      });

      expect(updated.id).toBe(2);
      expect(updated.stock_quantity).toBe(50);
      expect(updated.is_available).toBe(true);

      const aliasUpdated = await productService.updateStock(2, {
        stock_quantity: 12,
        is_available: false,
      });

      expect(aliasUpdated.stock_quantity).toBe(12);
      expect(aliasUpdated.is_available).toBe(false);
    });

    it('uploads an image and triggers progress callbacks in mock mode', async () => {
      const fakeFile = new File(['fake image bits'], 'kale.png', {
        type: 'image/png',
      });
      const progressSteps = [];

      const result = await productService.uploadProductImage(fakeFile, (p) => {
        progressSteps.push(p.percent);
      });

      expect(result).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.filename).toBe('kale.png');
      expect(result.type).toBe('image/png');
      expect(progressSteps.length).toBeGreaterThan(0);
      expect(progressSteps).toContain(100);

      // uploadImage alias
      const aliasResult = await productService.uploadImage(fakeFile);
      expect(aliasResult.url).toBeDefined();
    });

    it('rejects image upload with invalid file types or excessive size', async () => {
      const invalidTypeFile = new File(['text content'], 'notes.txt', {
        type: 'text/plain',
      });
      await expect(
        productService.uploadProductImage(invalidTypeFile)
      ).rejects.toThrow(/JPEG, PNG, or WebP/);

      // 3MB file (> 2MB budget per SEL-05)
      const bigBuffer = new Uint8Array(3 * 1024 * 1024);
      const oversizedFile = new File([bigBuffer], 'giant.jpg', {
        type: 'image/jpeg',
      });
      await expect(
        productService.uploadProductImage(oversizedFile)
      ).rejects.toThrow(/must not exceed 2 MB/);

      // Null file
      await expect(productService.uploadProductImage(null)).rejects.toThrow(
        /No image file/
      );
    });

    it('validates cart line items via validateCart in mock mode', async () => {
      const cartValidation = await productService.validateCart([
        { product_id: 1, quantity: 2, price: 400 },
      ]);

      expect(cartValidation).toBeDefined();
      expect(typeof cartValidation.is_valid).toBe('boolean');
      expect(Array.isArray(cartValidation.items)).toBe(true);
    });
  });

  describe('Live API Mode Operations (mockSwitch: false)', () => {
    beforeEach(() => {
      mockSwitch.setMockMode(false);
    });

    it('dispatches GET /products with query parameters and normalizes response', async () => {
      const mockApiResponse = {
        data: [
          { id: 10, name: 'Roma Tomatoes', price: 320, category_id: 1 },
          { id: 11, name: 'Cherry Tomatoes', price: 450, category_id: 1 },
        ],
        meta: { current_page: 1, last_page: 3, per_page: 12, total: 30 },
        links: { first: '/products?page=1', last: '/products?page=3' },
      };

      const getSpy = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValue(mockApiResponse);

      const params = {
        q: 'tomatoes',
        category: 1,
        min_price: 300,
        max_price: 500,
        availability: 'in_stock',
        seller: 2,
        location: 'Lagos',
        sort: 'price_asc',
        page: 1,
        per_page: 12,
      };

      const result = await productService.getProducts(params);

      expect(getSpy).toHaveBeenCalledWith('/products', { params });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Roma Tomatoes');
      expect(result.meta.total).toBe(30);
      expect(result.links.first).toBe('/products?page=1');
    });

    it('handles alternative Laravel collection envelope shapes (raw array, nested data)', async () => {
      // Direct array response
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: [{ id: 1, name: 'Cabbage' }],
      });
      const res1 = await productService.getProducts();
      expect(res1.data).toHaveLength(1);
      expect(res1.data[0].name).toBe('Cabbage');

      // Nested data.data envelope
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          data: [{ id: 2, name: 'Carrot' }],
          meta: { total: 1 },
        },
      });
      const res2 = await productService.getProducts();
      expect(res2.data).toHaveLength(1);
      expect(res2.data[0].name).toBe('Carrot');
      expect(res2.meta.total).toBe(1);
    });

    it('dispatches GET /products/{id} and normalizes single product envelope', async () => {
      const mockProduct = { id: 42, name: 'Fresh Bell Pepper', price: 500 };
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockProduct,
      });

      const product = await productService.getProductById(42);

      expect(getSpy).toHaveBeenCalledWith('/products/42');
      expect(product.id).toBe(42);
      expect(product.name).toBe('Fresh Bell Pepper');

      // Handles nested { data: { data: product } }
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { data: mockProduct },
      });
      const nestedProduct = await productService.getProductById(42);
      expect(nestedProduct.id).toBe(42);
    });

    it('dispatches GET /seller/products for seller inventory', async () => {
      const mockInventory = {
        data: [
          { id: 101, name: 'Cucumber', stock_quantity: 0, is_available: false },
        ],
        meta: { total: 1 },
        links: null,
      };
      const getSpy = vi
        .spyOn(apiClient, 'get')
        .mockResolvedValue(mockInventory);

      const result = await productService.getSellerProducts({ page: 2 });

      expect(getSpy).toHaveBeenCalledWith('/seller/products', {
        params: { page: 2 },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Cucumber');
    });

    it('dispatches POST /products with JSON payload for product creation', async () => {
      const newProduct = { name: 'Okra', price: 200, unit: 'kg' };
      const createdProduct = { id: 77, ...newProduct };

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: createdProduct,
      });

      const result = await productService.createProduct(newProduct);

      expect(postSpy).toHaveBeenCalledWith('/products', newProduct);
      expect(result.id).toBe(77);
      expect(result.name).toBe('Okra');
    });

    it('dispatches POST /products with FormData multipart payload for product creation with image', async () => {
      const formData = new FormData();
      formData.append('name', 'Spinach');
      formData.append('price', '250');
      formData.append(
        'image',
        new File(['bits'], 'spinach.jpg', { type: 'image/jpeg' })
      );

      const uploadSpy = vi.spyOn(apiClient, 'upload').mockResolvedValue({
        data: { id: 88, name: 'Spinach', image_url: '/storage/spinach.jpg' },
      });

      const result = await productService.createProduct(formData);

      expect(uploadSpy).toHaveBeenCalledWith('/products', formData);
      expect(result.id).toBe(88);
      expect(result.image_url).toBe('/storage/spinach.jpg');
    });

    it('dispatches PUT /products/{id} with JSON payload for product update', async () => {
      const updateData = { price: 300, stock_quantity: 80 };
      const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
        data: { id: 15, name: 'Onions', ...updateData },
      });

      const result = await productService.updateProduct(15, updateData);

      expect(putSpy).toHaveBeenCalledWith('/products/15', updateData);
      expect(result.id).toBe(15);
      expect(result.price).toBe(300);
      expect(result.stock_quantity).toBe(80);
    });

    it('dispatches multipart PUT with _method=PUT via POST to /products/{id}', async () => {
      const formData = new FormData();
      formData.append('price', '320');
      formData.append(
        'image',
        new File(['bits'], 'onion.jpg', { type: 'image/jpeg' })
      );

      const uploadSpy = vi.spyOn(apiClient, 'upload').mockResolvedValue({
        data: { id: 15, name: 'Onions', price: 320 },
      });

      const result = await productService.updateProduct(15, formData);

      expect(formData.get('_method')).toBe('PUT');
      expect(uploadSpy).toHaveBeenCalledWith('/products/15', formData, {
        method: 'POST',
      });
      expect(result.id).toBe(15);
    });

    it('dispatches DELETE /products/{id} for soft delete', async () => {
      const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({
        data: { message: 'Product archived successfully' },
      });

      const result = await productService.deleteProduct(20);

      expect(deleteSpy).toHaveBeenCalledWith('/products/20');
      expect(result.message).toBe('Product archived successfully');
    });

    it('dispatches PATCH /products/{id}/stock for quick stock and availability updates', async () => {
      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
        data: { id: 30, stock_quantity: 45, is_available: true },
      });

      const result = await productService.updateProductStock(30, {
        stock_quantity: 45,
        is_available: true,
      });

      expect(patchSpy).toHaveBeenCalledWith('/products/30/stock', {
        stock_quantity: 45,
        is_available: true,
      });
      expect(result.stock_quantity).toBe(45);
      expect(result.is_available).toBe(true);
    });

    it('dispatches uploadWithProgress to /seller/products/upload-image for image upload', async () => {
      const validFile = new File(['valid bits'], 'pepper.jpg', {
        type: 'image/jpeg',
      });
      const onProgress = vi.fn();

      const uploadWithProgressSpy = vi
        .spyOn(apiClient, 'uploadWithProgress')
        .mockResolvedValue({
          data: {
            url: 'https://cdn.example.com/images/pepper.jpg',
            filename: 'pepper.jpg',
            size: 1024,
            type: 'image/jpeg',
          },
        });

      const result = await productService.uploadProductImage(
        validFile,
        onProgress
      );

      expect(uploadWithProgressSpy).toHaveBeenCalledWith(
        '/seller/products/upload-image',
        expect.any(FormData),
        { onProgress }
      );
      expect(result.url).toBe('https://cdn.example.com/images/pepper.jpg');
    });

    it('dispatches POST /cart/validate for cart items stock/price check', async () => {
      const cartItems = [{ product_id: 1, quantity: 3, price: 500 }];
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: { is_valid: true, items: cartItems, has_stock_issues: false },
      });

      const result = await productService.validateCart(cartItems);

      expect(postSpy).toHaveBeenCalledWith('/cart/validate', {
        items: cartItems,
      });
      expect(result.is_valid).toBe(true);
    });

    it('propagates HTTP 404, 422, and 403 ApiErrors appropriately', async () => {
      // 404 Not Found
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
        new ApiError({ status: 404, message: 'Product not found' })
      );
      await expect(productService.getProductById(999)).rejects.toThrow(
        'Product not found'
      );

      // 422 Validation Error
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
        new ApiError({
          status: 422,
          message: 'The name field is required.',
          errors: { name: ['The name field is required.'] },
        })
      );
      await expect(productService.createProduct({})).rejects.toThrow(
        'The name field is required.'
      );

      // 403 Forbidden (Unapproved seller)
      vi.spyOn(apiClient, 'patch').mockRejectedValueOnce(
        new ApiError({ status: 403, message: 'Seller is pending approval.' })
      );
      await expect(
        productService.updateProductStock(1, { stock_quantity: 10 })
      ).rejects.toThrow('Seller is pending approval.');
    });
  });
});
