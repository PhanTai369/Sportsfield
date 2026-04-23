# Football Field Booking Frontend

## Deploy to Vercel

### Prerequisites
- Backend deployed at: https://football-field-booking-backend.onrender.com/

### Steps to Deploy

1. **Clone and setup**
   ```bash
   git clone <your-repo>
   cd Frontend
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env.production`
   - Update `VITE_API_URL` if needed

3. **Build locally to test**
   ```bash
   npm run build
   npm run preview
   ```

4. **Deploy to Vercel**
   - Connect your GitHub repo to Vercel
   - Set environment variables in Vercel dashboard:
     - `VITE_API_URL=https://football-field-booking-backend.onrender.com/api`
   - Deploy

### Environment Variables
- `VITE_API_URL`: Backend API URL (default: https://football-field-booking-backend.onrender.com/api)

### Files Created/Modified for Deployment
- `.env.production` - Production environment variables
- `.env.development` - Development environment variables
- `vercel.json` - Vercel deployment configuration
- `public/_redirects` - SPA routing support
- Updated all service files to use centralized API_BASE_URL
- Updated vite.config.ts for production builds

### API Configuration
All API calls now use the centralized `API_BASE_URL` from `src/config/api.ts`, which reads from environment variables.

### CORS Considerations
Make sure your backend at `https://football-field-booking-backend.onrender.com` allows CORS from your Vercel domain.
