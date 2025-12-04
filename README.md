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

### ⚠️ Important Security Notes

**This project requires a backend proxy server** to keep your Qase API token secure. The token must **never** be exposed in client-side code.

### Deployment Options

#### Option 1: GitHub Pages (Static Frontend Only)

**Requirements:**
- You must host the backend proxy server separately (see Option 2)
- Update the frontend to point to your hosted backend URL

**Steps:**

1. **Host the backend proxy server** on a platform like:
   - [Vercel](https://vercel.com) (recommended - free tier available)
   - [Railway](https://railway.app) (free tier available)
   - [Render](https://render.com) (free tier available)
   - [Fly.io](https://fly.io) (free tier available)

2. **Set environment variable** `VITE_API_BASE_URL` in your GitHub Pages build:
   - Create `.env.production` file with: `VITE_API_BASE_URL=https://your-backend-url.com/api`
   - Or set it in your CI/CD pipeline

3. **Deploy frontend to GitHub Pages:**
   ```bash
   npm run build
   # Deploy the dist folder to GitHub Pages
   ```

#### Option 2: Full Stack Deployment (Recommended)

Deploy both frontend and backend together:

- **Vercel**: Can host both with serverless functions
- **Railway**: Full-stack deployment support
- **Render**: Supports both frontend and backend

**Backend Environment Variables:**
- `QASE_API_TOKEN`: Your Qase API token (set in hosting platform's environment variables)

**Frontend Environment Variables:**
- `VITE_API_BASE_URL`: Your backend API URL (e.g., `https://your-app.vercel.app/api`)

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
