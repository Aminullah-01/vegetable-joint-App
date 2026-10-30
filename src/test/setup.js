import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { tokenStorage } from '../services/tokenStorage.js';
import { apiClient } from '../services/apiClient.js';

// Automatically clean up DOM and auth state after each test
afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.clear();
      window.localStorage.clear();
    } catch {
      // Storage unavailable
    }
    tokenStorage.clearToken();
    apiClient.clearToken();
  }
});

// Polyfill window.matchMedia for responsive components
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  if (!window.IntersectionObserver) {
    class MockIntersectionObserver {
      constructor(callback) {
        this.callback = callback;
      }
      observe(element) {
        this.callback([{ isIntersecting: true, target: element }]);
      }
      unobserve() {}
      disconnect() {}
    }
    window.IntersectionObserver = MockIntersectionObserver;
  }
}
