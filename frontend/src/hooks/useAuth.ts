/**
 * Custom hook for authentication
 * Wrapper around useAuthStore với additional utilities
 */

import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../constants'
import { useCallback } from 'react'

export function useAuth() {
  const authStore = useAuthStore()
  const navigate = useNavigate()

  const logout = useCallback(() => {
    authStore.logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }, [authStore, navigate])

  const requireAuth = useCallback(() => {
    if (!authStore.isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true })
      return false
    }
    return true
  }, [authStore.isAuthenticated, navigate])

  return {
    ...authStore,
    logout,
    requireAuth,
  }
}
