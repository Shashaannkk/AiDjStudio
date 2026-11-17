# AI DJ STUDIO — MANUAL ACTIONS REQUIRED
**Date:** November 18, 2026  
**Audience:** DevOps Engineers, System Administrators & Project Owners

---

## 1. Overview

AI DJ Studio is fully configured and operational for development, staging, local execution, and containerized deployment. No manual code interventions are required.

To connect your own production domain, external OAuth provider, and managed cloud database, follow the recommended actions below.

---

## 2. Recommended Production Setup Actions

### Action 1: Configure Production PostgreSQL / Supabase (Optional)
If deploying to a managed database provider (Supabase, Railway, Neon, AWS RDS):
1. Create a PostgreSQL 15+ database instance.
2. Run the migration script in `supabase/schema.sql` to establish tables, check constraints, and row-level security.
3. Set the environment variable on your production host:
   ```bash
   DATABASE_URL="postgres://username:password@hostname:5432/aidjstudio"
   ```
4. Set `NODE_ENV=production`. The server will verify the connection and enforce SQL persistence.

### Action 2: Configure Google OAuth Client ID (Optional)
To enable Google One-Tap and OAuth login:
1. Navigate to Google Cloud Console (`https://console.cloud.google.com/apis/credentials`).
2. Create an **OAuth 2.0 Client ID** (Web Application).
3. Add your authorized JavaScript origins (e.g., `https://your-domain.com`).
4. Set the Client ID in your production environment:
   ```bash
   VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   ```

### Action 3: Production JWT Secret Hardening
Ensure a cryptographically strong, random 256-bit string is set for JWT signing in production:
```bash
JWT_SECRET="$(openssl rand -base64 32)"
ADMIN_KEY="$(openssl rand -base64 24)"
```

### Action 4: Start the Production Server
Run the production server via Node.js:
```bash
npm run build
npm start
```
The server will start on port `process.env.PORT || 3000` with automated health monitoring at `/api/health`.
