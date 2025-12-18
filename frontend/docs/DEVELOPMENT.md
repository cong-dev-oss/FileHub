# Development Guide

Hướng dẫn phát triển và đóng góp cho dự án frontend.

## 📋 Mục lục

- [Setup Development Environment](#setup-development-environment)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Adding New Features](#adding-new-features)
- [Component Development](#component-development)
- [Service Development](#service-development)
- [State Management](#state-management)
- [Testing](#testing)
- [Debugging](#debugging)
- [Git Workflow](#git-workflow)

## Setup Development Environment

### Prerequisites

- Node.js 18+ và npm 9+
- Git
- Code editor (VS Code recommended)
- Backend API đang chạy tại `http://localhost:5000`

### Initial Setup

1. **Clone repository**
```bash
git clone <repository-url>
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env
# Edit .env với các giá trị phù hợp
```

4. **Start development server**
```bash
npm run dev
```

5. **Verify setup**
- Mở browser tại `http://localhost:3000`
- Kiểm tra console không có errors
- Test login với credentials mặc định

### VS Code Extensions (Recommended)

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Tailwind CSS IntelliSense**: Tailwind autocomplete
- **React Snippets**: React code snippets

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx
│   ├── ProtectedRoute.tsx
│   └── ...
├── pages/              # Page components (routes)
│   ├── Dashboard.tsx
│   ├── Files.tsx
│   └── ...
├── services/           # API service layer
│   ├── api.ts
│   ├── fileService.ts
│   └── ...
├── store/             # State management
│   └── authStore.ts
├── utils/             # Utility functions
│   └── errorHandler.ts
├── App.tsx            # Main app với routing
└── main.tsx           # Entry point
```

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Files**: PascalCase cho components, camelCase cho utilities (`userService.ts`)
- **Variables/Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`UserDto`, `ApiResponse`)

## Coding Standards

### TypeScript

#### Type Definitions

✅ **Always define types**:
```typescript
interface User {
  id: string
  email: string
  name: string
}

function getUser(id: string): Promise<User> {
  // ...
}
```

#### Avoid `any`

❌ **Bad**:
```typescript
function processData(data: any) {
  // ...
}
```

✅ **Good**:
```typescript
function processData(data: UserDto | FileDto) {
  // ...
}
```

#### Use Type Inference When Appropriate

✅ **Good**:
```typescript
const users = ['user1', 'user2'] // Type: string[]
const count = 42 // Type: number
```

### React

#### Functional Components

✅ **Always use functional components**:
```typescript
export default function MyComponent() {
  return <div>Hello</div>
}
```

#### Hooks

✅ **Use hooks properly**:
```typescript
function MyComponent() {
  const [state, setState] = useState<string>('')
  const { data } = useQuery(['key'], fetchData)
  
  useEffect(() => {
    // Side effects
  }, [dependencies])
}
```

#### Props Interface

✅ **Always define props interface**:
```typescript
interface MyComponentProps {
  title: string
  optional?: boolean
}

export default function MyComponent({ title, optional }: MyComponentProps) {
  // ...
}
```

### Code Style

#### Formatting

- Use 2 spaces for indentation
- Use single quotes for strings (configurable)
- Use semicolons (configurable)
- Max line length: 100 characters

#### ESLint Rules

Project sử dụng ESLint với các rules:
- React Hooks rules
- TypeScript rules
- Import ordering

Run linting:
```bash
npm run lint
```

## Adding New Features

### 1. Create Feature Branch

```bash
git checkout -b feature/new-feature
```

### 2. Plan the Feature

- Xác định components cần thiết
- Xác định services/APIs cần thiết
- Xác định state management
- Xác định routing

### 3. Implement

#### Add Service (if needed)

```typescript
// src/services/newService.ts
import api from './api'
import { extractData, ApiResponse } from './apiResponse'

export interface NewDto {
  // Define types
}

export const newService = {
  getAll: async (): Promise<NewDto[]> => {
    const response = await api.get<ApiResponse<NewDto[]>>('/new')
    return extractData(response)
  },
  // Add other methods
}
```

#### Add Component

```typescript
// src/components/NewComponent.tsx
interface NewComponentProps {
  // Props
}

export default function NewComponent({ ... }: NewComponentProps) {
  // Implementation
}
```

#### Add Page (if needed)

```typescript
// src/pages/NewPage.tsx
export default function NewPage() {
  // Implementation
}
```

#### Add Route

```typescript
// src/App.tsx
import NewPage from './pages/NewPage'

<Route path="new" element={<NewPage />} />
```

### 4. Test

- Test manually trong browser
- Kiểm tra TypeScript errors
- Kiểm tra ESLint warnings
- Test các edge cases

### 5. Commit

```bash
git add .
git commit -m "feat: add new feature"
```

## Component Development

### Component Structure

```typescript
import { useState, useEffect } from 'react'
import { SomeIcon } from 'lucide-react'

interface ComponentProps {
  // Props definition
}

export default function Component({ ... }: ComponentProps) {
  // 1. State
  const [state, setState] = useState()
  
  // 2. Hooks (useQuery, useMutation, etc.)
  const { data } = useQuery(...)
  
  // 3. Effects
  useEffect(() => {
    // Side effects
  }, [dependencies])
  
  // 4. Handlers
  const handleAction = () => {
    // Handler logic
  }
  
  // 5. Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Best Practices

#### 1. Keep Components Small

❌ **Bad**: Component quá lớn (> 300 lines)

✅ **Good**: Tách thành nhiều components nhỏ

#### 2. Single Responsibility

Mỗi component chỉ làm một việc cụ thể.

#### 3. Props Drilling

Tránh props drilling quá sâu. Sử dụng Context hoặc state management nếu cần.

#### 4. Conditional Rendering

✅ **Use early returns**:
```typescript
if (isLoading) return <Loading />
if (error) return <Error error={error} />
return <Content data={data} />
```

#### 5. Memoization

Sử dụng `React.memo` cho expensive components:
```typescript
export default React.memo(function ExpensiveComponent({ data }) {
  // ...
})
```

## Service Development

### Service Template

```typescript
import api from './api'
import { extractData, ApiResponse } from './apiResponse'

export interface EntityDto {
  id: string
  // Fields
}

export interface CreateEntityDto {
  // Fields
}

export interface UpdateEntityDto {
  // Fields
}

export const entityService = {
  getAll: async (params?: Record<string, string>): Promise<EntityDto[]> => {
    const response = await api.get<ApiResponse<EntityDto[]>>('/entities', { params })
    return extractData(response)
  },
  
  getById: async (id: string): Promise<EntityDto> => {
    const response = await api.get<ApiResponse<EntityDto>>(`/entities/${id}`)
    return extractData(response)
  },
  
  create: async (data: CreateEntityDto): Promise<EntityDto> => {
    const response = await api.post<ApiResponse<EntityDto>>('/entities', data)
    return extractData(response)
  },
  
  update: async (id: string, data: UpdateEntityDto): Promise<EntityDto> => {
    const response = await api.put<ApiResponse<EntityDto>>(`/entities/${id}`, data)
    return extractData(response)
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/entities/${id}`)
  },
}
```

### Error Handling

Luôn handle errors trong services:

```typescript
try {
  const result = await entityService.create(data)
  toast.success('Created successfully')
} catch (error) {
  const messages = extractAllErrorMessages(error)
  messages.forEach(msg => toast.error(msg))
}
```

## State Management

### Global State (Zustand)

**Khi nào sử dụng**:
- Authentication state
- User preferences
- Global UI state

**Ví dụ**:
```typescript
// src/store/myStore.ts
import { create } from 'zustand'

interface MyState {
  value: string
  setValue: (value: string) => void
}

export const useMyStore = create<MyState>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
}))
```

### Server State (React Query)

**Khi nào sử dụng**:
- API data
- Caching
- Synchronization

**Ví dụ**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['entities'],
  queryFn: () => entityService.getAll(),
  staleTime: 5 * 60 * 1000,
})
```

### Local State (useState)

**Khi nào sử dụng**:
- Component-specific state
- Form state
- UI state (modals, dropdowns)

## Testing

### Manual Testing Checklist

- [ ] Component renders correctly
- [ ] User interactions work
- [ ] API calls succeed
- [ ] Error handling works
- [ ] Loading states display
- [ ] Responsive design works
- [ ] Accessibility (keyboard navigation, screen readers)

### TypeScript Checking

```bash
npm run build
# Hoặc
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

## Debugging

### Browser DevTools

- **React DevTools**: Inspect component tree và props
- **Network Tab**: Inspect API calls
- **Console**: View logs và errors
- **Application Tab**: Inspect localStorage, sessionStorage

### VS Code Debugging

Tạo `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend"
    }
  ]
}
```

### Console Logging

```typescript
// Development only
if (import.meta.env.DEV) {
  console.log('Debug info:', data)
}
```

### React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <>
      {/* App */}
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </>
  )
}
```

## Git Workflow

### Branch Naming

- `feature/feature-name`: New features
- `fix/bug-description`: Bug fixes
- `refactor/refactor-description`: Refactoring
- `docs/documentation-update`: Documentation

### Commit Messages

Format: `type: description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Build process, dependencies

Examples:
```
feat: add file upload progress indicator
fix: resolve authentication token expiration issue
docs: update API documentation
refactor: extract file upload logic to custom hook
```

### Pull Request Process

1. Create feature branch
2. Make changes
3. Commit với clear messages
4. Push to remote
5. Create Pull Request
6. Address review comments
7. Merge after approval

### Code Review Checklist

- [ ] Code follows style guide
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Components are reusable
- [ ] Error handling is proper
- [ ] No console.logs in production code
- [ ] Documentation is updated

## Common Issues & Solutions

### Issue: API calls fail

**Solution**:
- Kiểm tra backend đang chạy
- Kiểm tra CORS configuration
- Kiểm tra proxy configuration
- Kiểm tra network tab trong DevTools

### Issue: TypeScript errors

**Solution**:
- Kiểm tra type definitions
- Sử dụng type assertions nếu cần
- Kiểm tra `tsconfig.json` settings

### Issue: Build fails

**Solution**:
- Xóa `node_modules` và `package-lock.json`
- Chạy `npm install` lại
- Kiểm tra TypeScript errors
- Kiểm tra import paths

### Issue: Styling not working

**Solution**:
- Kiểm tra Tailwind classes
- Kiểm tra `tailwind.config.js`
- Kiểm tra `index.css` imports
- Restart dev server

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
