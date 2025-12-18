import { ApiErrorResponse } from '../services/apiResponse'

/**
 * Extract error message from API error response
 * Handles both ApiErrorResponse format and standard error format
 */
export function extractErrorMessage(error: any): string {
  // Check if it's an ApiErrorResponse
  if (error.response?.data) {
    const errorData = error.response.data as ApiErrorResponse
    
    if (errorData.message) {
      return errorData.message
    }
    
    // Fallback to standard error message
    if (typeof errorData === 'string') {
      return errorData
    }
  }
  
  // Fallback to error message
  return error.message || 'Đã xảy ra lỗi không xác định'
}

/**
 * Extract all error messages from API error response
 * Returns an array of all error messages (including validation errors)
 */
export function extractAllErrorMessages(error: any): string[] {
  const messages: string[] = []
  
  if (error.response?.data) {
    const errorData = error.response.data as ApiErrorResponse
    
    // Add main message
    if (errorData.message) {
      messages.push(errorData.message)
    }
    
    // Add validation errors
    if (errorData.errors) {
      Object.values(errorData.errors).forEach((errorArray) => {
        if (Array.isArray(errorArray)) {
          messages.push(...errorArray)
        }
      })
    }
  }
  
  // Fallback to error message
  if (messages.length === 0 && error.message) {
    messages.push(error.message)
  }
  
  // Final fallback
  if (messages.length === 0) {
    messages.push('Đã xảy ra lỗi không xác định')
  }
  
  return messages
}

/**
 * Extract error code from API error response
 */
export function extractErrorCode(error: any): string | undefined {
  if (error.response?.data) {
    const errorData = error.response.data as ApiErrorResponse
    return errorData.errorCode
  }
  return undefined
}

/**
 * Format error messages for display
 * Combines all error messages into a readable format
 */
export function formatErrorMessage(error: any): string {
  const messages = extractAllErrorMessages(error)
  
  if (messages.length === 0) {
    return 'Đã xảy ra lỗi không xác định'
  }
  
  if (messages.length === 1) {
    return messages[0]
  }
  
  // Multiple errors - format as bullet list
  return messages.map((msg, index) => `${index + 1}. ${msg}`).join('\n')
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  if (error.response?.data) {
    const errorData = error.response.data as ApiErrorResponse
    return errorData.errorCode === 'VALIDATION_ERROR' || !!errorData.errors
  }
  return false
}

/**
 * Get error details for debugging
 */
export function getErrorDetails(error: any): {
  message: string
  errorCode?: string
  errors?: Record<string, string[]>
  status?: number
  url?: string
} {
  const details: any = {
    message: extractErrorMessage(error),
  }
  
  if (error.response?.data) {
    const errorData = error.response.data as ApiErrorResponse
    if (errorData.errorCode) {
      details.errorCode = errorData.errorCode
    }
    if (errorData.errors) {
      details.errors = errorData.errors
    }
  }
  
  if (error.response?.status) {
    details.status = error.response.status
  }
  
  if (error.config?.url) {
    details.url = error.config.url
  }
  
  return details
}
