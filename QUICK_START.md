# Quick Start Guide - No Backend Server Needed! 🎉

Your repository is now public at: **https://github.com/lukecoopz/qase-dashboard**

## 🚀 Deploy Everything to Vercel (One Command!)

Vercel will host both your frontend AND backend functions - no separate server needed!

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Deploy to Vercel

```bash
cd /Users/lukecooper/Documents/Work/qase-dashboard
vercel login
vercel --prod
```

### Step 3: Set Environment Variable

When prompted, or after deployment:

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Key**: `QASE_API_TOKEN`
   - **Value**: Your Qase API token (from your `.env` file)
   - **Environment**: Production (and Preview if you want)
5. Click **Save**
6. Redeploy (or it will auto-redeploy)

### Step 4: That's It! 🎉

Your dashboard will be live at: `https://qase-dashboard-xyz.vercel.app`

The API functions are automatically available at `/api/*` on the same domain.

## 🔄 Alternative: GitHub Pages + Vercel Functions

If you prefer GitHub Pages for the frontend:

### Step 1: Deploy Functions to Vercel (as above)

### Step 2: Configure GitHub Pages Secret

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/secrets/actions
2. Add secret:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-vercel-app.vercel.app/api`

### Step 3: Enable GitHub Pages

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/pages
2. Source: Deploy from branch `main` / `root`
3. Click **Save**

Your dashboard will be at: **https://lukecoopz.github.io/qase-dashboard/**

## ✅ Benefits of This Approach

- ✅ **No backend server to maintain** - Functions run on-demand
- ✅ **Free tier** - Vercel has generous free limits
- ✅ **Automatic HTTPS** - Secure by default
- ✅ **Easy updates** - Just push to GitHub, Vercel auto-deploys
- ✅ **API token stays secure** - Never exposed to client

## 🔧 Troubleshooting

**Functions return 500 errors?**
- Check Vercel dashboard → Functions → Logs
- Verify `QASE_API_TOKEN` environment variable is set

**Frontend can't connect?**
- Check browser console for CORS errors
- Verify API routes are accessible: `https://your-app.vercel.app/api/case/MA`
