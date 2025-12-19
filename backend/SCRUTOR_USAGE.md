# Hướng dẫn sử dụng Scrutor - Auto Service Registration

## ✅ Đã cài đặt và cấu hình Scrutor

### Package đã được thêm:
- **Scrutor** Version 4.2.2 trong `WebApp.API.csproj`

### Code trong Program.cs:

```csharp
using Scrutor;

// Tự động đăng ký tất cả services theo convention
builder.Services.Scan(scan => scan
    .FromAssemblyOf<FileService>() // Assembly chứa implementations
    .AddClasses(classes => classes
        .InNamespaceOf<FileService>() // Namespace: WebApp.Infrastructure.Services
        .Where(type => type.Name.EndsWith("Service") && !type.IsAbstract))
    .AsImplementedInterfaces()
    .WithScopedLifetime());
```

## 🎯 Cách hoạt động

### Convention được sử dụng:
1. **Assembly**: `WebApp.Infrastructure` (từ `FileService`)
2. **Namespace**: `WebApp.Infrastructure.Services`
3. **Filter**: Tên class kết thúc bằng `Service` và không phải abstract
4. **Registration**: Đăng ký với interface tương ứng
5. **Lifetime**: `Scoped`

### Ví dụ tự động đăng ký:

```csharp
// ✅ TỰ ĐỘNG ĐĂNG KÝ
namespace WebApp.Infrastructure.Services;
public class FileService : IFileService { }
// → Đăng ký: IFileService -> FileService (Scoped)

// ✅ TỰ ĐỘNG ĐĂNG KÝ
namespace WebApp.Infrastructure.Services;
public class ContentService : IContentService { }
// → Đăng ký: IContentService -> ContentService (Scoped)

// ❌ KHÔNG TỰ ĐỘNG ĐĂNG KÝ (không kết thúc bằng "Service")
namespace WebApp.Infrastructure.Repositories;
public class UnitOfWork : IUnitOfWork { }
// → Phải đăng ký thủ công

// ❌ KHÔNG TỰ ĐỘNG ĐĂNG KÝ (abstract class)
namespace WebApp.Infrastructure.Services;
public abstract class BaseService { }
// → Không đăng ký
```

## 📝 Khi thêm Service mới

### Bước 1: Tạo Interface
```csharp
// WebApp.Core/Interfaces/IUserService.cs
namespace WebApp.Core.Interfaces;

public interface IUserService
{
    Task<UserDto> GetUserAsync(string userId);
    Task CreateUserAsync(CreateUserDto dto);
}
```

### Bước 2: Tạo Implementation
```csharp
// WebApp.Infrastructure/Services/UserService.cs
namespace WebApp.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    
    public UserService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }
    
    // Implement methods...
}
```

### Bước 3: Sử dụng ngay - KHÔNG CẦN ĐĂNG KÝ!
```csharp
// Program.cs - KHÔNG CẦN THAY ĐỔI GÌ!
// Service đã tự động được đăng ký bởi Scrutor

// Controller - Inject và dùng ngay
public class UsersController : ControllerBase
{
    private readonly IUserService _userService; // ✅ Tự động resolve!
    
    public UsersController(IUserService userService)
    {
        _userService = userService;
    }
}
```

## 🚀 Tùy chọn nâng cao

### 1. Đăng ký với Lifetime khác nhau:

```csharp
builder.Services.Scan(scan => scan
    .FromAssemblyOf<FileService>()
    .AddClasses(classes => classes
        .Where(type => type.Name.EndsWith("Service") && !type.IsAbstract))
    .AsImplementedInterfaces()
    .WithSingletonLifetime()); // Hoặc WithTransientLifetime()
```

### 2. Đăng ký nhiều loại services:

```csharp
builder.Services.Scan(scan => scan
    .FromAssemblyOf<FileService>()
    
    // Services
    .AddClasses(classes => classes
        .Where(type => type.Name.EndsWith("Service") && !type.IsAbstract))
    .AsImplementedInterfaces()
    .WithScopedLifetime()
    
    // Repositories (nếu có)
    .AddClasses(classes => classes
        .Where(type => type.Name.EndsWith("Repository") && !type.IsAbstract))
    .AsImplementedInterfaces()
    .WithScopedLifetime());
```

### 3. Đăng ký với nhiều assemblies:

```csharp
builder.Services.Scan(scan => scan
    .FromAssemblyOf<FileService>()
    .FromAssemblyOf<SomeOtherService>()
    .AddClasses(classes => classes
        .Where(type => type.Name.EndsWith("Service")))
    .AsImplementedInterfaces()
    .WithScopedLifetime());
```

### 4. Filter theo nhiều điều kiện:

```csharp
builder.Services.Scan(scan => scan
    .FromAssemblyOf<FileService>()
    .AddClasses(classes => classes
        .Where(type => 
            type.Name.EndsWith("Service") && 
            !type.IsAbstract &&
            type.Namespace == "WebApp.Infrastructure.Services"))
    .AsImplementedInterfaces()
    .WithScopedLifetime());
```

### 5. Đăng ký với nhiều interfaces:

```csharp
builder.Services.Scan(scan => scan
    .FromAssemblyOf<FileService>()
    .AddClasses(classes => classes
        .Where(type => type.Name.EndsWith("Service")))
    .AsImplementedInterfaces()
    .AsSelf() // Cũng đăng ký chính nó
    .WithScopedLifetime());
```

## 🔍 Debug - Kiểm tra Services đã đăng ký

Thêm code này vào `Program.cs` để xem services đã đăng ký:

```csharp
// Chỉ dùng trong Development
if (app.Environment.IsDevelopment())
{
    var registeredServices = builder.Services
        .Where(s => s.ServiceType.Name.EndsWith("Service"))
        .Select(s => $"{s.ServiceType.Name} -> {s.ImplementationType?.Name} ({s.Lifetime})")
        .ToList();
    
    foreach (var service in registeredServices)
    {
        Console.WriteLine($"✅ {service}");
    }
}
```

Output sẽ là:
```
✅ IFileService -> FileService (Scoped)
✅ IContentService -> ContentService (Scoped)
✅ IUserService -> UserService (Scoped)
```

## 📊 So sánh với Extension Method

| Tiêu chí | Extension Method | Scrutor |
|----------|------------------|---------|
| **Cần thư viện** | ❌ Không | ✅ Có |
| **Linh hoạt** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Dễ sử dụng** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Filter phức tạp** | ❌ Khó | ✅ Dễ |
| **Multiple assemblies** | ❌ Không | ✅ Có |
| **Decoration pattern** | ❌ Không | ✅ Có |
| **Enterprise ready** | ✅ | ✅✅ |

## ✅ Ưu điểm của Scrutor

1. **Linh hoạt**: Nhiều tùy chọn filter và configuration
2. **Mạnh mẽ**: Hỗ trợ decoration pattern, multiple assemblies
3. **Phổ biến**: Được Microsoft và cộng đồng recommend
4. **Dễ debug**: Có thể xem services đã đăng ký
5. **Tài liệu tốt**: Nhiều ví dụ và best practices

## 📚 Tài liệu tham khảo

- **Scrutor GitHub**: https://github.com/khellang/Scrutor
- **NuGet Package**: https://www.nuget.org/packages/Scrutor/
- **Tutorial**: https://timdeschryver.dev/bits/automatic-service-discovery-and-registration-using-scrutor

## ⚠️ Lưu ý

1. **UnitOfWork**: Vẫn đăng ký thủ công vì không theo convention `*Service`
2. **Hosted Services**: Đăng ký riêng với `AddHostedService<T>()`
3. **DbContext**: Đăng ký riêng với `AddDbContext<T>()`
4. **Identity Services**: Đăng ký riêng với `AddIdentity<T>()`

Tất cả các services khác sẽ được tự động đăng ký! ✨

