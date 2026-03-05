# WindMonitor

A full-stack wind turbine farm monitoring dashboard. Real-time telemetry ingested via MQTT, streamed to the browser over Server-Sent Events, persisted in PostgreSQL, and visualised in a React SPA.

## Architecture

```
MQTT Broker (HiveMQ)
        |
        v
ASP.NET Core 10 API  <-->  PostgreSQL (Neon)
        |
        v (SSE)
  React 19 SPA (Vite)
```

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite 6, Tailwind CSS 4, React Router 7, TanStack Query 5, Recharts, Axios |
| Backend | ASP.NET Core 10, Entity Framework Core 10, Npgsql |
| Realtime | Server-Sent Events via `StateleSSE.AspNetCore` |
| Messaging | MQTT via `Mqtt.Controllers` (HiveMQ public broker) |
| Auth | JWT Bearer + BCrypt |
| Database | PostgreSQL (Neon serverless) |

## Features

- **Live dashboard** — fleet-wide turbine cards update in real time via SSE; no polling
- **Telemetry charts** — per-turbine time-series for wind speed, power output, rotor RPM, generator & gearbox temperature, vibration, blade pitch, and nacelle direction
- **Farm overview chart** — aggregated total power, average wind speed, and active turbine count over a configurable time window
- **Automatic alerts** — threshold violations generate Warning/Critical alerts; duplicates are suppressed while the original is unacknowledged
- **Alert management** — global alerts page with per-turbine filtering and one-click acknowledgement
- **Operator commands** — send `start`, `stop`, `setPitch`, or `setInterval` commands to individual turbines via MQTT
- **Maintenance mode** — take a turbine out of alert monitoring with an optional reason
- **Audit log** — every operator command is persisted with issuer identity, timestamp, and status
- **JWT authentication** — all API endpoints are protected; a default admin account is seeded on first run

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Generator Temp | > 65 °C | > 80 °C |
| Gearbox Temp | > 65 °C | > 80 °C |
| Vibration | > 2.0 g | > 4.0 g |
| Rotor Speed | < 5 or > 20 RPM | < 2 or > 23 RPM |
| Wind Speed | < 5 or > 20 m/s | < 2 or > 25 m/s |

Alerts are not generated while a turbine is in maintenance mode.

## MQTT Topics

```
farm/{farmId}/windmill/+/telemetry   # inbound — sensor data
farm/{farmId}/windmill/+/alert       # inbound — device-side alerts
farm/{farmId}/windmill/{id}/command  # outbound — operator commands
```

Default `farmId`: `365247` (configured in `appsettings.json`).

## Project Structure

```
windFullStack/
├── client/                 # React SPA
│   ├── src/
│   │   ├── components/     # TurbineCard, TurbineControls, AlertBell, charts…
│   │   ├── hooks/          # useSSE
│   │   ├── pages/          # Dashboard, TurbineDetail, AlertsPage, AuditLogPage
│   │   ├── services/       # api.js (Axios + auth helpers)
│   │   └── utils/          # turbineStatus helpers
│   └── vite.config.js      # dev proxy → localhost:5050
└── server/                 # ASP.NET Core API
    ├── Controllers/        # Auth, Turbines, Alerts, Commands, Realtime (SSE), MQTT
    ├── Data/               # AppDbContext
    ├── Migrations/         # EF Core migrations
    ├── Models/             # Turbine, TurbineMetric, Alert, OperatorCommand, User
    ├── Services/           # AlertService, TurbineStateService, OfflineDetectionService
    ├── appsettings.json    # Connection strings, MQTT, JWT, CORS, seed config
    └── Dockerfile
```

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) (npm included)
- A PostgreSQL database (or a [Neon](https://neon.tech) project)

### Backend

```bash
cd server

# Required environment variables (override appsettings.json values)
export ConnectionStrings__DefaultConnection="Host=...;Database=...;Username=...;Password=...;SSL Mode=VerifyFull;"
export Jwt__Key="<at-least-32-character-secret>"

dotnet run
# API available at http://localhost:5050
# Swagger UI at http://localhost:5050/swagger
```

EF Core migrations run automatically on startup. A default admin account is seeded when no users exist.

**Default credentials** (change in production via `Seed__AdminEmail` / `Seed__AdminPassword`):

```
Email:    admin@wind.local
Password: admin123
```

### Frontend

```bash
cd client
npm install
npm run dev
# SPA available at http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5050`.

### Docker (backend only)

```bash
cd server
docker build -t wind-turbine-api .
docker run -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection="<connection-string>" \
  -e Jwt__Key="<secret>" \
  wind-turbine-api
```

## API Reference

All endpoints except `POST /api/auth/login` require a `Bearer <token>` header.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Authenticate and receive a JWT |
| `GET` | `/api/turbines` | All turbines with latest metric snapshot |
| `GET` | `/api/turbines/{id}` | Single turbine with latest metric |
| `GET` | `/api/turbines/overview` | Aggregated farm-wide time series (`?minutes=60&bucket=1`) |
| `GET` | `/api/turbines/{id}/metrics` | Per-turbine time series (`?minutes=60&bucket=1`) |
| `GET` | `/api/turbines/{id}/alerts` | Recent alerts for a turbine (`?limit=20`) |
| `GET` | `/api/turbines/{id}/commands` | Command audit log for a turbine (`?limit=50`) |
| `POST` | `/api/turbines/{id}/command` | Send an operator command |
| `POST` | `/api/turbines/{id}/maintenance` | Toggle maintenance mode |
| `GET` | `/api/turbines/live` | SSE stream — live snapshot for all turbines |
| `GET` | `/api/alerts` | Recent alerts farm-wide (`?limit=50&unackOnly=false`) |
| `POST` | `/api/alerts/{id}/acknowledge` | Acknowledge an alert |
| `GET` | `/api/commands` | Global command audit log |

### Operator command payload

```json
{ "action": "start" }
{ "action": "stop",        "reason": "scheduled maintenance" }
{ "action": "setInterval", "value": 10 }
{ "action": "setPitch",    "angle": 15.5 }
```

- `setInterval` — reporting interval in seconds (1–60)
- `setPitch` — blade pitch angle in degrees (0–30)

## Configuration Reference

Key settings in `appsettings.json` (all overridable via environment variables using `__` as separator):

| Key | Description |
|-----|-------------|
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection string |
| `Jwt:Key` | HMAC-SHA256 signing key (required, min 32 chars) |
| `Jwt:ExpiryMinutes` | Token lifetime (default `43200` = 30 days) |
| `Mqtt:BrokerHost` / `BrokerPort` | MQTT broker address |
| `Mqtt:FarmId` | Farm identifier used in MQTT topics |
| `Cors:AllowedOrigins` | Array of allowed frontend origins |
| `Seed:AdminEmail` / `AdminPassword` | Initial admin account |
