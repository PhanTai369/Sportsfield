# Football Field Booking Backend

## Deploy trên Render

### 1. Chuẩn bị

Đảm bảo bạn đã có:
- Tài khoản Render (https://render.com)
- Database đã được setup (Supabase, PostgreSQL, etc.)
- Các API keys cần thiết (Cloudinary, Stripe, Google OAuth, etc.)

### 2. Deploy bằng Render.yaml

1. Push code lên GitHub repository
2. Trên Render Dashboard, chọn "New" → "Blueprint"
3. Connect GitHub repository của bạn
4. Render sẽ tự động đọc file `render.yaml` và tạo service

### 3. Deploy thủ công

Nếu không sử dụng render.yaml:

1. Trên Render Dashboard, chọn "New" → "Web Service"
2. Connect GitHub repository
3. Cấu hình:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: 18 hoặc 20

### 4. Environment Variables

Cấu hình các biến môi trường sau trong Render Dashboard:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://username:password@host:port/database
DB_FORCE_SYNC=false
BACKEND_URL=https://your-app-name.onrender.com
FRONTEND_URL=https://your-frontend-url.vercel.app/
...
```

### 5. Domain và SSL

- Render cung cấp subdomain miễn phí: `your-app-name.onrender.com`
- SSL certificate được tự động cấp phát
- Có thể sử dụng custom domain (plan trả phí)

### 6. Monitoring và Logs

- Xem logs realtime trong Render Dashboard
- Health check tự động tại endpoint `/`
- Auto-restart khi service crash

### 7. Lưu ý quan trọng

1. **Database Connection**: Sử dụng DATABASE_URL cho production
2. **File Upload**: Static files sẽ bị mất khi restart → nên dùng Cloudinary
3. **Environment**: Không commit file `.env` - chỉ sử dụng environment variables
4. **CORS**: Đảm bảo FRONTEND_URL được cấu hình đúng
5. **SSL**: Production yêu cầu HTTPS cho OAuth callbacks

### 8. Troubleshooting

**Build fails:**
```bash
npm install --production
```

**Database connection error:**
- Kiểm tra DATABASE_URL format
- Đảm bảo database server cho phép external connections
- Check firewall và security groups

**CORS error:**
- Kiểm tra FRONTEND_URL trong environment variables
- Đảm bảo không có trailing slash

**File upload không hoạt động:**
- Cấu hình Cloudinary credentials
- Check MAX_FILE_SIZE setting

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## Project Structure

```
src/
├── controllers/     # Route handlers
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── middlewares/    # Custom middlewares
├── config/         # Configuration files
└── utils/          # Helper functions
```
