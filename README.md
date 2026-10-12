# One Health Dashboard

One place to see human, animal and environment health reports, spot unusual rises early, and watch livestock movement. Built for Impact Hackathon, Track 05.

## Run it
1. Install Node.js 20.19 or newer.
2. `cd client && npm install && npm run build`
3. `cd ../server`
4. `npm install`
5. Optional for database mode: copy `.env.example` to `.env`, set `MONGO_URI`, then run `npm run seed` once.
6. `npm run dev`
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
| `AUTH_SECRET` | Secret used to sign role login tokens |
| `AUTH_USERS` | Optional users as JSON or `username:password:role;...` |
| `BOOTSTRAP_AUTH_USERS` | Set to `false` to stop startup from upserting configured users into MongoDB |
| `ADMIN_TOKEN` | Optional legacy admin token, still accepted as `x-admin-token` |

Default demo logins are `admin/admin123`, `analyst/analyst123`, and `viewer/viewer123`. When MongoDB is connected, the server stores those configured users with salted password hashes. Set `AUTH_USERS`, `ADMIN_PASSWORD`, `ANALYST_PASSWORD`, `VIEWER_PASSWORD`, and `AUTH_SECRET` before public deployment.

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

Deployment and demo notes:

- [Deployment guide](docs/DEPLOYMENT.md)
- [Demo and screenshot guide](docs/DEMO.md)
- [Hackathon completion checklist](docs/HACKATHON_CHECKLIST.md)
- [Submission notes](docs/SUBMISSION.md)

## Submission Snapshot
The hackathon-ready build includes:

- shared frontend/backend anomaly engine with ML-style scoring
- Leaflet map with heatmap, corridor layer and filters
- CSV upload demo using `data/sample-one-health.csv`
- generated screenshots in `docs/screenshots/`
- repeatable screenshot capture with `npm run screenshots`

Key screenshots:

- [Dashboard map](docs/screenshots/dashboard-map.png)
- [Map filters](docs/screenshots/map-filters.png)
- [Alert explainability](docs/screenshots/alert-explainability.png)
- [Data pipeline](docs/screenshots/pipeline.png)
- [CSV upload](docs/screenshots/csv-upload.png)

## What works
- **Dashboard:** map with heatmap, livestock corridor toggles, sector/risk filters, early warnings, weekly stats, charts.
- **CSV import:** use "Upload CSV Dataset" on the dashboard to save any compatible `.csv` dataset to MongoDB when logged in as analyst/admin. If the backend is unavailable, the same button still loads the CSV in-browser for demo mode. The CSV must include cases/count/value and disease/signal/sector style headers, plus either a location column or latitude/longitude. Pashudhan columns such as species, symptoms, mortality, vaccination status, lab status, farm ID and block/village are preserved when present. A ready demo file is included at `data/sample-one-health.csv`.
- **Reports:** add a report (saved in MongoDB), filter by sector and location, and capture animal species, symptoms, mortality, vaccination, suspected/confirmed status, farm and block for livestock cases.
- **Roles:** login as viewer, analyst or admin. Analysts/admins can save live reports, validate alerts and update field response status.
- **Admin:** admins can create users, change roles, disable accounts, inspect recent audit logs and review data quality/provenance indicators.
- **Alerts:** shared frontend/backend anomaly engine with rule thresholds, a calibrated ML ensemble score, validation checks, confidence, recommended actions, and a chart showing why a city was flagged.
- **Data pipeline:** stages, sources, climate, corridor, ML model, validation, report quality and provenance tables.
- The top right label shows "Connected to database", or "Demo data" if the server is offline.

## API
| Route | What it does |
|---|---|
| `GET /api/reports?sector=&location=&limit=` | List reports, newest first |
| `POST /api/reports` | Add a report: `{ disease, sector, location, cases, latitude?, longitude?, date? }` |
| `POST /api/reports/import-csv` | Upload multipart CSV as analyst/admin and persist valid rows to MongoDB |
| `GET /api/alerts` | Cities with an unusual rise this week |
| `POST /api/alerts/:location/validate` | Mark an alert `validated`, `review` or `dismissed` |
| `POST /api/alerts/:location/respond` | Move a field response through `new`, `investigating`, `sample_collected`, `contained` or `resolved` |
| `POST /api/auth/login` | Login and receive a signed role token |
| `GET /api/auth/me` | Check the current role token |
| `GET /api/admin/users` | Admin-only user and role list |
| `POST /api/admin/users` | Admin-only user creation |
| `PATCH /api/admin/users/:username` | Admin-only role, password or active-status update |
| `GET /api/admin/audit` | Admin-only audit trail for login, report, alert and user-management actions |
| `GET /api/admin/quality` | Admin-only report quality, source mix and provenance summary |
| `GET /api/ml/model` | Versioned ML model profile and backtest metrics |
| `GET /api/dashboard/stats` | This week and last week totals per sector |
| `GET /api/context/weather?points=City:lat:lon\|City:lat:lon` | Optional live weather context from Open-Meteo with Mongo/in-memory cache |
| `GET /api/health` | Quick check that the server is up |

`GET /api/reports` validates sector filters and clamps `limit` to 1-500. `POST /api/reports` rejects invalid cases, coordinates and dates instead of silently storing bad values.

## Security notes
- The API uses security headers, a small JSON body limit and a per-IP rate limit.
- CORS can be locked down with `CORS_ORIGIN` for deployed frontend URLs.
- Set `AUTH_SECRET` and non-demo passwords before public deployment. Report creation and manual alert validation require analyst/admin permissions.

## How an alert is raised
For each city, the last 7 days are compared with the 23 days before. A city is flagged when it has at least 8 reports this week, runs at least 1.8 times its usual level, and its z-score is 2 or more. The shared anomaly engine also calculates a lightweight isolation-forest style ML score from recent volume, ratio, z-score, active sectors, climate context and corridor load. Confidence/risk score (0 to 100) comes from:

- report volume
- ratio above usual activity
- z-score above the baseline
- ML anomaly score
- sectors rising together
- unusual weather
- livestock corridor load leaving the city

This is an explainable anomaly engine for early warning, not a confirmed outbreak diagnosis.

## What is real and what is sample
- Real: reports in MongoDB, Pashudhan-specific animal fields, DB-backed role users with salted password hashes, admin user management, audit logs, report quality/provenance scoring, persistent manual alert validations and response status, optional latitude/longitude on reports, server-side CSV import to MongoDB, browser-only CSV fallback, the anomaly/risk logic, adding and filtering reports.
- Live optional: the dashboard asks `/api/context/weather` for Open-Meteo readings when the backend is available; the app falls back to demo climate context if the external API is unavailable.
- Sample: livestock corridors are fixed demo values in `client/src/App.jsx` (`CORRIDORS`). Demo climate defaults still seed the alert engine before live weather context arrives. The map uses Leaflet with Esri Dark Gray basemap tiles, so uploaded CSV rows can create bubbles beyond the original demo cities when coordinates or recognized city names are present.
- The browser and `server/detect.js` both use `shared/anomalyEngine.mjs`, so dashboard and API alerts stay aligned.

## Demo flow
1. Start the app.
2. Open the dashboard.
3. Click "Upload CSV Dataset".
4. Pick `data/sample-one-health.csv`.
5. Show the map bubbles, red alerts, confidence drivers, alert chart, and data pipeline tables.
6. On Alerts, update a field response from investigating to sample collected/resolved to show the operational workflow.

## Folders
```
client/src/App.jsx         React dashboard
client/src/styles.css      Tailwind entry and theme variables
client/tailwind.config.js  Tailwind setup
client/dist/               built frontend served by Express
shared/anomalyEngine.mjs   shared rule + ML-style anomaly scoring
server/server.js           starts the app
server/detect.js           alert logic
server/seed.js             sample data
server/models/Report.js    report schema
server/routes/             reports.js, alerts.js
server/test/               backend tests
docs/                      deployment and demo notes
```
