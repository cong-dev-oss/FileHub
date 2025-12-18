# API Integration Documentation

Tài liệu chi tiết về cách tích hợp với Backend API trong ứng dụng frontend.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Axios Instance](#axios-instance)
- [API Response Format](#api-response-format)
- [Services](#services)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Request Interceptors](#request-interceptors)
- [Response Interceptors](#response-interceptors)

## Tổng quan

Frontend sử dụng **Axios** làm HTTP client để giao tiếp với Backend API. Tất cả API calls được tập trung trong thư mục `src/services/`.

### Base URL Configuration

API base URL được cấu hình trong `src/services/api.ts`:

```typescript
// Development: Sử dụng proxy từ Vite
baseURL: '/api'  // Proxy đến http://localhost:5000/api

// Production: Có thể cấu hình qua environment variable
VITE_API_URL=https://api.yourdomain.com/api
```

### Proxy Configuration

Vite proxy được cấu hình trong `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
    secure: false,
    timeout: 300000, // 5 minutes
  }
}
```

## Axios Instance

**File**: `src/services/api.ts`

### Configuration

```typescript
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 600000, // 10 minutes for large file uploads
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
})
```

### Base URL Logic

```typescript
const getBaseURL = () => {
  // 1. Check environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // 2. Development: Use proxy
  if (import.meta.env.DEV) {
    return '/api'
  }
  
  // 3. Production: Use relative path
  return '/api'
}
```

## API Response Format

### Standard Response Structure

Backend API trả về response theo format:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}
```

### Response Extraction

**File**: `src/services/apiResponse.ts`

```typescript
export function extractData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  if (response.data.success && response.data.data !== undefined) {
    return response.data.data
  }
  throw new Error(response.data.message || 'API request failed')
}
```

**Sử dụng**:
```typescript
const response = await api.get<ApiResponse<FileResponse[]>>('/files')
const files = extractData(response) // Returns FileResponse[]
```

## Services

### Service Structure

Mỗi service export một object với các methods:

```typescript
export const serviceName = {
  getAll: async (): Promise<Type[]> => { ... },
  getById: async (id: string): Promise<Type> => { ... },
  create: async (data: CreateDto): Promise<Type> => { ... },
  update: async (id: string, data: UpdateDto): Promise<Type> => { ... },
  delete: async (id: string): Promise<void> => { ... },
}
```

### Available Services

#### 1. Auth Service

**File**: `src/services/authService.ts`

**Methods**:
```typescript
authService.login(data: LoginDto): Promise<AuthResponse>
authService.register(data: RegisterDto): Promise<AuthResponse>
authService.getCurrentUser(): Promise<User>
```

**Types**:
```typescript
interface LoginDto {
  email: string
  password: string
}

interface RegisterDto {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

interface AuthResponse {
  token: string
  refreshToken: string
  expiresAt: string
  user: User
  roles: string[]
  permissions: string[]
}
```

**Sử dụng**:
```typescript
import { authService } from '../services/authService'

const handleLogin = async () => {
  try {
    const response = await authService.login({
      email: 'user@example.com',
      password: 'password'
    })
    // Handle success
  } catch (error) {
    // Handle error
  }
}
```

#### 2. File Service

**File**: `src/services/fileService.ts`

**Methods**:
```typescript
fileService.upload(
  file: File,
  description?: string,
  folderId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileResponse>

fileService.getAll(fileType?: string, folderId?: string): Promise<FileResponse[]>
fileService.getById(id: string): Promise<FileResponse>
fileService.download(id: string): Promise<Blob>
fileService.delete(id: string): Promise<void>
fileService.move(id: string, folderId?: string): Promise<void>
fileService.getStreamUrl(id: string): string
```

**Types**:
```typescript
interface FileResponse {
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

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // bytes per second
  timeRemaining: number // seconds
}
```

**Upload Strategy**:
- Files < 50MB: Direct upload (faster)
- Files >= 50MB: Chunked upload (more reliable)

**Sử dụng**:
```typescript
import { fileService } from '../services/fileService'

// Upload với progress tracking
const handleUpload = async (file: File) => {
  try {
    const result = await fileService.upload(
      file,
      'File description',
      undefined,
      (progress) => {
        console.log(`Upload: ${progress.percentage}%`)
      }
    )
    console.log('Upload complete:', result)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

// Get all files
const files = await fileService.getAll('Video')

// Download file
const blob = await fileService.download(fileId)
const url = URL.createObjectURL(blob)
// Use URL for download
```

#### 3. Content Service

**File**: `src/services/contentService.ts`

**Methods**:
```typescript
contentService.getAll(contentType?: string, status?: string): Promise<ContentDto[]>
contentService.getById(id: string): Promise<ContentDto>
contentService.create(data: CreateContentDto): Promise<ContentDto>
contentService.update(id: string, data: UpdateContentDto): Promise<ContentDto>
contentService.delete(id: string): Promise<void>
```

**Types**:
```typescript
interface ContentDto {
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

interface CreateContentDto {
  title: string
  description?: string
  body: string
  contentType: string
  status?: string
  fileIds?: string[]
}
```

**Sử dụng**:
```typescript
import { contentService } from '../services/contentService'

// Create content
const content = await contentService.create({
  title: 'New Post',
  body: '<p>Content</p>',
  contentType: 'Article',
  status: 'Draft'
})

// Get all published content
const published = await contentService.getAll(undefined, 'Published')
```

#### 4. User Service

**File**: `src/services/userService.ts`

**Methods**:
```typescript
userService.getAll(): Promise<UserDto[]>
userService.getById(id: string): Promise<UserDto>
userService.create(data: CreateUserDto): Promise<UserDto>
userService.update(id: string, data: UpdateUserDto): Promise<UserDto>
userService.delete(id: string): Promise<void>
```

#### 5. Role Service

**File**: `src/services/roleService.ts`

**Methods**:
```typescript
roleService.getAll(): Promise<RoleDto[]>
roleService.getById(id: string): Promise<RoleDto>
roleService.create(data: CreateRoleDto): Promise<RoleDto>
roleService.update(id: string, data: UpdateRoleDto): Promise<RoleDto>
roleService.delete(id: string): Promise<void>
```

#### 6. Folder Service

**File**: `src/services/folderService.ts`

**Methods**:
```typescript
folderService.getAll(): Promise<FolderDto[]>
folderService.getById(id: string): Promise<FolderDto>
folderService.create(data: CreateFolderDto): Promise<FolderDto>
folderService.update(id: string, data: UpdateFolderDto): Promise<FolderDto>
folderService.delete(id: string): Promise<void>
```

#### 7. Video Conversion Service

**File**: `src/services/videoConversionService.ts`

**Methods**:
```typescript
videoConversionService.startConversion(fileId: string): Promise<ConversionJob>
videoConversionService.getStatus(jobId: string): Promise<ConversionStatus>
videoConversionService.cancel(jobId: string): Promise<void>
```

#### 8. Chunked File Service

**File**: `src/services/chunkedFileService.ts`

**Mô tả**: Service xử lý upload file lớn bằng cách chia nhỏ thành chunks.

**Methods**:
```typescript
uploadChunked(options: ChunkedUploadOptions): Promise<FileResponse>
```

#### 9. TUS Upload Service

**File**: `src/services/tusUploadService.ts`

**Mô tả**: Service sử dụng TUS protocol cho resumable uploads.

**Methods**:
```typescript
tusUploadService.upload(options: TusUploadOptions): Promise<FileResponse>
```

#### 10. SignalR Service

**File**: `src/services/signalRService.ts`

**Mô tả**: Service cho real-time communication.

**Methods**:
```typescript
signalRService.connect(): Promise<void>
signalRService.disconnect(): void
signalRService.on(event: string, callback: Function): void
```

## Authentication

### Token Management

JWT token được tự động thêm vào request headers thông qua request interceptor:

```typescript
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### Auto Logout

Khi nhận được 401 response, ứng dụng tự động logout:

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

## Error Handling

### Error Handler Utility

**File**: `src/utils/errorHandler.ts`

**Function**:
```typescript
export function extractAllErrorMessages(error: unknown): string[]
```

**Sử dụng**:
```typescript
import { extractAllErrorMessages } from '../utils/errorHandler'

try {
  await fileService.upload(file)
} catch (error) {
  const messages = extractAllErrorMessages(error)
  messages.forEach(msg => toast.error(msg))
}
```

### Error Types

```typescript
// Axios Error
if (axios.isAxiosError(error)) {
  // Handle API error
}

// Network Error
if (!error.response) {
  // Handle network error
}

// Validation Error
if (error.response?.status === 400) {
  // Handle validation error
}
```

## Request Interceptors

### Token Injection

```typescript
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### Content-Type Handling

```typescript
// FormData: Let axios set Content-Type with boundary
if (config.data instanceof FormData) {
  delete config.headers['Content-Type']
}
// JSON: Set Content-Type
else if (!config.headers['Content-Type']) {
  config.headers['Content-Type'] = 'application/json'
}
```

## Response Interceptors

### Success Logging

```typescript
api.interceptors.response.use((response) => {
  if (import.meta.env.DEV) {
    console.log(`API ${response.config.method} ${response.config.url}:`, response.data)
  }
  return response
})
```

### Error Logging

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })
    return Promise.reject(error)
  }
)
```

## React Query Integration

### Query Example

```typescript
import { useQuery } from '@tanstack/react-query'
import { fileService } from '../services/fileService'

function FilesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['files'],
    queryFn: () => fileService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  if (isLoading) return <Loading />
  if (error) return <Error error={error} />
  return <FileList files={data} />
}
```

### Mutation Example

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fileService } from '../services/fileService'

function DeleteFileButton({ fileId }: { fileId: string }) {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: () => fileService.delete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries(['files'])
      toast.success('File deleted')
    },
    onError: (error) => {
      const messages = extractAllErrorMessages(error)
      messages.forEach(msg => toast.error(msg))
    }
  })
  
  return (
    <button onClick={() => mutation.mutate()}>
      Delete
    </button>
  )
}
```

## Best Practices

### 1. Always Use Services

❌ **Bad**:
```typescript
const response = await axios.get('/api/files')
```

✅ **Good**:
```typescript
const files = await fileService.getAll()
```

### 2. Handle Errors Properly

❌ **Bad**:
```typescript
try {
  await fileService.upload(file)
} catch (error) {
  console.error(error)
}
```

✅ **Good**:
```typescript
try {
  await fileService.upload(file)
  toast.success('Upload successful')
} catch (error) {
  const messages = extractAllErrorMessages(error)
  messages.forEach(msg => toast.error(msg))
}
```

### 3. Use React Query for Data Fetching

❌ **Bad**:
```typescript
const [files, setFiles] = useState([])
useEffect(() => {
  fileService.getAll().then(setFiles)
}, [])
```

✅ **Good**:
```typescript
const { data: files } = useQuery({
  queryKey: ['files'],
  queryFn: () => fileService.getAll()
})
```

### 4. Type Safety

✅ **Always type API responses**:
```typescript
const response = await api.get<ApiResponse<FileResponse[]>>('/files')
const files = extractData(response) // Type: FileResponse[]
```

## Testing API Calls (Future)

### Mock Services

```typescript
// __mocks__/fileService.ts
export const fileService = {
  getAll: jest.fn(),
  upload: jest.fn(),
  // ...
}
```

### Test Example

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { fileService } from '../services/fileService'

test('fetches files', async () => {
  const mockFiles = [{ id: '1', fileName: 'test.pdf' }]
  fileService.getAll.mockResolvedValue(mockFiles)
  
  const { result } = renderHook(() =>
    useQuery({
      queryKey: ['files'],
      queryFn: () => fileService.getAll()
    })
  )
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual(mockFiles)
})
```
