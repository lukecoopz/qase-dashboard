# Qase Dashboard

A dashboard for viewing test case statistics from [Qase.io](https://qase.io), deployed on GitHub Pages with a Cloudflare Worker + D1 backend.

## Features

- Browse and drill into test suite hierarchies
- Track automation percentage across projects and suites
- Test case growth chart with historical trends (daily snapshots stored in Cloudflare D1)
- View test run history and results
- Query snapshot counts via API: `GET /snapshot/{code}?suite_id=…&date=…`

## Architecture

- **Frontend**: React + Vite, deployed to GitHub Pages
- **API Proxy**: Cloudflare Worker proxies Qase API requests and serves snapshot data
- **Snapshot Storage**: Cloudflare D1 (SQLite) — daily cron stores per-suite test counts
- **Daily Cron**: GitHub Actions runs `scripts/snapshot.mjs` at 6am UTC

## Getting Started

```bash
npm install
npm run dev
```

Requires a `.env` file with your Qase API token:

```env
QASE_API_TOKEN=your_token_here
```
