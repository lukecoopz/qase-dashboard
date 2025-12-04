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

This creates a `dist` folder with static files.

## Configuration

The dashboard is configured to use:

- **Project Code**: MA

By default, the dashboard loads test cases from the "Progress AI" suite group (ID: 96) and its children. You can filter by specific test suites using the dropdown filter in the dashboard.

## Features

- **Total Tests**: Count of all test cases in selected suites
- **Automation Rate**: Percentage of automated tests
- **Distribution Charts**: Visual breakdowns by:
  - Status (Actual, Draft, Deprecated)
  - Priority (Critical, High, Medium, Low, Trivial)
  - Severity (Critical, Major, Normal, Minor, Trivial)
  - Type (Functional, Integration, UI/UX, API, Performance, Security, Smoke, Regression)
- **Test Case List**: Expandable list of test cases grouped by suite, with detailed step information

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
