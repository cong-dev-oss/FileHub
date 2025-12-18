/**
 * API Response Utilities
 * Re-export từ types để maintain backward compatibility
 */

// Import và re-export types
export type { ApiResponse, ApiErrorResponse } from '../types'

/**
 * Extract data from ApiResponse wrapper
 * Throws error if response is not successful
 */
export function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (response.data.success && response.data.data !== undefined) {
    return response.data.data
  }
  throw new Error(response.data.message || 'Request failed')
}

/**
 * Extract data from ApiResponse wrapper (for error responses)
 */
export function extractError(response: { data: ApiErrorResponse }): ApiErrorResponse {
  return response.data
}
