# Qase Dashboard

A beautiful glass-morphism dashboard for viewing test case statistics from Qase.io.

## Features

- 📊 View test case statistics for specific test suites
- 🤖 Track automation percentage
- 📈 Visualize distributions by status, priority, severity, and type
- 🎨 Beautiful Dracula-themed dark UI with glass morphism effects
- 🔄 Support for multiple test suites
- 📱 Responsive design

## Getting Started

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory with your Qase API token:

```env
QASE_API_TOKEN=your_token_here
```

**Important**: The `.env` file is already in `.gitignore` to keep your token secure. Never commit your API token to version control.

### Development

The project uses a proxy server to avoid CORS issues with the Qase API. Run:

```bash
npm run dev
```

This will start:

- **Backend proxy server** on `http://localhost:3001`
- **Frontend development server** on `http://localhost:5173`

The dashboard will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

This creates a `dist` folder with static files ready for deployment.

## Deployment

### 🚀 Deploy to GitHub Pages with GitHub Secret

**Use your GitHub repository secret `QASE_API_TOKEN`** - no need to login in the browser!

#### Step 1: Deploy Proxy Server (One-Time Setup)

Deploy the proxy server to any free Node.js hosting service:

**Option A: Render (Recommended - Easiest)**
1. Go to: https://render.com
2. Sign up (free tier available)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `qase-proxy`
   - **Root Directory**: Leave empty (or create a subdirectory)
   - **Environment**: Node
   - **Build Command**: `cd proxy && npm install` (if using subdirectory) or `npm install --prefix .` 
   - **Start Command**: `node proxy-server.js`
6. Add environment variable:
   - **Key**: `QASE_API_TOKEN`
   - **Value**: Your Qase API token (or use GitHub secret via Render's GitHub integration)
7. Deploy and copy your service URL (e.g., `https://qase-proxy.onrender.com`)

**Option B: Railway**
1. Go to: https://railway.app
2. New Project → Deploy from GitHub
3. Select your repository
4. Add environment variable: `QASE_API_TOKEN` = your token
5. Set start command: `node proxy-server.js`
6. Deploy and copy URL

**Option C: Fly.io**
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run: `fly launch`
3. Add secret: `fly secrets set QASE_API_TOKEN=your_token`
4. Deploy: `fly deploy`

#### Step 2: Configure GitHub Secrets

1. **Go to GitHub repository settings** → **Secrets and variables** → **Actions**
2. **Add secrets**:
   - `QASE_API_TOKEN`: Your Qase API token
   - `VITE_PROXY_BASE_URL`: Your proxy server URL (from Step 1)

#### Step 3: Enable GitHub Pages

1. **Go to repository settings** → **Pages**
2. **Source**: Deploy from branch `main` / `root`
3. **Click Save**

#### Step 4: Deploy

Push to main branch - GitHub Actions will auto-deploy with the proxy URL!

See [QUICK_START.md](./QUICK_START.md) for detailed instructions.

### ⚠️ Important Notes

- **No Login Required**: When proxy is configured, users don't need to login - token comes from GitHub secret
- **CORS Proxy Required**: The proxy server bypasses CORS restrictions
- **Free Tier**: Render/Railway/Fly.io all have free tiers (more than enough for personal use)
- **Token Security**: Token is stored in GitHub secrets and proxy server, never exposed to browser

### Making the Repository Public

✅ **Safe to make public:**
- All frontend code (React components, TypeScript)
- Server code structure (won't work without the token)
- Configuration files (package.json, tsconfig.json, etc.)

❌ **Never commit:**
- `.env` file (already in `.gitignore`)
- Any files containing API tokens
- Backend environment variables

**Before making public, verify:**
1. `.env` is in `.gitignore` ✅
2. No hardcoded tokens in code ✅
3. Backend URL is configurable via environment variable ✅

## Configuration

The dashboard is configured to use:

- **Project Code**: MA

By default, the dashboard loads **all test cases** from the project. You can then filter by specific test suites using the dropdown filter in the dashboard.

## Features

- **Total Tests**: Count of all test cases in selected suites
- **Automation Rate**: Percentage of automated tests
- **Distribution Charts**: Visual breakdowns by:
  - Status (Actual, Draft, Deprecated)
  - Priority (Critical, High, Medium, Low, Trivial)
  - Severity (Critical, Major, Normal, Minor, Trivial)
  - Type (Functional, Integration, UI/UX, API, Performance, Security, Smoke, Regression)

## Color Scheme

The dashboard uses the Dracula color palette:

- Background: `#282A36`
- Foreground: `#F8F8F2`
- Cyan: `#8BE9FD`
- Green: `#50FA7B`
- Orange: `#FFB86C`
- Pink: `#FF79C6`
- Purple: `#BD93F9`
- Red: `#FF5555`
- Yellow: `#F1FA8C`
