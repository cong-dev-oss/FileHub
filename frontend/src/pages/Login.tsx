import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'
import { LogIn, FolderOpen } from 'lucide-react'
import FormField from '../components/FormField'
import { formatErrorMessage } from '../utils/errorHandler'

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const response = await authService.login(data)
      setAuth(
        {
          ...response.user,
          roles: response.roles,
          permissions: response.permissions,
        },
        response.token
      )
      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (error: any) {
      // Use standardized error handler
      const errorMessage = formatErrorMessage(error)
      toast.error(errorMessage)
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-primary-100 p-3 rounded-full">
            <FolderOpen className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="flex items-center justify-center space-x-2 mb-8">
          <FolderOpen className="h-6 w-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-center text-gray-900">
            File Hub
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="email"
            label="Email"
            type="email"
            required
            placeholder="Enter your email"
            register={register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            error={errors.email}
          />

          <FormField
            name="password"
            label="Password"
            type="password"
            required
            placeholder="Enter your password"
            register={register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
            error={errors.password}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}



