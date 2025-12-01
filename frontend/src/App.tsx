import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Files from './pages/Files'
import Content from './pages/Content'
import ContentEditor from './pages/ContentEditor'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleManagement from './pages/RoleManagement'
import UserManagement from './pages/UserManagement'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="files" element={<Files />} />
          <Route path="content" element={<Content />} />
          <Route path="content/new" element={<ContentEditor />} />
          <Route path="content/:id" element={<ContentEditor />} />
          <Route
            path="users"
            element={
              <ProtectedRoute requiredPermissions={['USER_VIEW', 'USER_MANAGE']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="roles"
            element={
              <ProtectedRoute requiredPermissions={['ROLE_VIEW', 'ROLE_MANAGE']}>
                <RoleManagement />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </>
  )
}

export default App



