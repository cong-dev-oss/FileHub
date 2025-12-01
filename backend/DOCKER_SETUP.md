# Hướng dẫn Setup Database với Docker Desktop

## Bước 1: Tạo SQL Server Container

### Cách 1: Sử dụng Docker Compose (Khuyến nghị)

1. Mở terminal/command prompt tại thư mục `backend`

2. Chạy lệnh:
```bash
docker-compose -f docker-compose.db.yml up -d
```

3. Kiểm tra container đã chạy:
```bash
docker ps
```

Bạn sẽ thấy container `webapp-sqlserver` đang chạy.

### Cách 2: Sử dụng Docker Command trực tiếp

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd123!" -p 1433:1433 --name webapp-sqlserver -d mcr.microsoft.com/mssql/server:2022-latest
```

## Bước 2: Kiểm tra kết nối

### Kiểm tra container đang chạy:
```bash
docker ps
```

### Xem logs nếu có vấn đề:
```bash
docker logs webapp-sqlserver
```

## Bước 3: Cập nhật Connection String

Mở file `backend/src/WebApp.API/appsettings.json` và cập nhật connection string:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=WebAppDb;User Id=sa;Password=YourStrong@Passw0rd123!;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
}
```

**Lưu ý**: 
- `localhost,1433` - localhost với port 1433
- `sa` - System Administrator account
- `YourStrong@Passw0rd123!` - Mật khẩu bạn đã set (phải khớp với password trong docker-compose)
- `TrustServerCertificate=True` - Cần thiết cho local development

## Bước 4: Tạo Database

Khi bạn chạy ứng dụng lần đầu, database sẽ được tạo tự động bởi Entity Framework.

Hoặc bạn có thể tạo database thủ công bằng SQL Server Management Studio (SSMS) hoặc Azure Data Studio:

1. Kết nối đến server:
   - Server: `localhost,1433`
   - Authentication: SQL Server Authentication
   - Login: `sa`
   - Password: `YourStrong@Passw0rd123!`

2. Tạo database mới:
```sql
CREATE DATABASE WebAppDb;
```

## Bước 5: Chạy Migrations (Nếu cần)

```bash
cd backend/src/WebApp.API
dotnet ef database update
```

## Quản lý Container

### Dừng container:
```bash
docker stop webapp-sqlserver
```

### Khởi động lại:
```bash
docker start webapp-sqlserver
```

### Xóa container (giữ lại data):
```bash
docker stop webapp-sqlserver
docker rm webapp-sqlserver
```

### Xóa container và data:
```bash
docker-compose -f docker-compose.db.yml down -v
```

## Kết nối từ ứng dụng khác

Nếu bạn muốn kết nối từ SQL Server Management Studio hoặc Azure Data Studio:

- **Server name**: `localhost,1433`
- **Authentication**: SQL Server Authentication
- **Login**: `sa`
- **Password**: `YourStrong@Passw0rd123!`

## Troubleshooting

### Container không start được:
```bash
docker logs webapp-sqlserver
```

### Port 1433 đã được sử dụng:
Thay đổi port mapping trong `docker-compose.db.yml`:
```yaml
ports:
  - "1434:1433"  # Sử dụng port 1434 thay vì 1433
```

Và cập nhật connection string thành `localhost,1434`

### Quên mật khẩu:
Xóa container và tạo lại với mật khẩu mới:
```bash
docker stop webapp-sqlserver
docker rm webapp-sqlserver
docker-compose -f docker-compose.db.yml up -d
```

## Lưu ý bảo mật

⚠️ **QUAN TRỌNG**: 
- Mật khẩu trong file này chỉ dùng cho development
- Trong production, sử dụng secrets management
- Không commit mật khẩu thật vào git



