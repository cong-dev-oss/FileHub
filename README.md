# FileHub - File Management & CMS System

Hệ thống quản lý file và CMS hiện đại được xây dựng với .NET 8 và React 18, có cấu trúc bảo mật và dễ mở rộng.

## 🚀 Tính năng

### Backend (.NET 8)
- ✅ Clean Architecture pattern
- ✅ JWT Authentication & Authorization
- ✅ Entity Framework Core với SQL Server
- ✅ File Management (Word, Excel, PDF, Video, Image, Audio)
- ✅ Folder Management (Cây thư mục)
- ✅ CMS Content Management
- ✅ User & Role Management
- ✅ RESTful API với Swagger documentation
- ✅ CORS configuration
- ✅ Unit of Work pattern
- ✅ Repository pattern
- ✅ Chunked File Upload
- ✅ TUS Protocol support
- ✅ Video Conversion

### Frontend (React 18)
- ✅ TypeScript
- ✅ Vite build tool
- ✅ React Router
- ✅ React Query cho data fetching
- ✅ Zustand cho state management
- ✅ **Ant Design (antd)** - UI Component Library
- ✅ Tailwind CSS
- ✅ Responsive design
- ✅ File upload/download UI với progress tracking
- ✅ Content editor
- ✅ Folder tree navigation
- ✅ Video/Image preview
- ✅ Real-time notifications

## 📁 Cấu trúc dự án

```
FileHub/
├── backend/                 # .NET Backend
│   ├── src/
│   │   ├── WebApp.API/      # API layer
│   │   ├── WebApp.Core/     # Domain layer
│   │   ├── WebApp.Application/  # Application layer
│   │   └── WebApp.Infrastructure/  # Data layer
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── frontend/                # React Frontend
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── pages/          # Page components
    │   ├── services/       # API services
    │   ├── store/          # State management
    │   ├── hooks/          # Custom hooks
    │   ├── types/          # TypeScript types
    │   ├── constants/      # Constants
    │   ├── config/         # Configuration
    │   ├── routes/         # Route configuration
    │   └── utils/          # Utility functions
    ├── docs/               # Documentation
    └── package.json
```

## 🛠️ Cài đặt

### Backend

1. Đảm bảo đã cài .NET 8 SDK
2. Cập nhật connection string trong `backend/src/WebApp.API/appsettings.json`
3. Chạy migrations:
```bash
cd backend/src/WebApp.API
dotnet ef migrations add InitialCreate
dotnet ef database update
```
Hoặc database sẽ được tạo tự động khi chạy ứng dụng lần đầu.

4. Chạy API:
```bash
dotnet run
```

API sẽ chạy tại: `https://localhost:5001` hoặc `http://localhost:5000`
Swagger UI: `https://localhost:5001/swagger`

### 🔑 Tài khoản mặc định

Khi ứng dụng khởi động lần đầu, một tài khoản admin mặc định sẽ được tạo tự động:

- **Email**: `admin@webapp.com`
- **Password**: `Admin@123`
- **Role**: Admin

⚠️ **Lưu ý**: Hãy đổi mật khẩu mặc định sau lần đăng nhập đầu tiên!

Bạn có thể thay đổi thông tin này trong `backend/src/WebApp.API/appsettings.json`.

### Frontend

1. Cài đặt dependencies:
```bash
cd frontend
npm install
```

2. Cấu hình môi trường (tùy chọn):
Tạo file `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_ENV=development
```

3. Chạy development server:
```bash
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:3000`

## 🐳 Docker

Chạy toàn bộ ứng dụng với Docker Compose:

```bash
cd backend
docker-compose up -d
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Files
- `POST /api/files/upload` - Upload file (có thể chỉ định folderId)
- `GET /api/files?fileType=&folderId=` - Lấy danh sách files
- `GET /api/files/{id}` - Lấy thông tin file
- `GET /api/files/{id}/download` - Download file
- `GET /api/files/{id}/stream` - Stream file (cho video/image)
- `POST /api/files/{id}/move` - Di chuyển file vào folder
- `DELETE /api/files/{id}` - Xóa file

### Folders
- `GET /api/folders/tree` - Lấy cây thư mục của user
- `GET /api/folders?parentId=` - Lấy danh sách folder con
- `POST /api/folders` - Tạo folder mới
- `PUT /api/folders/{id}` - Cập nhật folder
- `DELETE /api/folders/{id}` - Xóa folder

### Content
- `GET /api/content?contentType=&status=` - Lấy danh sách content
- `GET /api/content/{id}` - Lấy chi tiết content
- `POST /api/content` - Tạo content mới
- `PUT /api/content/{id}` - Cập nhật content
- `DELETE /api/content/{id}` - Xóa content

### Users & Roles
- `GET /api/users` - Lấy danh sách users
- `POST /api/users` - Tạo user mới
- `PUT /api/users/{id}` - Cập nhật user
- `DELETE /api/users/{id}` - Xóa user
- `GET /api/roles` - Lấy danh sách roles
- `POST /api/roles` - Tạo role mới
- `PUT /api/roles/{id}` - Cập nhật role
- `DELETE /api/roles/{id}` - Xóa role

## 🔒 Bảo mật

- JWT token authentication
- Password hashing với ASP.NET Identity
- CORS configuration
- File type validation
- File size limits (500MB)
- User-based file access control
- Role-based access control (RBAC)
- Permission-based authorization

## 📦 File Types được hỗ trợ

- **Documents**: PDF, Word (.doc, .docx), RTF, Plain text
- **Spreadsheets**: Excel (.xls, .xlsx), CSV
- **Videos**: MP4, MPEG, QuickTime, AVI, WMV, WebM
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Audio**: MP3, WAV, OGG, WebM

## 🎨 UI/UX

Frontend sử dụng **Ant Design (antd)** - một UI component library hiện đại và đẹp mắt:
- Component library đầy đủ và nhất quán
- Responsive design
- Dark/Light theme support
- Accessibility (a11y) compliant
- Internationalization (i18n) ready

## 🎯 Mở rộng

Dự án được thiết kế với Clean Architecture để dễ dàng mở rộng:

1. **Thêm entities mới**: Tạo trong `WebApp.Core/Entities`
2. **Thêm repositories**: Implement `IRepository<T>` trong `WebApp.Infrastructure`
3. **Thêm services**: Tạo interface trong `WebApp.Core/Interfaces` và implement trong `WebApp.Infrastructure/Services`
4. **Thêm controllers**: Tạo trong `WebApp.API/Controllers`
5. **Thêm frontend pages**: Tạo trong `frontend/src/pages/`
6. **Thêm services**: Tạo trong `frontend/src/services/`

## 📚 Tài liệu

- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)
- [Frontend Architecture](./frontend/docs/ARCHITECTURE.md)
- [Frontend Components](./frontend/docs/COMPONENTS.md)
- [API Documentation](./frontend/docs/API.md)
- [Development Guide](./frontend/docs/DEVELOPMENT.md)
- [Deployment Guide](./frontend/docs/DEPLOYMENT.md)

## 🤝 Đóng góp

Xem [CONTRIBUTING.md](./frontend/docs/CONTRIBUTING.md) để biết hướng dẫn đóng góp.

## 📄 License

MIT

## 👥 Authors

Development Team
