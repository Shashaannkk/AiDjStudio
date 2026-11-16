# AI DJ Studio — Deployment Configuration & Cloud Orchestration Report

**Document ID:** `AI-DJ-DEPLOY-CFG-2026-11`  
**Generated:** November 16, 2026  
**Status:** **READY FOR DEPLOYMENT**  
**Role:** Senior DevOps Engineer, Cloud Infrastructure Architect  

---

## 1. Executive Summary

This report provides the complete cloud deployment blueprints, reverse proxy routing configurations, security headers, and infrastructure-as-code manifests for releasing AI DJ Studio into production.

The architecture is decoupled into three dedicated production tiers:
1. **Frontend Hosting (Vercel):** High-speed edge CDN distribution of the static SPA bundle, asset caching, security headers, and API proxy rewrites.
2. **Backend API & Realtime Gateway (Render or Railway):** Long-running Node.js process managing SSE streams, WebSockets, stateful DJ battles, and PostgreSQL connection pooling.
3. **Database & Persistence (Supabase):** Managed PostgreSQL instance providing Row Level Security (RLS) and multi-region replication.

---

## 2. Frontend Configuration — Vercel (`vercel.json`)

The root `vercel.json` file configures SPA routing, reverse proxying for backend endpoints, and HTTP security headers.

### 2.1 Complete `vercel.json` Manifest
```json
{
  "version": 2,
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(self), geolocation=()" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/chat/stream",
      "destination": "https://${BACKEND_URL}/api/chat/stream"
    },
    {
      "source": "/api/:path*",
      "destination": "https://${BACKEND_URL}/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2.2 Routing & Rewrite Rules
- `/api/chat/stream`: Proxies authenticated SSE event streams directly to the backend without response buffering.
- `/api/:path*`: Proxies REST calls (`/api/auth/*`, `/api/tracks/*`, `/api/queue/*`, `/api/health`) to the backend.
- `/(.*)`: Catch-all rewrite directing route requests to `/index.html` for client-side routing.
- `/assets/(.*)`: Immutable caching for 1 year (`max-age=31536000, immutable`) for hashed CSS/JS chunks.

---

## 3. Backend Configuration — Render (`render.yaml`)

Render provides managed Node.js web services with automatic TLS and zero-downtime rolling deploys.

### 3.1 Complete `render.yaml` Blueprint
```yaml
services:
  - type: web
    name: ai-dj-studio-backend
    runtime: node
    plan: starter
    region: oregon
    buildCommand: npm install
    startCommand: npm run server
    healthCheckPath: /api/health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: ALLOWED_ORIGINS
        sync: false
```

### 3.2 Operational Features on Render
- **Health Check Integration:** Render pings `/api/health` before routing traffic to a new deployment container.
- **Dynamic Port:** The application reads `process.env.PORT` automatically.
- **Cryptographic Secret Generation:** `JWT_SECRET` is generated as an independent 256-bit secret on initial creation.

---

## 4. Backend Configuration — Railway (`railway.json` & `Procfile`)

For operators deploying via Railway, native Nixpacks build configuration and process definition are provided.

### 4.1 `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run server",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### 4.2 `Procfile`
```procfile
web: npm run server
```

---

## 5. Dynamic CORS & WebSocket / SSE Proxy Configuration

### 5.1 Dynamic Origin Whitelisting in `server.mjs`
To allow secure communication between the Vercel frontend and Render/Railway backend without open wildcard security vulnerabilities:

```javascript
// server.mjs
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const configuredOrigins = rawOrigins
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isOriginAllowed(origin) {
  if (!origin) return true; // Server-to-server or same-origin requests
  const lower = origin.toLowerCase();
  
  if (configuredOrigins.includes(lower)) return true;
  
  // Allow localhost during local testing
  if (lower.startsWith('http://localhost:') || lower.startsWith('http://127.0.0.1:')) {
    return true;
  }
  
  return false;
}
```

### 5.2 SSE Stream Keep-Alive & Anti-Buffering Headers
For `/api/chat/stream`, reverse proxies often buffer responses unless specific streaming headers are supplied:
```javascript
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no', // Disables Nginx / reverse proxy buffering
});
```

---

## 6. Database Migration Script (`scripts/deploy-migrations.mjs`)

An automated migration runner is available to verify database schema readiness:

```bash
node scripts/deploy-migrations.mjs
```

### Execution Flow:
1. Connects to `SUPABASE_URL` with `SUPABASE_SERVICE_ROLE_KEY` (or direct PostgreSQL via `DATABASE_URL`).
2. Checks connection health with `ping()`.
3. Verifies schema integrity across all 18 tables.
4. Executes `autoMigrateIfEmpty()` to populate tracks and admin records if the target database is new.
5. Emits deployment status to CI/CD logs.
