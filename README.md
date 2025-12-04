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

### 🚀 Easy Deployment with Vercel (Recommended - No Backend Server!)

**Deploy everything in one command** - Vercel handles both frontend and backend functions:

```bash
npm i -g vercel
vercel login
vercel --prod
```

Then set the `QASE_API_TOKEN` environment variable in Vercel dashboard.

**That's it!** Your dashboard will be live with API functions automatically available.

See [QUICK_START.md](./QUICK_START.md) for detailed instructions.

### Alternative: GitHub Pages + Vercel Functions

If you prefer GitHub Pages for the frontend:

1. Deploy functions to Vercel (as above)
2. Set `VITE_API_BASE_URL` secret in GitHub Actions to your Vercel API URL
3. Enable GitHub Pages in repository settings

### ⚠️ Important Security Notes

**The API token must never be exposed in client-side code.** The serverless functions keep your token secure on the server side.

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
