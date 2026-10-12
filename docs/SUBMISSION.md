# Submission Notes

Use this file as the final hackathon handoff summary.

## Project Pitch

One Health Dashboard brings human, animal and environmental health signals into one dashboard. It highlights unusual city-level rises early, explains why an alert was raised, and shows livestock movement routes that may need investigation.

## What Is Complete

- Real ML-style anomaly module in `shared/anomalyEngine.mjs`
- Shared alert logic used by both React and Express
- Leaflet map with heatmap, sector filter, alert filter, minimum-case filter and livestock corridors
- CSV upload demo with `data/sample-one-health.csv`, including animal species, mortality, vaccination and lab-status columns
- Pashudhan report workflow for species, symptoms, farm/block, suspected or lab-confirmed status
- Field response workflow for alerts: new, investigating, sample collected, contained and resolved
- Explainable alert page with baseline chart, z-score, ML anomaly score, risk and confidence drivers
- Data pipeline page showing collect, clean, merge, detect and alert stages
- Demo screenshots saved under `docs/screenshots/`

## Demo Flow

1. Open the dashboard and show the One Health view across all sectors.
2. Toggle heatmap and livestock corridors.
3. Change map filters to show alerting or high-risk cities.
4. Open Alerts and explain the ML anomaly score, z-score and confidence drivers.
5. Upload `data/sample-one-health.csv` and show the dashboard preserving livestock fields.
6. On Alerts, mark one alert investigated/sample collected to show field response tracking.
7. Open Data pipeline and show how reports become alerts.

## Verification Commands

```bash
cd server
npm test
node --check server.js

cd ../client
npm run build
```

Screenshot regeneration:

```bash
npm install
npm run screenshots
```

## Demo Data Note

Reports can come from MongoDB or from browser CSV upload. Livestock report details are stored/imported when present. Climate readings and livestock corridor volumes are sample context for the demo. Alerts are early-warning signals to investigate, not confirmed outbreak diagnoses.
