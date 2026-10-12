# Demo and Screenshot Guide

Use this flow for a 2-3 minute hackathon walkthrough.

## What This Proves

The demo should make six upgrades visible:

| Upgrade | Where to show it |
|---|---|
| Lightweight ML-style anomaly scoring | Early warnings card drivers include `ML anomaly score`, risk and confidence |
| Shared client/server alert logic | Dashboard alerts and `/api/alerts` use `shared/anomalyEngine.mjs` |
| Better map filters and heatmap | Dashboard map has heatmap, livestock corridor toggle, sector filter, alert-level filter and minimum weekly cases |
| Pashudhan report context | Reports preserve species, symptoms, mortality, vaccination, lab status, farm and block |
| Field response workflow | Alerts can move from investigating to sample collected, contained or resolved |
| Deployment-ready package | `docs/DEPLOYMENT.md`, health endpoint, environment variables and pre-deploy checks |

## Screenshots to Capture

Save these after running the app locally or on the deployed URL:

| Screenshot | What to show |
|---|---|
| `dashboard-map.png` | Dashboard with map bubbles, heat layer and top risk cards |
| `map-filters.png` | Sector, alert-level and minimum-case filters changing the map |
| `alert-explainability.png` | Early warning page with confidence, drivers and chart |
| `pipeline.png` | Data pipeline stage counts and source tables |
| `csv-upload.png` | Dashboard after uploading `data/sample-one-health.csv` |

Recommended capture size: desktop width around 1440px, plus one mobile screenshot around 390px wide.

Suggested folder:

```bash
mkdir -p docs/screenshots
```

Local app commands:

```bash
cd client
npm run build

cd ../server
npm run seed
npm run dev
```

Open `http://localhost:5000`, capture the screenshots above, and save them under `docs/screenshots/`.

You can also regenerate the full screenshot set with Playwright:

```bash
npm install
npm run screenshots
```

Set `SCREENSHOT_BASE_URL=https://YOUR_DEPLOYED_URL` to capture from a deployed app instead of local.
By default the script forces browser demo mode so MongoDB is not modified. Set `SCREENSHOT_FORCE_DEMO=false` if you intentionally want screenshots from live database data.

## Demo Script

1. Open the dashboard and point out the unified One Health view across human, animal and environment reports.
2. Toggle heatmap and livestock corridors on the map.
3. Use the map filters to show only high-risk or sector-specific locations.
4. Open an early warning and explain the confidence drivers:
   - recent spike above baseline
   - z-score
   - ML anomaly score
   - sectors rising together
   - weather or movement context
5. Upload `data/sample-one-health.csv` and show the dashboard preserving livestock fields.
6. Open an alert and update the field response status.
7. Open the data pipeline page to show how reports are cleaned, merged, scored and surfaced as alerts.

## Judge-facing Notes

- The anomaly engine is shared by frontend and backend through `shared/anomalyEngine.mjs`.
- The risk score combines rule thresholds with a lightweight isolation-forest style ML score.
- Map bubbles use current-week volume, the translucent heat layer scales by relative intensity, and filters can narrow by sector, active alerts, high-risk alerts or minimum case count.
- CSV upload can save to MongoDB for analyst/admin users, and still falls back to browser-only demo mode when the backend is unavailable.
- Report creation, CSV import and alert response updates are protected by role permissions.
