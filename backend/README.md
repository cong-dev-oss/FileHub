# WebApp Backend API

Backend API được xây dựng với .NET 8.0, sử dụng Clean Architecture pattern.

## Cấu trúc dự án

- **WebApp.Core**: Chứa entities, interfaces, DTOs (Domain layer)
- **WebApp.Infrastructure**: Chứa repositories, services, database context (Data layer)
- **WebApp.API**: Chứa controllers, configuration (Presentation layer)

## Tính năng

- ✅ Authentication & Authorization với JWT
- ✅ File Management (Word, Excel, Video, Image, Audio)
- ✅ CMS Content Management
- ✅ Clean Architecture
- ✅ Entity Framework Core với SQL Server
- ✅ Swagger/OpenAPI documentation
- ✅ Role-based access control (Admin, User)

## Tài khoản mặc định

Khi ứng dụng khởi động lần đầu, một tài khoản admin mặc định sẽ được tạo tự động:

- **Email**: `admin@webapp.com`
- **Password**: `Admin@123`
- **Role**: Admin

Bạn có thể thay đổi thông tin này trong file `appsettings.json`:

```json
"DefaultAdmin": {
  "Email": "admin@webapp.com",
  "Password": "Admin@123",
  "FirstName": "Admin",
  "LastName": "User"
}
```

⚠️ **Lưu ý**: Hãy đổi mật khẩu mặc định sau lần đăng nhập đầu tiên!

## Yêu cầu

- .NET 8.0 SDK
- SQL Server hoặc SQL Server LocalDB
- Visual Studio 2022 hoặc VS Code

## Cài đặt

1. Restore packages:
```bash
dotnet restore
```

2. Cập nhật connection string trong `appsettings.json`

3. Tạo database và chạy migrations:
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

**Lưu ý**: Nếu bạn đã thêm chức năng Folder Management, hãy chạy migration:
```bash
cd src/WebApp.API
dotnet ef database update
```

Hoặc nếu chưa có migrations, database sẽ được tạo tự động khi chạy ứng dụng.

4. Chạy ứng dụng:
```bash
dotnet run
```

API sẽ chạy tại: `https://localhost:5001` hoặc `http://localhost:5000`

Swagger UI: `https://localhost:5001/swagger`

## Docker

Chạy với Docker Compose:
```bash
docker-compose up -d
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Files
- `POST /api/files/upload` - Upload file (có thể chỉ định folderId)
- `GET /api/files?fileType=&folderId=` - Lấy danh sách files (có thể filter theo folder)
- `GET /api/files/{id}` - Lấy thông tin file
- `GET /api/files/{id}/download` - Download file
- `POST /api/files/{id}/move` - Di chuyển file vào folder khác
- `DELETE /api/files/{id}` - Xóa file

### Folders
- `GET /api/folders/tree` - Lấy cây thư mục của user
- `GET /api/folders?parentId=` - Lấy danh sách folder con
- `POST /api/folders` - Tạo folder mới
- `PUT /api/folders/{id}` - Cập nhật folder (đổi tên/di chuyển)
- `DELETE /api/folders/{id}` - Xóa folder

### Content
- `GET /api/content` - Lấy danh sách content
- `GET /api/content/{id}` - Lấy chi tiết content
- `POST /api/content` - Tạo content mới
- `PUT /api/content/{id}` - Cập nhật content
- `DELETE /api/content/{id}` - Xóa content
