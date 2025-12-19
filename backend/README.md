# FileHub Backend API

Backend API được xây dựng với .NET 8.0, sử dụng Clean Architecture pattern.

## 📋 Mục lục

- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Tính năng](#tính-năng)
- [Yêu cầu](#yêu-cầu)
- [Cài đặt](#cài-đặt)
- [Tài khoản mặc định](#tài-khoản-mặc-định)
- [API Endpoints](#api-endpoints)
- [Docker](#docker)
- [Bảo mật](#bảo-mật)

## Cấu trúc dự án (Clean Architecture)

```
backend/
├── src/
│   ├── WebApp.Core/              # Domain layer
│   │   ├── Entities/             # Domain entities
│   │   └── Interfaces/           # Domain interfaces
│   ├── WebApp.Application/       # Application layer
│   │   ├── DTOs/                 # Data Transfer Objects
│   │   └── Interfaces/           # Application service interfaces
│   ├── WebApp.Infrastructure/    # Infrastructure layer
│   │   ├── Data/                 # DbContext, Repositories
│   │   ├── Services/             # Service implementations
│   │   └── Identity/             # Identity configuration
│   └── WebApp.API/               # Presentation layer
│       ├── Controllers/          # API Controllers
│       ├── Middleware/           # Custom middleware
│       └── appsettings.json      # Configuration
├── Dockerfile
└── docker-compose.yml
```

### Layers

- **WebApp.Core**: Domain layer
  - Entities (User, FileMetadata, Folder, Content, Permission, VideoConversionJob)
  - Domain interfaces (IRepository, IUnitOfWork)
  
- **WebApp.Application**: Application layer
  - Application service interfaces (IAuthService, IFileService, IContentService, etc.)
  - DTOs (Data Transfer Objects) cho tất cả các modules
  
- **WebApp.Infrastructure**: Infrastructure layer
  - Data access (ApplicationDbContext, DbInitializer)
  - Repository implementations (Repository, UnitOfWork)
  - Service implementations (AuthService, FileService, ContentService, etc.)
  - SignalR Hubs (VideoConversionHub)
  - Entity Framework Migrations
  
- **WebApp.API**: Presentation layer
  - Controllers (API endpoints)
  - Configuration (Program.cs, appsettings.json)
  - Middleware và Extensions

## Tính năng

- ✅ Authentication & Authorization với JWT
- ✅ File Management (Word, Excel, PDF, Video, Image, Audio)
- ✅ Folder Management (Cây thư mục)
- ✅ CMS Content Management
- ✅ User & Role Management
- ✅ Clean Architecture
- ✅ Entity Framework Core với SQL Server
- ✅ Swagger/OpenAPI documentation
- ✅ Role-based access control (Admin, User)
- ✅ Permission-based authorization
- ✅ Chunked File Upload
- ✅ TUS Protocol support
- ✅ Video Conversion
- ✅ File streaming (cho video/image)

## Yêu cầu

- .NET 8.0 SDK
- SQL Server hoặc SQL Server LocalDB
- Visual Studio 2022 hoặc VS Code

## Cài đặt

### 1. Restore packages

```bash
dotnet restore
```

### 2. Cập nhật connection string

Cập nhật connection string trong `src/WebApp.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=FileHubDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  }
}
```

### 3. Tạo database và chạy migrations

```bash
cd src/WebApp.API
dotnet ef migrations add InitialCreate
dotnet ef database update
```

Hoặc nếu đã có migrations, chỉ cần update database:

```bash
cd src/WebApp.API
dotnet ef database update
```

**Lưu ý**: Database sẽ được tạo tự động khi chạy ứng dụng lần đầu nếu chưa có migrations.

### 4. Chạy ứng dụng

```bash
cd src/WebApp.API
dotnet run
```

API sẽ chạy tại:
- HTTPS: `https://localhost:5001`
- HTTP: `http://localhost:5000`

Swagger UI: `https://localhost:5001/swagger`

## Tài khoản mặc định

Khi ứng dụng khởi động lần đầu, một tài khoản admin mặc định sẽ được tạo tự động:

- **Email**: `admin@webapp.com`
- **Password**: `Admin@123`
- **Role**: Admin

Bạn có thể thay đổi thông tin này trong file `src/WebApp.API/appsettings.json`:

```json
{
  "DefaultAdmin": {
    "Email": "admin@webapp.com",
    "Password": "Admin@123",
    "FirstName": "Admin",
    "LastName": "User"
  }
}
```

⚠️ **Lưu ý**: Hãy đổi mật khẩu mặc định sau lần đăng nhập đầu tiên!

## API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký user mới
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```

- `POST /api/auth/login` - Đăng nhập
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```

- `GET /api/auth/me` - Lấy thông tin user hiện tại (cần authentication)

### Files

- `POST /api/files/upload` - Upload file
  - FormData với fields: `file`, `description` (optional), `folderId` (optional)
  - Hỗ trợ chunked upload cho file lớn

- `GET /api/files?fileType=&folderId=` - Lấy danh sách files
  - Query params: `fileType` (optional), `folderId` (optional)

- `GET /api/files/{id}` - Lấy thông tin file

- `GET /api/files/{id}/download` - Download file

- `GET /api/files/{id}/stream` - Stream file (cho video/image preview)

- `POST /api/files/{id}/move` - Di chuyển file vào folder khác
  ```json
  {
    "folderId": "folder-id" // null để di chuyển về root
  }
  ```

- `DELETE /api/files/{id}` - Xóa file

### Folders

- `GET /api/folders/tree` - Lấy cây thư mục của user (hierarchical structure)

- `GET /api/folders?parentId=` - Lấy danh sách folder con
  - Query param: `parentId` (optional)

- `POST /api/folders` - Tạo folder mới
  ```json
  {
    "name": "Folder Name",
    "parentId": "parent-folder-id" // optional
  }
  ```

- `PUT /api/folders/{id}` - Cập nhật folder (đổi tên/di chuyển)
  ```json
  {
    "name": "New Folder Name",
    "parentId": "new-parent-id" // optional
  }
  ```

- `DELETE /api/folders/{id}` - Xóa folder (và tất cả files bên trong)

### Content

- `GET /api/content?contentType=&status=` - Lấy danh sách content
  - Query params: `contentType` (optional), `status` (optional)

- `GET /api/content/{id}` - Lấy chi tiết content

- `POST /api/content` - Tạo content mới
  ```json
  {
    "title": "Content Title",
    "description": "Description",
    "body": "<p>Content body</p>",
    "contentType": "Article",
    "status": "Draft",
    "fileIds": ["file-id-1", "file-id-2"]
  }
  ```

- `PUT /api/content/{id}` - Cập nhật content
  ```json
  {
    "title": "Updated Title",
    "description": "Updated Description",
    "body": "<p>Updated body</p>",
    "status": "Published",
    "fileIds": ["file-id-1"]
  }
  ```

- `DELETE /api/content/{id}` - Xóa content

### Users (Admin only)

- `GET /api/users` - Lấy danh sách users

- `GET /api/users/{id}` - Lấy thông tin user

- `POST /api/users` - Tạo user mới

- `PUT /api/users/{id}` - Cập nhật user

- `DELETE /api/users/{id}` - Xóa user

### Roles (Admin only)

- `GET /api/roles` - Lấy danh sách roles

- `GET /api/roles/{id}` - Lấy thông tin role

- `POST /api/roles` - Tạo role mới

- `PUT /api/roles/{id}` - Cập nhật role

- `DELETE /api/roles/{id}` - Xóa role

- `GET /api/permissions` - Lấy danh sách permissions

## Docker

Chạy với Docker Compose:

```bash
cd backend
docker-compose up -d
```

Hoặc build và chạy Docker image:

```bash
docker build -t filehub-backend .
docker run -p 5000:80 filehub-backend
```

## Bảo mật

- JWT token authentication với expiration
- Password hashing với ASP.NET Identity
- CORS configuration cho frontend
- File type validation
- File size limits (500MB)
- User-based file access control
- Role-based access control (RBAC)
- Permission-based authorization
- SQL injection protection (Entity Framework)
- XSS protection

## File Types được hỗ trợ

- **Documents**: PDF, Word (.doc, .docx), RTF, Plain text
- **Spreadsheets**: Excel (.xls, .xlsx), CSV
- **Videos**: MP4, MPEG, QuickTime, AVI, WMV, WebM
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Audio**: MP3, WAV, OGG, WebM

## Mở rộng

Dự án được thiết kế với Clean Architecture để dễ dàng mở rộng:

1. **Thêm entities mới**: Tạo trong `WebApp.Core/Entities`
2. **Thêm repositories**: Implement `IRepository<T>` trong `WebApp.Infrastructure/Data/Repositories`
3. **Thêm services**: Tạo interface trong `WebApp.Core/Interfaces` và implement trong `WebApp.Infrastructure/Services`
4. **Thêm controllers**: Tạo trong `WebApp.API/Controllers`
5. **Thêm DTOs**: Tạo trong `WebApp.Application/DTOs`

## License

MIT
