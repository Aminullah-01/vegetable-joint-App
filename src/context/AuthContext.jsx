import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { AuthContext } from './authContextDef.js';
import { authService, apiClient } from '../services';

const STORAGE_TOKEN_KEY = 'vegetable_joint_token';
const STORAGE_USER_KEY = 'vegetable_joint_user';

/**
 * Authentication Provider Component
 * Holds user, role and token; handles login, logout, and session restore on refresh.
 * Conforms to SRS AUTH-04, AUTH-05, and CON-02.
 */
export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(STORAGE_TOKEN_KEY) || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [user, setUserState] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cached = window.localStorage.getItem(STORAGE_USER_KEY);
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Sync token with ApiClient token provider
  useEffect(() => {
    apiClient.setTokenProvider(() => token);
  }, [token]);

  // Safely persist user state to localStorage
  const persistUser = useCallback((userData) => {
    setUserState(userData);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (userData) {
          window.localStorage.setItem(
            STORAGE_USER_KEY,
            JSON.stringify(userData)
          );
        } else {
          window.localStorage.removeItem(STORAGE_USER_KEY);
        }
      } catch {
        // Storage restricted
      }
    }
  }, []);

  // Safely persist token to localStorage and apiClient
  const persistToken = useCallback((newToken) => {
    setTokenState(newToken);
    apiClient.setToken(newToken);
  }, []);

  const dismissSessionExpired = useCallback(() => {
    setIsSessionExpired(false);
  }, []);

  const triggerSessionExpired = useCallback(() => {
    persistToken(null);
    persistUser(null);
    setIsSessionExpired(true);
  }, [persistToken, persistUser]);

  /**
   * Log out the active session, invalidate token, and wipe credentials.
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      persistToken(null);
      persistUser(null);
      setError(null);
    }
  }, [persistToken, persistUser]);

  // Session restore on initial mount or page refresh
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const activeToken =
        token ||
        (typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem(STORAGE_TOKEN_KEY)
          : null);

      if (!activeToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        apiClient.setToken(activeToken);
        const profile = await authService.getProfile();
        if (isMounted && profile) {
          persistUser(profile);
          if (!token) {
            persistToken(activeToken);
          }
        }
      } catch (err) {
        // Token was invalid or expired (401)
        if (isMounted) {
          if (err?.status === 401 || err?.isAuthError) {
            persistToken(null);
            persistUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    // Register 401 interceptor (ERR-04 session expired prompt)
    const unsubscribeUnauthorized = apiClient.onUnauthorized(() => {
      persistToken(null);
      persistUser(null);
      setIsSessionExpired(true);
    });

    return () => {
      isMounted = false;
      unsubscribeUnauthorized();
    };
  }, [persistToken, persistUser, token]);

  /**
   * Authenticate a user with email & password.
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<Object>}
   */
  const login = useCallback(
    async (credentials) => {
      setIsLoading(true);
      setError(null);
      setIsSessionExpired(false);
      try {
        const response = await authService.login(credentials);
        const authUser = response.user;
        const authToken = response.token;

        if (authToken) {
          persistToken(authToken);
        }
        if (authUser) {
          persistUser(authUser);
        }

        return response;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [persistToken, persistUser]
  );

  /**
   * Register a new Buyer or Seller account.
   *
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  const register = useCallback(
    async (payload) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authService.register(payload);
        if (response?.token) {
          persistToken(response.token);
        }
        if (response?.user) {
          persistUser(response.user);
        }
        return response;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [persistToken, persistUser]
  );

  /**
   * Update profile details.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  const updateProfile = useCallback(
    async (data) => {
      setIsLoading(true);
      setError(null);
      try {
        const updated = await authService.updateProfile(data);
        if (updated) {
          persistUser({ ...user, ...updated });
        }
        return updated;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [persistUser, user]
  );

  const role = user?.role || null;
  const isAuthenticated = Boolean(user && token);

  const value = useMemo(
    () => ({
      user,
      role,
      token,
      isAuthenticated,
      isLoading,
      error,
      isSessionExpired,
      dismissSessionExpired,
      triggerSessionExpired,
      login,
      register,
      logout,
      updateProfile,
      isBuyer: role === 'buyer',
      isSeller: role === 'seller',
      isAdmin: role === 'admin',
    }),
    [
      user,
      role,
      token,
      isAuthenticated,
      isLoading,
      error,
      isSessionExpired,
      dismissSessionExpired,
      triggerSessionExpired,
      login,
      register,
      logout,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
