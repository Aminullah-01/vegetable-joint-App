import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { categoryService } from '../categoryService.js';
import { apiClient } from '../apiClient.js';
import { mockSwitch } from '../mockSwitch.js';
import { mockStore } from '../../data/mockStore.js';
import { ApiError } from '../apiErrors.js';

describe('categoryService (FE-106 / SRS Section 4.4 & ADM-05)', () => {
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
    it('retrieves active product categories as an array', async () => {
      const categories = await categoryService.getCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      categories.forEach((cat) => {
        expect(cat.id).toBeDefined();
        expect(cat.name).toBeDefined();
        expect(cat.is_active).toBe(true);
      });
    });

    it('retrieves all categories including inactive when all=true is specified', async () => {
      // First deactivate a category
      await categoryService.deactivateCategory(1);

      const activeOnly = await categoryService.getCategories();
      const allCategories = await categoryService.getCategories({ all: true });

      expect(activeOnly.some((c) => c.id === 1)).toBe(false);
      expect(allCategories.some((c) => c.id === 1)).toBe(true);
    });

    it('retrieves a single category by ID', async () => {
      const cat = await categoryService.getCategoryById(1);

      expect(cat).toBeDefined();
      expect(cat.id).toBe(1);
      expect(cat.name).toBeDefined();
    });

    it('throws ApiError 404 when category does not exist in mock store', async () => {
      await expect(categoryService.getCategoryById(99999)).rejects.toThrow();
    });

    it('creates a new category in mockStore (Admin)', async () => {
      const newCategory = {
        name: 'Organic Mushrooms',
        slug: 'organic-mushrooms',
        description: 'Locally grown button, portobello, and oyster mushrooms.',
        is_active: true,
      };

      const created = await categoryService.createCategory(newCategory);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Organic Mushrooms');

      const fetched = await categoryService.getCategoryById(created.id);
      expect(fetched.name).toBe('Organic Mushrooms');
    });

    it('updates an existing category in mockStore (Admin)', async () => {
      const updated = await categoryService.updateCategory(2, {
        description: 'Fresh leafy greens and specialty herbs.',
      });

      expect(updated.id).toBe(2);
      expect(updated.description).toBe(
        'Fresh leafy greens and specialty herbs.'
      );
    });

    it('deactivates and reactivates a category in mockStore (ADM-05, BR-09)', async () => {
      const deactivated = await categoryService.deactivateCategory(2);
      expect(deactivated.is_active).toBe(false);

      const reactivated = await categoryService.reactivateCategory(2);
      expect(reactivated.is_active).toBe(true);
    });

    it('deletes an unused category in mockStore', async () => {
      // Create a temporary category with 0 products
      const temp = await categoryService.createCategory({
        name: 'Temporary Exotic Veg',
        slug: 'temp-exotic',
        is_active: true,
      });

      const deleteResult = await categoryService.deleteCategory(temp.id);
      expect(deleteResult).toBeDefined();
      expect(deleteResult.success).toBe(true);

      const all = await categoryService.getCategories({ all: true });
      expect(all.some((c) => c.id === temp.id)).toBe(false);
    });

    it('prevents hard deletion when category has associated products (BR-09, TC-31)', async () => {
      // Category 1 has associated products in mock store
      await expect(categoryService.deleteCategory(1)).rejects.toThrow(
        /contains active products|associated products/i
      );
    });
  });

  describe('Live API Mode Operations (mockSwitch: false)', () => {
    beforeEach(() => {
      mockSwitch.setMockMode(false);
    });

    it('dispatches GET /categories and normalizes array responses', async () => {
      const mockCategories = [
        { id: 1, name: 'Leafy Greens', is_active: true },
        { id: 2, name: 'Root Vegetables', is_active: true },
      ];

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockCategories,
      });

      const result = await categoryService.getCategories();

      expect(getSpy).toHaveBeenCalledWith('/categories', { params: {} });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Leafy Greens');
    });

    it('handles diverse Laravel API resource collection envelope formats', async () => {
      // 1. Wrapped in data.data
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          data: [{ id: 5, name: 'Peppers' }],
        },
      });
      const res1 = await categoryService.getCategories();
      expect(res1).toHaveLength(1);
      expect(res1[0].name).toBe('Peppers');

      // 2. Wrapped in raw.data
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        raw: {
          data: [{ id: 6, name: 'Tubers' }],
        },
      });
      const res2 = await categoryService.getCategories();
      expect(res2).toHaveLength(1);
      expect(res2[0].name).toBe('Tubers');
    });

    it('dispatches GET /categories/{id} and normalizes single resource envelope', async () => {
      const mockCategory = { id: 10, name: 'Cruciferous', is_active: true };
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: mockCategory,
      });

      const result = await categoryService.getCategoryById(10);

      expect(getSpy).toHaveBeenCalledWith('/categories/10');
      expect(result.id).toBe(10);
      expect(result.name).toBe('Cruciferous');

      // Nested data.data
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { data: mockCategory },
      });
      const nestedResult = await categoryService.getCategoryById(10);
      expect(nestedResult.id).toBe(10);
    });

    it('dispatches POST /categories for category creation (Admin)', async () => {
      const newCat = { name: 'Squash & Gourds', is_active: true };
      const createdCat = { id: 15, ...newCat };

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: createdCat,
      });

      const result = await categoryService.createCategory(newCat);

      expect(postSpy).toHaveBeenCalledWith('/categories', newCat);
      expect(result.id).toBe(15);
      expect(result.name).toBe('Squash & Gourds');
    });

    it('dispatches PUT /categories/{id} for category update (Admin)', async () => {
      const updatePayload = { name: 'Root Vegetables & Tubers' };
      const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
        data: { id: 2, ...updatePayload },
      });

      const result = await categoryService.updateCategory(2, updatePayload);

      expect(putSpy).toHaveBeenCalledWith('/categories/2', updatePayload);
      expect(result.id).toBe(2);
      expect(result.name).toBe('Root Vegetables & Tubers');
    });

    it('dispatches DELETE /categories/{id} (Admin)', async () => {
      const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({
        data: { message: 'Category deleted successfully' },
      });

      const result = await categoryService.deleteCategory(8);

      expect(deleteSpy).toHaveBeenCalledWith('/categories/8');
      expect(result.message).toBe('Category deleted successfully');
    });

    it('dispatches deactivateCategory and reactivateCategory via PUT /categories/{id}', async () => {
      const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({
        data: { id: 3, is_active: false },
      });

      await categoryService.deactivateCategory(3);
      expect(putSpy).toHaveBeenCalledWith('/categories/3', {
        is_active: false,
      });

      await categoryService.reactivateCategory(3);
      expect(putSpy).toHaveBeenCalledWith('/categories/3', { is_active: true });
    });

    it('propagates API errors properly (404, 422, 409)', async () => {
      // 404 Not Found
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
        new ApiError({ status: 404, message: 'Category not found' })
      );
      await expect(categoryService.getCategoryById(99)).rejects.toThrow(
        'Category not found'
      );

      // 422 Validation Error
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
        new ApiError({
          status: 422,
          message: 'The name has already been taken.',
          errors: { name: ['The name has already been taken.'] },
        })
      );
      await expect(
        categoryService.createCategory({ name: 'Leafy Greens' })
      ).rejects.toThrow('The name has already been taken.');

      // 409 Conflict (cannot delete category with products)
      vi.spyOn(apiClient, 'delete').mockRejectedValueOnce(
        new ApiError({
          status: 409,
          message: 'Cannot delete category with associated products.',
        })
      );
      await expect(categoryService.deleteCategory(1)).rejects.toThrow(
        'Cannot delete category with associated products.'
      );
    });
  });
});
