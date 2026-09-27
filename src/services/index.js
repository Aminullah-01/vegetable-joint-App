// Service layer abstractions for API / Mock data access (CON-02, IF-01 to IF-06)
export * from './apiErrors.js';
export * from './apiClient.js';
export { default as apiClient } from './apiClient.js';

export * from './authService.js';
export { default as authService } from './authService.js';

export * from './productService.js';
export { default as productService } from './productService.js';

export * from './categoryService.js';
export { default as categoryService } from './categoryService.js';

export * from './orderService.js';
export { default as orderService } from './orderService.js';

export * from './sellerService.js';
export { default as sellerService } from './sellerService.js';

export * from './adminService.js';
export { default as adminService } from './adminService.js';
