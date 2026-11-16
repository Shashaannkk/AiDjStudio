# AI DJ Studio — Production Setup & System Architecture Report

**Document ID:** `AI-DJ-PROD-SETUP-2026-11`  
**Generated:** November 16, 2026  
**Status:** **READY FOR DEPLOYMENT**  
**Role:** Senior DevOps Engineer, PostgreSQL Database Architect, Full-Stack Engineer  

---

## 1. Executive Summary

AI DJ Studio is an enterprise-grade, real-time collaborative audio streaming and automated harmonic mixing platform. Following the successful completion of the remediation phases, this document establishes the production deployment architecture, microservice boundaries, environment variable configuration, health check telemetry, and fail-fast production enforcement gates.

The system is architected for zero-downtime, multi-tenant deployment across modern cloud infrastructure:
- **Frontend Layer:** Hosted on Vercel Edge Network / CDN as a high-performance Single Page Application (SPA).
- **Backend API & Realtime Gateway:** Hosted on Render / Railway as a stateful, event-driven Node.js runtime supporting HTTP/2, Server-Sent Events (SSE), and WebSocket synchronization.
- **Persistence Layer:** Hosted on Supabase Managed PostgreSQL utilizing connection pooling, Row Level Security (RLS), and Realtime replication across 18 relational schema tables.

---

## 2. Microservice & Topology Map

```
                             +------------------------+
                             |     End User Browser   |
                             +-----------+------------+
                                         |
                         HTTPS / 443     |      WSS / SSE
                                         v
               +----------------------------------------------------+
               |              Vercel Edge Global CDN                |
               |     (Static Assets, SPA Client, Pre-rendering)     |
               +-------------------------+--------------------------+
                                         |
                       Reverse Proxy     | /api/* & /events/*
                                         v
               +----------------------------------------------------+
               |           Render / Railway Web Service             |
               |       (server.mjs - Node.js Event Runtime)         |
               |                                                    |
               |  - Auth & RBAC (Scrypt / HS256 JWT)                |
               |  - Soundclash Head-to-Head Engine                  |
               |  - Collaborative Queue & Dynamic Reordering        |
               |  - Sub-100ms Float Drift Synchronization Engine    |
               |  - 50-Participant Atomic Room Capacity Guard       |
               +-------------------------+--------------------------+
                                         |
                    PostgREST / Pooling  | Direct SSL / 5432
                                         v
               +----------------------------------------------------+
               |           Supabase Managed PostgreSQL              |
               |                                                    |
               |  - 18 Relational Tables (Profiles, Tracks, Events) |
               |  - Multi-tenant Row-Level Security (RLS)           |
               |  - Idempotent Schema Migrations                    |
               +----------------------------------------------------+
```

---

## 3. Port & Service Topology

| Component | Default Dev Port | Production Protocol / Port | Target Platform | Primary Responsibilities |
|---|---|---|---|---|
| **Frontend Client** | `5173` / `5185` | `HTTPS / 443` | Vercel Edge Network | UI rendering, Web Audio API synthesis, dual-deck mixing, real-time waveform visualization. |
| **Backend API Gateway** | `3000` | `HTTP/2, HTTPS / 443` (via `$PORT`) | Render / Railway | Authentication, RBAC, SSE stream broadcast, queue reordering, Soundclash battle state. |
| **Health Telemetry** | `3000/api/health` | `GET /api/health` | Render / Railway | Live operational health, database connectivity, SSE connection pool stats, memory/uptime. |
| **PostgreSQL Database**| `5432` | `PostgREST / Direct SSL 5432` | Supabase Cloud | Persistent user records, track catalog, acoustic metadata, battle history, analytics events. |

---

## 4. Production Environment Variable Manifest

The application strictly segregates public client-side environment variables from sensitive server-side secrets.

### 4.1 Server-Side Environment Variables (Render / Railway / Docker)

| Variable Name | Required | Default / Fallback | Sensitivity | Purpose & Description |
|---|---|---|---|---|
| `NODE_ENV` | **YES** | `development` | Public | Environment mode (`production`, `staging`, `development`). |
| `PORT` | NO | `3000` | Public | Port dynamically assigned by container orchestrator (Render/Railway). |
| `DATABASE_URL` | **YES (Prod)** | None | **CONFIDENTIAL** | PostgreSQL connection URI (`postgres://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require`). |
| `SUPABASE_URL` | **YES (Prod)** | None | Public / Internal | Supabase project API gateway (`https://[PROJECT-REF].supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **YES (Prod)** | None | **STRICT SECRET** | Supabase service-role administrative key with full DB bypass for backend data sync. |
| `JWT_SECRET` | **YES (Prod)** | `aidj-studio-dev-secret-key-change-in-production-2026` | **STRICT SECRET** | 256-bit cryptographic signing secret for HS256 authentication tokens. |
| `ALLOWED_ORIGINS` | NO | `http://localhost:5173,http://localhost:3000` | Public | Comma-delimited list of allowed CORS domains (e.g. `https://ai-dj-studio.vercel.app`). |

### 4.2 Frontend Client Environment Variables (Vercel)

| Variable Name | Required | Default / Fallback | Sensitivity | Purpose & Description |
|---|---|---|---|---|
| `VITE_API_URL` | **YES (Prod)** | `""` (Relative proxy) | Public | Backend API endpoint URL (e.g., `https://api.aidjstudio.com`). |
| `VITE_SUPABASE_URL` | **YES (Prod)** | `""` | Public | Supabase project URL for browser client anonymous queries and presence. |
| `VITE_SUPABASE_ANON_KEY` | **YES (Prod)** | `""` | Public | Supabase anonymous public key (protected by PostgreSQL Row Level Security). |

> [!CAUTION]
> Under no circumstances should `SUPABASE_SERVICE_ROLE_KEY` or `JWT_SECRET` be prefixed with `VITE_` or exposed to the frontend build environment.

---

## 5. Health Check & Diagnostic Telemetry (`GET /api/health`)

AI DJ Studio includes a production health check endpoint at `/api/health` providing real-time telemetry for uptime monitors, Kubernetes readiness probes, and cloud load balancers.

### 5.1 Endpoint Specification
- **Method:** `GET`
- **Route:** `/api/health`
- **Headers Returned:** `Content-Type: application/json`
- **Status Codes:**
  - `200 OK`: Server healthy, database connected (or in allowed development fallback mode).
  - `503 Service Unavailable`: Critical persistence failure or fatal database connection loss in production.

### 5.2 Health Check Payload Example
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": 1794751200000,
  "uptimeSec": 4328,
  "environment": "production",
  "database": {
    "configured": true,
    "provider": "supabase_postgres",
    "connected": true,
    "latencyMs": 14,
    "tablesTracked": 18,
    "error": null
  },
  "realtime": {
    "activeSseConnections": 12,
    "totalRoomsTracked": 3
  },
  "memory": {
    "rssMb": 68,
    "heapUsedMb": 34,
    "heapTotalMb": 48
  }
}
```

---

## 6. Fail-Fast Production Gating

To prevent data loss and silent failures caused by transient container restarts on ephemeral disks, `src/server/postgresAdapter.js` enforces strict production gating:

```javascript
// Verification Rule: Enforce zero-fallback in production
postgresAdapter.assertProductionReady();
```

### Operational Behavior
1. **Development Mode (`NODE_ENV !== 'production'`):**  
   If Supabase/PostgreSQL credentials are absent, the application logs a yellow advisory and safely falls back to local transactional JSON persistence (`data/*.json`), allowing seamless local offline development.
2. **Production Mode (`NODE_ENV === 'production'`):**  
   If database credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `DATABASE_URL`) are missing or blank, `server.mjs` **immediately halts execution** with exit code 1:
   ```
   FATAL [DATABASE_CONFIG_ERROR]: NODE_ENV is set to "production" but PostgreSQL/Supabase 
   credentials are not configured. The application cannot start because falling back to 
   local ephemeral JSON storage in production is prohibited to prevent data loss.
   ```
   This ensures operators are notified instantly in their deployment dashboard (Vercel/Render/Railway) rather than silently losing user data.

---

## 7. Production Build & Lint Verification

The production build pipeline was verified with 100% clean compilation:

### Build Metrics
- **Command:** `npm run build` (`tsc -b && vite build`)
- **Compilation Duration:** 2.55 seconds
- **Modules Transformed:** 2,030 modules
- **Output Artifacts:**
  - `dist/index.html`: `1.42 kB` (Gzip: `0.76 kB`)
  - `dist/assets/index-Bv-CXMCs.css`: `118.50 kB` (Gzip: `16.18 kB`)
  - `dist/assets/index-DlbeJNEd.js`: `1,004.48 kB` (Gzip: `251.84 kB`)

### Lint & Static Analysis
- **Command:** `npm run lint` (`oxlint`)
- **Analyzed Files:** 105 files with 116 rules across 12 threads
- **Result:** `Found 0 warnings and 0 errors.` (100% compliant)
