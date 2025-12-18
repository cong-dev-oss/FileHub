/**
 * Custom hook for permission checking
 */

import { useAuthStore } from '../store/authStore'

export function usePermissions() {
  const { hasPermission, hasAnyPermission, user } = useAuthStore()

  const hasRole = (role: string): boolean => {
    if (!user) return false
    return user.roles?.includes(role) ?? false
  }

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false
    return roles.some(role => user.roles?.includes(role))
  }

  const isAdmin = (): boolean => {
    return hasRole('Admin')
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
    isAdmin,
    user,
  }
}
