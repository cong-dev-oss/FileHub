// Standard API Response types matching backend ApiResponse<T> and ApiErrorResponse

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errorCode?: string
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  message: string
  errorCode?: string
  errors?: Record<string, string[]>
  timestamp: string
}

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
