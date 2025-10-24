# Vercel Deployment Guide

This guide will help you deploy your React frontend to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
3. **Backend Server**: Your backend should be deployed and accessible via HTTPS
4. **Supabase Project**: If using Supabase for authentication

## Step 1: Prepare Your Environment Variables

### 1.1 Copy the environment template
```bash
cp env.example .env.local
```

### 1.2 Update your environment variables
Edit `.env.local` with your actual values:

```env
# API Configuration - Replace with your backend URL
VITE_API_URL=https://your-backend-server.com/api

# Supabase Configuration - Get these from your Supabase dashboard
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Socket.io Configuration
VITE_SOCKET_URL=https://your-backend-server.com

# Optional: Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Optional: Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

## Step 2: Test Build Locally

Before deploying, test your build locally:

```bash
# Install dependencies
npm install

# Test the build
npm run build

# Preview the production build
npm run preview
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project? → No
   - Project name → `sport-project-frontend` (or your preferred name)
   - Directory → `./` (current directory)
   - Override settings? → No

5. **Set environment variables**:
   ```bash
   vercel env add VITE_API_URL
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   # Add other environment variables as needed
   ```

6. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### Option B: Deploy via Vercel Dashboard

1. **Go to [vercel.com/dashboard](https://vercel.com/dashboard)**

2. **Click "New Project"**

3. **Import your Git repository**

4. **Configure the project**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add each variable from your `.env.local` file

6. **Deploy**

## Step 4: Configure Custom Domain (Optional)

1. **Go to your project dashboard on Vercel**
2. **Click on "Domains" tab**
3. **Add your custom domain**
4. **Follow DNS configuration instructions**

## Step 5: Configure Backend CORS

Make sure your backend server allows requests from your Vercel domain:

```javascript
// Example for Express.js backend
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'https://your-custom-domain.com',
    'http://localhost:3000' // for development
  ],
  credentials: true
}));
```

## Step 6: Update Supabase Settings

1. **Go to your Supabase dashboard**
2. **Navigate to Authentication → URL Configuration**
3. **Add your Vercel URLs**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: 
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/auth`

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Your backend API URL | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_SOCKET_URL` | Socket.io server URL | No |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | No |

## Troubleshooting

### Build Failures

1. **Check Node.js version**: Vercel uses Node.js 18.x by default
2. **Check dependencies**: Ensure all dependencies are in `package.json`
3. **Check TypeScript errors**: Run `npm run build` locally first

### Runtime Errors

1. **Check environment variables**: Ensure all required variables are set
2. **Check CORS settings**: Verify backend allows your Vercel domain
3. **Check network requests**: Use browser dev tools to debug API calls

### Performance Issues

1. **Enable Vercel Analytics**: Go to project settings and enable analytics
2. **Optimize images**: Use Vercel's Image Optimization
3. **Check bundle size**: Use `npm run build` to check for large chunks

## Continuous Deployment

Once connected to Git, Vercel will automatically deploy when you push to your main branch:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

## Monitoring and Analytics

1. **Vercel Analytics**: Built-in performance monitoring
2. **Function Logs**: Check serverless function logs in dashboard
3. **Real User Monitoring**: Enable in project settings

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to Git
2. **API Keys**: Use Vercel's environment variable system
3. **CORS**: Configure your backend to only allow your Vercel domain
4. **HTTPS**: Vercel provides HTTPS by default

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **Vite Documentation**: [vitejs.dev](https://vitejs.dev)
