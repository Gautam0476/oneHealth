# Deployment Guide

This app has two deployable parts:

- `client`: React + Vite dashboard
- `server`: Express API that also serves `client/dist` after build

## Single-service Deploy
Use this when the hosting provider can run Node.js and serve the built frontend from Express.

Build command:

```bash
cd client && npm install && npm run build
cd ../server && npm install
```

Start command:

```bash
cd server && npm start
```

Environment variables:

| Variable | Required | Notes |
|---|---:|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `PORT` | No | Hosting providers often inject this |
| `CORS_ORIGIN` | Recommended | Public frontend URL, for example `https://onehealth.example.com` |
| `RATE_LIMIT_MAX` | No | Defaults to `300` API requests per IP every 15 minutes |
| `AUTH_SECRET` | Yes | Signs role tokens for analyst/admin actions |
| `AUTH_USERS` | Recommended | Production users as JSON or `username:password:role;...` |
| `ADMIN_TOKEN` | Optional | Legacy fallback accepted as `x-admin-token` |

## Split Deploy
Use this when deploying the frontend and API separately.

Frontend:

```bash
cd client
npm install
npm run build
```

API:

```bash
cd server
npm install
npm start
```

Set `CORS_ORIGIN` on the API to the deployed frontend URL.

## Pre-deploy Checks

```bash
cd server
npm test
node --check server.js
node --check routes/reports.js

cd ../client
npm run build
```

## Production Smoke Test

After deploy, check:

```bash
curl https://YOUR_DEPLOYED_URL/api/health
curl https://YOUR_DEPLOYED_URL/api/alerts
```

Expected:

- `/api/health` returns `{ "ok": true, "database": true }` when MongoDB is connected.
- `/api/alerts` returns an array. It can be empty when no city crosses the alert rules.
- The top-right dashboard label should say `Connected to database`; if it says `Demo data`, check `MONGO_URI` and deployment logs.

## Demo Data

For a fresh MongoDB database, seed sample reports once:

```bash
cd server
npm run seed
```

For judge demos without touching MongoDB, use dashboard CSV upload with `data/sample-one-health.csv`.
