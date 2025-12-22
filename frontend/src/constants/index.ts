/**
 * Application Constants
 * Tất cả các constants được định nghĩa ở đây
 */

// ==================== API Constants ====================

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  FILES: {
    BASE: '/files',
    UPLOAD: '/files/upload',
    DOWNLOAD: (id: string) => `/files/${id}/download`,
    STREAM: (id: string) => `/files/${id}/stream`,
    MOVE: (id: string) => `/files/${id}/move`,
  },
  FOLDERS: {
    BASE: '/folders',
    TREE: '/folders/tree',
  },
  CONTENT: {
    BASE: '/content',
  },
  USERS: {
    BASE: '/users',
  },
  ROLES: {
    BASE: '/roles',
  },
  VIDEO_CONVERSION: {
    START: '/video-conversion/start',
    STATUS: (jobId: string) => `/video-conversion/${jobId}/status`,
    CANCEL: (jobId: string) => `/video-conversion/${jobId}/cancel`,
  },
} as const

// ==================== File Constants ====================

export const FILE_TYPES = {
  DOCUMENT: 'Document',
  SPREADSHEET: 'Spreadsheet',
  VIDEO: 'Video',
  IMAGE: 'Image',
  AUDIO: 'Audio',
} as const

export const FILE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: FILE_TYPES.DOCUMENT, label: 'Documents' },
  { value: FILE_TYPES.SPREADSHEET, label: 'Spreadsheets' },
  { value: FILE_TYPES.VIDEO, label: 'Videos' },
  { value: FILE_TYPES.IMAGE, label: 'Images' },
  { value: FILE_TYPES.AUDIO, label: 'Audio' },
] as const

export const FILE_SIZE_LIMITS = {
  CHUNKED_UPLOAD_THRESHOLD: 50 * 1024 * 1024, // 50MB
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
} as const

// ==================== Content Constants ====================

export const CONTENT_TYPES = {
  ARTICLE: 'Article',
  PAGE: 'Page',
  POST: 'Post',
} as const

export const CONTENT_STATUS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
} as const

export const CONTENT_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: CONTENT_STATUS.DRAFT, label: 'Draft' },
  { value: CONTENT_STATUS.PUBLISHED, label: 'Published' },
  { value: CONTENT_STATUS.ARCHIVED, label: 'Archived' },
] as const

// ==================== Permissions ====================

export const PERMISSIONS = {
  // User Management
  USER_VIEW: 'USER_VIEW',
  USER_MANAGE: 'USER_MANAGE',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  
  // Role Management
  ROLE_VIEW: 'ROLE_VIEW',
  ROLE_MANAGE: 'ROLE_MANAGE',
  ROLE_CREATE: 'ROLE_CREATE',
  ROLE_UPDATE: 'ROLE_UPDATE',
  ROLE_DELETE: 'ROLE_DELETE',
  
  // File Management
  FILE_VIEW: 'FILE_VIEW',
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DOWNLOAD: 'FILE_DOWNLOAD',
  FILE_DELETE: 'FILE_DELETE',
  
  // Content Management
  CONTENT_VIEW: 'CONTENT_VIEW',
  CONTENT_CREATE: 'CONTENT_CREATE',
  CONTENT_UPDATE: 'CONTENT_UPDATE',
  CONTENT_DELETE: 'CONTENT_DELETE',
  CONTENT_PUBLISH: 'CONTENT_PUBLISH',
} as const

// ==================== Routes ====================

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  FILES: '/files',
  CONTENT: '/content',
  CONTENT_NEW: '/content/new',
  CONTENT_EDIT: (id: string) => `/content/${id}`,
  USERS: '/users',
  ROLES: '/roles',
  CHAT: '/chat',
} as const

// ==================== Storage Keys ====================

export const STORAGE_KEYS = {
  AUTH: 'auth-storage',
  THEME: 'theme-preference',
  LANGUAGE: 'language-preference',
} as const

// ==================== Query Keys ====================

export const QUERY_KEYS = {
  FILES: 'files',
  FILES_BY_TYPE: (type?: string, folderId?: string) => ['files', type, folderId],
  FILE_BY_ID: (id: string) => ['files', id],
  FOLDERS: 'folders',
  FOLDERS_TREE: 'folders-tree',
  CONTENT: 'content',
  CONTENT_BY_ID: (id: string) => ['content', id],
  USERS: 'users',
  USER_BY_ID: (id: string) => ['users', id],
  ROLES: 'roles',
  ROLE_BY_ID: (id: string) => ['roles', id],
  CURRENT_USER: 'current-user',
} as const

// ==================== Time Constants ====================

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const

// ==================== UI Constants ====================

export const TOAST_POSITION = 'top-right' as const

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const

// ==================== Date Formats ====================

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DATETIME: 'MMM dd, yyyy HH:mm',
  TIME: 'HH:mm',
} as const
