import api from './api'
import { extractData, ApiResponse } from './apiResponse'

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
  expiresAt: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    roles: string[]
    permissions: string[]
  }
  roles: string[]
  permissions: string[]
}

export const authService = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data)
    return extractData(response)
  },

  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data)
    return extractData(response)
  },

  getCurrentUser: async () => {
    const response = await api.get<ApiResponse<any>>('/auth/me')
    return extractData(response)
  },
}



