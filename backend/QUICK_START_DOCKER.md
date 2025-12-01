# 🚀 Quick Start - Tạo Database với Docker Desktop

## Bước 1: Tạo SQL Server Container

Mở terminal tại thư mục `backend` và chạy:

```bash
docker-compose -f docker-compose.db.yml up -d
```

Lệnh này sẽ:
- Tải image SQL Server 2022
- Tạo container tên `webapp-sqlserver`
- Mở port 1433 để kết nối
- Tạo volume để lưu data (data sẽ không mất khi restart)

## Bước 2: Kiểm tra Container đang chạy

```bash
docker ps
```

Bạn sẽ thấy container `webapp-sqlserver` với status `Up`.

## Bước 3: Connection String đã được cấu hình

File `appsettings.json` đã được cấu hình sẵn với:
- **Server**: `localhost,1433`
- **Database**: `WebAppDb`
- **User**: `sa`
- **Password**: `YourStrong@Passw0rd123!`

## Bước 4: Chạy ứng dụng

```bash
cd src/WebApp.API
dotnet run
```

Database sẽ được tạo tự động khi ứng dụng chạy lần đầu!

## ✅ Xong!

Bây giờ bạn có thể:
- Truy cập API tại: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/swagger`
- Đăng nhập với tài khoản mặc định:
  - Email: `admin@webapp.com`
  - Password: `Admin@123`

## 🔧 Các lệnh hữu ích

### Dừng database:
```bash
docker stop webapp-sqlserver
```

### Khởi động lại:
```bash
docker start webapp-sqlserver
```

### Xem logs:
```bash
docker logs webapp-sqlserver
```

### Xóa container (giữ data):
```bash
docker stop webapp-sqlserver
docker rm webapp-sqlserver
```

### Xóa container và data:
```bash
docker-compose -f docker-compose.db.yml down -v
```

## 🔍 Kết nối từ SQL Server Management Studio

Nếu bạn muốn xem database bằng SSMS hoặc Azure Data Studio:

1. **Server name**: `localhost,1433`
2. **Authentication**: SQL Server Authentication
3. **Login**: `sa`
4. **Password**: `YourStrong@Passw0rd123!`

## ⚠️ Lưu ý

- Mật khẩu này chỉ dùng cho development
- Đảm bảo Docker Desktop đang chạy
- Port 1433 phải không bị chiếm bởi ứng dụng khác

