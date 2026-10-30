import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../authService.js';
import { apiClient } from '../apiClient.js';
import { mockSwitch } from '../mockSwitch.js';
import { mockStore } from '../../data/mockStore.js';
import { ApiError, HTTP_STATUS, ERROR_CODES } from '../apiErrors.js';

describe('FE-105 / Section 4.4: AuthService API & Mock Integration', () => {
  beforeEach(() => {
    mockStore.reset();
    apiClient.clearToken();
    mockSwitch.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    mockSwitch.reset();
    apiClient.clearToken();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. MOCK MODE TESTS (Default when VITE_USE_MOCK_DATA is true)
  // =========================================================================
  describe('1. Mock Mode Operations (mockSwitch is true)', () => {
    beforeEach(() => {
      mockSwitch.setMockMode(true);
    });

    it('registers a new buyer successfully in mock mode', async () => {
      const payload = {
        name: 'New Test Buyer',
        email: 'newbuyer@example.com',
        phone: '+2348011223344',
        password: 'password123',
        password_confirmation: 'password123',
        role: 'buyer',
      };

      const result = await authService.register(payload);
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('newbuyer@example.com');
      expect(result.user.role).toBe('buyer');
      expect(result.token).toBeDefined();
      expect(authService.getToken()).toBe(result.token);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('authenticates user and sets token in mock mode', async () => {
      const credentials = {
        email: 'admin@example.com',
        password: 'password123',
      };

      const result = await authService.login(credentials);
      expect(result).toBeDefined();
      expect(result.user.role).toBe('admin');
      expect(result.token).toBeDefined();
      expect(authService.getToken()).toBe(result.token);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('rejects invalid credentials in mock mode with error', async () => {
      await expect(
        authService.login({
          email: 'admin@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });

    it('logs out and clears token in mock mode', async () => {
      await authService.login({
        email: 'admin@example.com',
        password: 'password123',
      });
      expect(authService.isAuthenticated()).toBe(true);

      await authService.logout();
      expect(authService.getToken()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('retrieves and updates authenticated user profile in mock mode', async () => {
      await authService.login({
        email: 'seller@arewafarms.ng',
        password: 'password123',
      });

      const profile = await authService.getProfile();
      expect(profile).toBeDefined();
      expect(profile.email).toBe('seller@arewafarms.ng');

      const updated = await authService.updateProfile({
        name: 'Ibrahim Updated Danladi',
      });
      expect(updated.name).toBe('Ibrahim Updated Danladi');
    });

    it('handles forgot password and reset password in mock mode', async () => {
      const forgotResult = await authService.forgotPassword({
        email: 'buyer@example.com',
      });
      expect(forgotResult).toBeDefined();
      const resetToken = forgotResult.reset_token || forgotResult.token;
      expect(resetToken).toBeDefined();

      const resetResult = await authService.resetPassword({
        email: 'buyer@example.com',
        token: resetToken,
        password: 'newsecretpassword123',
        password_confirmation: 'newsecretpassword123',
      });
      expect(resetResult.message).toMatch(/reset successfully/i);

      // Verify login with new password
      const loginResult = await authService.login({
        email: 'buyer@example.com',
        password: 'newsecretpassword123',
      });
      expect(loginResult.user.email).toBe('buyer@example.com');
    });
  });

  // =========================================================================
  // 2. LIVE API INTEGRATION TESTS (mockSwitch is false -> Laravel REST API v1)
  // =========================================================================
  describe('2. Live API Integration against Laravel REST endpoints (mockSwitch is false)', () => {
    beforeEach(() => {
      mockSwitch.setMockMode(false);
    });

    describe('POST /auth/register', () => {
      it('sends registration request without Auth header and persists returned Sanctum token', async () => {
        const payload = {
          name: 'Halima Sani',
          email: 'halima@farmdirect.ng',
          phone: '+2348099887766',
          password: 'Password@123',
          password_confirmation: 'Password@123',
          role: 'seller',
          business_name: 'Halima Organic Produce',
          farm_address: 'Kaduna, Nigeria',
        };

        const mockApiResponse = {
          data: {
            user: {
              id: 15,
              name: 'Halima Sani',
              email: 'halima@farmdirect.ng',
              role: 'seller',
              status: 'active',
            },
            token: '15|sanctum_token_halima_xyz123',
          },
          status: 201,
          raw: {
            user: {
              id: 15,
              name: 'Halima Sani',
              email: 'halima@farmdirect.ng',
            },
            token: '15|sanctum_token_halima_xyz123',
          },
        };

        const postSpy = vi
          .spyOn(apiClient, 'post')
          .mockResolvedValueOnce(mockApiResponse);

        const result = await authService.register(payload);

        // Verify correct endpoint and skipAuth flag
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy).toHaveBeenCalledWith('/auth/register', payload, {
          skipAuth: true,
        });

        // Verify returned data shape
        expect(result.user).toEqual(mockApiResponse.data.user);
        expect(result.token).toBe('15|sanctum_token_halima_xyz123');

        // Verify token persistence in ApiClient
        expect(apiClient.getToken()).toBe('15|sanctum_token_halima_xyz123');
        expect(authService.isAuthenticated()).toBe(true);
      });

      it('normalizes response when Laravel wraps user inside data envelope and puts token at top level', async () => {
        const payload = {
          name: 'Aliyu Bello',
          email: 'aliyu@example.com',
          password: 'password123',
          password_confirmation: 'password123',
          role: 'buyer',
        };

        // Laravel format: { data: { id: 20, name: ... }, token: "token_123" }
        const mockApiResponse = {
          data: {
            id: 20,
            name: 'Aliyu Bello',
            email: 'aliyu@example.com',
            role: 'buyer',
          },
          raw: {
            data: { id: 20, name: 'Aliyu Bello', email: 'aliyu@example.com' },
            token: '20|sanctum_token_aliyu',
          },
          status: 201,
        };

        vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockApiResponse);

        const result = await authService.register(payload);

        expect(result.user.id).toBe(20);
        expect(result.user.email).toBe('aliyu@example.com');
        expect(result.token).toBe('20|sanctum_token_aliyu');
        expect(apiClient.getToken()).toBe('20|sanctum_token_aliyu');
      });

      it('handles 422 Unprocessable Entity registration errors', async () => {
        const validationError = new ApiError({
          message: 'The email has already been taken.',
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          code: ERROR_CODES.VALIDATION_ERROR,
          errors: {
            email: ['The email has already been taken.'],
          },
        });

        vi.spyOn(apiClient, 'post').mockRejectedValueOnce(validationError);

        await expect(
          authService.register({
            name: 'Duplicate User',
            email: 'existing@example.com',
            password: 'password123',
            password_confirmation: 'password123',
            role: 'buyer',
          })
        ).rejects.toMatchObject({
          status: 422,
          isValidationError: true,
          errors: {
            email: ['The email has already been taken.'],
          },
        });

        expect(apiClient.getToken()).toBeNull();
      });
    });

    describe('POST /auth/login', () => {
      it('sends credentials to /auth/login and stores returned token', async () => {
        const credentials = {
          email: 'seller@arewafarms.ng',
          password: 'correct_password',
        };

        const mockLoginResponse = {
          data: {
            user: {
              id: 2,
              name: 'Ibrahim Danladi',
              email: 'seller@arewafarms.ng',
              role: 'seller',
            },
            token: '2|sanctum_token_seller_login_xyz',
          },
          status: 200,
        };

        const postSpy = vi
          .spyOn(apiClient, 'post')
          .mockResolvedValueOnce(mockLoginResponse);

        const result = await authService.login(credentials);

        expect(postSpy).toHaveBeenCalledWith('/auth/login', credentials, {
          skipAuth: true,
        });

        expect(result.user.name).toBe('Ibrahim Danladi');
        expect(result.token).toBe('2|sanctum_token_seller_login_xyz');
        expect(apiClient.getToken()).toBe('2|sanctum_token_seller_login_xyz');
      });

      it('handles 401 Unauthorized invalid login credentials', async () => {
        const unauthorizedError = new ApiError({
          message: 'Invalid login credentials.',
          status: HTTP_STATUS.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        });

        vi.spyOn(apiClient, 'post').mockRejectedValueOnce(unauthorizedError);

        await expect(
          authService.login({
            email: 'user@example.com',
            password: 'wrong_password',
          })
        ).rejects.toMatchObject({
          status: 401,
          isAuthError: true,
          message: 'Invalid login credentials.',
        });

        expect(apiClient.getToken()).toBeNull();
      });

      it('handles 429 Too Many Requests rate limit with retryAfter', async () => {
        const rateLimitError = new ApiError({
          message: 'Too many login attempts. Please try again in 60 seconds.',
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          code: ERROR_CODES.RATE_LIMITED,
          retryAfter: 60,
        });

        vi.spyOn(apiClient, 'post').mockRejectedValueOnce(rateLimitError);

        await expect(
          authService.login({
            email: 'locked@example.com',
            password: 'attempt_password',
          })
        ).rejects.toMatchObject({
          status: 429,
          isRateLimited: true,
          retryAfter: 60,
        });
      });
    });

    describe('POST /auth/logout', () => {
      it('sends POST /auth/logout with token and clears local token on success', async () => {
        apiClient.setToken('test_token_to_clear');
        expect(apiClient.getToken()).toBe('test_token_to_clear');

        const postSpy = vi
          .spyOn(apiClient, 'post')
          .mockResolvedValueOnce({
            data: { message: 'Logged out.' },
            status: 200,
          });

        await authService.logout();

        expect(postSpy).toHaveBeenCalledWith('/auth/logout', {});
        expect(apiClient.getToken()).toBeNull();
        expect(authService.isAuthenticated()).toBe(false);
      });

      it('clears local token even if server returns network error or 500', async () => {
        apiClient.setToken('test_token_server_error');

        vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
          new ApiError({
            message: 'Server error on logout',
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          })
        );

        await authService.logout().catch(() => {});

        // Must still be cleared
        expect(apiClient.getToken()).toBeNull();
        expect(authService.isAuthenticated()).toBe(false);
      });
    });

    describe('GET /profile and PUT /profile', () => {
      it('retrieves user profile via GET /profile', async () => {
        apiClient.setToken('valid_token_for_profile');

        const mockProfileData = {
          id: 6,
          name: 'Amina Bello',
          email: 'buyer@example.com',
          phone: '+2348011223344',
          role: 'buyer',
          status: 'active',
        };

        const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
          data: mockProfileData,
          status: 200,
        });

        const profile = await authService.getProfile();

        expect(getSpy).toHaveBeenCalledWith('/profile');
        expect(profile).toEqual(mockProfileData);
      });

      it('updates user profile via PUT /profile', async () => {
        apiClient.setToken('valid_token_for_update');

        const updatePayload = {
          name: 'Amina Bello-Danjuma',
          phone: '+2348099998888',
        };

        const mockUpdatedResponse = {
          data: {
            id: 6,
            name: 'Amina Bello-Danjuma',
            email: 'buyer@example.com',
            phone: '+2348099998888',
            role: 'buyer',
          },
          status: 200,
        };

        const putSpy = vi
          .spyOn(apiClient, 'put')
          .mockResolvedValueOnce(mockUpdatedResponse);

        const updated = await authService.updateProfile(updatePayload);

        expect(putSpy).toHaveBeenCalledWith('/profile', updatePayload);
        expect(updated.name).toBe('Amina Bello-Danjuma');
      });

      it('handles 401 unauthenticated session expired on profile request', async () => {
        apiClient.setToken('expired_profile_token');

        const unauthorizedError = new ApiError({
          message: 'Unauthenticated.',
          status: HTTP_STATUS.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        });

        vi.spyOn(apiClient, 'get').mockRejectedValueOnce(unauthorizedError);

        await expect(authService.getProfile()).rejects.toMatchObject({
          status: 401,
          isAuthError: true,
        });
      });
    });

    describe('Password Reset Endpoints', () => {
      it('requests password reset link via POST /auth/forgot-password', async () => {
        const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
          data: { message: 'We have emailed your password reset link.' },
          status: 200,
        });

        const result = await authService.forgotPassword({
          email: 'forgotten@example.com',
        });

        expect(postSpy).toHaveBeenCalledWith(
          '/auth/forgot-password',
          { email: 'forgotten@example.com' },
          { skipAuth: true }
        );
        expect(result.message).toMatch(/reset link/i);
      });

      it('submits new password via POST /auth/reset-password', async () => {
        const resetData = {
          email: 'user@example.com',
          token: 'valid_sanctum_reset_token',
          password: 'NewStrongPassword@2026',
          password_confirmation: 'NewStrongPassword@2026',
        };

        const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
          data: { message: 'Your password has been reset.' },
          status: 200,
        });

        const result = await authService.resetPassword(resetData);

        expect(postSpy).toHaveBeenCalledWith(
          '/auth/reset-password',
          resetData,
          {
            skipAuth: true,
          }
        );
        expect(result.message).toBe('Your password has been reset.');
      });

      it('handles 422 invalid or expired reset token', async () => {
        const error = new ApiError({
          message: 'This password reset token is invalid.',
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          errors: {
            token: ['This password reset token is invalid.'],
          },
        });

        vi.spyOn(apiClient, 'post').mockRejectedValueOnce(error);

        await expect(
          authService.resetPassword({
            email: 'user@example.com',
            token: 'invalid_token',
            password: 'NewPassword123',
            password_confirmation: 'NewPassword123',
          })
        ).rejects.toMatchObject({
          status: 422,
          isValidationError: true,
        });
      });
    });

    describe('POST /auth/change-password', () => {
      it('changes password for authenticated user', async () => {
        apiClient.setToken('auth_token_for_change');

        const payload = {
          current_password: 'OldPassword123',
          password: 'NewBrandPassword456',
          password_confirmation: 'NewBrandPassword456',
        };

        const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
          data: { message: 'Password changed successfully.' },
          status: 200,
        });

        const result = await authService.changePassword(payload);

        expect(postSpy).toHaveBeenCalledWith('/auth/change-password', payload);
        expect(result.message).toBe('Password changed successfully.');
      });

      it('handles 422 when current password is wrong', async () => {
        apiClient.setToken('auth_token_for_change');

        const error = new ApiError({
          message: 'The current password provided is incorrect.',
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          errors: {
            current_password: ['The current password provided is incorrect.'],
          },
        });

        vi.spyOn(apiClient, 'post').mockRejectedValueOnce(error);

        await expect(
          authService.changePassword({
            current_password: 'WrongCurrentPassword',
            password: 'NewPassword123',
            password_confirmation: 'NewPassword123',
          })
        ).rejects.toMatchObject({
          status: 422,
          errors: {
            current_password: ['The current password provided is incorrect.'],
          },
        });
      });
    });

    describe('Token Management Helpers', () => {
      it('manages bearer token via setToken, getToken, clearToken, and isAuthenticated', () => {
        expect(authService.isAuthenticated()).toBe(false);
        expect(authService.getToken()).toBeNull();

        authService.setToken('my_bearer_token');
        expect(authService.getToken()).toBe('my_bearer_token');
        expect(authService.isAuthenticated()).toBe(true);

        authService.clearToken();
        expect(authService.getToken()).toBeNull();
        expect(authService.isAuthenticated()).toBe(false);
      });
    });
  });
});
