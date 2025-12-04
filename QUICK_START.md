# Quick Start Guide - GitHub Pages with GitHub Secret 🎉

Your repository is now public at: **https://github.com/lukecoopz/qase-dashboard**

## 🚀 Setup (5 Minutes)

### Step 1: Add GitHub Secret

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - **Name**: `QASE_API_TOKEN`
   - **Value**: Your Qase API token (from https://app.qase.io/user/api/token)
4. Click **"Add secret"**

### Step 2: Deploy Proxy Server to Render (Free)

1. **Go to**: https://render.com
2. **Sign up/Login** (free, no credit card needed)
3. **Click "New +"** → **"Web Service"**
4. **Connect GitHub** and select `qase-dashboard` repository
5. **Configure**:
   - **Name**: `qase-proxy` (or any name)
   - **Root Directory**: Leave empty
   - **Environment**: Node
   - **Build Command**: `npm install --prefix .` (or create `proxy/` folder and use `cd proxy && npm install`)
   - **Start Command**: `node proxy-server.js`
6. **Add Environment Variable**:
   - **Key**: `QASE_API_TOKEN`
   - **Value**: Your Qase API token (same as GitHub secret)
7. **Click "Create Web Service"**
8. **Wait for deployment** (takes ~2 minutes)
9. **Copy your service URL** (e.g., `https://qase-proxy.onrender.com`)

### Step 3: Add Proxy URL to GitHub Secrets

1. Go back to: https://github.com/lukecoopz/qase-dashboard/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - **Name**: `VITE_PROXY_BASE_URL`
   - **Value**: Your Render service URL (from Step 2, e.g., `https://qase-proxy.onrender.com`)
4. Click **"Add secret"**

### Step 4: Enable GitHub Pages

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/pages
2. Under **"Source"**, select:
   - **Deploy from a branch**: `main`
   - **Branch**: `main` / `root`
3. Click **Save**

### Step 5: Wait for Deployment

- GitHub Actions will automatically build and deploy
- Check the Actions tab to see progress
- Your dashboard will be live at: **https://lukecoopz.github.io/qase-dashboard/**

## ✅ That's It!

Your dashboard is now live! **No login required** - the token comes from your GitHub secret!

## 🔐 How It Works

1. **Browser** → Makes request to **Proxy Server** (no token needed)
2. **Proxy Server** → Uses `QASE_API_TOKEN` from environment → Forwards to **Qase API**
3. **Qase API** → Returns data to **Proxy Server**
4. **Proxy Server** → Returns data to **Browser** (with CORS headers)

## 📝 Alternative Hosting Options

### Railway (Alternative to Render)

1. Go to: https://railway.app
2. New Project → Deploy from GitHub
3. Select repository
4. Add environment variable: `QASE_API_TOKEN`
5. Set start command: `node proxy-server.js`
6. Deploy

### Fly.io (Alternative to Render)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (from project root)
fly launch

# Add secret
fly secrets set QASE_API_TOKEN=your_token_here

# Deploy
fly deploy
```

## 🔧 Troubleshooting

**Proxy server not working?**
- Check Render dashboard logs
- Verify `QASE_API_TOKEN` environment variable is set
- Test proxy directly: `https://your-proxy.onrender.com/health`

**GitHub Pages shows 404?**
- Check GitHub Actions logs
- Verify `VITE_PROXY_BASE_URL` secret is set correctly

**CORS errors?**
- Verify proxy URL is correct (no trailing slash)
- Check proxy server is running and accessible

## 💡 Why This Approach?

- ✅ **No login required** - Token comes from GitHub secret
- ✅ **Secure** - Token never exposed to browser
- ✅ **Free** - Render/Railway/Fly.io all have free tiers
- ✅ **Simple** - One-time setup, then automatic deployments
