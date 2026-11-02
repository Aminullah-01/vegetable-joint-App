# Vegetable Joint — Front-End Application

[![CI/CD Pipeline](https://github.com/Aminullah-01/vegetable-joint-App/actions/workflows/ci.yml/badge.svg)](https://github.com/Aminullah-01/vegetable-joint-App/actions/workflows/ci.yml)
[![Test Coverage](https://img.shields.io/badge/Coverage-93.33%25-brightgreen.svg)](https://github.com/Aminullah-01/vegetable-joint-App)
[![Code Quality](https://img.shields.io/badge/ESLint-0%20warnings-brightgreen.svg)](https://github.com/Aminullah-01/vegetable-joint-App)
[![Code Style](https://img.shields.io/badge/Code%20Style-Prettier-ff69b4.svg)](https://prettier.io)
[![SRS Compliant](https://img.shields.io/badge/SRS%20Specification-V1.0-blue.svg)](https://github.com/Aminullah-01/vegetable-joint-App)

> **Vegetable Joint** is a digital B2B/B2C multi-seller marketplace platform connecting vegetable farmers, aggregators, and cooperatives directly with household consumers, restaurants, and caterers across Nigeria.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Quick Start & Setup](#quick-start--setup)
4. [Environment Configuration](#environment-configuration)
5. [Folder Structure (Source §26–§27, NFR-MAIN-01)](#folder-structure)
6. [Mock Data vs. Live Laravel API Switch (NFR-MAIN-02, CON-02)](#mock-data-vs-live-laravel-api-switch)
7. [Demo Accounts for Development](#demo-accounts-for-development)
8. [Available Scripts](#available-scripts)
9. [Coding Standards & Workflow (NFR-MAIN-03)](#coding-standards--workflow)
10. [Testing, Coverage & QA (NFR-MAIN-04)](#testing-coverage--qa)
11. [Production Build & Static/CDN Deployment (Source §43, FE-124)](#production-build--deployment)
12. [Security & Access Control (NFR-SEC)](#security--access-control)
13. [SRS & Task Traceability Matrix](#srs--task-traceability-matrix)

---

## 1. Project Overview

Vegetable Joint eliminates middlemen and post-harvest wastage in the fresh produce supply chain. Key platform characteristics tailored to the Nigerian commerce ecosystem:

- **Currency**: Nigerian Naira (`₦`) formatted as `₦2,500` with explicit units (e.g., `₦2,500 / basket`, `₦1,800 / kg`).
- **Origins & Geography**: Regional produce tracking across key agricultural hubs (Kano, Plateau, Gombe, Kaduna, Oyo, Lagos, Abuja FCT).
- **Multi-Seller Architecture**: Buyers can add produce from multiple sellers to a unified cart; checkout transparently splits orders per seller with independent lifecycle tracking (`Pending` &rarr; `Confirmed` &rarr; `Processing` &rarr; `Ready` &rarr; `Completed`).
- **Payment Model**: Pay-on-delivery / seller-direct settlement for version 1.0 (with idempotent UUID client checkout references).
- **Accessibility & Performance**: WCAG 2.1 AA contrast compliance, &ge; 44&times;44px touch targets, mobile-first responsive grid (360px to 1280px+), and optimized initial bundle budgets (&le; 250 KB gzipped).

---

## 2. Architecture & Technology Stack

| Layer               | Technology                                                                                              | Details                                                              |
| :------------------ | :------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------- |
| **Framework**       | [React 18.3](https://react.dev)                                                                         | Component-based functional UI with hooks and Context API             |
| **Build Tool**      | [Vite 5.4](https://vitejs.dev)                                                                          | Ultra-fast HMR and Rollup production bundling                        |
| **Routing**         | [React Router 7](https://reactrouter.com)                                                               | Declarative role-based routing (`guest`, `buyer`, `seller`, `admin`) |
| **Type Checking**   | [PropTypes](https://www.npmjs.com/package/prop-types)                                                   | Runtime component interface contract enforcement                     |
| **Testing**         | [Vitest 2.1](https://vitest.dev) + [Testing Library](https://testing-library.com)                       | JSDOM test runner with comprehensive E2E journey tests               |
| **Coverage**        | [V8 Coverage](https://v8.dev)                                                                           | In-depth branch, function, line, and statement analysis              |
| **Linting & Style** | [ESLint 9](https://eslint.org) + [Prettier 3](https://prettier.io)                                      | Strict zero-warning linting with automated formatting                |
| **Git Hooks**       | [Husky 9](https://typicode.github.io/husky) + [lint-staged](https://github.com/lint-staged/lint-staged) | Pre-commit automated formatting and lint checks                      |
| **Static Hosting**  | [Nginx](https://nginx.org) / CDN                                                                        | Multi-stage Docker container and CDN SPA routing                     |

---

## 3. Quick Start & Setup

### Prerequisites

- **Node.js**: Version `20.x` or higher (LTS recommended)
- **npm**: Version `10.x` or higher
- **Git**: For version control

### 1. Clone the Repository

```bash
git clone https://github.com/Aminullah-01/vegetable-joint-App.git
cd vegetable-joint-App
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Configure Local Environment

Copy `.env.example` to `.env` (defaults to Mock Mode for standalone frontend development):

```bash
cp .env.example .env
```

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application starts in **Mock Data Mode**, allowing full interaction without requiring a running Laravel backend.

---

## 4. Environment Configuration

The application uses Vite environment variables prefixed with `VITE_`. All environment variables are documented in [`.env.example`](file:///home/ameenullah/vegetable-joint-App/.env.example).

| Variable                    | Type      | Default (Dev)                                   | Production Target                                           | Description                                                      |
| :-------------------------- | :-------- | :---------------------------------------------- | :---------------------------------------------------------- | :--------------------------------------------------------------- |
| `VITE_APP_NAME`             | `string`  | `"Vegetable Joint"`                             | `"Vegetable Joint"`                                         | Application display title                                        |
| `VITE_APP_ENV`              | `enum`    | `"development"`                                 | `"production"`                                              | Active environment: `'development'`, `'staging'`, `'production'` |
| `VITE_APP_ORIGIN`           | `url`     | `"http://localhost:3000"`                       | `"https://vegetablejoint.ng"`                               | Canonical front-end origin                                       |
| `VITE_ALLOWED_ORIGINS`      | `csv`     | `"http://localhost:3000,http://127.0.0.1:3000"` | `"https://vegetablejoint.ng,https://www.vegetablejoint.ng"` | Approved CORS origins (NFR-SEC-10)                               |
| `VITE_API_BASE_URL`         | `url`     | `"http://localhost:8000/api/v1"`                | `"https://api.vegetablejoint.ng/api/v1"`                    | Versioned Laravel REST API endpoint (CON-03)                     |
| `VITE_SANCTUM_CSRF_URL`     | `url`     | `"http://localhost:8000/sanctum/csrf-cookie"`   | `"https://api.vegetablejoint.ng/sanctum/csrf-cookie"`       | Sanctum CSRF initialization cookie endpoint                      |
| `VITE_AUTH_TOKEN_STRATEGY`  | `enum`    | `"cookie"`                                      | `"cookie"`                                                  | Token storage strategy: `'cookie'` (HttpOnly) or `'bearer'`      |
| `VITE_API_WITH_CREDENTIALS` | `boolean` | `"true"`                                        | `"true"`                                                    | Enables CORS `credentials: 'include'` for cookie sessions        |
| `VITE_USE_MOCK_DATA`        | `boolean` | `"true"`                                        | `"false"`                                                   | Single environment switch between Mock Store and Live API        |

> [!IMPORTANT]
> **Zero Secrets in Source**: In accordance with **CON-05** and **NFR-SEC-09**, `.env.local` files, API keys, private keys, and passwords must never be committed to Git. The build pipeline runs automated bundle secret scanners before release.

---

## 5. Folder Structure

Conforming to **NFR-MAIN-01** and Source Document **§26–§27**, the codebase strictly separates presentation, state management, service logic, and fixtures:

```
vegetable-joint-App/
├── .github/                      # GitHub Actions CI/CD workflows (ci.yml, deploy.yml)
├── public/                       # Static public assets served untouched
│   ├── favicon.svg               # Application favicon
│   ├── _redirects                # SPA client-side routing fallback (/* /index.html 200)
│   ├── _headers                  # Production CDN security headers & immutable caching
│   └── robots.txt                # Search crawler boundary rules
├── scripts/                      # Developer and CI verification automation
│   ├── security-audit.js         # Secret scan & vulnerability audit (FE-122)
│   ├── verify-openapi-drift.js   # OpenAPI vs Mock seed drift validator (FE-110)
│   └── verify-deployment.js      # Production deployment readiness validator (FE-124)
├── src/
│   ├── assets/                   # Static images, icons, and SVG illustrations
│   ├── components/               # Reusable presentational components (Source §27)
│   │   ├── common/               # Atoms & molecules (Button, Input, Modal, Table, etc.)
│   │   ├── cart/                 # Cart items, summary, price/stock validation alerts
│   │   ├── checkout/             # Multi-step checkout, delivery forms, review modal
│   │   ├── home/                 # Hero, Categories, Featured Sellers, Static sections
│   │   └── layout/               # Navbar, Footer, MainLayout, DashboardLayout
│   ├── constants/                # Domain constants, Nigerian states, strings, route paths
│   ├── context/                  # React Context providers (AuthContext, CartContext, Toast)
│   ├── data/                     # In-memory mock store & seed fixtures (CON-02)
│   │   ├── mockStore.js          # Stateful mock database simulating Laravel REST API
│   │   ├── mockProducts.js       # Seed products with Nigerian origin & pricing
│   │   ├── mockSellers.js        # Seed seller profiles & verification states
│   │   ├── mockCategories.js     # Seed vegetable categories
│   │   ├── mockOrders.js         # Seed orders across lifecycle states
│   │   └── mockUsers.js          # Seed user accounts across roles
│   ├── hooks/                    # Custom application hooks (useAuth, useCart, useToast)
│   ├── pages/                    # Route page components
│   │   ├── public/               # Public marketplace (Home, Products, ProductDetails, Cart, Policies)
│   │   ├── buyer/                # Authenticated buyer portal (Checkout, MyOrders, OrderDetail)
│   │   ├── seller/               # Seller dashboard (Overview, Products, Orders, Sales, Inventory)
│   │   ├── admin/                # Admin portal (Overview, Sellers, Products, Orders, Users, Logs)
│   │   ├── auth/                 # Authentication pages (Login, Register, Password Reset)
│   │   └── errors/               # Standard error boundaries (403 Forbidden, 404 Not Found, 500)
│   ├── routes/                   # Route configuration & guards (ProtectedRoute, GuestRoute)
│   ├── services/                 # Service layer communicating with API or Mock (CON-02)
│   │   ├── apiClient.js          # Fetch wrapper with CSRF, retry, and auth cookie handling
│   │   ├── authService.js        # Authentication & profile service
│   │   ├── productService.js     # Products catalog, filtering, and CRUD service
│   │   ├── orderService.js       # Orders placement, history, and status advancement
│   │   ├── sellerService.js      # Seller profile, inventory, and sales analytics
│   │   ├── adminService.js       # Administrative approvals, category CRUD, and audit logs
│   │   └── mockSwitch.js         # Centralized toggle between Mock Store and Live API
│   ├── test/                     # Vitest test setup, matchers, and mocks
│   ├── utils/                    # Utility functions (currency, formatting, validation, audits)
│   ├── App.jsx                   # Application root with router and providers
│   ├── index.css                 # Global styles, variables, typography, and utility classes
│   └── main.jsx                  # React DOM client entrypoint
├── Dockerfile                    # Multi-stage production container build (Source §43)
├── nginx.conf                    # Hardened Nginx static host configuration
├── vercel.json                   # Vercel SPA deployment configuration
├── vite.config.js                # Vite build and Vitest configuration
└── package.json                  # Project dependencies and script declarations
```

---

## 6. Mock Data vs. Live Laravel API Switch

In compliance with **NFR-MAIN-02** and **CON-02**, UI components never access data sources directly. All data access flows through the **Service Layer**:

```
UI Component (e.g. Products.jsx)
        ↓
Service Layer (e.g. productService.getProducts())
        ↓
  [mockSwitch]
   ├── If VITE_USE_MOCK_DATA="true"  ──→ mockStore (Simulated Network + In-Memory State)
   └── If VITE_USE_MOCK_DATA="false" ──→ apiClient (Live Laravel REST API /api/v1)
```

### Switching to Live Backend

To point the frontend to a live Laravel REST API, simply update `.env`:

```ini
VITE_USE_MOCK_DATA="false"
VITE_API_BASE_URL="http://localhost:8000/api/v1"
```

No changes to components, pages, or routes are required.

### OpenAPI Parity & Drift Verification

The Mock Store adheres 100% to the project's [`openapi.json`](file:///home/ameenullah/vegetable-joint-App/Vegetable-joint-all-document/openapi.json) specification. Run the automated schema drift verifier:

```bash
npm run verify:schema
```

---

## 7. Demo Accounts for Development

When running in **Mock Mode** (`VITE_USE_MOCK_DATA="true"`), the following pre-seeded accounts are available:

| Role                        | Email                  | Password      | Capabilities                                                                              |
| :-------------------------- | :--------------------- | :------------ | :---------------------------------------------------------------------------------------- |
| **Administrator**           | `admin@example.com`    | `password123` | Approve/reject sellers, manage categories, moderate products, view platform audit logs.   |
| **Active Seller**           | `seller@arewafarms.ng` | `password123` | Manage products, track inventory, process orders along status lifecycle, view sales KPIs. |
| **Active Seller (Plateau)** | `seller@josorganic.ng` | `password123` | Manage products and orders from Plateau State.                                            |
| **Pending Seller**          | `pending@newfarm.ng`   | `password123` | Simulated seller awaiting administrative document approval.                               |
| **Buyer**                   | `buyer@example.com`    | `password123` | Browse catalog, add to cart, complete multi-seller checkout, track orders.                |
| **Buyer (Lagos)**           | `emeka@example.ng`     | `password123` | First-time buyer persona with saved Lagos delivery address.                               |
| **Suspended Account**       | `suspended@example.ng` | `password123` | Tests platform suspension guards and automatic login lockout.                             |

---

## 8. Available Scripts

The repository includes a comprehensive set of npm scripts:

| Command                     | Purpose                                                                               |
| :-------------------------- | :------------------------------------------------------------------------------------ |
| `npm run dev`               | Starts Vite local development server on `http://localhost:3000`                       |
| `npm run build`             | Builds the production bundle to `dist/`                                               |
| `npm run build:prod`        | Explicitly compiles production bundle with `.env.production` settings                 |
| `npm run build:staging`     | Explicitly compiles staging bundle with `.env.staging` settings                       |
| `npm run preview`           | Serves the local `dist/` build for release testing                                    |
| `npm test`                  | Runs all Vitest automated test suites                                                 |
| `npm run test:coverage`     | Generates detailed V8 code coverage report                                            |
| `npm run test:watch`        | Starts Vitest in interactive watch mode                                               |
| `npm run lint`              | Runs ESLint across all JavaScript/JSX files                                           |
| `npm run lint:fix`          | Runs ESLint with automated fixes applied                                              |
| `npm run format`            | Formats all files using Prettier                                                      |
| `npm run format:check`      | Verifies code formatting against Prettier standards                                   |
| `npm run verify:schema`     | Verifies zero drift between Mock Store and OpenAPI specification (FE-110)             |
| `npm run audit:security`    | Runs automated security review: bundle secrets, dependencies, DOM sinks (FE-122)      |
| `npm run verify:deployment` | Audits deployment readiness: environment settings, CDN headers, SPA rewrites (FE-124) |

---

## 9. Coding Standards & Workflow

In accordance with **NFR-MAIN-03**, code quality is enforced across the entire development lifecycle:

### 1. Zero-Warning Policy

ESLint is configured with zero tolerance for warnings in CI:

```bash
npm run lint -- --max-warnings=0
```

### 2. Pre-Commit Hooks

Husky and `lint-staged` run automatically on `git commit`, ensuring staged files pass ESLint and Prettier before commits are created.

### 3. Conventional Commits

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org) specification:

- `feat(scope): ...` for new features or user tasks
- `fix(scope): ...` for bug fixes
- `refactor(scope): ...` for code refactoring without behavior change
- `test(scope): ...` for adding or updating tests
- `docs(scope): ...` for documentation changes

### 4. Component Design Principles

- **Small, Reusable Components**: Large interfaces are broken down into self-contained units (e.g. `QuantitySelector`, `AvailabilityBadge`, `DeliveryDetailsForm`).
- **Accessible Attributes**: Form inputs must specify associated `<label>` elements and HTML autocomplete attributes (`name`, `tel`, `street-address`, etc.).
- **Visual Feedback**: Loading states (`Spinner`, `Skeleton`) and inline field errors must be communicated accessibly.

---

## 10. Testing, Coverage & QA

In compliance with **NFR-MAIN-04**, business-logic modules, calculations, and critical purchase journeys require automated tests with **&ge; 70% coverage**.

### Coverage Status

Current project test coverage significantly exceeds requirements:

- **Statements**: **93.33%** (Target: &ge; 70%)
- **Lines**: **93.33%**
- **Functions**: **96.61%**
- **Branches**: **82.13%**

### Core Test Categories

1. **Business Logic Unit Tests**:
   - Cart subtotal and grand total math (`cartCalculations.test.js`)
   - Order status transitions and permitted actions (`orderStatus.test.js`)
   - Form and field validations (`validation.test.js`)
   - Nigerian currency formatting with units (`formatters.test.js`)
2. **Quality & Release Audits (Module 10)**:
   - **FE-118**: Responsive QA across mobile, tablet, and desktop viewports (`ResponsiveQA.test.jsx`)
   - **FE-119**: Cross-browser testing for Chrome, Edge, Firefox, and Safari WebKit (`CrossBrowserQA.test.jsx`)
   - **FE-120**: WCAG 2.1 Level AA Accessibility Audit (`AccessibilityAudit.test.jsx`)
   - **FE-121**: Performance Audit with bundle budgets & 4G LCP simulation (`PerformanceAudit.test.jsx`)
   - **FE-122**: Front-end security review and secret scanning (`FrontEndSecurityReview.test.jsx`)
   - **FE-123**: First-time buyer usability test with 5 personas (`UsabilityTestWithBuyers.test.jsx`)
   - **FE-124**: Production build and static/CDN deployment audit (`ProductionDeployment.test.jsx`)

---

## 11. Production Build & Deployment

In accordance with **Source §43**, the React frontend and Laravel backend are deployed independently. The frontend is packaged as an optimized static build suitable for any static host or CDN.

### Static Host Deployment Files

- **`public/_redirects`**: Rewrites all routes to `/index.html` with HTTP 200 to support client-side SPA routing on Cloudflare Pages, Netlify, and Render.
- **`public/_headers`**: Enforces strict security headers (CSP, HSTS, X-Frame-Options) and sets 1-year immutable caching for `/assets/*`.
- **`nginx.conf`**: Enterprise-grade Nginx configuration with gzip compression, TLS termination, and `try_files $uri $uri/ /index.html;`.
- **`Dockerfile`**: Multi-stage build (Node 20 builder &rarr; Nginx alpine static host).

### Docker Container Deployment

```bash
# Build the container image
docker build -t vegetable-joint-app .

# Run the container
docker run -d -p 8080:80 --name vegetable-joint vegetable-joint-app
```

Access the application at [http://localhost:8080](http://localhost:8080).

### CI/CD Deployment Pipeline

Pushing to the `main` branch triggers the GitHub Actions workflow [`.github/workflows/ci.yml`](file:///home/ameenullah/vegetable-joint-App/.github/workflows/ci.yml):

1. Runs formatting, linting, OpenAPI drift check, and test coverage suites.
2. Runs front-end security audit and secret scanner.
3. Compiles production build with production environment settings (`npm run build:prod`).
4. Executes deployment verification script (`npm run verify:deployment`).
5. Deploys production bundle artifact to static/CDN host.

---

## 12. Security & Access Control

- **Token Storage (NFR-SEC-03)**: Preferred authentication mechanism uses Laravel Sanctum cookie authentication (`HttpOnly`, `SameSite=Lax`, `Secure`). JavaScript has zero programmatic access to session tokens, neutralizing token exfiltration via XSS.
- **CSRF Protection (NFR-SEC-06)**: State-changing requests automatically attach `X-XSRF-TOKEN` derived from the `/sanctum/csrf-cookie` handshake.
- **CORS Whitelist (NFR-SEC-10)**: Front-end origin is locked down via `VITE_ALLOWED_ORIGINS`.
- **Route Authorization Guard**: [`ProtectedRoute.jsx`](file:///home/ameenullah/vegetable-joint-App/src/routes/ProtectedRoute.jsx) restricts pages by authenticated role (`buyer`, `seller`, `admin`), automatically redirecting unauthorized attempts to `/403` Forbidden.

---

## 13. SRS & Task Traceability Matrix

| Module                                 | Tasks Covered    | SRS References              | Status   |
| :------------------------------------- | :--------------- | :-------------------------- | :------- |
| **1. Project Setup & Architecture**    | FE-001 to FE-005 | CON-01, CON-02, CON-05      | **Done** |
| **2. Layout & Common Components**      | FE-006 to FE-028 | UI-01 to UI-08, NFR-USAB    | **Done** |
| **3. Authentication & Profile**        | FE-029 to FE-038 | AUTH-01 to AUTH-09, NFR-SEC | **Done** |
| **4. Marketplace & Public Pages**      | FE-039 to FE-054 | MKT-01 to MKT-06, BR-01     | **Done** |
| **5. Shopping Cart**                   | FE-055 to FE-066 | CART-01 to CART-09, BR-02   | **Done** |
| **6. Checkout & Orders (Buyer)**       | FE-067 to FE-077 | CHK-01 to CHK-10, ORD-01    | **Done** |
| **7. Seller Dashboard & Product Mgmt** | FE-078 to FE-095 | SEL-01 to SEL-15, BR-08/10  | **Done** |
| **8. Admin Portal**                    | FE-096 to FE-103 | ADM-01 to ADM-06, BR-09     | **Done** |
| **9. API Integration & Real Backend**  | FE-104 to FE-113 | IF-01 to IF-06, NFR-REL     | **Done** |
| **10. Testing, Quality & Release**     | FE-114 to FE-125 | TC-08 to TC-33, NFR-MAIN    | **Done** |

---

## License

This project is proprietary software developed for the Vegetable Joint marketplace initiative. All rights reserved.
