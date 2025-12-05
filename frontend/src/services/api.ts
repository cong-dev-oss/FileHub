import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Use direct backend URL in development if proxy doesn't work
// Option 1: Set VITE_API_URL in .env file: VITE_API_URL=http://localhost:5000/api
// Option 2: Uncomment the line below to use direct backend URL
const USE_DIRECT_BACKEND = false // Set to true if proxy doesn't work

const getBaseURL = () => {
  // Check if VITE_API_URL is set in environment
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Use direct backend URL if enabled
  if (USE_DIRECT_BACKEND && import.meta.env.DEV) {
    return 'http://localhost:5000/api'
  }
  
  // In development, try proxy first
  if (import.meta.env.DEV) {
    return '/api'
  }
  
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 600000, // 10 minutes for large file uploads
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
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
    if (process.env.NODE_ENV === 'development') {
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
    
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

