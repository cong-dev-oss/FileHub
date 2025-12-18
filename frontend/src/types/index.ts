/**
 * Centralized Type Definitions
 * Tất cả các types và interfaces được định nghĩa ở đây
 */

// ==================== API Types ====================

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errorCode?: string
  timestamp: string
}

export interface ApiErrorResponse {
  success: false
  message: string
  errorCode?: string
  errors?: Record<string, string[]>
  timestamp: string
}

// ==================== Auth Types ====================

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  permissions: string[]
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
  expiresAt: string
  user: User
  roles: string[]
  permissions: string[]
}

// ==================== File Types ====================

export interface FileResponse {
  id: string
  fileName: string
  originalFileName: string
  contentType: string
  fileSize: number
  fileType: string
  description?: string
  createdAt: string
  downloadUrl: string
  folderId?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // bytes per second
  timeRemaining: number // seconds
}

export interface UploadState {
  fileName: string
  progress: number
  speed: number
  timeRemaining: number
  isUploading: boolean
}

// ==================== Folder Types ====================

export interface FolderDto {
  id: string
  name: string
  parentId?: string
  children: FolderDto[]
}

export interface CreateFolderDto {
  name: string
  parentId?: string
}

export interface UpdateFolderDto {
  name: string
  parentId?: string
}

// ==================== Content Types ====================

export interface ContentDto {
  id: string
  title: string
  slug: string
  description?: string
  body: string
  contentType: string
  status: string
  createdAt: string
  updatedAt?: string
  publishedAt?: string
  createdBy?: string
  fileIds?: string[]
}

export interface CreateContentDto {
  title: string
  description?: string
  body: string
  contentType: string
  status?: string
  fileIds?: string[]
}

export interface UpdateContentDto {
  title: string
  description?: string
  body: string
  status?: string
  fileIds?: string[]
}

// ==================== User Management Types ====================

export interface UserDto {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  permissions: string[]
  createdAt: string
  updatedAt?: string
}

export interface CreateUserDto {
  email: string
  password: string
  firstName: string
  lastName: string
  roleIds: string[]
}

export interface UpdateUserDto {
  email?: string
  firstName?: string
  lastName?: string
  roleIds?: string[]
}

// ==================== Role Types ====================

export interface RoleDto {
  id: string
  name: string
  description?: string
  permissions: string[]
  createdAt: string
  updatedAt?: string
}

export interface CreateRoleDto {
  name: string
  description?: string
  permissionIds: string[]
}

export interface UpdateRoleDto {
  name?: string
  description?: string
  permissionIds?: string[]
}

// ==================== Video Conversion Types ====================

export interface ConversionJob {
  id: string
  fileId: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed'
  progress: number
  outputFileId?: string
  error?: string
  createdAt: string
}

export interface ConversionStatus {
  jobId: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed'
  progress: number
  outputFileId?: string
  error?: string
}

// ==================== Navigation Types ====================

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permissions?: string[]
}

// ==================== Route Types ====================

export interface RouteConfig {
  path: string
  element: React.ComponentType
  requiredPermissions?: string[]
  children?: RouteConfig[]
}
