/**
 * Application Routes Configuration
 * Tất cả routes được định nghĩa ở đây
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ROUTES } from '../constants'
import { PERMISSIONS } from '../constants'

// Pages
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Files from '../pages/Files'
import Content from '../pages/Content'
import ContentEditor from '../pages/ContentEditor'
import UserManagement from '../pages/UserManagement'
import RoleManagement from '../pages/RoleManagement'

// Components
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'

export default function AppRoutes() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path={ROUTES.LOGIN}
        element={isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <Login />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="files" element={<Files />} />
        <Route path="content" element={<Content />} />
        <Route path="content/new" element={<ContentEditor />} />
        <Route path="content/:id" element={<ContentEditor />} />
        
        {/* Admin Routes */}
        <Route
          path="users"
          element={
            <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_VIEW, PERMISSIONS.USER_MANAGE]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="roles"
          element={
            <ProtectedRoute requiredPermissions={[PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_MANAGE]}>
              <RoleManagement />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 - Catch all */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  )
}
