# Cấu trúc Dự án Frontend

Tài liệu này mô tả cấu trúc dự án frontend sau khi được tùy chỉnh và tối ưu hóa.

## 📁 Cấu trúc Thư mục

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components
│   │   ├── ConfirmDialog.tsx
│   │   ├── ContentDetail.tsx
│   │   ├── FormField.tsx
│   │   ├── ImagePreview.tsx
│   │   ├── Layout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── VideoConversionManager.tsx
│   │   └── VideoPlayer.tsx
│   │
│   ├── pages/              # Page components (routes)
│   │   ├── Content.tsx
│   │   ├── ContentEditor.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Files.tsx
│   │   ├── Login.tsx
│   │   ├── RoleManagement.tsx
│   │   └── UserManagement.tsx
│   │
│   ├── services/           # API service layer
│   │   ├── api.ts          # Axios instance & interceptors
│   │   ├── apiResponse.ts  # API response utilities
│   │   ├── authService.ts
│   │   ├── chunkedFileService.ts
│   │   ├── contentService.ts
│   │   ├── fileService.ts
│   │   ├── folderService.ts
│   │   ├── roleService.ts
│   │   ├── signalRService.ts
│   │   ├── tusUploadService.ts
│   │   ├── userService.ts
│   │   └── videoConversionService.ts
│   │
│   ├── store/              # State management (Zustand)
│   │   └── authStore.ts
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── index.ts        # Hooks barrel export
│   │   ├── useAuth.ts      # Authentication hook
│   │   └── usePermissions.ts # Permissions hook
│   │
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts        # Centralized types
│   │
│   ├── constants/          # Application constants
│   │   └── index.ts        # All constants
│   │
│   ├── config/             # Configuration files
│   │   └── index.ts        # App configuration
│   │
│   ├── routes/             # Route configuration
│   │   └── index.tsx       # All routes
│   │
│   ├── utils/              # Utility functions
│   │   └── errorHandler.ts
│   │
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css          # Global styles
│
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   ├── COMPONENTS.md
│   ├── API.md
│   ├── DEVELOPMENT.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── .env                    # Environment variables
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── PROJECT_STRUCTURE.md    # This file
```

## 🎯 Các Thay Đổi Chính

### 1. **Types Centralization** (`src/types/`)
- Tất cả TypeScript types và interfaces được tập trung trong `types/index.ts`
- Dễ dàng quản lý và tái sử dụng types
- Tránh duplicate type definitions

### 2. **Constants Management** (`src/constants/`)
- Tất cả constants (API endpoints, routes, permissions, etc.) được tập trung
- Dễ dàng thay đổi và maintain
- Type-safe constants với `as const`

### 3. **Configuration** (`src/config/`)
- Cấu hình ứng dụng tập trung
- Environment variables handling
- Feature flags
- React Query configuration

### 4. **Routes Separation** (`src/routes/`)
- Routes được tách ra file riêng
- Dễ dàng quản lý và maintain
- Sử dụng constants cho routes

### 5. **Custom Hooks** (`src/hooks/`)
- Custom hooks được tổ chức riêng
- `useAuth`: Wrapper cho authentication
- `usePermissions`: Permission checking utilities
- Dễ dàng mở rộng thêm hooks mới

## 📦 Import Patterns

### Types
```typescript
import { User, FileResponse, ApiResponse } from '../types'
```

### Constants
```typescript
import { ROUTES, PERMISSIONS, API_ENDPOINTS } from '../constants'
```

### Config
```typescript
import { API_CONFIG, QUERY_CONFIG } from '../config'
```

### Hooks
```typescript
import { useAuth, usePermissions } from '../hooks'
```

### Services
```typescript
import { fileService } from '../services/fileService'
```

## 🔄 Migration Guide

### Cập nhật Imports

**Trước:**
```typescript
import { User } from '../store/authStore'
```

**Sau:**
```typescript
import { User } from '../types'
```

**Trước:**
```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
]
```

**Sau:**
```typescript
import { ROUTES } from '../constants'

const navigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD },
]
```

**Trước:**
```typescript
import { useAuthStore } from '../store/authStore'
const { logout } = useAuthStore()
```

**Sau:**
```typescript
import { useAuth } from '../hooks'
const { logout } = useAuth()
```

## ✅ Best Practices

### 1. Types
- Luôn import types từ `types/index.ts`
- Không định nghĩa types inline trong components
- Sử dụng interfaces cho objects, types cho unions

### 2. Constants
- Luôn sử dụng constants thay vì hardcode strings
- Sử dụng `as const` để type safety
- Group related constants

### 3. Routes
- Sử dụng `ROUTES` constants thay vì hardcode paths
- Tất cả routes được định nghĩa trong `routes/index.tsx`

### 4. Hooks
- Sử dụng custom hooks khi logic được reuse
- Export hooks từ `hooks/index.ts`

### 5. Services
- Mỗi service export object với methods
- Sử dụng types từ `types/index.ts`
- Sử dụng constants cho API endpoints

## 🚀 Benefits

1. **Maintainability**: Dễ dàng tìm và sửa code
2. **Scalability**: Dễ dàng mở rộng và thêm features
3. **Type Safety**: Centralized types đảm bảo consistency
4. **DRY Principle**: Không duplicate code
5. **Developer Experience**: Dễ dàng navigate và understand codebase

## 📝 Notes

- Tất cả file mới đã được tạo và cấu trúc đã được cập nhật
- Một số file cũ vẫn tồn tại để backward compatibility
- Có thể dần dần migrate các file còn lại sang cấu trúc mới
- Tài liệu đã được cập nhật trong `docs/` folder

## 🔗 Related Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Kiến trúc chi tiết
- [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Hướng dẫn phát triển
- [API.md](./docs/API.md) - API integration
