# Quick Start Guide - GitHub Pages Only! 🎉

Your repository is now public at: **https://github.com/lukecoopz/qase-dashboard**

## 🚀 Deploy to GitHub Pages (No Backend Needed!)

Everything runs in the browser - no servers, no Vercel, just GitHub Pages!

### Step 1: Enable GitHub Pages

1. Go to: https://github.com/lukecoopz/qase-dashboard/settings/pages
2. Under **"Source"**, select:
   - **Deploy from a branch**: `main`
   - **Branch**: `main` / `root`
3. Click **Save**

### Step 2: Wait for Deployment

- GitHub Actions will automatically build and deploy
- Your dashboard will be live at: **https://lukecoopz.github.io/qase-dashboard/**

### Step 3: Login with Your Qase Token

1. Visit your dashboard
2. Enter your Qase API token when prompted
3. Your token is stored locally in your browser (never sent anywhere except Qase API)

## ✅ That's It!

The dashboard is now live and ready to use!

## 🔐 How It Works

- **No backend server** - Everything runs in your browser
- **Secure** - Your API token is stored locally in your browser (localStorage)
- **Direct API calls** - The dashboard makes direct calls to Qase API
- **Auto-deploy** - Push to GitHub, GitHub Pages updates automatically

## 📝 Getting Your Qase API Token

1. Go to: https://app.qase.io/user/api/token
2. Copy your API token
3. Paste it in the login form when you visit the dashboard

## ⚠️ Important Notes

- **CORS**: If you encounter CORS errors, Qase API may not allow direct browser access. In that case, you may need to use a browser extension or contact Qase support.
- **Token Storage**: Your token is stored in browser localStorage. Clear your browser data to remove it.
- **Security**: Never share your API token. It's stored locally and only used to make API calls to Qase.

## 🔧 Troubleshooting

**Dashboard shows CORS error?**
- Check browser console for details
- Qase API may require a proxy server (contact Qase support)

**Token not working?**
- Verify your token at: https://app.qase.io/user/api/token
- Make sure you're using the correct project code (MA)

**GitHub Pages shows 404?**
- Check GitHub Actions logs: https://github.com/lukecoopz/qase-dashboard/actions
- Verify repository name matches base path in `vite.config.ts`
