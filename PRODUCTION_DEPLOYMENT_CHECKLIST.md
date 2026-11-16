# AI DJ Studio — Production Deployment & Operations Checklist

**Target Release:** Production Release 2.0  
**Date:** November 16, 2026  
**Audience:** Site Reliability Engineers, DevOps Engineers, Infrastructure Architects  

---

## 1. Pre-Deployment Infrastructure Prerequisites

- [ ] **Node.js Runtime:** Node.js v20.x LTS or v22.x LTS installed.
- [ ] **Database Instance:** PostgreSQL 15+ (managed AWS RDS, Supabase, or Azure Database for PostgreSQL).
- [ ] **Reverse Proxy & SSL/TLS:** Nginx / Cloudflare / Caddy configured with valid TLS certificate and WebSocket proxying (`Upgrade $http_upgrade`, `Connection "upgrade"`).
- [ ] **DNS Records:** Application apex and subdomain records routed to load balancer / edge proxy.
- [ ] **Firewall Rules:** Inbound traffic restricted to port 80/443; internal API port 3001 bound strictly to loopback (`127.0.0.1`) or private VPC subnet.

---

## 2. Environment Configuration & Secret Provisioning

Configure the following environment variables in production `.env` (or Kubernetes Secret / AWS Secrets Manager):

```bash
# -------------------------------------------------------------
# APPLICATION RUNTIME
# -------------------------------------------------------------
NODE_ENV=production
PORT=3001
VITE_API_BASE_URL=https://app.aidjstudio.com

# -------------------------------------------------------------
# AUTHENTICATION & CRYPTOGRAPHY (MANDATORY IN PRODUCTION)
# -------------------------------------------------------------
# Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<64-character-cryptographic-hex-secret>

# Initial Operator Administrator (Optional bootstrap)
INITIAL_ADMIN_EMAIL=security-admin@aidjstudio.com
INITIAL_ADMIN_PASSWORD=<minimum-12-character-strong-password>
INITIAL_ADMIN_NAME="Production Security Administrator"

# -------------------------------------------------------------
# DATABASE PERSISTENCE (POSTGRESQL OR SUPABASE)
# -------------------------------------------------------------
DATABASE_URL=postgres://aidj_user:<db-password>@db.production.aidjstudio.com:5432/aidj_production?sslmode=require

# Or Supabase Integration:
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<private-service-role-key>

# -------------------------------------------------------------
# STREAMING & PROVIDER INTEGRATION
# -------------------------------------------------------------
JAMENDO_CLIENT_ID=<your-jamendo-client-id>
AUDIUS_APP_NAME="AI DJ Studio Production"
```

---

## 3. Database Initialization & Data Migration Steps

Execute the following sequential commands during maintenance window:

```bash
# Step 1: Connect to PostgreSQL and apply the schema definition
psql "$DATABASE_URL" -f supabase/schema.sql

# Step 2: Generate and apply initial data migration from catalogue
node -e "
import { generateMigrationSql } from './src/server/db.js';
import fs from 'fs';
fs.writeFileSync('production_seed.sql', generateMigrationSql());
"
psql "$DATABASE_URL" -f production_seed.sql

# Step 3: Verify 18 tables and trigger existence
node scripts/test-phase5-database-persistence.mjs
```

---

## 4. Application Build & Process Management

```bash
# Step 1: Install production dependencies
npm ci

# Step 2: Execute TypeScript compilation and Vite asset build
npm run build

# Step 3: Provision initial administrator securely via CLI
node scripts/provision-admin.mjs \
  --email="security-admin@aidjstudio.com" \
  --password="<SecureProductionPassword2026!>" \
  --name="Security Administrator"

# Step 4: Launch via PM2 or systemd
pm2 start server.mjs --name "aidj-backend" -i max
```

---

## 5. Post-Deployment Verification & Smoke Tests

- [ ] **Health Check:** `curl -f http://127.0.0.1:3001/api/health` returns HTTP 200.
- [ ] **Authentication Verification:**
  - Register new listener account: `POST /api/auth/register` succeeds with `role: "listener"`.
  - Attempt privilege escalation: `POST /api/auth/register` with `role: "admin"` is rejected with HTTP 400.
- [ ] **Playback Verification:** Full-length stream plays from 0:00 without 30s cutoff. Apple previews correctly display 30-second duration and badge.
- [ ] **Realtime Room Sync:** Two separate browser sessions connect to a room, exchange messages, and synchronize queue votes.
- [ ] **Soundclash Battle:** Launch a Human DJ clash and confirm voting and conclusion banner render cleanly.
- [ ] **Room Capacity Gate:** Test that the 51st participant is rejected with HTTP 409 (`ROOM_CAPACITY_REACHED`).

---

## 6. Rollback & Emergency Recovery Protocol

In the event of a critical failure during deployment:
1. Revert reverse proxy upstream traffic to previous blue/green release.
2. If schema rollback is required:
   ```bash
   # Revert to snapshot before migration
   pg_restore -d "$DATABASE_URL" -c pre_deployment_snapshot.dump
   ```
3. Restart backend service:
   ```bash
   pm2 restart aidj-backend
   ```
4. Verify fallback atomic local storage operates without interruption.
