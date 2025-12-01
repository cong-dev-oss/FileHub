import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  permissions: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
      hasPermission: (permission: string) => {
        const state = useAuthStore.getState()
        if (!state.user) return false
        return state.user.permissions?.includes(permission) ?? false
      },
      hasAnyPermission: (permissions: string[]) => {
        const state = useAuthStore.getState()
        if (!state.user) return false
        return permissions.some(p => state.user!.permissions?.includes(p))
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)



