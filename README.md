# One Health Dashboard

One place to see human, animal and environment health reports, spot unusual rises early, and watch livestock movement. Built for Impact Hackathon, Track 05.

## Run it
1. Install Node.js 20.19 or newer. Have a MongoDB ready (local, or a free MongoDB Atlas link).
2. `cd client && npm install && npm run build`
3. `cd ../server`
4. `npm install`
5. Copy `.env.example` to `.env` and set `MONGO_URI`.
6. `npm run seed` (adds sample reports, run it once), then `npm run dev`.
7. Open http://localhost:5000

The server serves the React build from `client/dist`. If MongoDB is not connected, the server still starts and the dashboard shows demo data.

For frontend-only development, run `npm run dev` inside `client`. Vite opens the React + Tailwind app at http://localhost:5173 and proxies `/api` to the backend on port 5000.

## Configuration
| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `PORT` | Express port, default `5000` |
| `CORS_ORIGIN` | Comma-separated list of frontend origins allowed to call the API |
| `RATE_LIMIT_MAX` | API requests allowed per IP every 15 minutes, default `300` |
| `ADMIN_TOKEN` | Optional write token. When set, `POST /api/reports` must include `x-admin-token` |

## Checks
Run backend tests with:

```bash
cd server
npm test
```

Run the frontend production build with:

```bash
cd client
npm run build
```

## What works
- **Dashboard:** map with heatmap and livestock corridor toggles, early warnings, weekly stats, charts.
- **CSV live upload:** use "Upload CSV Dataset" on the dashboard to load any compatible `.csv` dataset directly in the browser. The CSV must include cases/count/value and disease/signal/sector style headers, plus either a location column or latitude/longitude. The map, charts and alerts update immediately without saving the CSV to MongoDB. A ready demo file is included at `data/sample-one-health.csv`.
- **Reports:** add a report (saved in MongoDB), filter by sector and location.
- **Alerts:** multivariate anomaly score, confidence, recommended actions, and a chart showing why a city was flagged.
- **Data pipeline:** stages, sources, climate and corridor tables.
- The top right label shows "Connected to database", or "Demo data" if the server is offline.

## API
| Route | What it does |
|---|---|
| `GET /api/reports?sector=&location=&limit=` | List reports, newest first |
| `POST /api/reports` | Add a report: `{ disease, sector, location, cases, latitude?, longitude?, date? }` |
| `GET /api/alerts` | Cities with an unusual rise this week |
| `GET /api/dashboard/stats` | This week and last week totals per sector |
| `GET /api/health` | Quick check that the server is up |

`GET /api/reports` validates sector filters and clamps `limit` to 1-500. `POST /api/reports` rejects invalid cases, coordinates and dates instead of silently storing bad values.

## Security notes
- The API uses security headers, a small JSON body limit and a per-IP rate limit.
- CORS can be locked down with `CORS_ORIGIN` for deployed frontend URLs.
- Set `ADMIN_TOKEN` before public deployment if report creation should be restricted.

## How an alert is raised
For each city, the last 7 days are compared with the 23 days before. A city is flagged when it has at least 8 reports this week, runs at least 1.8 times its usual level, and its z-score is 2 or more. The anomaly engine then computes a confidence/risk score (0 to 100) from:

- report volume
- ratio above usual activity
- z-score above the baseline
- sectors rising together
- unusual weather
- livestock corridor load leaving the city

This is an explainable anomaly engine for early warning, not a confirmed outbreak diagnosis.

## What is real and what is sample
- Real: reports in MongoDB, optional latitude/longitude on reports, CSV ingestion in the browser, the anomaly/risk logic, adding and filtering reports.
- Sample: climate readings and livestock corridors are fixed demo values in `client/src/App.jsx` (`ENV` and `CORRIDORS`). The server uses the same demo context in `server/detect.js`. The map uses Leaflet and OpenStreetMap, so uploaded CSV rows can create bubbles beyond the original demo cities when coordinates or recognized city names are present.
- The browser works out alerts from the reports it loads. `server/detect.js` does the same on the server (`GET /api/alerts`).

## Demo flow
1. Start the app.
2. Open the dashboard.
3. Click "Upload CSV Dataset".
4. Pick `data/sample-one-health.csv`.
5. Show the map bubbles, red alerts, confidence drivers, alert chart, and data pipeline tables.

## Folders
```
client/src/App.jsx         React dashboard
client/src/styles.css      Tailwind entry and theme variables
client/tailwind.config.js  Tailwind setup
client/dist/               built frontend served by Express
server/server.js           starts the app
server/detect.js           alert logic
server/seed.js             sample data
server/models/Report.js    report schema
server/routes/             reports.js, alerts.js
```
