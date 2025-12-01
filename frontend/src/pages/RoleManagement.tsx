import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleService, Role, Permission } from '../services/roleService'
import { Plus, Trash2, Shield, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { useConfirm } from '../components/ConfirmDialog'

export default function RoleManagement() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [newRoleName, setNewRoleName] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const confirm = useConfirm()

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.getRoles(),
  })

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleService.getPermissions(),
  })

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => roleService.createRole(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setNewRoleName('')
      toast.success('Role created')
    },
    onError: () => toast.error('Failed to create role'),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => roleService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setSelectedRole(null)
      setSelectedPermissions([])
      toast.success('Role deleted')
    },
    onError: () => toast.error('Failed to delete role'),
  })

  const setPermissionsMutation = useMutation({
    mutationFn: (payload: { roleId: string; codes: string[] }) =>
      roleService.setRolePermissions(payload.roleId, payload.codes),
    onSuccess: () => {
      toast.success('Permissions updated')
      // Nếu đang chỉnh role hiện tại của user, gợi ý reload trang để cập nhật quyền
      if (selectedRole && user?.roles?.includes(selectedRole.name)) {
        toast('Permissions changed. Please re-login to update your session.', { icon: 'ℹ️' })
      }
    },
    onError: () => toast.error('Failed to update permissions'),
  })

  // Khi chọn role, tải quyền của role đó
  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!selectedRole) {
        setSelectedPermissions([])
        return
      }
      try {
        const codes = await roleService.getRolePermissions(selectedRole.id)
        setSelectedPermissions(codes)
      } catch {
        toast.error('Failed to load role permissions')
      }
    }

    loadRolePermissions()
  }, [selectedRole])

  const togglePermission = (code: string) => {
    setSelectedPermissions(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const onSavePermissions = () => {
    if (!selectedRole) return
    setPermissionsMutation.mutate({ roleId: selectedRole.id, codes: selectedPermissions })
  }

  // Group permissions by module để UI dễ nhìn
  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const key = p.module || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary-600" />
            Role & Permission Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý nhóm quyền và quyền chi tiết cho hệ thống.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles list & create */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Roles</h2>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New role name..."
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              onClick={() => newRoleName && createRoleMutation.mutate(newRoleName)}
              className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </button>
          </div>

          <div className="divide-y divide-gray-200 mt-3 max-h-80 overflow-y-auto">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`flex items-center justify-between py-2 px-2 rounded cursor-pointer ${
                  selectedRole?.id === role.id ? 'bg-primary-50' : ''
                }`}
                onClick={() => setSelectedRole(role)}
              >
                <span className="text-sm font-medium text-gray-800">{role.name}</span>
                {role.name !== 'Admin' && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      const ok = await confirm({
                        title: 'Xóa role',
                        message: `Bạn có chắc chắn muốn xóa role "${role.name}"?`,
                        confirmText: 'Xóa role',
                      })
                      if (ok) {
                        deleteRoleMutation.mutate(role.id)
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Permissions for selected role */}
        <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Role Permissions</h2>
              {selectedRole ? (
                <p className="text-sm text-gray-500">
                  Thiết lập quyền cho role: <strong>{selectedRole.name}</strong>
                </p>
              ) : (
                <p className="text-sm text-gray-500">Chọn một role bên trái để cấu hình quyền.</p>
              )}
            </div>
            {selectedRole && (
              <button
                onClick={onSavePermissions}
                disabled={setPermissionsMutation.isPending}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm disabled:opacity-50"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                {setPermissionsMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>

          {!selectedRole ? (
            <div className="text-sm text-gray-500">Chưa chọn role.</div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="border border-gray-100 rounded-lg">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 font-medium text-sm text-gray-700">
                    {module}
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded"
                          checked={selectedPermissions.includes(p.code)}
                          onChange={() => togglePermission(p.code)}
                        />
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">
                            {p.code}
                          </div>
                          {p.description && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {p.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


