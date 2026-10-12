import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { cityStats, computeAlerts as computeSharedAlerts } from '../../shared/anomalyEngine.mjs';

const SECTORS = {
  human: 'Human',
  animal: 'Animal',
  environment: 'Environment',
};

const COLORS = {
  human: 'var(--human)',
  animal: 'var(--animal)',
  environment: 'var(--env)',
  alert: 'var(--alert)',
};

const DISEASES = {
  human: ['Dengue', 'Leptospirosis', 'Rabies', 'Brucellosis'],
  animal: ['Avian influenza', 'Anthrax', 'Brucellosis', 'Foot-and-mouth'],
  environment: ['Heat index', 'Rainfall anomaly', 'Water contamination'],
};

const CITY_COORDS = {
  Agartala: [23.84, 91.28],
  Agra: [27.18, 78.01],
  Ahmedabad: [23.02, 72.57],
  Aizawl: [23.73, 92.72],
  Ajmer: [26.45, 74.64],
  Amritsar: [31.63, 74.87],
  Bengaluru: [12.97, 77.59],
  Bhopal: [23.26, 77.41],
  Bhubaneswar: [20.3, 85.82],
  Chandigarh: [30.73, 76.78],
  Chennai: [13.08, 80.27],
  Coimbatore: [11.02, 76.96],
  Dehradun: [30.32, 78.03],
  Delhi: [28.61, 77.21],
  Dhanbad: [23.8, 86.43],
  Dispur: [26.14, 91.79],
  Faridabad: [28.41, 77.32],
  Ghaziabad: [28.67, 77.45],
  Goa: [15.49, 73.83],
  Gorakhpur: [26.76, 83.37],
  Guwahati: [26.14, 91.74],
  Gwalior: [26.22, 78.18],
  Hyderabad: [17.39, 78.49],
  Imphal: [24.82, 93.94],
  Indore: [22.72, 75.86],
  Itanagar: [27.08, 93.61],
  Jabalpur: [23.18, 79.99],
  Jaipur: [26.91, 75.79],
  Jammu: [32.73, 74.86],
  Jamshedpur: [22.8, 86.2],
  Jodhpur: [26.24, 73.02],
  Kanpur: [26.45, 80.33],
  Kochi: [9.93, 76.27],
  Kohima: [25.67, 94.11],
  Kolkata: [22.57, 88.36],
  Kota: [25.21, 75.86],
  Kozhikode: [11.26, 75.78],
  Lucknow: [26.85, 80.95],
  Ludhiana: [30.9, 75.86],
  Madurai: [9.93, 78.12],
  Meerut: [28.98, 77.71],
  Mumbai: [19.08, 72.88],
  Mysuru: [12.3, 76.64],
  Nagpur: [21.15, 79.09],
  Nashik: [19.99, 73.79],
  Noida: [28.54, 77.39],
  Panaji: [15.49, 73.83],
  Patna: [25.61, 85.14],
  Puducherry: [11.94, 79.81],
  Pune: [18.52, 73.86],
  Raipur: [21.25, 81.63],
  Rajkot: [22.3, 70.8],
  Ranchi: [23.34, 85.31],
  Shillong: [25.58, 91.89],
  Shimla: [31.1, 77.17],
  Siliguri: [26.73, 88.4],
  Srinagar: [34.08, 74.8],
  Surat: [21.17, 72.83],
  Thiruvananthapuram: [8.52, 76.94],
  Udaipur: [24.59, 73.71],
  Vadodara: [22.31, 73.18],
  Varanasi: [25.32, 82.97],
  Vijayawada: [16.51, 80.64],
  Visakhapatnam: [17.69, 83.22],
};

const LOCATIONS = Object.entries(CITY_COORDS).map(([name, [lat, lon]]) => [name, lon, lat]);

const OUTLINE = [
  [74.5, 37],
  [77.8, 35.5],
  [79, 32.5],
  [81, 30],
  [88, 27.8],
  [88.5, 26.5],
  [92, 27.8],
  [97, 28],
  [96, 26],
  [93, 23.5],
  [89, 22],
  [86.9, 21.2],
  [85, 19.5],
  [82, 16.5],
  [80.3, 15],
  [80.2, 13],
  [79.8, 10.3],
  [77.5, 8.1],
  [76.2, 9.8],
  [75, 12.5],
  [73.8, 15.5],
  [72.8, 19],
  [72.6, 21],
  [70, 20.9],
  [69, 22.3],
  [70.5, 23.2],
  [68.2, 23.7],
  [71, 25],
  [70, 27],
  [72, 29],
  [74.5, 31],
  [74.5, 34],
];

const LEFT_LABELS = new Set(['Mumbai', 'Jaipur', 'Bengaluru', 'Bhopal']);

const ENV = Object.fromEntries(
  LOCATIONS.map(([name], index) => [
    name,
    [Number((((index * 7) % 9) / 4 - 0.6).toFixed(1)), ((index * 13) % 50) - 20],
  ]),
);
ENV.Jaipur = [3.8, -30];
ENV.Guwahati = [1.2, 64];

const CORRIDORS = [
  ['Jaipur', 'Delhi', 1800],
  ['Jaipur', 'Lucknow', 900],
  ['Jaipur', 'Bhopal', 700],
  ['Guwahati', 'Kolkata', 1500],
  ['Guwahati', 'Patna', 800],
  ['Mumbai', 'Pune', 1400],
  ['Bhopal', 'Mumbai', 1100],
  ['Hyderabad', 'Bengaluru', 1300],
  ['Chennai', 'Bengaluru', 900],
  ['Lucknow', 'Delhi', 1200],
  ['Patna', 'Kolkata', 1000],
];

const randFactory = () => {
  let seed = 11;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
};

const pick = (items, rnd) => items[Math.floor(rnd() * items.length)];

function createDemoReports() {
  const rnd = randFactory();
  const reports = [];
  let id = 1;
  const add = (day, loc, sec, dis, n) => reports.push({ id: id++, day, loc, sec, dis, n });

  for (let day = 29; day >= 0; day -= 1) {
    for (let k = 0; k < 5; k += 1) {
      const sec = pick(['human', 'human', 'animal', 'animal', 'environment'], rnd);
      add(day, pick(LOCATIONS, rnd)[0], sec, pick(DISEASES[sec], rnd), 1 + Math.floor(rnd() * 3));
    }
  }

  for (let day = 5; day >= 0; day -= 1) {
    add(day, 'Jaipur', 'animal', 'Brucellosis', 3);
    add(day, 'Jaipur', 'human', 'Brucellosis', 2);
  }

  for (let day = 3; day >= 0; day -= 1) {
    add(day, 'Guwahati', 'animal', 'Avian influenza', 3);
  }

  return reports;
}

const DEMO_REPORTS = createDemoReports();
const total = (rows) => rows.reduce((sum, row) => sum + row.n, 0);
const sign = (value) => `${value > 0 ? '+' : ''}${value}`;
const dateLabel = (day) =>
  new Date(Date.now() - day * 864e5).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

const norm = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const hashText = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
};

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}

const findColumn = (headers, names) =>
  headers.findIndex((header) => header && names.some((name) => header === name || header.includes(name) || name.includes(header)));

const findColumns = (headers, names) =>
  headers
    .map((header, index) => (header && names.some((name) => header === name || header.includes(name) || name.includes(header)) ? index : -1))
    .filter((index) => index >= 0);

const readCell = (row, index) => (index >= 0 ? String(row[index] ?? '').trim() : '');
const cityKey = (value) => norm(value).replace(/_/g, '');
const cityLookup = Object.fromEntries(Object.keys(CITY_COORDS).map((city) => [cityKey(city), city]));
const getKnownCity = (value) => cityLookup[cityKey(value)] ?? null;
const getKnownCoords = (value) => {
  const city = getKnownCity(value);
  return city ? CITY_COORDS[city] : null;
};
const toCoordNumber = (value) => {
  const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : null;
};

function detectLocationName(row, indexes) {
  const cells = [...indexes.map((index) => readCell(row, index)), ...row.map((cell) => String(cell ?? ''))].filter(Boolean);
  const known = cells.map(getKnownCity).find(Boolean);
  if (known) return known;
  return indexes.map((index) => readCell(row, index)).find(Boolean) || null;
}

function detectLocation(row, indexes) {
  const location = detectLocationName(row, indexes);
  if (location) return location;
  const joined = row.join('|');
  return LOCATIONS[hashText(joined) % LOCATIONS.length][0];
}

function getReportCoords(report) {
  if (Number.isFinite(report.lat) && Number.isFinite(report.lon)) return [report.lat, report.lon];
  return getKnownCoords(report.loc);
}

const getReportLocations = (reports) => [...new Set(reports.map((row) => row.loc).filter(Boolean))].sort((a, b) => a.localeCompare(b));

function detectSector(row, sectorIndex, diseaseText) {
  const explicit = norm(readCell(row, sectorIndex));
  if (explicit.includes('animal') || explicit.includes('livestock') || explicit.includes('veterinary')) return 'animal';
  if (explicit.includes('environment') || explicit.includes('weather') || explicit.includes('water') || explicit.includes('climate')) return 'environment';
  if (explicit.includes('human') || explicit.includes('patient') || explicit.includes('hospital')) return 'human';

  const joined = norm(`${row.join(' ')} ${diseaseText}`);
  if (/animal|livestock|cattle|cow|goat|poultry|chicken|avian|veterinary|farm/.test(joined)) return 'animal';
  if (/rain|rainfall|water|temperature|weather|climate|heat|air|pollution|pm2|environment/.test(joined)) return 'environment';
  return 'human';
}

function parseCases(value) {
  const number = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(number) || number <= 0) return 1;
  return Math.max(1, Math.min(500, Math.round(number)));
}

function parseDateValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^\d{4}$/.test(raw)) return new Date(Number(raw), 0, 1);
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(raw)) {
    const [first, second, third] = raw.split(/[/-]/).map(Number);
    const year = third < 100 ? 2000 + third : third;
    if (first > 12) return new Date(year, second - 1, first);
    if (second > 12) return new Date(year, first - 1, second);
  }
  if (/^\d{5}$/.test(raw)) {
    const excelDate = new Date(Math.round((Number(raw) - 25569) * 864e5));
    if (!Number.isNaN(excelDate.getTime())) return excelDate;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

const CSV_HEADERS = {
  location: ['city', 'location', 'district', 'state', 'province', 'region', 'area', 'place', 'address', 'station'],
  signal: [
    'disease',
    'condition',
    'diagnosis',
    'illness',
    'pathogen',
    'virus',
    'syndrome',
    'symptom',
    'label',
    'target',
    'outbreak',
    'event',
    'signal',
    'parameter',
    'metric',
    'variable',
  ],
  sector: ['sector', 'source', 'type', 'category', 'domain', 'report_type'],
  cases: ['cases', 'case_count', 'count', 'total', 'value', 'number', 'num_cases', 'confirmed', 'incidence', 'deaths', 'patients'],
  date: ['date', 'report_date', 'onset_date', 'created_at', 'updated_at', 'observation_date', 'year', 'month'],
  lat: ['lat', 'latitude'],
  lon: ['lon', 'lng', 'long', 'longitude'],
};

function validateCsvHeaders({ locationColumns, diseaseIndex, sectorIndex, caseIndex, latIndex, lonIndex }) {
  const missing = [];
  if (!locationColumns.length && (latIndex < 0 || lonIndex < 0)) missing.push('location/city/district/state or latitude/longitude');
  if (caseIndex < 0) missing.push('cases/count/value');
  if (diseaseIndex < 0 && sectorIndex < 0) missing.push('disease/condition/signal/sector');

  if (!missing.length) return null;
  return `Invalid CSV. Missing required header: ${missing.join(', ')}`;
}

function parseUploadedCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { reports: [], skipped: 0, error: 'Invalid CSV. Add a header row and at least one data row.' };

  const headers = rows[0].map(norm);
  const body = rows.slice(1);
  const locationColumns = findColumns(headers, CSV_HEADERS.location);
  const diseaseIndex = findColumn(headers, CSV_HEADERS.signal);
  const sectorIndex = findColumn(headers, CSV_HEADERS.sector);
  const caseIndex = findColumn(headers, CSV_HEADERS.cases);
  const dateIndex = findColumn(headers, CSV_HEADERS.date);
  const latIndex = findColumn(headers, CSV_HEADERS.lat);
  const lonIndex = findColumn(headers, CSV_HEADERS.lon);
  const headerError = validateCsvHeaders({ locationColumns, diseaseIndex, sectorIndex, caseIndex, latIndex, lonIndex });
  if (headerError) return { reports: [], skipped: body.length, error: headerError };

  const datedRows = body.map((row) => ({ row, date: parseDateValue(readCell(row, dateIndex)) }));
  const maxDate =
    datedRows
      .map((item) => item.date)
      .filter(Boolean)
      .sort((a, b) => b - a)[0] ?? null;

  const reports = [];
  let skipped = 0;

  datedRows.forEach(({ row, date }, index) => {
    if (!row.some((cell) => String(cell ?? '').trim())) {
      skipped += 1;
      return;
    }

    const lat = toCoordNumber(readCell(row, latIndex));
    const lon = toCoordNumber(readCell(row, lonIndex));
    const location = detectLocationName(row, locationColumns) || (lat !== null && lon !== null ? `Point ${index + 1}` : null);
    const knownCoords = getKnownCoords(location);
    const coords = lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? [lat, lon] : knownCoords;
    if (!location || !coords) {
      skipped += 1;
      return;
    }
    const disease = readCell(row, diseaseIndex) || 'Imported CSV signal';
    const sector = detectSector(row, sectorIndex, disease);
    const cases = parseCases(readCell(row, caseIndex));
    const latestDay = maxDate ? new Date(maxDate).setHours(0, 0, 0, 0) : null;
    const rowDay = date ? new Date(date).setHours(0, 0, 0, 0) : null;
    const day = rowDay && latestDay ? Math.max(0, Math.round((latestDay - rowDay) / 864e5)) : index % 30;

    if (day > 29) {
      skipped += 1;
      return;
    }
    reports.push({
      id: index + 1,
      day,
      loc: location,
      lat: coords[0],
      lon: coords[1],
      sec: sector,
      dis: disease.slice(0, 60),
      n: cases,
    });
  });

  if (!reports.length) {
    return {
      reports,
      skipped,
      error: 'No mappable rows found. Add latitude/longitude columns, or use recognizable city names like Delhi, Jaipur, Mumbai, Pune, Chennai or Bengaluru.',
    };
  }

  return { reports, skipped };
}

function computeAlerts(reports) {
  return computeSharedAlerts(reports, { env: ENV, corridors: CORRIDORS });
}

const mapX = (lon) => (lon - 67) * 14;
const mapY = (lat) => (38 - lat) * 14;
const locationPoint = (name) => {
  const item = LOCATIONS.find(([loc]) => loc === name);
  return [mapX(item[1]), mapY(item[2])];
};

function Button({ children, variant = 'solid', className = '', ...props }) {
  const base =
    'inline-flex cursor-pointer items-center justify-center rounded-full px-[18px] py-2.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-env focus-visible:ring-offset-2 focus-visible:ring-offset-bg';
  const styles =
    variant === 'ghost'
      ? 'border border-ink bg-transparent text-ink hover:bg-ink/5'
      : 'bg-ink text-bg hover:opacity-90';

  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

function CsvUploadButton({ onUpload }) {
  return (
    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-ink bg-transparent px-[18px] py-2.5 text-sm font-semibold text-ink outline-none transition hover:bg-ink/5 focus-within:ring-2 focus-within:ring-env focus-within:ring-offset-2 focus-within:ring-offset-bg">
      Upload CSV Dataset
      <input className="sr-only" type="file" accept=".csv,text/csv" onChange={onUpload} />
    </label>
  );
}

function Tag({ sector }) {
  return (
    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: COLORS[sector] }}>
      {SECTORS[sector]}
    </span>
  );
}

function Header({ page, setPage, alertCount, live, empty, uploadInfo }) {
  const liveText = uploadInfo ? 'CSV live feed' : live ? (empty ? 'Database empty, showing demo data' : 'Connected to database') : 'Demo data';
  const items = [
    ['dashboard', 'Dashboard'],
    ['reports', 'Reports'],
    ['alerts', 'Alerts'],
    ['pipeline', 'Data pipeline'],
  ];

  return (
    <header className="flex flex-wrap items-center gap-7 border-b border-line px-4 py-3.5 sm:px-8 lg:px-11">
      <div className="flex items-center gap-2.5 font-display text-[22px] font-extrabold text-ink">
        <span className="grid size-5 grid-cols-2 gap-0.5">
          <span className="rounded-full bg-human" />
          <span className="rounded-full bg-animal" />
          <span className="rounded-full bg-env" />
          <span className="rounded-full bg-alert" />
        </span>
        OneHealth
      </div>

      <nav className="flex flex-1 gap-1 overflow-x-auto">
        {items.map(([key, label]) => (
          <button
            key={key}
            className={`flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2 font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-env ${
              page === key ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-ink'
            }`}
            aria-current={page === key ? 'page' : undefined}
            onClick={() => setPage(key)}
          >
            {label}
            {key === 'alerts' && alertCount > 0 ? (
              <span className="rounded-full bg-alert px-2 text-xs font-semibold text-white">{alertCount}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="hidden items-center gap-2 text-sm text-mute md:flex">
        <span className="live-dot size-2 rounded-full bg-env" />
        {liveText}
      </div>
    </header>
  );
}

function Top({ title, children, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="max-w-[22ch] font-display text-[30px] font-extrabold leading-none text-ink sm:text-5xl lg:text-[52px]">
          {title}
        </h1>
        {children ? <p className="mt-2 max-w-[60ch] text-mute">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

function AlertItem({ alert, compact = false }) {
  return (
    <div className="flex items-start gap-4 border-t border-line py-4">
      <div className={`w-[76px] shrink-0 font-display text-[34px] font-extrabold leading-none ${alert.severity === 'high' ? 'text-alert' : 'text-animal'}`}>
        {alert.risk}
      </div>
      <div>
        <b className="block text-base">{alert.disease} rising in {alert.loc}</b>
        <small className="text-[13.5px] text-mute">
          {alert.recent} reports in 7 days, usual is about {alert.base}. That is {alert.ratio.toFixed(1)}x normal.{' '}
          Confidence {alert.confidence}%. {alert.severity === 'high' ? 'Investigate now.' : 'Keep watching.'}
        </small>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {alert.drivers.map((driver) => (
            <span key={driver} className="rounded-full border border-line px-2 py-0.5 text-xs text-mute">
              {driver}
            </span>
          ))}
        </div>
        {!compact ? <ActionList alert={alert} /> : null}
      </div>
    </div>
  );
}

function ActionList({ alert }) {
  const env = ENV[alert.loc] ?? [0, 0];
  const actions = [
    `Send a vet team to ${alert.loc} to test animals for ${alert.disease}`,
    alert.corridors.length
      ? `Check animals leaving on the routes to ${alert.corridors.map((route) => route[1]).join(', ')} (${alert.load.toLocaleString('en-IN')} a week)`
      : null,
    `Tell nearby clinics to watch for ${alert.disease} in people`,
    alert.envOdd ? `Share the weather anomaly (${env[0]} deg C, rain ${env[1]}%) with health teams` : null,
  ].filter(Boolean);

  return (
    <ul className="mt-2 list-disc pl-5 text-[13.5px] text-ink">
      {actions.map((item) => (
        <li key={item} className="my-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

function LeafletDiseaseMap({ reports, alerts, layers, mapFilters, selectedLocation, setSelectedLocation }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const alertByCity = useMemo(() => Object.fromEntries(alerts.map((alert) => [alert.loc, alert])), [alerts]);
  const points = useMemo(
    () =>
      getReportLocations(reports)
        .map((loc) => {
          const sample = reports.find((row) => row.loc === loc && getReportCoords(row));
          const coords = sample ? getReportCoords(sample) : getKnownCoords(loc);
          if (!coords) return null;
          const alert = alertByCity[loc];
          const count = total(
            reports.filter((row) => row.loc === loc && row.day < 7 && (mapFilters.sector === 'all' || row.sec === mapFilters.sector)),
          );
          if (count < mapFilters.minCases) return null;
          if (mapFilters.severity === 'alerts' && !alert) return null;
          if (mapFilters.severity === 'high' && alert?.severity !== 'high') return null;
          return { loc, coords, count, alert };
        })
        .filter(Boolean),
    [reports, alertByCity, mapFilters],
  );

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return;
    const map = L.map(nodeRef.current, {
      center: [22.9, 79.6],
      zoom: 5,
      minZoom: 4,
      maxBounds: [
        [5, 66],
        [38, 100],
      ],
      maxBoundsViscosity: 0.6,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(nodeRef.current);
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (layers.corridors) {
      CORRIDORS.forEach(([from, to, count]) => {
        const fromCoords = getKnownCoords(from);
        const toCoords = getKnownCoords(to);
        if (!fromCoords || !toCoords) return;
        const hot = Boolean(alertByCity[from]);
        L.polyline([fromCoords, toCoords], {
          color: hot ? '#ff5a52' : '#2f55d4',
          weight: 1.5 + count / 900,
          opacity: 0.7,
          dashArray: '6 7',
        })
          .bindTooltip(`${from} to ${to}: ${count.toLocaleString('en-IN')} animals a week`)
          .addTo(layer);
      });
    }

    const maxCount = Math.max(...points.map((point) => point.count), 1);

    points.forEach(({ loc, coords, count, alert }) => {
      const alerted = Boolean(alert);
      const color = alerted ? '#e5322d' : '#0a8f78';
      const radius = 6 + Math.min(count, 40) * 0.7;
      const intensity = Math.max(0.22, count / maxCount);

      if (layers.heat && count > 0) {
        [1.8, 1.15, 0.55].forEach((scale, index) => {
          L.circle(coords, {
            radius: (18000 + Math.min(count, 80) * 1800) * scale,
            color,
            fillColor: color,
            fillOpacity: (alerted ? 0.1 : 0.07) * intensity * (index + 1),
            opacity: 0,
          }).addTo(layer);
        });
      }

      L.circleMarker(coords, {
        radius,
        color: selectedLocation === loc ? '#08111c' : '#ffffff',
        weight: selectedLocation === loc ? 3 : 1.5,
        fillColor: color,
        fillOpacity: alerted ? 0.9 : 0.76,
      })
        .bindTooltip(`${loc}: ${count.toLocaleString('en-IN')} reports this week${alerted ? ', unusual rise' : ''}`)
        .on('click', () => setSelectedLocation(loc))
        .addTo(layer);
    });

    if (points.length) {
      const bounds = L.latLngBounds(points.map((point) => point.coords));
      map.fitBounds(bounds.pad(0.18), { maxZoom: 7, animate: false });
    }
  }, [alertByCity, layers, points, selectedLocation, setSelectedLocation]);

  return <div ref={nodeRef} className="onehealth-map flex-1 overflow-hidden rounded-[16px]" aria-label="Interactive OpenStreetMap disease report map" />;
}

function MapPanel({ reports, alerts, layers, setLayers, mapFilters, setMapFilters, selectedLocation, setSelectedLocation }) {
  const alertByCity = Object.fromEntries(alerts.map((alert) => [alert.loc, alert]));
  const weekForCity = (loc) => reports.filter((row) => row.loc === loc && row.day < 7 && (mapFilters.sector === 'all' || row.sec === mapFilters.sector));
  const selectedWeek = selectedLocation ? weekForCity(selectedLocation) : [];
  const selectedAlert = selectedLocation ? alertByCity[selectedLocation] : null;
  const selectedEnv = selectedLocation ? (ENV[selectedLocation] ?? [0, 0]) : [0, 0];
  const mappedLocations = getReportLocations(reports).filter((loc) => {
    const weeklyCount = total(weekForCity(loc));
    const alert = alertByCity[loc];
    if (!reports.some((row) => row.loc === loc && getReportCoords(row))) return false;
    if (weeklyCount < mapFilters.minCases) return false;
    if (mapFilters.severity === 'alerts' && !alert) return false;
    if (mapFilters.severity === 'high' && alert?.severity !== 'high') return false;
    return true;
  });
  const updateMapFilter = (patch) => setMapFilters((current) => ({ ...current, ...patch }));

  return (
    <div className="map-shell flex min-h-full flex-col rounded-[24px] p-4 text-[#dbe6f2] sm:p-6">
      <h2 className="font-display text-[22px] font-bold text-white">Live disease map</h2>
      <div className="mb-2 text-sm text-[#8fa4bd]">OpenStreetMap with dynamic CSV locations. Bubble size is this week's reports.</div>
      <div className="mb-2 flex flex-wrap gap-2">
        {[
          ['heat', 'Heatmap'],
          ['corridors', 'Livestock corridors'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`rounded-full border px-3 py-1 text-[13px] outline-none transition focus-visible:ring-2 focus-visible:ring-env ${
              layers[key] ? 'border-[#dbe6f2] bg-[#dbe6f2] text-[#08111c]' : 'border-[#2b4161] text-[#9fb2c8]'
            }`}
            aria-pressed={layers[key]}
            onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-3 grid gap-2 text-[13px] sm:grid-cols-3">
        <label className="grid gap-1 text-[#9fb2c8]">
          Sector
          <select
            className="rounded-[10px] border border-[#2b4161] bg-[#0d1b2b] px-2.5 py-2 text-[#dbe6f2] outline-none focus-visible:ring-2 focus-visible:ring-env"
            value={mapFilters.sector}
            onChange={(event) => updateMapFilter({ sector: event.target.value })}
          >
            <option value="all">All sectors</option>
            {Object.entries(SECTORS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[#9fb2c8]">
          Alert level
          <select
            className="rounded-[10px] border border-[#2b4161] bg-[#0d1b2b] px-2.5 py-2 text-[#dbe6f2] outline-none focus-visible:ring-2 focus-visible:ring-env"
            value={mapFilters.severity}
            onChange={(event) => updateMapFilter({ severity: event.target.value })}
          >
            <option value="all">All places</option>
            <option value="alerts">Alerts only</option>
            <option value="high">High risk</option>
          </select>
        </label>
        <label className="grid gap-1 text-[#9fb2c8]">
          Min weekly cases
          <input
            className="rounded-[10px] border border-[#2b4161] bg-[#0d1b2b] px-2.5 py-2 text-[#dbe6f2] outline-none focus-visible:ring-2 focus-visible:ring-env"
            min="0"
            type="number"
            value={mapFilters.minCases}
            onChange={(event) => updateMapFilter({ minCases: Math.max(0, Math.round(Number(event.target.value) || 0)) })}
          />
        </label>
      </div>

      <div className="grid flex-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
        <LeafletDiseaseMap
          reports={reports}
          alerts={alerts}
          layers={layers}
          mapFilters={mapFilters}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
        />
        <div className="border-l-2 border-[#2b4161] pl-3 text-[13px] text-[#b8c8da]">
          {selectedLocation ? (
            <>
              <b className="block font-display text-[22px] font-bold text-white">{selectedLocation}</b>
              {total(selectedWeek)} reports this week
              <br />
              Human {total(selectedWeek.filter((row) => row.sec === 'human'))}
              <br />
              Animal {total(selectedWeek.filter((row) => row.sec === 'animal'))}
              <br />
              Environment {total(selectedWeek.filter((row) => row.sec === 'environment'))}
              <br />
              Temp {sign(selectedEnv[0])} deg C, rain {sign(selectedEnv[1])}%
              {selectedAlert ? (
                <>
                  <br />
                  <span className="font-semibold text-alert">{selectedAlert.ratio.toFixed(1)}x usual level</span>
                  <br />
                  AI confidence {selectedAlert.confidence}%
                </>
              ) : null}
            </>
          ) : (
            <>
              <b className="block font-display text-[22px] font-bold text-white">Pick a city</b>
              Click a bubble to see this week's reports by sector. {mappedLocations.length.toLocaleString('en-IN')} locations match the map filters.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, note }) {
  return (
    <div className="mr-5 border-r border-line py-4 pr-5 last:border-0 md:min-h-[118px]">
      <span className="flex items-center gap-2 text-sm text-mute">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <b className="block font-display text-4xl font-extrabold leading-none sm:text-5xl lg:text-[60px]">{value}</b>
      <em className="text-[13px] not-italic text-mute">{note}</em>
    </div>
  );
}

function LineChart({ reports }) {
  const width = 640;
  const height = 230;
  const pad = 30;
  const days = [...Array(30).keys()].reverse();
  const sectorSeries = Object.keys(SECTORS).map((sector) =>
    days.map((day) => total(reports.filter((row) => row.sec === sector && row.day === day))),
  );
  const max = Math.max(...sectorSeries.flat(), 4);
  const x = (index) => pad + (index * (width - pad - 8)) / 29;
  const y = (value) => height - 24 - (value * (height - 44)) / max;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily reports by sector, last 30 days">
      {[0, 1, 2, 3, 4].map((i) => {
        const value = Math.round((max * i) / 4);
        return (
          <g key={i}>
            <line x1={pad} x2={width} y1={y(value)} y2={y(value)} stroke="var(--line)" />
            <text x="0" y={y(value) + 4}>
              {value}
            </text>
          </g>
        );
      })}
      {[0, 7, 14, 21, 29].map((index) => (
        <text key={index} x={x(index)} y={height - 6} textAnchor="middle">
          {dateLabel(days[index])}
        </text>
      ))}
      {Object.keys(SECTORS).map((sector, index) => (
        <polyline
          key={sector}
          fill="none"
          stroke={COLORS[sector]}
          strokeWidth="2.5"
          strokeLinejoin="round"
          points={sectorSeries[index].map((value, itemIndex) => `${x(itemIndex)},${y(value)}`).join(' ')}
        />
      ))}
    </svg>
  );
}

function LeadingSignals({ reports }) {
  const entries = useMemo(() => {
    const count = {};
    for (const row of reports.filter((item) => item.day < 30)) {
      if (!count[row.dis]) count[row.dis] = { cases: 0, sectors: {} };
      count[row.dis].cases += row.n;
      count[row.dis].sectors[row.sec] = (count[row.dis].sectors[row.sec] || 0) + row.n;
    }
    return Object.entries(count)
      .map(([disease, item]) => {
        const sector = Object.entries(item.sectors).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'human';
        return [disease, item.cases, sector];
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
  }, [reports]);

  if (!entries.length) return <div className="py-5 text-mute">No reports in the last 30 days.</div>;
  const max = entries[0][1];

  return (
    <div>
      {entries.map(([disease, count, sector]) => {
        return (
          <div key={disease} className="my-2 grid grid-cols-[120px_1fr_34px] items-center gap-2 text-[13px]">
            <span>{disease}</span>
            <div className="h-3 rounded-md bg-bg">
              <div className="h-full rounded-md" style={{ width: `${(count / max) * 100}%`, background: COLORS[sector] }} />
            </div>
            <b>{count}</b>
          </div>
        );
      })}
    </div>
  );
}

function Dashboard({
  reports,
  alerts,
  setPage,
  layers,
  setLayers,
  mapFilters,
  setMapFilters,
  selectedLocation,
  setSelectedLocation,
  live,
  empty,
  uploadInfo,
  onCsvUpload,
}) {
  const week = (sector) => reports.filter((row) => row.day < 7 && (!sector || row.sec === sector));
  const locationCount = getReportLocations(reports).length;
  const trend = (sector) => {
    const current = total(reports.filter((row) => row.sec === sector && row.day < 7));
    const previous = total(reports.filter((row) => row.sec === sector && row.day >= 7 && row.day < 14));
    return `${current >= previous ? 'Up' : 'Down'} ${Math.abs(current - previous)} from last week`;
  };
  const count = alerts.length;

  return (
    <>
      <Top
        title={count ? `${count} ${count === 1 ? 'place needs' : 'places need'} a closer look this week` : 'No unusual rises this week'}
        action={
          <div className="flex flex-wrap gap-2">
            <CsvUploadButton onUpload={onCsvUpload} />
            <Button onClick={() => setPage('reports')}>Add a report</Button>
          </div>
        }
      >
        Human, animal and environmental reports from {locationCount.toLocaleString('en-IN')} mapped locations, week ending {dateLabel(0)}.
      </Top>

      {uploadInfo ? (
        <div className="mb-5 rounded-tool border border-env/40 bg-card p-4 text-sm text-ink">
          <b className="font-display">CSV live upload active:</b> {uploadInfo.rows.toLocaleString('en-IN')} rows from {uploadInfo.name} are powering the map,
          charts and alerts in this browser only. MongoDB was not touched.
          {uploadInfo.skipped ? <span className="text-mute"> {uploadInfo.skipped.toLocaleString('en-IN')} older or blank rows were ignored.</span> : null}
        </div>
      ) : null}

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:gap-11">
        <MapPanel
          reports={reports}
          alerts={alerts}
          layers={layers}
          setLayers={setLayers}
          mapFilters={mapFilters}
          setMapFilters={setMapFilters}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
        />
        <section>
          <h2 className="font-display text-2xl font-bold">Early warnings</h2>
          <div className="mb-2 text-sm text-mute">The number is a risk score out of 100. It combines how far reports rose, weather and movement routes.</div>
          {alerts.length ? alerts.slice(0, 4).map((alert) => <AlertItem key={alert.loc} alert={alert} compact />) : <div className="py-5 text-mute">No unusual increases this week.</div>}
          <Button variant="ghost" className="mt-3" onClick={() => setPage('alerts')}>
            See all alerts
          </Button>
        </section>
      </div>

      <div className="my-9 grid border-t-2 border-ink md:grid-cols-4">
        <StatCard label="Human cases" value={total(week('human'))} color={COLORS.human} note={trend('human')} />
        <StatCard label="Animal reports" value={total(week('animal'))} color={COLORS.animal} note={trend('animal')} />
        <StatCard label="Environment signals" value={total(week('environment'))} color={COLORS.environment} note={trend('environment')} />
        <StatCard label="Active alerts" value={count} color={COLORS.alert} note="Unusual rise detected" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-11">
        <section>
          <h2 className="font-display text-[22px] font-bold">Reports over time</h2>
          <div className="mb-2 text-sm text-mute">Daily totals for the last 30 days</div>
          <div className="mb-2 flex flex-wrap gap-3 text-[13px] text-mute">
            {Object.keys(SECTORS).map((sector) => (
              <span key={sector} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: COLORS[sector] }} />
                {SECTORS[sector]}
              </span>
            ))}
          </div>
          <LineChart reports={reports} />
        </section>
        <section>
          <h2 className="font-display text-[22px] font-bold">Leading signals</h2>
          <div className="mb-2 text-sm text-mute">Most reported diseases, last 30 days</div>
          <LeadingSignals reports={reports} />
        </section>
      </div>

      <p className="mt-11 border-t border-line pt-3 text-[13px] text-mute">
        {uploadInfo
          ? 'Reports come from the uploaded CSV in this browser. Climate and movement corridor figures are still sample data.'
          : live && !empty
            ? 'Reports come from the database. Climate and movement corridor figures are still sample data.'
            : 'All numbers are sample data for demonstration.'}{' '}
        Alerts are signals to investigate, not confirmed outbreaks.
      </p>
    </>
  );
}

function ReportsPage({ reports, setReports, filters, setFilters, live, reload, showToast }) {
  const locationOptions = useMemo(
    () => [...new Set([...getReportLocations(reports), ...LOCATIONS.map(([loc]) => loc)])].sort((a, b) => a.localeCompare(b)),
    [reports],
  );
  const [form, setForm] = useState({
    sector: 'human',
    disease: DISEASES.human[0],
    location: LOCATIONS[0][0],
    cases: 1,
  });

  const rows = reports
    .filter((row) => (filters.sec === 'all' || row.sec === filters.sec) && (filters.loc === 'all' || row.loc === filters.loc))
    .sort((a, b) => a.day - b.day || b.id - a.id)
    .slice(0, 40);

  const updateForm = (patch) => {
    setForm((current) => {
      const next = { ...current, ...patch };
      if (patch.sector && !DISEASES[patch.sector].includes(next.disease)) next.disease = DISEASES[patch.sector][0];
      return next;
    });
  };

  const saveReport = async () => {
    const cases = Math.max(1, Math.min(500, Math.round(Number(form.cases) || 1)));
    const body = {
      disease: form.disease,
      sector: form.sector,
      location: form.location,
      cases,
    };
    const coords = getKnownCoords(body.location);
    if (coords) {
      body.latitude = coords[0];
      body.longitude = coords[1];
    }

    if (!live) {
      setReports((current) => [
        { id: Date.now(), day: 0, loc: body.location, lat: coords?.[0], lon: coords?.[1], sec: body.sector, dis: body.disease, n: cases },
        ...current,
      ]);
      showToast('Saved in demo mode only');
      return;
    }

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('save failed');
      await reload();
      showToast('Report saved to database');
    } catch {
      showToast('Could not save. Is the server running?');
    }
  };

  return (
    <>
      <Top title="Reports">Add an observation or filter what has been filed</Top>

      <section className="mb-4 rounded-tool border border-line bg-card p-4">
        <h3 className="font-display text-lg font-bold">New report</h3>
        <div className="mb-3 text-sm text-mute">It appears on the dashboard right away</div>
        <div className="grid items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <Label text="Sector">
            <Select value={form.sector} onChange={(event) => updateForm({ sector: event.target.value })}>
              {Object.entries(SECTORS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Label>
          <Label text="Disease or signal">
            <Select value={form.disease} onChange={(event) => updateForm({ disease: event.target.value })}>
              {DISEASES[form.sector].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Label>
          <Label text="Location">
            <Select value={form.location} onChange={(event) => updateForm({ location: event.target.value })}>
              {locationOptions.map((loc) => (
                <option key={loc}>{loc}</option>
              ))}
            </Select>
          </Label>
          <Label text="Number of cases">
            <Input type="number" min="1" value={form.cases} onChange={(event) => updateForm({ cases: event.target.value })} />
          </Label>
          <Button className="w-full" onClick={saveReport}>
            Save report
          </Button>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap gap-2.5">
        <Select value={filters.sec} aria-label="Filter by sector" onChange={(event) => setFilters((current) => ({ ...current, sec: event.target.value }))}>
          <option value="all">All sectors</option>
          {Object.entries(SECTORS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <Select value={filters.loc} aria-label="Filter by location" onChange={(event) => setFilters((current) => ({ ...current, loc: event.target.value }))}>
          <option value="all">All locations</option>
          {locationOptions.map((loc) => (
            <option key={loc}>{loc}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-tool border border-line bg-card p-4">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr>
              {['Date', 'Sector', 'Disease or signal', 'Location', 'Cases'].map((head) => (
                <th key={head} className="border-b border-ink p-2 text-left text-[13px] font-medium text-mute">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={`${row.id}-${row.loc}-${row.day}`} className="hover:bg-mute/10">
                  <td className="border-b border-line p-2.5">{dateLabel(row.day)}</td>
                  <td className="border-b border-line p-2.5">
                    <Tag sector={row.sec} />
                  </td>
                  <td className="border-b border-line p-2.5">{row.dis}</td>
                  <td className="border-b border-line p-2.5">{row.loc}</td>
                  <td className="border-b border-line p-2.5">{row.n}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-5 text-mute">
                  No reports match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Label({ text, children }) {
  return (
    <label className="grid gap-1 text-[13px] text-mute">
      {text}
      {children}
    </label>
  );
}

function Select({ className = '', ...props }) {
  return (
    <select
      className={`rounded-[10px] border border-line bg-card px-2.5 py-2 font-sans text-ink outline-none focus-visible:ring-2 focus-visible:ring-env ${className}`}
      {...props}
    />
  );
}

function Input({ className = '', ...props }) {
  return <input className={`rounded-[10px] border border-line bg-card px-2.5 py-2 font-sans text-ink outline-none focus-visible:ring-2 focus-visible:ring-env ${className}`} {...props} />;
}

function DetectionChart({ reports, location }) {
  const width = 640;
  const height = 220;
  const pad = 28;
  const stats = cityStats(reports, location);
  const threshold = stats.mean + 2 * stats.sd;
  const max = Math.max(...stats.series, threshold, 4) + 1;
  const x = (index) => pad + (index * (width - pad - 8)) / 29;
  const y = (value) => height - 24 - (value * (height - 44)) / max;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Daily reports for ${location} with usual level and alert line`}>
      <rect x={x(23)} y="10" width={x(29) - x(23)} height={height - 34} fill="var(--alert)" opacity=".08" />
      <line x1={pad} x2={width} y1={y(stats.mean)} y2={y(stats.mean)} stroke="var(--mute)" strokeDasharray="4 4" />
      <text x={pad + 4} y={y(stats.mean) - 4}>
        usual level
      </text>
      <line x1={pad} x2={width} y1={y(threshold)} y2={y(threshold)} stroke="var(--alert)" />
      <text x={pad + 4} y={y(threshold) - 4} style={{ fill: 'var(--alert)' }}>
        alert line
      </text>
      <polyline fill="none" stroke="var(--ink)" strokeWidth="2" points={stats.series.map((value, index) => `${x(index)},${y(value)}`).join(' ')} />
      {stats.series.map((value, index) =>
        value > threshold ? <circle key={index} cx={x(index)} cy={y(value)} r="4" fill="var(--alert)" /> : null,
      )}
      <text x={x(26)} y={height - 6} textAnchor="middle">
        this week
      </text>
      <text x={x(11)} y={height - 6} textAnchor="middle">
        baseline: the 3 weeks before
      </text>
    </svg>
  );
}

function AlertsPage({ reports, alerts, activeCity, setActiveCity }) {
  const cityOptions = getReportLocations(reports);
  const city = activeCity || alerts[0]?.loc || cityOptions[0] || LOCATIONS[0][0];

  return (
    <>
      <Top title="Early warnings">
        A city is flagged when its weekly reports run at least 1.8x the usual level and cross the alert line. The anomaly engine combines z-score,
        cross-sector rise, unusual weather and movement routes. These are signals to investigate, not confirmed outbreaks.
      </Top>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-11">
        <div>{alerts.length ? alerts.map((alert) => <AlertItem key={alert.loc} alert={alert} />) : <div className="py-5 text-mute">No unusual increases this week.</div>}</div>
        <section>
          <h2 className="font-display text-[22px] font-bold">How it was flagged</h2>
          <div className="mb-3 text-sm text-mute">Pick a city to see its daily reports against the usual level</div>
          <Select className="mb-3" value={city} aria-label="City" onChange={(event) => setActiveCity(event.target.value)}>
            {cityOptions.map((loc) => (
              <option key={loc}>{loc}</option>
            ))}
          </Select>
          <DetectionChart reports={reports} location={city} />
        </section>
      </div>
    </>
  );
}

function PipelinePage({ reports, alerts, live, empty, uploadInfo }) {
  const locationNames = getReportLocations(reports);
  const sources = [
    ['Human health', 'Hospital and clinic reports', 'human'],
    ['Animal health', 'Veterinary and livestock reports', 'animal'],
    ['Environment', 'Weather station readings', 'environment'],
  ];
  const stages = [
    ['Collect', reports.length, 'reports received from 3 sectors'],
    ['Clean', new Set(reports.map((row) => row.dis)).size, 'disease and signal names standardized'],
    ['Merge', locationNames.length, 'locations joined across sectors by date'],
    ['Detect', alerts.length, 'cities above the alert line'],
    ['Alert', alerts.filter((alert) => alert.severity === 'high').length, 'high-risk alerts to act on'],
  ];

  return (
    <>
      <Top title="Data pipeline">How human, animal and environment data flow into one view, and what is moving between cities.</Top>

      <div className="mb-8 grid border-t-2 border-ink sm:grid-cols-2 lg:grid-cols-5">
        {stages.map(([name, value, note], index) => (
          <div key={name} className="py-3 pr-4">
            <span className="text-[13.5px] text-mute">
              {index + 1}. {name}
            </span>
            <b className="block font-display text-[40px] font-extrabold leading-tight">{value}</b>
            <span className="text-[13.5px] text-mute">{note}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-11">
        <section>
          <h2 className="font-display text-[22px] font-bold">Data sources</h2>
          <div className="mb-2 text-sm text-mute">Records from the last 30 days</div>
          <DataTable
            headers={['Source', 'Feeds from', 'Records', 'Status']}
            rows={sources.map(([source, feed, sector]) => [
              <Tag key={source} sector={sector} />,
              feed,
              reports.filter((row) => row.sec === sector).length,
              uploadInfo ? 'CSV upload' : live && !empty ? 'Connected' : 'Demo data',
            ])}
          />

          <h2 className="mt-7 font-display text-[22px] font-bold">Climate readings</h2>
          <div className="mb-2 text-sm text-mute">Difference from the usual for this time of year</div>
          <DataTable
            headers={['City', 'Temperature', 'Rainfall', 'Flag']}
            rows={locationNames.map((loc) => {
              const env = ENV[loc] ?? [0, 0];
              const flagged = Math.abs(env[0]) >= 3 || Math.abs(env[1]) >= 40;
              return [
                loc,
                `${sign(env[0])} deg C`,
                `${sign(env[1])}%`,
                <span key={loc} className={flagged ? 'font-semibold text-alert' : ''}>
                  {flagged ? 'Unusual' : 'Normal'}
                </span>,
              ];
            })}
          />
        </section>

        <section>
          <h2 className="font-display text-[22px] font-bold">Livestock corridors</h2>
          <div className="mb-2 text-sm text-mute">Animals moving between cities each week. Routes out of an alerting city are at risk.</div>
          <DataTable
            headers={['Route', 'Animals a week', 'Status']}
            rows={CORRIDORS.map(([from, to, count]) => {
              const hot = alerts.some((alert) => alert.loc === from);
              return [
                `${from} to ${to}`,
                count.toLocaleString('en-IN'),
                <span key={`${from}-${to}`} className={hot ? 'font-semibold text-alert' : ''}>
                  {hot ? 'At risk' : 'Normal'}
                </span>,
              ];
            })}
          />
        </section>
      </div>
    </>
  );
}

function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-ink p-2 text-left text-[13px] font-medium text-mute">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-mute/10">
              {row.map((cell, index) => (
                <td key={index} className="border-b border-line p-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [reports, setReports] = useState(DEMO_REPORTS);
  const [live, setLive] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [filters, setFilters] = useState({ sec: 'all', loc: 'all' });
  const [layers, setLayers] = useState({ heat: true, corridors: true });
  const [mapFilters, setMapFilters] = useState({ sector: 'all', severity: 'all', minCases: 0 });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [toast, setToast] = useState('');
  const [uploadInfo, setUploadInfo] = useState(null);
  const csvUploadToken = useRef(0);
  const alerts = useMemo(() => computeAlerts(reports), [reports]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const loadReports = async (first = false) => {
    if (first) setReports(DEMO_REPORTS);
    const tokenAtStart = csvUploadToken.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch('/api/reports?limit=500', { signal: controller.signal });
      if (!response.ok) throw new Error('bad status');
      const rows = await response.json();
      if (tokenAtStart !== csvUploadToken.current) return;
      setLive(true);
      setEmpty(!rows.length);
      setUploadInfo(null);

      if (rows.length) {
        const today = new Date().setHours(0, 0, 0, 0);
        setReports(
          rows.map((row, index) => {
            const coords = getKnownCoords(row.location);
            return {
              id: rows.length - index,
              day: Math.max(0, Math.round((today - new Date(row.date).setHours(0, 0, 0, 0)) / 864e5)),
              loc: row.location,
              lat: Number.isFinite(row.latitude) ? row.latitude : coords?.[0],
              lon: Number.isFinite(row.longitude) ? row.longitude : coords?.[1],
              sec: row.sector,
              dis: row.disease,
              n: row.cases,
            };
          }),
        );
      }
    } catch {
      setLive(false);
      setEmpty(false);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    csvUploadToken.current += 1;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please upload a .csv file');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseUploadedCsv(text);
      if (parsed.error) {
        showToast(parsed.error);
        return;
      }
      if (!parsed.reports.length) {
        showToast('No usable One Health rows found in this CSV');
        return;
      }

      setReports(parsed.reports);
      setLive(false);
      setEmpty(false);
      setUploadInfo({ name: file.name, rows: parsed.reports.length, skipped: parsed.skipped });
      setSelectedLocation(null);
      setActiveCity(parsed.reports[0]?.loc ?? null);
      setPage('dashboard');
      showToast(`Loaded ${parsed.reports.length.toLocaleString('en-IN')} CSV rows in browser`);
    } catch {
      showToast('Could not read this CSV file');
    }
  };

  useEffect(() => {
    loadReports(true);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const content = {
    dashboard: (
      <Dashboard
        reports={reports}
        alerts={alerts}
        setPage={setPage}
        layers={layers}
        setLayers={setLayers}
        mapFilters={mapFilters}
        setMapFilters={setMapFilters}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        live={live}
        empty={empty}
        uploadInfo={uploadInfo}
        onCsvUpload={handleCsvUpload}
      />
    ),
    reports: (
      <ReportsPage
        reports={reports}
        setReports={setReports}
        filters={filters}
        setFilters={setFilters}
        live={live}
        reload={() => loadReports(false)}
        showToast={showToast}
      />
    ),
    alerts: <AlertsPage reports={reports} alerts={alerts} activeCity={activeCity} setActiveCity={setActiveCity} />,
    pipeline: <PipelinePage reports={reports} alerts={alerts} live={live} empty={empty} uploadInfo={uploadInfo} />,
  }[page];

  return (
    <>
      <Header page={page} setPage={setPage} alertCount={alerts.length} live={live} empty={empty} uploadInfo={uploadInfo} />
      <main className="mx-auto max-w-[1500px] px-4 py-7 pb-16 sm:px-8 lg:px-11">{content}</main>
      {toast ? (
        <div className="fixed bottom-5 left-1/2 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[22px] bg-ink px-[18px] py-2.5 text-center font-semibold text-bg shadow-soft">
          {toast}
        </div>
      ) : null}
    </>
  );
}

export default App;
