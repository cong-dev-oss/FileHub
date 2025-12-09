# TUS Protocol Implementation - Industry Standard Resumable Upload

## 📋 Tổng Quan

Đã implement **TUS Protocol** - tiêu chuẩn industry cho resumable file uploads được sử dụng bởi:
- Vimeo
- Transloadit
- Google Cloud Storage
- AWS S3
- Và nhiều công ty lớn khác

## 🚀 TUS Protocol là gì?

**TUS** (Transloadit Upload Service) là một protocol mở cho resumable file uploads được xây dựng trên HTTP/1.1 và HTTP/2.

### Ưu điểm:
- ✅ **Resumable**: Có thể tiếp tục upload từ điểm dừng
- ✅ **Chunked**: Tự động chia file thành chunks
- ✅ **Retry**: Tự động retry khi lỗi
- ✅ **Standard**: Protocol tiêu chuẩn, được hỗ trợ rộng rãi
- ✅ **Reliable**: Xử lý tốt network interruptions

## 📦 Packages Đã Cài Đặt

### Frontend:
```bash
npm install tus-js-client
```

### Backend:
```xml
<PackageReference Include="tusdotnet" Version="2.7.0" />
```

## 🔧 Implementation

### Frontend (`tusUploadService.ts`):
- Sử dụng `tus-js-client` - official TUS client library
- Chunk size: 5MB (có thể tùy chỉnh)
- Retry delays: [0, 3s, 5s, 10s, 20s]
- Tự động retry khi lỗi
- Progress tracking với tốc độ và thời gian còn lại

### Backend (Cần implement):
Cần thêm TUS endpoints vào backend:
1. `POST /api/files/upload/tus/init` - Khởi tạo upload session
2. TUS endpoints (tự động bởi tusdotnet)
3. `GET /api/files/upload/tus/complete/{fileId}` - Lấy file metadata sau khi upload

## 📝 Cách Sử Dụng

```typescript
import { tusUploadService } from '../services/tusUploadService'

// Upload file
const fileResponse = await tusUploadService.upload({
  file: fileObject,
  description: 'Optional description',
  folderId: 'Optional folder ID',
  onProgress: (progress) => {
    console.log(`Uploaded: ${progress.percentage}%`)
    console.log(`Speed: ${progress.speed} bytes/s`)
    console.log(`Time remaining: ${progress.timeRemaining}s`)
  },
  onSuccess: (fileResponse) => {
    console.log('Upload completed!', fileResponse)
  },
  onError: (error) => {
    console.error('Upload failed:', error)
  }
})

// Pause upload
tusUploadService.pause(fileName)

// Resume upload
tusUploadService.resume(fileName)

// Cancel upload
tusUploadService.cancel(fileName)
```

## 🎯 Tính Năng

1. **Automatic Chunking**: File tự động được chia thành chunks 5MB
2. **Resumable**: Có thể pause/resume upload
3. **Retry Logic**: Tự động retry khi lỗi với exponential backoff
4. **Progress Tracking**: Real-time progress với tốc độ và thời gian còn lại
5. **Error Handling**: Xử lý lỗi tốt với callbacks

## 📚 Tài Liệu Tham Khảo

- TUS Protocol: https://tus.io/
- tus-js-client: https://github.com/tus/tus-js-client
- tusdotnet: https://github.com/tusdotnet/tusdotnet

## 🔄 Next Steps

1. ✅ Frontend TUS client - **DONE**
2. ⏳ Backend TUS server implementation
3. ⏳ Tích hợp vào UI hiện tại
4. ⏳ Testing với file lớn

## 💡 So Sánh với Custom Implementation

| Tính Năng | Custom Chunked | TUS Protocol |
|-----------|---------------|--------------|
| Standard | ❌ | ✅ Industry Standard |
| Resumable | ⚠️ Manual | ✅ Built-in |
| Retry | ⚠️ Manual | ✅ Automatic |
| Browser Support | ⚠️ Limited | ✅ Wide Support |
| Server Libraries | ❌ Custom | ✅ Many Options |
| Maintenance | ⚠️ High | ✅ Low |









