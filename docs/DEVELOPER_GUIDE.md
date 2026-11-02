# Vegetable Joint — Developer Guide & Architecture Manual

**Version:** 1.0.0  
**SRS Reference:** CON-01, CON-02, NFR-MAIN-01 to NFR-MAIN-05  
**Task Reference:** FE-125

---

## 1. Architectural Principles

### 1.1 Separation of Concerns (CON-02)

- **UI Components** (`src/components/`, `src/pages/`): Responsible solely for rendering and handling user interactions. Components **must never** import mock fixtures or call raw `fetch()` directly.
- **Service Layer** (`src/services/`): Mediates between UI components and data sources. All backend requests (HTTP or simulated) pass through this layer.
- **Data Fixtures** (`src/data/`): Contains self-contained, stateful mock models (`mockStore`) that mirror the Laravel REST API.
- **State Management** (`src/context/`, `src/hooks/`): Lightweight React Context providers manage global cross-cutting state:
  - `AuthContext`: Session user, role, token lifecycle, and authentication methods.
  - `CartContext`: Line items, item counts, totals, persistent local storage, and background cart re-validation.
  - `ToastContext`: Accessible non-blocking notifications.

---

## 2. Step-by-Step Feature Implementation Guide

When implementing new functionality, follow this standard front-end first workflow:

### Step 1: Data Contract & Schema Parity

Ensure the data structure matches [`openapi.json`](../Vegetable-joint-all-document/openapi.json) and [`vegetable_joint_schema.sql`](../Vegetable-joint-all-document/vegetable_joint_schema.sql):

- Define domain constants in `src/constants/`.
- Validate required fields and types.

### Step 2: Implement Mock Data Operation

Add the simulated endpoint logic to `src/data/mockStore.js`:

```javascript
// Example in src/data/mockStore.js
getSpecialVegetables() {
  return this.products.filter((p) => p.is_special);
}
```

### Step 3: Service Layer Integration

Extend the corresponding service file in `src/services/`:

```javascript
// Example in src/services/productService.js
export const productService = {
  async getSpecialVegetables() {
    if (mockSwitch.isMockMode()) {
      return mockStore.getSpecialVegetables();
    }
    const response = await apiClient.get('/products/special');
    return response.data;
  },
};
```

### Step 4: Component Development

Create small, reusable functional components in `src/components/`:

- Use descriptive prop types with `prop-types`.
- Enforce accessible ARIA labels, semantic HTML, and &ge; 44&times;44px touch targets.
- Include `data-testid` attributes on interactive elements for automated testing.

### Step 5: Route & Guard Configuration

If creating a new page:

- Add the route to `src/routes/routeConfig.js`.
- If restricted by role (`buyer`, `seller`, `admin`), wrap with `ProtectedRoute` and specify `allowedRoles`.

---

## 3. Testing Recipes & Best Practices

### 3.1 Test Harness Pattern

When testing pages wrapped by providers, use a test harness that mounts required contexts:

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, CartProvider, ToastProvider } from '../context';

function TestHarness({ children, initialEntries = ['/'] }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
```

### 3.2 Mocking vs. In-Memory MockStore

In integration tests, prefer using `mockStore` directly rather than mock spies:

```javascript
beforeEach(() => {
  localStorage.clear();
  mockSwitch.setMockMode(true);
  mockStore.reset();
});
```

---

## 4. Code Quality & Pre-Commit Checklist

Before pushing any changes:

1. **Formatting**: Run `npm run format:check` (or `npm run format`).
2. **Linting**: Run `npm run lint -- --max-warnings=0`.
3. **OpenAPI Drift**: Run `npm run verify:schema`.
4. **Automated Tests**: Run `npm test`.
5. **Coverage**: Run `npm run test:coverage` (ensure statements &ge; 70%).
6. **Security Audit**: Run `npm run audit:security`.
7. **Production Build**: Run `npm run build:prod` and `npm run verify:deployment`.
