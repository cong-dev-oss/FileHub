# Kiến trúc Frontend

Tài liệu này mô tả kiến trúc tổng thể của ứng dụng frontend WebApp.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tech Stack](#tech-stack)
- [Kiến trúc tổng thể](#kiến-trúc-tổng-thể)
- [Design Patterns](#design-patterns)
- [State Management](#state-management)
- [Routing](#routing)
- [API Integration](#api-integration)
- [Error Handling](#error-handling)
- [Performance](#performance)

## Tổng quan

Frontend được xây dựng theo kiến trúc component-based với các nguyên tắc:
- **Separation of Concerns**: Tách biệt logic, UI, và data fetching
- **Reusability**: Components và services có thể tái sử dụng
- **Type Safety**: TypeScript cho type checking
- **Scalability**: Dễ dàng mở rộng và bảo trì

## Tech Stack

### Core Framework
- **React 18.2.0**: UI framework với hooks và concurrent features
- **TypeScript 5.2.2**: Type-safe JavaScript
- **Vite 5.0.8**: Build tool và dev server nhanh

### Routing & Navigation
- **React Router DOM 6.20.0**: Client-side routing
- **Protected Routes**: Route guards với permission checking

### State Management
- **Zustand 4.4.7**: Lightweight state management cho global state
- **TanStack React Query 5.12.2**: Server state management và caching

### HTTP & API
- **Axios 1.6.2**: HTTP client với interceptors
- **SignalR 10.0.0**: Real-time communication

### UI & Styling
- **Tailwind CSS 3.3.6**: Utility-first CSS framework
- **Lucide React 0.294.0**: Icon library
- **React Hot Toast 2.4.1**: Toast notifications

### Forms & Validation
- **React Hook Form 7.48.2**: Form state management
- **Built-in validation**: TypeScript types và runtime validation

## Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │   Layout     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────┐
│                    State Management Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Zustand    │  │ React Query  │  │  Local State │      │
│  │   Stores     │  │   Cache      │  │   (useState) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────┐
│                      Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │ File Service │  │Content Service│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │           Axios Instance (api.ts)                  │    │
│  │  - Request Interceptors (Auth Token)                │    │
│  │  - Response Interceptors (Error Handling)          │    │
│  └──────────────────────┬─────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      Backend API                             │
│              http://localhost:5000/api                      │
└──────────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. Component-based Architecture

**Mục đích**: Tách biệt UI thành các components độc lập và tái sử dụng.

**Cấu trúc**:
```
components/
├── Layout.tsx              # Layout wrapper với sidebar
├── ProtectedRoute.tsx      # Route guard component
├── ConfirmDialog.tsx       # Reusable dialog
├── FormField.tsx           # Form input wrapper
├── ImagePreview.tsx        # Image preview component
├── VideoPlayer.tsx         # Video player component
└── VideoConversionManager.tsx  # Video conversion UI
```

**Ví dụ**:
```typescript
// Component độc lập, có thể tái sử dụng
export default function FormField({ label, error, ...props }) {
  return (
    <div>
      <label>{label}</label>
      <input {...props} />
      {error && <span>{error}</span>}
    </div>
  )
}
```

### 2. Service Layer Pattern

**Mục đích**: Tách biệt logic API calls khỏi components.

**Cấu trúc**:
```
services/
├── api.ts                  # Axios instance & interceptors
├── authService.ts          # Authentication APIs
├── fileService.ts          # File management APIs
├── contentService.ts       # Content management APIs
└── ...
```

**Ví dụ**:
```typescript
// Service layer
export const fileService = {
  getAll: () => api.get<FileResponse[]>('/files'),
  getById: (id: string) => api.get<FileResponse>(`/files/${id}`),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<FileResponse>('/files/upload', formData)
  }
}

// Component sử dụng service
const { data } = useQuery({
  queryKey: ['files'],
  queryFn: () => fileService.getAll()
})
```

### 3. Container/Presentational Pattern

**Mục đích**: Tách biệt logic và presentation.

- **Pages**: Container components với logic và data fetching
- **Components**: Presentational components chỉ nhận props

**Ví dụ**:
```typescript
// Container (Page)
export default function Files() {
  const { data } = useQuery(['files'], fileService.getAll)
  const deleteMutation = useMutation(fileService.delete)
  
  return <FileList files={data} onDelete={deleteMutation.mutate} />
}

// Presentational (Component)
function FileList({ files, onDelete }) {
  return files.map(file => (
    <FileItem key={file.id} file={file} onDelete={onDelete} />
  ))
}
```

### 4. Custom Hooks Pattern

**Mục đích**: Tái sử dụng logic giữa các components.

**Ví dụ**:
```typescript
// Custom hook
function useAuth() {
  const { user, token, setAuth, logout } = useAuthStore()
  return { user, token, setAuth, logout }
}

// Sử dụng trong component
function MyComponent() {
  const { user, logout } = useAuth()
  // ...
}
```

## State Management

### Global State (Zustand)

**Sử dụng cho**: Authentication state, user preferences

**Ví dụ**:
```typescript
// authStore.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false })
    }),
    { name: 'auth-storage' }
  )
)
```

### Server State (React Query)

**Sử dụng cho**: API data, caching, synchronization

**Ví dụ**:
```typescript
// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['files'],
  queryFn: () => fileService.getAll(),
  staleTime: 5 * 60 * 1000, // 5 minutes
})

// Mutations
const mutation = useMutation({
  mutationFn: fileService.delete,
  onSuccess: () => {
    queryClient.invalidateQueries(['files'])
  }
})
```

### Local State (useState)

**Sử dụng cho**: Component-specific state, form state

**Ví dụ**:
```typescript
const [isOpen, setIsOpen] = useState(false)
const [searchTerm, setSearchTerm] = useState('')
```

## Routing

### Route Structure

```typescript
/                    → Redirect to /dashboard
/login               → Login page (public)
/dashboard           → Dashboard (protected)
/files               → File management (protected)
/content             → Content list (protected)
/content/new         → Create content (protected)
/content/:id         → Edit content (protected)
/users               → User management (protected, admin only)
/roles               → Role management (protected, admin only)
```

### Protected Routes

```typescript
<ProtectedRoute requiredPermissions={['USER_VIEW']}>
  <UserManagement />
</ProtectedRoute>
```

**Logic**:
1. Kiểm tra authentication
2. Kiểm tra permissions (nếu có)
3. Redirect đến `/login` nếu không đủ điều kiện

## API Integration

### Axios Instance

**File**: `src/services/api.ts`

**Tính năng**:
- Base URL configuration
- Request interceptors: Thêm JWT token
- Response interceptors: Error handling, 401 redirect
- Timeout configuration: 10 phút cho upload lớn

### Service Structure

Mỗi service export các functions:
- `getAll()`: Lấy danh sách
- `getById(id)`: Lấy chi tiết
- `create(data)`: Tạo mới
- `update(id, data)`: Cập nhật
- `delete(id)`: Xóa

### Error Handling

**Centralized Error Handler**: `src/utils/errorHandler.ts`

**Xử lý**:
- Parse error response
- Extract error messages
- Format cho UI display
- Log errors (development)

## Error Handling

### Strategy

1. **Service Layer**: Catch và format errors
2. **React Query**: Handle errors trong `onError`
3. **Components**: Display errors với toast notifications
4. **Global**: Error boundary (có thể thêm)

### Error Flow

```
API Error
  ↓
Axios Interceptor
  ↓
Error Handler Utility
  ↓
React Query onError
  ↓
Toast Notification
  ↓
User sees error message
```

## Performance

### Optimization Strategies

1. **Code Splitting**: React.lazy cho routes
2. **Memoization**: React.memo cho components
3. **Query Caching**: React Query cache
4. **Image Optimization**: Lazy loading images
5. **Bundle Size**: Tree shaking với Vite

### Best Practices

- Sử dụng `useMemo` cho expensive calculations
- Sử dụng `useCallback` cho event handlers
- Tránh unnecessary re-renders
- Optimize React Query queries với `staleTime` và `cacheTime`

## Security

### Authentication

- JWT tokens stored in localStorage (với Zustand persist)
- Token tự động thêm vào request headers
- Auto logout khi token expired (401 response)

### Authorization

- Permission-based UI rendering
- Protected routes với permission checks
- API calls validate permissions trên backend

### XSS Prevention

- React tự động escape HTML
- Không sử dụng `dangerouslySetInnerHTML` trừ khi cần thiết
- Validate và sanitize user input

## Testing Strategy (Future)

### Unit Tests
- Components với React Testing Library
- Services với Jest
- Utils với Jest

### Integration Tests
- API integration tests
- Route navigation tests

### E2E Tests
- Playwright hoặc Cypress
- Critical user flows

## Future Improvements

- [ ] Add Error Boundary component
- [ ] Implement code splitting với React.lazy
- [ ] Add unit tests
- [ ] Add E2E tests
- [ ] Implement dark mode
- [ ] Add i18n (internationalization)
- [ ] Optimize bundle size
- [ ] Add PWA support
