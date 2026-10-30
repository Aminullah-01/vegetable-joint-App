# Vegetable Joint: Backend Token Handling & CORS Origin Agreement

**Document Version:** 1.0.0  
**SRS Reference:** Section 4.4, Section 4.5, NFR-SEC-03, NFR-SEC-06, NFR-SEC-09, NFR-SEC-10, IF-05  
**Task Reference:** FE-109 (Token handling and CORS/env setup)  
**Status:** Agreed & Configured

---

## 1. Authentication & Token Storage Strategy (NFR-SEC-03)

### 1.1 Agreed Strategy: HttpOnly Cookie (Preferred)
In compliance with **NFR-SEC-03** (*"Authentication shall use expiring tokens (e.g. Laravel Sanctum). Tokens shall be revocable on logout and on password change. Token storage in the browser shall minimise XSS exposure (HttpOnly cookie preferred)"*):

- **Primary Authentication Mechanism:** Laravel Sanctum Cookie-Based SPA Authentication (`HttpOnly`, `Secure`, `SameSite=Lax`).
- **XSS Mitigation:** JavaScript running in the browser has **zero programmatic access** to the session token. Even in the event of an XSS vulnerability, session tokens cannot be exfiltrated via `document.cookie` or `localStorage`.
- **Transmission:** The browser automatically attaches authentication cookies to API requests via CORS `credentials: 'include'` (`withCredentials: true`).

### 1.2 Fallback Strategy: Bearer Token (IF-05)
For non-cookie clients (native mobile apps, test runners, or developer CLI tools), the backend returns `token` in the response envelope (`{ user, token }`).
- Client transmits: `Authorization: Bearer <token>`.
- Client storage: In-memory or scoped browser storage.

---

## 2. CSRF Handshake & Protection (NFR-SEC-06)

When cookie-based authentication is utilized, Laravel Sanctum enforces CSRF protection for all state-changing HTTP verbs (`POST`, `PUT`, `PATCH`, `DELETE`):

1. **Initialization:**
   - Client dispatches `GET /sanctum/csrf-cookie`.
   - Server returns HTTP `204 No Content` and sets the `XSRF-TOKEN` cookie (not `HttpOnly`, `Secure`, `SameSite=Lax`).
2. **State-Changing Requests:**
   - Frontend reads the `XSRF-TOKEN` cookie value.
   - Frontend automatically attaches the header `X-XSRF-TOKEN: <decoded_csrf_token>`.
   - Laravel verifies `X-XSRF-TOKEN` matching the active session cookie.

---

## 3. Configured Origins & CORS Whitelist (NFR-SEC-10, Section 4.5)

In compliance with **NFR-SEC-10** (*"CORS shall allow only the configured front-end origin(s)"*):

### 3.1 Environment Origin Matrix

| Tier | Front-End Origin(s) | API Base URL | Sanctum Stateful Domains | Session Domain |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | `http://localhost:3000`<br>`http://127.0.0.1:3000` | `http://localhost:8000/api/v1` | `localhost:3000,127.0.0.1:3000` | `localhost` |
| **Staging** | `https://staging.vegetablejoint.ng` | `https://staging-api.vegetablejoint.ng/api/v1` | `staging.vegetablejoint.ng` | `.vegetablejoint.ng` |
| **Production** | `https://vegetablejoint.ng`<br>`https://www.vegetablejoint.ng` | `https://api.vegetablejoint.ng/api/v1` | `vegetablejoint.ng,www.vegetablejoint.ng` | `.vegetablejoint.ng` |

### 3.2 Required Laravel Backend CORS Configuration (`config/cors.php`)
```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
    'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'https://vegetablejoint.ng,https://www.vegetablejoint.ng')),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'X-Requested-With', 'Authorization', 'Accept', 'X-XSRF-TOKEN'],
    'exposed_headers' => [],
    'max_age' => 86400,
    'supports_credentials' => true,
];
```

### 3.3 Required Laravel Sanctum Configuration (`config/sanctum.php`)
```php
return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'vegetablejoint.ng,www.vegetablejoint.ng')),
    'guard' => ['web'],
    'expiration' => 60 * 24, // 24 hours expiring tokens (NFR-SEC-03)
    'middleware' => [
        'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
    ],
];
```

---

## 4. Token & Session Revocation Lifecycle (NFR-SEC-03)

- **Revocation on Logout (`POST /auth/logout`):**
  - Backend deletes current Sanctum access token / invalidates session cookie.
  - Frontend wipes session marker, in-memory tokens, and clears client-side state.
- **Revocation on Password Change (`POST /auth/change-password`):**
  - Backend invalidates all existing Sanctum tokens for the authenticated user (`$user->tokens()->delete()`).
  - Frontend re-authenticates or clears existing session credentials.
- **Revocation on Password Reset (`POST /auth/reset-password`):**
  - Backend invalidates all tokens and resets session cookies.
  - Frontend forces explicit login with the new password.
