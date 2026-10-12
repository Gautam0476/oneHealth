# Hackathon Completion Checklist

Use this as the judge-facing map from the final prompt to the project files.

| Requested work | Status | Implementation |
|---|---|---|
| Add real ML-style anomaly module | Done | `shared/anomalyEngine.mjs` includes deterministic isolation-forest style scoring, confidence, risk, drivers and rule fallback |
| Shift client/server alert logic into shared utility | Done | React imports `computeAlerts` from `shared/anomalyEngine.mjs`; Express uses `server/detect.js` as a CommonJS bridge to the same module |
| Add map filters and better heatmap layer | Done | `client/src/App.jsx` has Leaflet map filters for sector, alert level and minimum weekly cases, plus heatmap and corridor layers |
| Add Pashudhan-specific report context | Done | `Report.js`, CSV import and the report form support species, symptoms, mortality, vaccination status, lab status, farm and block |
| Add field response tracking | Done | Alert validation records now include response status from new through resolved |
| Add deployment and screenshots/demo docs | Done | `docs/DEPLOYMENT.md`, `docs/DEMO.md` and this checklist cover deploy commands, environment variables, screenshot targets and demo script |

## Verification

Run the backend tests:

```bash
cd server
npm test
```

Run the frontend production build:

```bash
cd client
npm run build
```

Optional API smoke check after starting the server:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/alerts
```

## Demo Evidence

These screens have been generated under `docs/screenshots/`:

- `dashboard-map.png`: heatmap, bubbles, top alerts
- `map-filters.png`: sector/alert/minimum-case filters
- `alert-explainability.png`: ML anomaly score, z-score, confidence drivers and chart
- `pipeline.png`: collect, clean, merge, detect and alert stages
- `csv-upload.png`: sample CSV loaded in-browser

Run `npm run screenshots` from the project root to refresh them.
