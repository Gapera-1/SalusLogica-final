/**
 * Error Handler Utility
 * Extracts and formats detailed error messages from API responses
 */

/**
 * Parse error response and extract meaningful message
 * @param {Error|Object} error - The error object from API call
 * @param {Function} t - Translation function (optional)
 * @returns {Object} - { message: string, type: string, fields: object }
 */
export const parseApiError = (error, t = (key) => key) => {
  // Default error structure
  const result = {
    message: t('errors.unknown') || 'An unexpected error occurred',
    type: 'error',
    fields: {},
    statusCode: null,
  };

  // Network/Connection errors
  if (!error) {
    return result;
  }

  // Check for network failure
  if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
    result.message = t('errors.networkError') || 'Unable to connect to server. Please check your internet connection.';
    result.type = 'network';
    return result;
  }

  // Check for timeout
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    result.message = t('errors.timeout') || 'Request timed out. Please try again.';
    result.type = 'timeout';
    return result;
  }

  // Extract status code
  const statusCode = error.status || error.response?.status || null;
  result.statusCode = statusCode;

  // Handle based on status code
  if (statusCode) {
    switch (statusCode) {
      case 400:
        result.type = 'validation';
        break;
      case 401:
        result.message = t('errors.unauthorized') || 'Session expired. Please login again.';
        result.type = 'auth';
        return result;
      case 403:
        result.message = t('errors.forbidden') || 'You do not have permission to perform this action.';
        result.type = 'permission';
        return result;
      case 404:
        result.message = t('errors.notFound') || 'The requested resource was not found.';
        result.type = 'notFound';
        return result;
      case 429:
        result.message = t('errors.tooManyRequests') || 'Too many requests. Please wait a moment and try again.';
        result.type = 'rateLimit';
        return result;
      case 500:
      case 502:
      case 503:
        result.message = t('errors.serverError') || 'Server error. Please try again later.';
        result.type = 'server';
        return result;
      default:
        break;
    }
  }

  // Extract error message from response data
  const errorData = error.response?.data || error.data || {};

  // Handle Django REST Framework error formats
  if (errorData.error) {
    // Format: { error: { message, type, fields } }
    if (typeof errorData.error === 'object') {
      if (errorData.error.message) {
        result.message = errorData.error.message;
      }
      if (errorData.error.type) {
        result.type = errorData.error.type;
      }
      if (errorData.error.fields) {
        result.fields = errorData.error.fields;
        // Extract non_field_errors
        if (errorData.error.fields.non_field_errors) {
          result.message = Array.isArray(errorData.error.fields.non_field_errors)
            ? errorData.error.fields.non_field_errors[0]
            : errorData.error.fields.non_field_errors;
        }
        // Format field errors
        const fieldMessages = formatFieldErrors(errorData.error.fields, t);
        if (fieldMessages && !result.message.includes(fieldMessages)) {
          result.message = fieldMessages || result.message;
        }
      }
    } else if (typeof errorData.error === 'string') {
      result.message = errorData.error;
    }
  }

  // Format: { detail: "error message" }
  if (errorData.detail) {
    result.message = errorData.detail;
  }

  // Format: { message: "error message" }
  if (errorData.message && !result.message.includes(errorData.message)) {
    result.message = errorData.message;
  }

  // Format: { non_field_errors: ["error1", "error2"] }
  if (errorData.non_field_errors) {
    result.message = Array.isArray(errorData.non_field_errors)
      ? errorData.non_field_errors[0]
      : errorData.non_field_errors;
  }

  // Format: { field_name: ["error1", "error2"] }
  if (!result.message || result.message === (t('errors.unknown') || 'An unexpected error occurred')) {
    const fieldErrors = formatFieldErrors(errorData, t);
    if (fieldErrors) {
      result.message = fieldErrors;
    }
  }

  // If error has a direct message property
  if (error.message && error.message !== 'Request failed' && !result.message.includes(error.message)) {
    // Only use if we don't have a better message
    if (result.message === (t('errors.unknown') || 'An unexpected error occurred')) {
      result.message = error.message;
    }
  }

  return result;
};

/**
 * Format field-level validation errors into a readable string
 * @param {Object} fields - Object with field names as keys and error arrays as values
 * @param {Function} t - Translation function
 * @returns {string} - Formatted error message
 */
const formatFieldErrors = (fields, t) => {
  if (!fields || typeof fields !== 'object') return '';

  const skipFields = ['non_field_errors'];
  const messages = [];

  Object.entries(fields).forEach(([field, errors]) => {
    if (skipFields.includes(field)) return;
    
    const fieldName = formatFieldName(field, t);
    const errorList = Array.isArray(errors) ? errors : [errors];
    
    errorList.forEach((err) => {
      if (typeof err === 'string') {
        // Check if error already contains field name
        if (err.toLowerCase().includes(field.toLowerCase())) {
          messages.push(capitalizeFirst(err));
        } else {
          messages.push(`${fieldName}: ${err}`);
        }
      }
    });
  });

  return messages.join('\n');
};

/**
 * Format field name to be more readable
 * @param {string} field - Field name from API
 * @param {Function} t - Translation function
 * @returns {string} - Formatted field name
 */
const formatFieldName = (field, t) => {
  // Try to get translation first
  const translationKey = `fields.${field}`;
  const translated = t(translationKey);
  if (translated !== translationKey) {
    return translated;
  }

  // Convert snake_case to Title Case
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Capitalize first letter
 * @param {string} str - Input string
 * @returns {string} - Capitalized string
 */
const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Get user-friendly error message for display
 * @param {Error|Object} error - The error object
 * @param {Function} t - Translation function
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error, t = (key) => key) => {
  const parsed = parseApiError(error, t);
  return parsed.message;
};

/**
 * Check if error is an authentication error
 * @param {Error|Object} error - The error object
 * @returns {boolean}
 */
export const isAuthError = (error) => {
  const statusCode = error?.status || error?.response?.status;
  return statusCode === 401;
};

/**
 * Check if error is a network error
 * @param {Error|Object} error - The error object
 * @returns {boolean}
 */
export const isNetworkError = (error) => {
  return (
    error?.message === 'Network request failed' ||
    error?.message === 'Failed to fetch' ||
    error?.type === 'network'
  );
};

/**
 * Check if error is a validation error
 * @param {Error|Object} error - The error object
 * @returns {boolean}
 */
export const isValidationError = (error) => {
  const statusCode = error?.status || error?.response?.status;
  return statusCode === 400;
};

/**
 * Log error with context for debugging
 * @param {string} context - Where the error occurred
 * @param {Error|Object} error - The error object
 */
export const logError = (context, error) => {
  console.error(`[${context}] Error:`, {
    message: error?.message,
    status: error?.status || error?.response?.status,
    data: error?.response?.data,
    stack: error?.stack,
  });
};

export default {
  parseApiError,
  getErrorMessage,
  isAuthError,
  isNetworkError,
  isValidationError,
  logError,
};
