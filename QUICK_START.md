# Quick Start Guide - GitHub Pages with CORS Proxy 🎉

Your repository is now public at: **https://github.com/lukecoopz/qase-dashboard**

## 🚀 Setup (5 Minutes)

### Step 1: Deploy Cloudflare Worker Proxy (Required for CORS)

1. **Go to**: https://workers.cloudflare.com/
2. **Sign up/Login** (free, no credit card needed)
3. **Click "Create a Worker"**
4. **Name it** (e.g., `qase-proxy`)
5. **Copy the code from `cloudflare-worker.js`** in this repo
6. **Paste it** into the Cloudflare Worker editor
7. **Click "Deploy"**
8. **Copy your Worker URL** (e.g., `https://qase-proxy.your-subdomain.workers.dev`)

### Step 2: Configure GitHub Secret

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - **Name**: `VITE_CORS_PROXY_URL`
   - **Value**: Your Cloudflare Worker URL (from Step 1)
4. Click **"Add secret"**

### Step 3: Enable GitHub Pages

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/pages
2. Under **"Source"**, select:
   - **Deploy from a branch**: `main`
   - **Branch**: `main` / `root`
3. Click **Save**

### Step 4: Wait for Deployment

- GitHub Actions will automatically build and deploy
- Check the Actions tab to see progress
- Your dashboard will be live at: **https://lukecoopz.github.io/qase-dashboard/**

### Step 5: Login

1. Visit your dashboard
2. Enter your Qase API token
3. Your token is stored locally in your browser

## ✅ That's It!

Your dashboard is now live and working!

## 🔐 How It Works

1. **Browser** → Makes request to **Cloudflare Worker** (with token)
2. **Cloudflare Worker** → Forwards request to **Qase API** (adds CORS headers)
3. **Qase API** → Returns data to **Cloudflare Worker**
4. **Cloudflare Worker** → Returns data to **Browser** (with CORS headers)

## 📝 Getting Your Qase API Token

1. Go to: https://app.qase.io/user/api/token
2. Copy your API token
3. Paste it in the login form

## 🔧 Troubleshooting

**CORS errors still appearing?**
- Verify `VITE_CORS_PROXY_URL` secret is set correctly
- Check Cloudflare Worker is deployed and accessible
- Verify Worker URL is correct (no trailing slash)

**GitHub Pages shows 404?**
- Check GitHub Actions logs
- Verify repository name matches base path in `vite.config.ts`

**Token not working?**
- Verify token at: https://app.qase.io/user/api/token
- Check browser console for errors

## 💡 Why Cloudflare Worker?

- **Free tier**: 100,000 requests/day (plenty for personal use)
- **Fast**: Edge network, low latency
- **Simple**: Just copy-paste code, no configuration needed
- **Secure**: Your token is only sent through the proxy to Qase API
