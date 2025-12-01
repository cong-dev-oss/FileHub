# 🔧 Troubleshooting - Sửa lỗi Database và Docker

## Lỗi: Image chỉ có 4.11 KB

**Nguyên nhân**: Image SQL Server không được tải đúng hoặc bị lỗi.

**Giải pháp**:

### Windows (PowerShell):
```powershell
cd backend
.\fix-docker-db.ps1
```

### Linux/Mac:
```bash
cd backend
chmod +x fix-docker-db.sh
./fix-docker-db.sh
```

### Hoặc thủ công:

1. **Dừng và xóa container cũ**:
```bash
docker stop webapp-sqlserver
docker rm webapp-sqlserver
```

2. **Xóa image cũ**:
```bash
docker rmi mcr.microsoft.com/mssql/server:2022-latest
```

3. **Tải lại image**:
```bash
docker pull mcr.microsoft.com/mssql/server:2022-latest
```

4. **Tạo container mới**:
```bash
docker-compose -f docker-compose.db.yml up -d
```

5. **Kiểm tra logs**:
```bash
docker logs webapp-sqlserver
```

## Lỗi 500 - Internal Server Error

### Bước 1: Kiểm tra Container đang chạy

```bash
docker ps
```

Nếu không thấy `webapp-sqlserver`, chạy:
```bash
docker-compose -f docker-compose.db.yml up -d
```

### Bước 2: Kiểm tra Logs của Container

```bash
docker logs webapp-sqlserver
```

Tìm các lỗi như:
- `Password validation failed` - Mật khẩu không đủ mạnh
- `Port already in use` - Port 1433 đã được sử dụng
- `Cannot connect` - SQL Server chưa sẵn sàng

### Bước 3: Kiểm tra Logs của Ứng dụng

Xem console output khi chạy `dotnet run`. Tìm các lỗi:
- `A network-related or instance-specific error` - Không kết nối được database
- `Login failed` - Sai username/password
- `Database does not exist` - Database chưa được tạo

### Bước 4: Kiểm tra Connection String

Mở `appsettings.json` và đảm bảo connection string đúng:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=WebAppDb;User Id=sa;Password=YourStrong@Passw0rd123!;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
}
```

**Lưu ý**:
- Password phải khớp với password trong `docker-compose.db.yml`
- `TrustServerCertificate=True` là bắt buộc cho local development

### Bước 5: Test kết nối Database

Sử dụng SQL Server Management Studio hoặc Azure Data Studio:

- **Server**: `localhost,1433`
- **Authentication**: SQL Server Authentication
- **Login**: `sa`
- **Password**: `YourStrong@Passw0rd123!`

Nếu không kết nối được, container có vấn đề.

## Lỗi: Port 1433 đã được sử dụng

**Giải pháp 1**: Thay đổi port trong `docker-compose.db.yml`:

```yaml
ports:
  - "1434:1433"  # Sử dụng port 1434
```

Và cập nhật connection string:
```
Server=localhost,1434;...
```

**Giải pháp 2**: Tìm và dừng process đang dùng port 1433:

Windows:
```powershell
netstat -ano | findstr :1433
taskkill /PID <PID> /F
```

Linux/Mac:
```bash
lsof -ti:1433 | xargs kill -9
```

## Lỗi: Password không đủ mạnh

SQL Server yêu cầu mật khẩu:
- Ít nhất 8 ký tự
- Có chữ hoa, chữ thường, số và ký tự đặc biệt

**Giải pháp**: Sử dụng mật khẩu mạnh hơn trong `docker-compose.db.yml`:

```yaml
environment:
  - SA_PASSWORD=YourStrong@Passw0rd123!
```

Và cập nhật `appsettings.json` tương ứng.

## Lỗi: Database không được tạo

**Giải pháp**: Tạo database thủ công:

1. Kết nối đến SQL Server (xem Bước 5 ở trên)

2. Chạy SQL:
```sql
CREATE DATABASE WebAppDb;
```

3. Hoặc chạy migrations:
```bash
cd backend/src/WebApp.API
dotnet ef database update
```

## Lỗi: Container không start

**Kiểm tra**:

1. **Docker Desktop đang chạy?**
   - Mở Docker Desktop và đảm bảo nó đang chạy

2. **Đủ RAM?**
   - SQL Server cần ít nhất 2GB RAM
   - Kiểm tra trong Docker Desktop Settings > Resources

3. **Xem logs chi tiết**:
```bash
docker logs webapp-sqlserver
```

## Lỗi: Timeout khi kết nối

**Nguyên nhân**: SQL Server chưa sẵn sàng (cần 10-30 giây để khởi động)

**Giải pháp**: Đợi thêm vài giây, sau đó thử lại. Ứng dụng có retry logic tự động (5 lần).

## Kiểm tra nhanh

Chạy lệnh này để kiểm tra tất cả:

```bash
# Kiểm tra container
docker ps -a | grep webapp-sqlserver

# Kiểm tra logs
docker logs --tail 20 webapp-sqlserver

# Test kết nối (nếu có sqlcmd)
docker exec -it webapp-sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd123!" -Q "SELECT @@VERSION"
```

## Vẫn không được?

1. **Xóa tất cả và bắt đầu lại**:
```bash
docker-compose -f docker-compose.db.yml down -v
docker-compose -f docker-compose.db.yml up -d
```

2. **Kiểm tra firewall** - Đảm bảo port 1433 không bị chặn

3. **Kiểm tra Docker network**:
```bash
docker network ls
docker network inspect webapp_webapp-network
```

4. **Xem logs chi tiết của ứng dụng**:
   - Chạy `dotnet run` và xem toàn bộ output
   - Tìm các dòng có `Error` hoặc `Exception`



