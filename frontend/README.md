# WebApp Frontend

Frontend được xây dựng với React 18, TypeScript, Vite, và Tailwind CSS.

## Tính năng

- ✅ Modern React với TypeScript
- ✅ React Router cho navigation
- ✅ React Query cho data fetching
- ✅ Zustand cho state management
- ✅ React Hook Form cho form handling
- ✅ Tailwind CSS cho styling
- ✅ Responsive design
- ✅ File upload/download
- ✅ Content management

## Yêu cầu

- Node.js 18+ 
- npm hoặc yarn

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy development server:
```bash
npm run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

## Build

Để build cho production:
```bash
npm run build
```

## Cấu trúc

- `src/components/` - Reusable components
- `src/pages/` - Page components
- `src/services/` - API services
- `src/store/` - State management (Zustand)
- `src/App.tsx` - Main app component với routing

## API Integration

Frontend kết nối với backend API tại `http://localhost:5000/api` (có thể cấu hình trong `vite.config.ts`).



