# WebApp Frontend

Ứng dụng frontend hiện đại được xây dựng với React 18, TypeScript, Vite, và Tailwind CSS. Ứng dụng cung cấp giao diện quản lý file, nội dung CMS, và quản lý người dùng với hệ thống phân quyền chi tiết.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cấu hình](#-cấu-hình)
- [Scripts](#-scripts)
- [Kiến trúc](#-kiến-trúc)
- [Tài liệu chi tiết](#-tài-liệu-chi-tiết)
- [Phát triển](#-phát-triển)
- [Triển khai](#-triển-khai)
- [Đóng góp](#-đóng-góp)
- [License](#-license)

## ✨ Tính năng

### 🔐 Xác thực & Phân quyền
- ✅ JWT Authentication
- ✅ Role-based Access Control (RBAC)
- ✅ Permission-based UI rendering
- ✅ Protected routes
- ✅ Persistent authentication state

### 📁 Quản lý File
- ✅ Upload file đa định dạng (Word, Excel, PDF, Video, Image, Audio)
- ✅ Chunked upload cho file lớn
- ✅ TUS protocol hỗ trợ resume upload
- ✅ Download file
- ✅ Xóa file
- ✅ Quản lý thư mục (Folder)
- ✅ Preview file (Image, Video)
- ✅ Chuyển đổi video format

### 📝 Quản lý Nội dung (CMS)
- ✅ Tạo và chỉnh sửa content
- ✅ Rich text editor
- ✅ Quản lý trạng thái (Draft, Published)
- ✅ Filter và search content
- ✅ Preview content

### 👥 Quản lý Người dùng & Vai trò
- ✅ Quản lý người dùng (CRUD)
- ✅ Quản lý vai trò và quyền
- ✅ Phân quyền chi tiết
- ✅ Dashboard thống kê

### 🎨 Giao diện
- ✅ Responsive design
- ✅ Modern UI với Tailwind CSS
- ✅ Dark mode ready
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling

## 💻 Yêu cầu hệ thống

- **Node.js**: 18.0.0 hoặc cao hơn
- **npm**: 9.0.0 hoặc cao hơn (hoặc yarn/pnpm)
- **Backend API**: Đang chạy tại `http://localhost:5000` (hoặc cấu hình khác)

## 🚀 Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd frontend
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` trong thư mục `frontend`:

```env
# API Base URL (optional - mặc định sử dụng proxy)
VITE_API_URL=http://localhost:5000/api

# Environment
VITE_ENV=development
```

### 4. Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

## 📁 Cấu trúc dự án

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components
│   │   ├── ConfirmDialog.tsx
│   │   ├── ContentDetail.tsx
│   │   ├── FormField.tsx
│   │   ├── ImagePreview.tsx
│   │   ├── Layout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── VideoConversionManager.tsx
│   │   └── VideoPlayer.tsx
│   ├── pages/              # Page components (routes)
│   │   ├── Content.tsx
│   │   ├── ContentEditor.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Files.tsx
│   │   ├── Login.tsx
│   │   ├── RoleManagement.tsx
│   │   └── UserManagement.tsx
│   ├── services/           # API service layer
│   │   ├── api.ts          # Axios instance & interceptors
│   │   ├── apiResponse.ts  # API response utilities
│   │   ├── authService.ts
│   │   ├── chunkedFileService.ts
│   │   ├── contentService.ts
│   │   ├── fileService.ts
│   │   ├── folderService.ts
│   │   ├── roleService.ts
│   │   ├── signalRService.ts
│   │   ├── tusUploadService.ts
│   │   ├── userService.ts
│   │   └── videoConversionService.ts
│   ├── store/              # State management (Zustand)
│   │   └── authStore.ts
│   ├── hooks/              # Custom React hooks
│   │   ├── index.ts        # Hooks barrel export
│   │   ├── useAuth.ts      # Authentication hook
│   │   └── usePermissions.ts # Permissions hook
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts        # Centralized types
│   ├── constants/          # Application constants
│   │   └── index.ts        # All constants
│   ├── config/             # Configuration files
│   │   └── index.ts        # App configuration
│   ├── routes/             # Route configuration
│   │   └── index.tsx        # All routes
│   ├── utils/              # Utility functions
│   │   └── errorHandler.ts
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── docs/                   # Tài liệu chi tiết
│   ├── ARCHITECTURE.md
│   ├── COMPONENTS.md
│   ├── API.md
│   ├── DEVELOPMENT.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
├── .env                    # Environment variables
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── PROJECT_STRUCTURE.md    # Cấu trúc dự án chi tiết
```

### ✨ Cấu trúc mới được tối ưu

Dự án đã được tùy chỉnh với cấu trúc hiện đại và dễ maintain:

- **`types/`**: Tập trung tất cả TypeScript types và interfaces
- **`constants/`**: Tập trung tất cả constants (routes, permissions, API endpoints)
- **`config/`**: Cấu hình ứng dụng và environment variables
- **`routes/`**: Routes được tách riêng, dễ quản lý
- **`hooks/`**: Custom hooks được tổ chức riêng

Xem chi tiết tại [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## ⚙️ Cấu hình

### Vite Configuration

File `vite.config.ts` cấu hình:
- React plugin
- Development server với proxy đến backend API
- Port: 3000
- Proxy timeout: 5 phút (cho upload file lớn)

### TypeScript Configuration

File `tsconfig.json` cấu hình:
- Target: ES2020
- Strict mode enabled
- JSX: react-jsx
- Module resolution: bundler

### Tailwind CSS

File `tailwind.config.js` cấu hình Tailwind CSS cho styling.

## 📜 Scripts

### Development

```bash
npm run dev          # Chạy development server
```

### Build

```bash
npm run build        # Build cho production
```

### Preview

```bash
npm run preview      # Preview production build
```

### Linting

```bash
npm run lint         # Chạy ESLint
```

## 🏗️ Kiến trúc

### Tech Stack

- **Framework**: React 18.2.0
- **Language**: TypeScript 5.2.2
- **Build Tool**: Vite 5.0.8
- **Routing**: React Router DOM 6.20.0
- **State Management**: Zustand 4.4.7
- **Data Fetching**: TanStack React Query 5.12.2
- **HTTP Client**: Axios 1.6.2
- **Forms**: React Hook Form 7.48.2
- **Styling**: Tailwind CSS 3.3.6
- **Icons**: Lucide React 0.294.0
- **Notifications**: React Hot Toast 2.4.1
- **Real-time**: SignalR 10.0.0

### Kiến trúc tổng quan

```
┌─────────────────────────────────────────┐
│           React Components              │
│  (Pages, Components, Layout)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        State Management                 │
│  (Zustand Stores, React Query)         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                   │
│  (API Services, Axios Instance)        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Backend API                     │
│  (http://localhost:5000/api)           │
└─────────────────────────────────────────┘
```

### Design Patterns

- **Component-based Architecture**: Tách biệt components và pages
- **Service Layer Pattern**: Tách biệt logic API calls
- **State Management**: Zustand cho global state, React Query cho server state
- **Protected Routes**: Route guards với permission checking
- **Error Handling**: Centralized error handling với errorHandler utility

Xem chi tiết tại [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## 📚 Tài liệu chi tiết

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Kiến trúc chi tiết và design patterns
- **[COMPONENTS.md](./docs/COMPONENTS.md)** - Tài liệu các components
- **[API.md](./docs/API.md)** - Tài liệu API integration và services
- **[DEVELOPMENT.md](./docs/DEVELOPMENT.md)** - Hướng dẫn phát triển
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Hướng dẫn triển khai
- **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** - Hướng dẫn đóng góp

## 🔧 Phát triển

### Thêm Component mới

1. Tạo file trong `src/components/`
2. Export component
3. Import và sử dụng trong pages

### Thêm Service mới

1. Tạo file trong `src/services/`
2. Sử dụng `api` instance từ `api.ts`
3. Export service functions

### Thêm Page mới

1. Tạo file trong `src/pages/`
2. Thêm route trong `App.tsx`
3. Thêm navigation link trong `Layout.tsx` (nếu cần)

Xem chi tiết tại [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## 🚢 Triển khai

### Build Production

```bash
npm run build
```

Output sẽ được tạo trong thư mục `dist/`.

### Environment Variables

Đảm bảo cấu hình các biến môi trường cho production:

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_ENV=production
```

### Deploy

Có thể deploy lên:
- **Vercel**: Tự động detect Vite project
- **Netlify**: Cấu hình build command và publish directory
- **GitHub Pages**: Sử dụng GitHub Actions
- **Docker**: Build Docker image với Nginx

Xem chi tiết tại [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Vui lòng đọc [CONTRIBUTING.md](./docs/CONTRIBUTING.md) để biết chi tiết về quy trình đóng góp.

### Quy trình đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 🐛 Troubleshooting

### Lỗi kết nối API

- Kiểm tra backend API đang chạy tại `http://localhost:5000`
- Kiểm tra CORS configuration trên backend
- Kiểm tra proxy configuration trong `vite.config.ts`

### Lỗi build

- Xóa `node_modules` và `package-lock.json`
- Chạy `npm install` lại
- Kiểm tra TypeScript errors: `npm run lint`

### Lỗi authentication

- Kiểm tra token trong localStorage
- Clear localStorage và đăng nhập lại
- Kiểm tra token expiration

## 📄 License

MIT

## 👥 Authors

- Development Team

## 🙏 Acknowledgments

- React Team
- Vite Team
- Tailwind CSS Team
- Tất cả các contributors
