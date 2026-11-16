# AI DJ Studio — Manual Security Actions & Production Runbook

**Audience:** Platform Administrator, DevOps Engineer, Project Owner  
**Date:** November 17, 2026  
**Purpose:** Actionable operational security steps requiring human credential authority or environment access.

---

## 1. Immediate Actions for Production Deployment

### 1.1 Configure High-Entropy Cryptographic Secrets
Before deploying to production (e.g. Render, Railway, AWS, Vercel), generate strong random 256-bit secrets and set them in your hosting provider's environment variables:

```bash
# Generate high-entropy JWT_SECRET (256-bit hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate high-entropy ADMIN_KEY
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Set these values in your cloud environment:
- `JWT_SECRET`: 64-character hex string generated above.
- `ADMIN_KEY`: Random 48-character string for master administrative API calls.
- `NODE_ENV`: Set to `production`.

### 1.2 Configure Google Gemini AI Studio API Key (Server-Side)
1. Obtain an API key from Google AI Studio (`https://aistudio.google.com/`).
2. Add to your deployment environment variables as:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. **DO NOT** add `VITE_GEMINI_API_KEY` to any client-side environment files.

### 1.3 Apply PostgreSQL & Supabase Database Migration
When connecting to a live Supabase project, execute `supabase/schema.sql` in the Supabase SQL Editor:
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Paste the contents of `supabase/schema.sql`.
3. Click **Run** to provision the tables, foreign keys, RLS policies, and the `prevent_profile_role_escalation` trigger.
4. Set the connection variables in your hosting environment:
   ```env
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-public-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.<your-project>.supabase.co:5432/postgres
   ```

---

## 2. Optional Git History Scrubbing (For Aesthetic / Compliance Requirements)

If you wish to completely expunge the historical synthetic test file from git commit history:

```bash
# 1. Install git-filter-repo (recommended by Git core team)
# pip install git-filter-repo

# 2. Strip data/users.json and other runtime data from all past commits
git filter-repo --path data/users.json --invert-paths --force
git filter-repo --path data/refresh_tokens.json --invert-paths --force
git filter-repo --path data/sessions.json --invert-paths --force

# 3. Force push rewritten history to GitHub (requires owner permission)
git remote add origin https://github.com/Shashaannkk/AiDjStudio.git
git push origin --force --all
```
*(Note: As verified in `security-audit/GITHUB_SECRET_EXPOSURE_AUDIT.md`, all historical records were synthetic development fixtures, so this action is optional.)*

---

## 3. Routine DevSecOps Maintenance Procedures

1. **Dependency Vulnerability Scanning:**
   Execute `npm audit` monthly or integrate Dependabot / Snyk into your GitHub repository settings.
2. **Key Rotation Schedule:**
   Rotate `JWT_SECRET` and `ADMIN_KEY` every 90 days in accordance with organizational security policies.
3. **Database Audit Logs:**
   Regularly monitor `data/queue_votes.json` and Supabase Database logs for anomalous activity.
