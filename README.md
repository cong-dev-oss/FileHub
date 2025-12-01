# WebApp - CMS Web Application

Ứng dụng CMS web hiện đại được xây dựng với .NET 8 và React 18, có cấu trúc bảo mật và dễ mở rộng.

## 🚀 Tính năng

### Backend (.NET 8)
- ✅ Clean Architecture pattern
- ✅ JWT Authentication & Authorization
- ✅ Entity Framework Core với SQL Server
- ✅ File Management (Word, Excel, Video, Image, Audio)
- ✅ CMS Content Management
- ✅ RESTful API với Swagger documentation
- ✅ CORS configuration
- ✅ Unit of Work pattern
- ✅ Repository pattern

### Frontend (React 18)
- ✅ TypeScript
- ✅ Vite build tool
- ✅ React Router
- ✅ React Query cho data fetching
- ✅ Zustand cho state management
- ✅ Tailwind CSS
- ✅ Responsive design
- ✅ File upload/download UI
- ✅ Content editor

## 📁 Cấu trúc dự án

```
webapp/
├── backend/                 # .NET Backend
│   ├── src/
│   │   ├── WebApp.API/      # API layer
│   │   ├── WebApp.Core/     # Domain layer
│   │   └── WebApp.Infrastructure/  # Data layer
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── frontend/                # React Frontend
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── pages/          # Page components
    │   ├── services/       # API services
    │   └── store/          # State management
    └── package.json
```

## 🛠️ Cài đặt

### Backend

1. Đảm bảo đã cài .NET 8 SDK
2. Cập nhật connection string trong `backend/src/WebApp.API/appsettings.json`
3. Chạy migrations (nếu có):
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

2. Chạy development server:
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
- `POST /api/files/upload` - Upload file
- `GET /api/files` - Lấy danh sách files (có thể filter theo fileType)
- `GET /api/files/{id}` - Lấy thông tin file
- `GET /api/files/{id}/download` - Download file
- `DELETE /api/files/{id}` - Xóa file

### Content
- `GET /api/content` - Lấy danh sách content (có thể filter theo contentType, status)
- `GET /api/content/{id}` - Lấy chi tiết content
- `POST /api/content` - Tạo content mới
- `PUT /api/content/{id}` - Cập nhật content
- `DELETE /api/content/{id}` - Xóa content

## 🔒 Bảo mật

- JWT token authentication
- Password hashing với ASP.NET Identity
- CORS configuration
- File type validation
- File size limits (500MB)
- User-based file access control

## 📦 File Types được hỗ trợ

- **Documents**: PDF, Word (.doc, .docx), RTF, Plain text
- **Spreadsheets**: Excel (.xls, .xlsx), CSV
- **Videos**: MP4, MPEG, QuickTime, AVI, WMV, WebM
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Audio**: MP3, WAV, OGG, WebM

## 🎯 Mở rộng

Dự án được thiết kế với Clean Architecture để dễ dàng mở rộng:

1. **Thêm entities mới**: Tạo trong `WebApp.Core/Entities`
2. **Thêm repositories**: Implement `IRepository<T>` trong `WebApp.Infrastructure`
3. **Thêm services**: Tạo interface trong `WebApp.Core/Interfaces` và implement trong `WebApp.Infrastructure/Services`
4. **Thêm controllers**: Tạo trong `WebApp.API/Controllers`

## 📄 License

MIT

