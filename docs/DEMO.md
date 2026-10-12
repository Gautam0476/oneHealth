# Demo Guide

Use this flow for a 2-3 minute hackathon walkthrough.

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
5. Upload `data/sample-one-health.csv` and show the dashboard updating without changing the database.
6. Open the data pipeline page to show how reports are cleaned, merged, scored and surfaced as alerts.

## Judge-facing Notes

- The anomaly engine is shared by frontend and backend through `shared/anomalyEngine.mjs`.
- The risk score combines rule thresholds with a lightweight isolation-forest style ML score.
- CSV upload is browser-only by design for demo safety; MongoDB-backed reports still work through the API.
- Report creation can be protected in public deployments with `ADMIN_TOKEN`.
