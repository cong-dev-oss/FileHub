# Deployment Guide

Hướng dẫn triển khai ứng dụng frontend lên các môi trường production.

## 📋 Mục lục

- [Prerequisites](#prerequisites)
- [Build Process](#build-process)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [CI/CD](#cicd)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Build Requirements

- Node.js 18+ và npm 9+
- Backend API đã được deploy và accessible
- Environment variables đã được cấu hình

### Production Checklist

- [ ] Backend API đang chạy và accessible
- [ ] Environment variables đã được cấu hình
- [ ] API base URL đã được set đúng
- [ ] CORS đã được cấu hình trên backend
- [ ] SSL certificate đã được setup (nếu cần HTTPS)

## Build Process

### 1. Install Dependencies

```bash
npm ci  # Sử dụng ci thay vì install để đảm bảo exact versions
```

### 2. Set Environment Variables

Tạo file `.env.production`:

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_ENV=production
```

### 3. Build Application

```bash
npm run build
```

Build output sẽ được tạo trong thư mục `dist/`:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

### 4. Verify Build

```bash
npm run preview
```

Mở browser tại `http://localhost:4173` để kiểm tra production build.

## Environment Configuration

### Environment Variables

Frontend sử dụng Vite environment variables với prefix `VITE_`:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.example.com/api` |
| `VITE_ENV` | Environment name | `production` |

### Environment Files

- `.env`: Default (development)
- `.env.local`: Local overrides (gitignored)
- `.env.production`: Production (build time)
- `.env.development`: Development

### Accessing Environment Variables

```typescript
const apiUrl = import.meta.env.VITE_API_URL
const env = import.meta.env.VITE_ENV
const mode = import.meta.env.MODE // 'development' | 'production'
```

**Lưu ý**: Environment variables chỉ available tại build time, không phải runtime.

## Deployment Options

### Option 1: Static Hosting (Vercel)

#### Setup

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel
```

Hoặc connect GitHub repository trong Vercel dashboard.

#### Configuration

Tạo `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "https://api.yourdomain.com/api"
  }
}
```

#### Environment Variables

Set trong Vercel dashboard:
- Settings → Environment Variables
- Add `VITE_API_URL`

### Option 2: Static Hosting (Netlify)

#### Setup

1. **Install Netlify CLI**
```bash
npm i -g netlify-cli
```

2. **Deploy**
```bash
netlify deploy --prod
```

#### Configuration

Tạo `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_API_URL = "https://api.yourdomain.com/api"
```

#### Environment Variables

Set trong Netlify dashboard:
- Site settings → Environment variables
- Add `VITE_API_URL`

### Option 3: Static Hosting (GitHub Pages)

#### Setup

1. **Install gh-pages**
```bash
npm install --save-dev gh-pages
```

2. **Update package.json**
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

3. **Update vite.config.ts**
```typescript
export default defineConfig({
  base: '/repository-name/', // Thay bằng tên repository
  // ...
})
```

4. **Deploy**
```bash
npm run deploy
```

### Option 4: Nginx

#### Setup

1. **Build application**
```bash
npm run build
```

2. **Copy files to server**
```bash
scp -r dist/* user@server:/var/www/html/
```

3. **Nginx configuration**

Tạo `/etc/nginx/sites-available/frontend`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

4. **Enable site**
```bash
sudo ln -s /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 5: Apache

#### Setup

1. **Build application**
```bash
npm run build
```

2. **Copy files**
```bash
scp -r dist/* user@server:/var/www/html/
```

3. **Apache configuration**

Tạo `.htaccess` trong `dist/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

## Docker Deployment

### Dockerfile

Tạo `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

Tạo `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Build và Run

```bash
# Build image
docker build -t frontend-app .

# Run container
docker run -d -p 80:80 --name frontend frontend-app
```

### Docker Compose

Tạo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://backend:5000/api
    depends_on:
      - backend
```

## CI/CD

### GitHub Actions

Tạo `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI

Tạo `.gitlab-ci.yml`:

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:18
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache rsync openssh
    - rsync -avz --delete dist/ user@server:/var/www/html/
  only:
    - main
```

## Post-Deployment

### Verification Checklist

- [ ] Application loads correctly
- [ ] API calls work
- [ ] Authentication works
- [ ] File upload/download works
- [ ] All routes accessible
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile responsive

### Monitoring

#### Error Tracking

Có thể tích hợp error tracking services:
- **Sentry**: Error tracking và monitoring
- **LogRocket**: Session replay và error tracking
- **Rollbar**: Error tracking

#### Analytics

Có thể tích hợp analytics:
- **Google Analytics**: User behavior tracking
- **Plausible**: Privacy-friendly analytics
- **Mixpanel**: Product analytics

### Performance Optimization

#### Code Splitting

Vite tự động code splitting. Có thể optimize thêm:

```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Files = lazy(() => import('./pages/Files'))
```

#### Asset Optimization

- Images: Compress và sử dụng modern formats (WebP)
- Fonts: Self-host và preload
- CSS: Purge unused Tailwind classes

#### Caching

- Static assets: Long-term caching (1 year)
- HTML: Short-term caching hoặc no-cache
- API responses: Cache trong React Query

## Troubleshooting

### Issue: Blank page after deployment

**Causes**:
- Incorrect base URL
- Missing environment variables
- Build errors

**Solutions**:
- Kiểm tra browser console errors
- Kiểm tra network tab
- Verify environment variables
- Rebuild application

### Issue: API calls fail

**Causes**:
- CORS not configured
- Wrong API URL
- Network issues

**Solutions**:
- Kiểm tra CORS configuration trên backend
- Verify `VITE_API_URL` environment variable
- Kiểm tra network tab trong DevTools

### Issue: Routes not working (404)

**Causes**:
- Server không configured cho SPA routing
- Incorrect base path

**Solutions**:
- Configure server redirects (see Nginx/Apache configs)
- Kiểm tra `base` trong `vite.config.ts`

### Issue: Assets not loading

**Causes**:
- Incorrect base path
- Missing files
- CORS issues

**Solutions**:
- Kiểm tra `base` trong `vite.config.ts`
- Verify all files copied to server
- Kiểm tra server CORS configuration

### Issue: Build fails

**Causes**:
- TypeScript errors
- Missing dependencies
- Environment issues

**Solutions**:
- Fix TypeScript errors
- Run `npm ci` để reinstall dependencies
- Kiểm tra Node.js version

## Security Considerations

### Content Security Policy (CSP)

Thêm CSP headers trong server configuration:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

### HTTPS

Luôn sử dụng HTTPS trong production:
- SSL certificate từ Let's Encrypt (free)
- Redirect HTTP to HTTPS
- HSTS headers

### Environment Variables

- Không commit `.env` files
- Sử dụng secure storage cho secrets
- Rotate secrets regularly

## Rollback Strategy

### Quick Rollback

1. **Revert to previous build**
```bash
# Nginx
cd /var/www/html
rm -rf current
ln -s previous-build current

# Docker
docker pull previous-image:tag
docker-compose up -d
```

2. **Git revert**
```bash
git revert HEAD
git push origin main
```

### Backup Strategy

- Keep previous builds
- Database backups (nếu có)
- Configuration backups

## Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Documentation](https://docs.docker.com)
