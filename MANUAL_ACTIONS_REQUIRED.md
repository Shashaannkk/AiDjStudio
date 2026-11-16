# AI DJ Studio — Manual Actions & Cloud Deployment Checklist

**Document ID:** `AI-DJ-MANUAL-ACTIONS-2026-11`  
**Generated:** November 16, 2026  
**Target Audience:** Cloud Operator / System Administrator  
**Estimated Completion Time:** 10 – 15 minutes  

---

## Overview

AI DJ Studio has completed all automated local engineering, database adapter development, fail-fast production gating, and test verification.

Because connecting to external cloud services requires sensitive personal accounts and API tokens, this checklist details the exact manual steps required to launch the application live on **Supabase**, **Render / Railway**, and **Vercel**.

---

## Step 1: Provision Supabase PostgreSQL Database

1. Navigate to [https://supabase.com](https://supabase.com) and sign in or create an account.
2. Click **"New Project"**, select an organization, name the project `ai-dj-studio`, and choose a region close to your target audience. Set a strong database password (save this password).
3. Once the database is provisioned (approx. 2 minutes), go to **Project Settings -> API**:
   - Copy **Project URL** (e.g., `https://abcdefghijkl.supabase.co`).
   - Copy **anon public key** (`eyJhb...`).
   - Copy **service_role secret key** (`eyJhb...`).
4. Go to **Project Settings -> Database**:
   - Under **Connection string -> URI**, copy the PostgreSQL connection string. Replace `[YOUR-PASSWORD]` with your database password.
5. In the Supabase sidebar, click **"SQL Editor"** -> **"New query"**:
   - Open the file [`supabase/schema.sql`](file:///c:/Users/Shashank%20Poojari/Documents/Ai%20Dj%20Studio/supabase/schema.sql) in your local editor.
   - Copy the entire SQL content into the Supabase SQL Editor.
   - Click **Run** to generate all 18 tables, indices, triggers, and Row Level Security policies.

---

## Step 2: Deploy Backend API Service (Render or Railway)

Choose either **Option A (Render)** or **Option B (Railway)**.

### Option A: Deploy on Render
1. Navigate to [https://render.com](https://render.com) and click **"New +" -> "Web Service"**.
2. Connect your Git repository (`ai-dj-studio`).
3. Render will automatically detect [`render.yaml`](file:///c:/Users/Shashank%20Poojari/Documents/Ai%20Dj%20Studio/render.yaml) or you can configure manually:
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run server`
   - **Health Check Path:** `/api/health`
4. In the **Environment Variables** tab, add:
   - `NODE_ENV`: `production`
   - `SUPABASE_URL`: *[Your Supabase Project URL from Step 1]*
   - `SUPABASE_SERVICE_ROLE_KEY`: *[Your Supabase Service Role Key from Step 1]*
   - `DATABASE_URL`: *[Your Supabase Database URI from Step 1]*
   - `JWT_SECRET`: *[Generate a random 64-character hex or string]*
   - `ALLOWED_ORIGINS`: `https://ai-dj-studio.vercel.app` *(replace with your actual Vercel domain from Step 3)*
5. Click **"Deploy Web Service"**.
6. Once deployed, copy your backend URL (e.g. `https://ai-dj-studio-backend.onrender.com`).
7. Test the health check endpoint in your browser:
   `https://ai-dj-studio-backend.onrender.com/api/health`
   It should return:
   ```json
   {
     "status": "healthy",
     "version": "2.0.0",
     "database": { "connected": true, "provider": "supabase_postgres" }
   }
   ```

### Option B: Deploy on Railway
1. Navigate to [https://railway.app](https://railway.app) and click **"New Project" -> "Deploy from GitHub repo"**.
2. Railway detects [`railway.json`](file:///c:/Users/Shashank%20Poojari/Documents/Ai%20Dj%20Studio/railway.json) and [`Procfile`](file:///c:/Users/Shashank%20Poojari/Documents/Ai%20Dj%20Studio/Procfile).
3. Under **Variables**, add the same environment variables listed in Option A.
4. Generate a public domain under **Settings -> Networking -> Generate Domain**.

---

## Step 3: Deploy Frontend SPA Client (Vercel)

1. Navigate to [https://vercel.com](https://vercel.com) and click **"Add New..." -> "Project"**.
2. Select your Git repository (`ai-dj-studio`).
3. Vercel will automatically detect Vite and [`vercel.json`](file:///c:/Users/Shashank%20Poojari/Documents/Ai%20Dj%20Studio/vercel.json):
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Expand **Environment Variables** and enter:
   - `VITE_API_URL`: *[Your backend URL from Step 2, e.g., `https://ai-dj-studio-backend.onrender.com`]*
   - `VITE_SUPABASE_URL`: *[Your Supabase Project URL from Step 1]*
   - `VITE_SUPABASE_ANON_KEY`: *[Your Supabase Anon Key from Step 1]*
5. Click **"Deploy"**.
6. Once the deployment finishes, copy your live frontend URL (e.g., `https://ai-dj-studio.vercel.app`).
7. Update `ALLOWED_ORIGINS` in your Backend (Render/Railway) environment settings with this frontend URL.

---

## Step 4: Provision Initial Platform Administrator Account

To establish the initial root administrator account on your production backend:

Run the administrative provisioning script locally with your production credentials:
```bash
ADMIN_EMAIL="admin@aidjstudio.com" \
ADMIN_PASSWORD="YourSecureAdminPassword2026!" \
node scripts/provision-admin.mjs
```
Alternatively, log into the frontend, register your account, and in your Supabase dashboard (**Table Editor -> profiles**), change your user's `role` from `'listener'` to `'admin'`.

---

## Step 5: Final Production Smoke Test (5 Minutes)

Complete this quick smoke test to verify all systems in the live production environment:

1. **Health Telemetry:**  
   Open `https://<YOUR-BACKEND>/api/health` and verify `"database": { "connected": true }`.
2. **User Authentication:**  
   Open `https://<YOUR-FRONTEND>` in your browser, register a new user account, and log in.
3. **Full-Length Audio Playback:**  
   Select a track (e.g. *Electric Sunrise* or *iLLPeTiLL*) and verify that playback begins at 0:00 and continues playing without pausing at 30 seconds.
4. **Preview Indicator:**  
   Select *Tauba Tauba* (Apple preview) and verify that the `"30s Preview"` badge is displayed. Click **"Full Alt"** and confirm that a full-length track replaces it.
5. **Collaborative Room & Queue:**  
   Create a room, open a second browser window (incognito), join with the room code, add a track to the queue, and verify that upvotes/downvotes synchronize in real time.
6. **Soundclash Battle:**  
   Initiate a Soundclash battle from the DJ deck, register a challenger, and cast a vote.
