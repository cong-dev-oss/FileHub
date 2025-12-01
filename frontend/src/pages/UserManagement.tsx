import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService, UserListItem, CreateUserRequest } from '../services/userService'
import { roleService, Role } from '../services/roleService'
import { Users, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../components/ConfirmDialog'
import FormField from '../components/FormField'

export default function UserManagement() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    roles: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getRoles(),
  })

  const updateRolesMutation = useMutation({
    mutationFn: (payload: { userId: string; roles: string[] }) =>
      userService.updateUserRoles(payload.userId, payload.roles),
    onSuccess: () => {
      toast.success('User roles updated')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to update user roles'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { userId: string; isActive: boolean }) =>
      userService.updateUserStatus(payload.userId, payload.isActive),
    onSuccess: () => {
      toast.success('User status updated')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to update user status'),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted')
      setSelectedUser(null)
      setSelectedRoles([])
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const createUserMutation = useMutation({
    mutationFn: (payload: CreateUserRequest) => userService.createUser(payload),
    onSuccess: () => {
      toast.success('User created')
      setNewUser({ email: '', firstName: '', lastName: '', password: '', confirmPassword: '', roles: [] })
      setErrors({})
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data ?? 'Failed to create user'
      toast.error(typeof message === 'string' ? message : 'Failed to create user')
    },
  })

  const onSelectUser = (user: UserListItem) => {
    setSelectedUser(user)
    setSelectedRoles(user.roles)
  }

  const toggleRole = (roleName: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]
    )
  }

  const onSaveRoles = () => {
    if (!selectedUser) return
    updateRolesMutation.mutate({ userId: selectedUser.id, roles: selectedRoles })
  }

  const onToggleActive = (user: UserListItem) => {
    updateStatusMutation.mutate({ userId: user.id, isActive: !user.isActive })
  }

  const toggleNewUserRole = (roleName: string) => {
    setNewUser(prev => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter(r => r !== roleName)
        : [...prev.roles, roleName],
    }))
  }

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Email is required'
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
          return 'Invalid email address'
        }
        return ''
      case 'firstName':
        if (!value.trim()) return 'First name is required'
        return ''
      case 'password':
        if (!value) return 'Password is required'
        if (value.length < 6) return 'Password must be at least 6 characters'
        return ''
      case 'confirmPassword':
        if (!value) return 'Confirm password is required'
        if (value !== newUser.password) return 'Passwords do not match'
        return ''
      default:
        return ''
    }
  }

  const handleFieldChange = (field: keyof CreateUserRequest, value: string) => {
    setNewUser(prev => ({ ...prev, [field]: value }))
    // Clear error khi user bắt đầu nhập lại
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    // Validate confirmPassword khi password thay đổi
    if (field === 'password' && newUser.confirmPassword) {
      const confirmError = validateField('confirmPassword', newUser.confirmPassword)
      setErrors(prev => {
        const newErrors = { ...prev }
        if (confirmError) {
          newErrors.confirmPassword = confirmError
        } else {
          delete newErrors.confirmPassword
        }
        return newErrors
      })
    }
  }

  const handleFieldBlur = (field: keyof CreateUserRequest) => {
    const value = newUser[field] as string
    const error = validateField(field, value)
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    const emailError = validateField('email', newUser.email)
    if (emailError) newErrors.email = emailError

    const firstNameError = validateField('firstName', newUser.firstName)
    if (firstNameError) newErrors.firstName = firstNameError

    const passwordError = validateField('password', newUser.password)
    if (passwordError) newErrors.password = passwordError

    const confirmPasswordError = validateField('confirmPassword', newUser.confirmPassword)
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin đã nhập')
      return
    }
    createUserMutation.mutate(newUser)
  }

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true
    const keyword = userSearch.toLowerCase()
    return (
      u.email.toLowerCase().includes(keyword) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(keyword)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-primary-600" />
            User Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý tài khoản người dùng, thông tin cơ bản và nhóm quyền (roles).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User list */}
        <div className="bg-white rounded-lg shadow p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            <span className="text-xs text-gray-400">
              {users.length} user{users.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="mb-3">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <div className="border border-gray-100 rounded-md max-h-[480px] overflow-y-auto divide-y divide-gray-100">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-6 text-sm text-gray-500 text-center">
                Không tìm thấy user phù hợp.
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectUser(user)}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName || ''}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.roles.map(role => (
                        <span
                          key={role}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onToggleActive(user)
                    }}
                    className={`text-xs px-2 py-1 rounded-md ${
                      user.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tạo user mới */}
        <div className="bg-white rounded-lg shadow p-4 lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create User</h2>
          <p className="text-xs text-gray-500 mb-3">
            Nhập thông tin cơ bản và nhóm quyền ban đầu cho user mới.
          </p>
          <form className="space-y-3" onSubmit={onCreateUser}>
            <FormField
              name="email"
              label="Email"
              type="email"
              required
              placeholder="user@example.com"
              value={newUser.email}
              error={errors.email}
              onChange={e => handleFieldChange('email', (e.target as HTMLInputElement).value)}
              onBlur={() => handleFieldBlur('email')}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                name="firstName"
                label="First name"
                type="text"
                required
                placeholder="Enter first name"
                value={newUser.firstName}
                error={errors.firstName}
                onChange={e => handleFieldChange('firstName', (e.target as HTMLInputElement).value)}
                onBlur={() => handleFieldBlur('firstName')}
              />
              <FormField
                name="lastName"
                label="Last name"
                type="text"
                placeholder="Enter last name"
                value={newUser.lastName}
                error={errors.lastName}
                onChange={e => handleFieldChange('lastName', (e.target as HTMLInputElement).value)}
              />
            </div>
            <FormField
              name="password"
              label="Password"
              type="password"
              required
              placeholder="Tối thiểu 6 ký tự"
              value={newUser.password}
              error={errors.password}
              onChange={e => handleFieldChange('password', (e.target as HTMLInputElement).value)}
              onBlur={() => handleFieldBlur('password')}
            />
            <FormField
              name="confirmPassword"
              label="Confirm password"
              type="password"
              required
              placeholder="Nhập lại password"
              value={newUser.confirmPassword}
              error={errors.confirmPassword}
              onChange={e => handleFieldChange('confirmPassword', (e.target as HTMLInputElement).value)}
              onBlur={() => handleFieldBlur('confirmPassword')}
            />

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Roles</label>
              <div className="border border-gray-200 rounded-md max-h-32 overflow-y-auto divide-y divide-gray-100">
                {roles.map((role: Role) => (
                  <label
                    key={role.id}
                    className="flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50"
                  >
                    <span className="text-gray-700">{role.name}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      checked={newUser.roles.includes(role.name)}
                      onChange={() => toggleNewUserRole(role.name)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="w-full inline-flex justify-center items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm disabled:opacity-50"
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>

        {/* Thông tin & roles của user đã chọn */}
        <div className="bg-white rounded-lg shadow p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">User Detail & Roles</h2>
              {selectedUser ? (
                <div className="text-sm text-gray-500 space-y-1">
                  <div className="font-medium text-gray-800">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </div>
                  <div>{selectedUser.email}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        selectedUser.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {selectedUser.roles.map(role => (
                      <span
                        key={role}
                        className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Chọn một user bên trái để gán roles.</p>
              )}
            </div>
            {selectedUser && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onSaveRoles}
                  disabled={updateRolesMutation.isPending}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {updateRolesMutation.isPending ? 'Saving...' : 'Save Roles'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedUser) return
                    const ok = await confirm({
                      title: 'Xóa user',
                      message: `Bạn có chắc chắn muốn xóa user "${selectedUser.email}"? Hành động này không thể hoàn tác.`,
                      confirmText: 'Xóa user',
                    })
                    if (ok) {
                      deleteUserMutation.mutate(selectedUser.id)
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-xs"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {!selectedUser ? (
            <div className="text-sm text-gray-500">
              Chưa chọn user. Chọn một user bên trái để xem chi tiết và gán quyền.
            </div>
          ) : (
            <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {roles.map((role: Role) => (
                <label
                  key={role.id}
                  className="flex items-center justify-between px-3 py-2 border border-gray-100 rounded-md cursor-pointer hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-800">{role.name}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                    checked={selectedRoles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


