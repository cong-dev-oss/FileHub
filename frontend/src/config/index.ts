/**
 * Application Configuration
 * Cấu hình ứng dụng và environment variables
 */

// ==================== API Configuration ====================

const getApiBaseUrl = (): string => {
  // Check environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Development: Use proxy
  if (import.meta.env.DEV) {
    return '/api'
  }
  
  // Production: Use relative path
  return '/api'
}

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 600000, // 10 minutes for large file uploads
  MAX_CONTENT_LENGTH: Infinity,
  MAX_BODY_LENGTH: Infinity,
} as const

// ==================== App Configuration ====================

export const APP_CONFIG = {
  NAME: 'WebApp',
  VERSION: '1.0.0',
  ENV: import.meta.env.MODE,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const

// ==================== Feature Flags ====================

export const FEATURES = {
  ENABLE_VIDEO_CONVERSION: true,
  ENABLE_TUS_UPLOAD: true,
  ENABLE_CHUNKED_UPLOAD: true,
  ENABLE_SIGNALR: true,
  ENABLE_ANALYTICS: import.meta.env.PROD,
} as const

// ==================== React Query Configuration ====================

export const QUERY_CONFIG = {
  DEFAULT_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  DEFAULT_CACHE_TIME: 10 * 60 * 1000, // 10 minutes
  RETRY: 1,
  REFETCH_ON_WINDOW_FOCUS: false,
} as const
