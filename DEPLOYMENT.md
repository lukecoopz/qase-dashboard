# Deployment Guide

This guide will help you deploy both the frontend (GitHub Pages) and backend (Vercel) for this dashboard.

## Prerequisites

- GitHub account
- Vercel account (free tier available at https://vercel.com)
- Qase API token

## Step 1: Deploy Backend to Vercel

The backend proxy server must be hosted separately to keep your API token secure.

### Option A: Deploy via Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy the backend:
   ```bash
   cd /Users/lukecooper/Documents/Work/qase-dashboard
   vercel --prod
   ```

4. When prompted, set the environment variable:
   - `QASE_API_TOKEN`: Your Qase API token

5. Note your deployment URL (e.g., `https://qase-dashboard-xyz.vercel.app`)

### Option B: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Root Directory**: Leave as root
   - **Framework Preset**: Other
   - **Build Command**: Leave empty (we only need the server)
   - **Output Directory**: Leave empty
4. Add Environment Variable:
   - Key: `QASE_API_TOKEN`
   - Value: Your Qase API token
5. Deploy

## Step 2: Update Frontend API URL

After deploying the backend, update the GitHub Pages deployment:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add a new repository secret:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://your-vercel-app.vercel.app/api` (replace with your actual Vercel URL)

## Step 3: Enable GitHub Pages

1. Go to your GitHub repository
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select:
   - **Deploy from a branch**: `main`
   - **Branch**: `main` / `root`
4. Click **Save**

The GitHub Actions workflow will automatically build and deploy your frontend.

## Step 4: Update Repository Name (if needed)

If your repository name is not `qase-dashboard`, update `vite.config.ts`:

```typescript
base: process.env.GITHUB_PAGES ? '/your-repo-name/' : '/',
```

## Accessing Your Dashboard

- **Frontend**: `https://your-username.github.io/qase-dashboard/`
- **Backend API**: `https://your-vercel-app.vercel.app/api`

## Troubleshooting

### Frontend can't connect to backend

- Verify `VITE_API_BASE_URL` secret is set correctly in GitHub
- Check that your Vercel deployment is live
- Ensure CORS is enabled in your backend (already configured)

### Backend returns 401/403 errors

- Verify `QASE_API_TOKEN` is set correctly in Vercel environment variables
- Check that the token hasn't expired

### GitHub Pages shows 404

- Ensure the repository name matches the `base` path in `vite.config.ts`
- Check GitHub Actions workflow logs for build errors

