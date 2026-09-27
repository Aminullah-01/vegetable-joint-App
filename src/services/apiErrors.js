import { STRINGS } from '../constants/index.js';

/**
 * Standard HTTP Status Codes used in Vegetable Joint REST API (IF-03)
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Standardized Error Code strings for classification
 */
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Custom error class representing normalized API errors across the application.
 * Conforms to IF-02, IF-03, ERR-01, ERR-02, ERR-03, and ERR-04.
 */
export class ApiError extends Error {
  /**
   * @param {Object} options
   * @param {string} options.message - Human-friendly error message.
   * @param {number} [options.status=0] - HTTP status code (0 for network failure).
   * @param {string} [options.code='UNKNOWN_ERROR'] - Normalized classification code.
   * @param {Record<string, string[]>} [options.errors={}] - Validation errors keyed by field.
   * @param {any} [options.data=null] - Raw response payload or parsed body.
   * @param {Response} [options.rawResponse=null] - Raw Fetch Response instance.
   * @param {Error} [options.originalError=null] - Original caught JavaScript error.
   */
  constructor({
    message,
    status = 0,
    code = ERROR_CODES.UNKNOWN_ERROR,
    errors = {},
    data = null,
    rawResponse = null,
    originalError = null,
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors || {};
    this.data = data;
    this.rawResponse = rawResponse;
    this.originalError = originalError;

    // Categorization flags
    this.isNetworkError = status === 0;
    this.isAuthError = status === HTTP_STATUS.UNAUTHORIZED;
    this.isForbidden = status === HTTP_STATUS.FORBIDDEN;
    this.isNotFound = status === HTTP_STATUS.NOT_FOUND;
    this.isConflict = status === HTTP_STATUS.CONFLICT;
    this.isValidationError = status === HTTP_STATUS.UNPROCESSABLE_ENTITY;
    this.isRateLimited = status === HTTP_STATUS.TOO_MANY_REQUESTS;
    this.isServerError = status >= 500 && status <= 599;

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Get validation error messages for a specific field name.
   * @param {string} field
   * @returns {string[]}
   */
  getFieldErrors(field) {
    if (!this.errors || typeof this.errors !== 'object') {
      return [];
    }
    const val = this.errors[field];
    if (Array.isArray(val)) {
      return val;
    }
    if (typeof val === 'string') {
      return [val];
    }
    return [];
  }

  /**
   * Get the first error message for a specific field, or null if none.
   * @param {string} field
   * @returns {string|null}
   */
  getFirstFieldError(field) {
    const list = this.getFieldErrors(field);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Check if a specific field has validation errors.
   * @param {string} field
   * @returns {boolean}
   */
  hasFieldError(field) {
    return this.getFieldErrors(field).length > 0;
  }
}

/**
 * Returns a default fallback error message and classification code based on HTTP status code.
 * Preserves user-facing standard strings (ERR-01, ERR-04).
 *
 * @param {number} status
 * @returns {{ message: string, code: string }}
 */
export function getStatusDetails(status) {
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return {
        message: 'Bad request. Please verify the submitted data.',
        code: ERROR_CODES.UNKNOWN_ERROR,
      };
    case HTTP_STATUS.UNAUTHORIZED:
      return {
        message: STRINGS.ERRORS.INVALID_CREDENTIALS,
        code: ERROR_CODES.UNAUTHORIZED,
      };
    case HTTP_STATUS.FORBIDDEN:
      return {
        message: STRINGS.ERRORS.FORBIDDEN_403_MESSAGE,
        code: ERROR_CODES.FORBIDDEN,
      };
    case HTTP_STATUS.NOT_FOUND:
      return {
        message: STRINGS.ERRORS.PRODUCT_NOT_FOUND,
        code: ERROR_CODES.NOT_FOUND,
      };
    case HTTP_STATUS.CONFLICT:
      return {
        message:
          'A conflict occurred. The resource may have been updated or requested stock is insufficient.',
        code: ERROR_CODES.CONFLICT,
      };
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return {
        message: 'Validation failed. Please check the provided inputs.',
        code: ERROR_CODES.VALIDATION_ERROR,
      };
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      return {
        message: 'Too many requests. Please wait a moment before trying again.',
        code: ERROR_CODES.RATE_LIMITED,
      };
    default:
      if (status >= 500 && status <= 599) {
        return {
          message: STRINGS.ERRORS.SERVER_ERROR_500_MESSAGE,
          code: ERROR_CODES.SERVER_ERROR,
        };
      }
      return {
        message: 'An unexpected error occurred. Please try again.',
        code: ERROR_CODES.UNKNOWN_ERROR,
      };
  }
}

/**
 * Parses and normalizes an error response into an ApiError instance.
 * Conforms to Laravel JSON error envelope: { message: "...", errors: { field: [...] } }
 *
 * @param {Response} response
 * @param {any} body - Parsed JSON body or text
 * @returns {ApiError}
 */
export function createApiErrorFromResponse(response, body) {
  const status = response.status;
  const statusDetails = getStatusDetails(status);

  let message = statusDetails.message;
  let errors = {};

  if (body && typeof body === 'object') {
    // Envelope: { message: "...", errors: { ... } }
    if (typeof body.message === 'string' && body.message.trim().length > 0) {
      // For 500 errors in production, hide technical error details (ERR-02)
      if (status >= 500) {
        message = STRINGS.ERRORS.SERVER_ERROR_500_MESSAGE;
      } else {
        message = body.message;
      }
    }

    if (body.errors && typeof body.errors === 'object') {
      errors = body.errors;
    }
  }

  return new ApiError({
    message,
    status,
    code: statusDetails.code,
    errors,
    data: body,
    rawResponse: response,
  });
}

/**
 * Creates a normalized network error when fetch fails completely (offline, DNS, timeout).
 *
 * @param {Error} originalError
 * @returns {ApiError}
 */
export function createNetworkError(originalError) {
  const isTimeout =
    originalError?.name === 'AbortError' ||
    originalError?.message?.toLowerCase().includes('timeout');

  return new ApiError({
    message: isTimeout
      ? 'Request timed out. Please check your connection and try again.'
      : STRINGS.ERRORS.NETWORK_ERROR,
    status: 0,
    code: isTimeout ? ERROR_CODES.TIMEOUT_ERROR : ERROR_CODES.NETWORK_ERROR,
    originalError,
  });
}
