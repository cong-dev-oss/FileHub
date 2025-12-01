import api from './api'

export interface UserListItem {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  createdAt: string
  roles: string[]
}

export interface UpdateUserRolesRequest {
  roles: string[]
}

export interface UpdateUserStatusRequest {
  isActive: boolean
}

export interface CreateUserRequest {
  email: string
  firstName: string
  lastName: string
  password: string
  confirmPassword: string
  roles: string[]
}

export const userService = {
  getUsers: async (): Promise<UserListItem[]> => {
    const res = await api.get<UserListItem[]>('/users')
    return res.data
  },

  createUser: async (payload: CreateUserRequest): Promise<void> => {
    await api.post('/users', payload)
  },

  updateUserRoles: async (userId: string, roles: string[]): Promise<void> => {
    const payload: UpdateUserRolesRequest = { roles }
    await api.put(`/users/${userId}/roles`, payload)
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<void> => {
    const payload: UpdateUserStatusRequest = { isActive }
    await api.put(`/users/${userId}/status`, payload)
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`)
  },
}


