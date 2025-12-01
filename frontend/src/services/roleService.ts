import api from './api'

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
    const res = await api.get<Role[]>('/roles')
    return res.data
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
    const res = await api.get<Permission[]>('/permissions')
    return res.data
  },

  getRolePermissions: async (roleId: string): Promise<string[]> => {
    const res = await api.get<string[]>(`/roles/${roleId}/permissions`)
    return res.data
  },

  setRolePermissions: async (roleId: string, permissionCodes: string[]): Promise<void> => {
    await api.post(`/roles/${roleId}/permissions`, permissionCodes)
  },
}


