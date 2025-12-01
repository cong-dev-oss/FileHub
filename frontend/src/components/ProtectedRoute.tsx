import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[]
}

export default function ProtectedRoute({ children, requiredPermissions }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = user?.permissions || []
    const hasAny = requiredPermissions.some(p => userPermissions.includes(p))
    if (!hasAny) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}

