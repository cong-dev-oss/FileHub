import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { API_CONFIG } from '../config'
import { ROUTES } from '../constants'

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  maxContentLength: API_CONFIG.MAX_CONTENT_LENGTH,
  maxBodyLength: API_CONFIG.MAX_BODY_LENGTH,
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Don't set Content-Type for FormData - let axios handle it automatically with boundary
    if (config.data instanceof FormData) {
      // Remove Content-Type header completely so axios can set it with proper boundary
      delete config.headers['Content-Type']
    } else if (!config.headers['Content-Type']) {
      // Only set Content-Type for non-FormData requests
      config.headers['Content-Type'] = 'application/json'
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    if (import.meta.env.DEV) {
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.data)
    }
    return response
  },
  (error) => {
    // Log errors for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })
    
    // Handle standardized error response format
    // The error will be properly formatted by errorHandler utility
    // We keep the original error structure for components to handle
    
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = ROUTES.LOGIN
    }
    return Promise.reject(error)
  }
)

export default api

