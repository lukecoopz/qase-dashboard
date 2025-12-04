# Quick Start Guide

Your repository is now public at: **https://github.com/lukecoopz/qase-dashboard**

## 🚀 Next Steps to Get It Live

### Step 1: Deploy Backend to Vercel (5 minutes)

1. **Install Vercel CLI** (if you don't have it):
   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy**:
   ```bash
   cd /Users/lukecooper/Documents/Work/qase-dashboard
   vercel login
   vercel --prod
   ```

3. **Set Environment Variable** when prompted:
   - `QASE_API_TOKEN`: Your Qase API token (from your `.env` file)

4. **Copy your Vercel URL** (e.g., `https://qase-dashboard-xyz.vercel.app`)

### Step 2: Configure GitHub Pages Secret

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-vercel-app.vercel.app/api` (replace with your actual Vercel URL)

### Step 3: Enable GitHub Pages

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/pages
2. Under **"Source"**, select:
   - **Deploy from a branch**: `main`
   - **Branch**: `main` / `root`
3. Click **Save**

### Step 4: Wait for Deployment

- GitHub Actions will automatically build and deploy (check Actions tab)
- Your dashboard will be live at: **https://lukecoopz.github.io/qase-dashboard/**

## ✅ That's It!

Once both are deployed:
- **Frontend**: https://lukecoopz.github.io/qase-dashboard/
- **Backend**: Your Vercel URL

The dashboard will automatically connect to your backend API!

## 🔧 Troubleshooting

**Frontend shows errors?**
- Check GitHub Actions logs: https://github.com/lukecoopz/qase-dashboard/actions
- Verify `VITE_API_BASE_URL` secret is set correctly

**Backend not working?**
- Check Vercel dashboard: https://vercel.com/dashboard
- Verify `QASE_API_TOKEN` environment variable is set

