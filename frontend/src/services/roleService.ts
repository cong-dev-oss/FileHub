import api from './api'
import { extractData, ApiResponse } from './apiResponse'

export interface Role {
  id: string
  name: string
}

export interface Permission {
  id: number
  code: string
  name: string
  module: string
  description?: string
  isActive: boolean
}

export const roleService = {
  getRoles: async (): Promise<Role[]> => {
    const res = await api.get<ApiResponse<Role[]>>('/roles')
    return extractData(res)
  },

  createRole: async (name: string): Promise<void> => {
    await api.post('/roles', name, {
      headers: { 'Content-Type': 'application/json' },
    })
  },

  deleteRole: async (roleId: string): Promise<void> => {
    await api.delete(`/roles/${roleId}`)
  },

  getPermissions: async (): Promise<Permission[]> => {
    const res = await api.get<ApiResponse<Permission[]>>('/permissions')
    return extractData(res)
  },

  getRolePermissions: async (roleId: string): Promise<string[]> => {
    const res = await api.get<ApiResponse<string[]>>(`/roles/${roleId}/permissions`)
    return extractData(res)
  },

  setRolePermissions: async (roleId: string, permissionCodes: string[]): Promise<void> => {
    await api.post(`/roles/${roleId}/permissions`, permissionCodes)
  },
}


