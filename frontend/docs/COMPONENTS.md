# Components Documentation

Tài liệu chi tiết về các components trong ứng dụng frontend.

## 📋 Mục lục

- [Layout Components](#layout-components)
- [Form Components](#form-components)
- [File Components](#file-components)
- [Content Components](#content-components)
- [UI Components](#ui-components)
- [Utility Components](#utility-components)

## Layout Components

### Layout

**File**: `src/components/Layout.tsx`

**Mô tả**: Layout chính của ứng dụng với sidebar navigation và header.

**Props**: Không có props (sử dụng `useOutlet()` từ React Router)

**Tính năng**:
- Sidebar navigation với menu items
- Responsive sidebar (mobile menu)
- User profile display
- Logout functionality
- Active route highlighting
- Permission-based menu items (chỉ hiển thị Users/Roles cho Admin)

**Sử dụng**:
```typescript
<Routes>
  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    {/* Child routes */}
  </Route>
</Routes>
```

**Menu Items**:
- Dashboard (`/dashboard`)
- Files (`/files`)
- Content (`/content`)
- Users (`/users`) - Admin only
- Roles & Permissions (`/roles`) - Admin only

---

### ProtectedRoute

**File**: `src/components/ProtectedRoute.tsx`

**Mô tả**: Component bảo vệ routes, yêu cầu authentication và optional permissions.

**Props**:
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[]
}
```

**Tính năng**:
- Kiểm tra authentication
- Kiểm tra permissions (nếu có)
- Redirect đến `/login` nếu chưa authenticated
- Hiển thị access denied nếu thiếu permissions

**Sử dụng**:
```typescript
// Basic protection
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// With permissions
<ProtectedRoute requiredPermissions={['USER_VIEW', 'USER_MANAGE']}>
  <UserManagement />
</ProtectedRoute>
```

---

## Form Components

### FormField

**File**: `src/components/FormField.tsx`

**Mô tả**: Wrapper component cho form inputs với label và error display.

**Props**:
```typescript
interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}
```

**Tính năng**:
- Label với required indicator
- Error message display
- Consistent styling

**Sử dụng**:
```typescript
<FormField label="Email" error={errors.email} required>
  <input type="email" {...register('email')} />
</FormField>
```

---

## File Components

### ImagePreview

**File**: `src/components/ImagePreview.tsx`

**Mô tả**: Component hiển thị preview ảnh với modal.

**Props**:
```typescript
interface ImagePreviewProps {
  src: string
  alt?: string
  className?: string
}
```

**Tính năng**:
- Thumbnail preview
- Click để mở modal full-size
- Close modal với ESC hoặc click outside

**Sử dụng**:
```typescript
<ImagePreview src={file.url} alt={file.fileName} />
```

---

### VideoPlayer

**File**: `src/components/VideoPlayer.tsx`

**Mô tả**: Video player component với controls.

**Props**:
```typescript
interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
}
```

**Tính năng**:
- HTML5 video player
- Custom controls
- Poster image support
- Responsive design

**Sử dụng**:
```typescript
<VideoPlayer src={file.url} poster={file.thumbnailUrl} />
```

---

### VideoConversionManager

**File**: `src/components/VideoConversionManager.tsx`

**Mô tả**: Component quản lý quá trình chuyển đổi video format.

**Props**:
```typescript
interface VideoConversionManagerProps {
  fileId: string
  onConversionComplete?: () => void
}
```

**Tính năng**:
- Hiển thị trạng thái conversion
- Progress tracking
- Start/stop conversion
- Real-time updates với SignalR

**Sử dụng**:
```typescript
<VideoConversionManager 
  fileId={file.id} 
  onConversionComplete={() => refetch()} 
/>
```

---

## Content Components

### ContentDetail

**File**: `src/components/ContentDetail.tsx`

**Mô tả**: Component hiển thị chi tiết content với formatting.

**Props**:
```typescript
interface ContentDetailProps {
  content: ContentResponse
  onEdit?: () => void
  onDelete?: () => void
}
```

**Tính năng**:
- Display content metadata
- Render HTML content
- Action buttons (Edit/Delete)
- Status badge

**Sử dụng**:
```typescript
<ContentDetail 
  content={content} 
  onEdit={() => navigate(`/content/${content.id}`)}
  onDelete={() => handleDelete(content.id)}
/>
```

---

## UI Components

### ConfirmDialog

**File**: `src/components/ConfirmDialog.tsx`

**Mô tả**: Reusable confirmation dialog component.

**Tính năng**:
- Context provider cho global access
- Customizable title và message
- Confirm và cancel actions
- Promise-based API

**Sử dụng**:
```typescript
import { useConfirm } from '../components/ConfirmDialog'

function MyComponent() {
  const confirm = useConfirm()
  
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete File',
      message: 'Are you sure you want to delete this file?'
    })
    
    if (confirmed) {
      // Delete logic
    }
  }
}
```

**API**:
```typescript
interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

const confirmed = await confirm(options)
```

---

## Utility Components

### Loading Spinner

**Mô tả**: Loading indicator (có thể tạo component riêng hoặc sử dụng từ thư viện).

**Sử dụng**:
```typescript
{isLoading && <LoadingSpinner />}
```

---

### Error Message

**Mô tả**: Error display component (có thể tạo component riêng).

**Sử dụng**:
```typescript
{error && <ErrorMessage message={error.message} />}
```

---

## Component Best Practices

### 1. Props Interface

Luôn định nghĩa TypeScript interface cho props:

```typescript
interface MyComponentProps {
  title: string
  optional?: boolean
  children?: React.ReactNode
}

export default function MyComponent({ title, optional, children }: MyComponentProps) {
  // ...
}
```

### 2. Default Props

Sử dụng default parameters:

```typescript
function MyComponent({ 
  title, 
  size = 'medium',
  variant = 'primary' 
}: MyComponentProps) {
  // ...
}
```

### 3. Conditional Rendering

Sử dụng early returns cho conditional rendering:

```typescript
if (!data) return <LoadingSpinner />
if (error) return <ErrorMessage error={error} />
return <DataDisplay data={data} />
```

### 4. Memoization

Sử dụng `React.memo` cho components không cần re-render:

```typescript
export default React.memo(function ExpensiveComponent({ data }) {
  // ...
})
```

### 5. Custom Hooks

Tách logic thành custom hooks:

```typescript
function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  // ... logic
  return { uploading, upload }
}

function FileUploadComponent() {
  const { uploading, upload } = useFileUpload()
  // ...
}
```

## Component Structure Template

```typescript
import { useState } from 'react'
import { SomeIcon } from 'lucide-react'

interface ComponentNameProps {
  // Define props
}

export default function ComponentName({ 
  // Destructure props
}: ComponentNameProps) {
  // State
  const [state, setState] = useState()
  
  // Effects
  useEffect(() => {
    // ...
  }, [])
  
  // Handlers
  const handleAction = () => {
    // ...
  }
  
  // Render
  return (
    <div className="...">
      {/* JSX */}
    </div>
  )
}
```

## Styling Guidelines

### Tailwind CSS Classes

- Sử dụng utility classes từ Tailwind
- Tạo custom classes trong `index.css` nếu cần reuse
- Responsive: `sm:`, `md:`, `lg:`, `xl:`

### Class Organization

```typescript
className={`
  base-classes
  conditional-classes
  responsive-classes
`.trim()}
```

### Example

```typescript
<button
  className={`
    px-4 py-2 rounded-lg
    ${isActive ? 'bg-blue-500' : 'bg-gray-200'}
    hover:bg-blue-600
    transition-colors
  `}
>
  Click me
</button>
```

## Accessibility

### ARIA Labels

```typescript
<button aria-label="Close dialog">
  <X />
</button>
```

### Keyboard Navigation

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    onClose()
  }
}
```

### Focus Management

```typescript
const inputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  inputRef.current?.focus()
}, [])
```

## Testing Components (Future)

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

test('renders component', () => {
  render(<MyComponent title="Test" />)
  expect(screen.getByText('Test')).toBeInTheDocument()
})
```

### Integration Tests

```typescript
test('handles user interaction', async () => {
  const handleClick = jest.fn()
  render(<MyComponent onClick={handleClick} />)
  
  fireEvent.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalled()
})
```
