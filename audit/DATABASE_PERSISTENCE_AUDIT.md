# AI DJ Studio — Database & Persistence Audit Report

**Auditor:** Senior Database Architect & Infrastructure Auditor  
**Audit Scope:** PostgreSQL DDL, Supabase Integration, Ephemeral JSON Persistence, Concurrency, and Data Integrity  
**Date:** 2026-11-16  

---

## 1. Executive Summary & Architecture Duality

The repository exhibits an **architectural duality** between a planned PostgreSQL database and an actual flat-file JSON implementation:

1. **The Documented Specification:**
   - `supabase/schema.sql`: Contains 8 relational tables (`tracks`, `acoustic_features`, `queue_votes`, `queue_events`, `soundclash_battles`, `soundclash_history`, `sessions`, `session_events`), foreign key constraints with `ON DELETE CASCADE`, RLS policies, and a PostgreSQL trigger `trigger_check_room_capacity`.
2. **The Actual Production Implementation:**
   - `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are empty.
   - `data/*.json`: All server-side data is written directly to flat JSON files on the local filesystem (`data/users.json`, `data/tracks.json`, `data/sessions.json`, `data/queue_votes.json`, `data/soundclash_history.json`).

---

## 2. Table-by-Table Relational Schema Audit

| Table Name | PostgreSQL Schema Status | Production JSON File | Keys & Constraints | RLS Configured | Production Reality |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **profiles** | Defined in SQL | `data/users.json` | PK: `id`, Unique: `email` | Yes (in SQL) | Inactive in Supabase; stored in JSON array |
| **tracks** | Defined in SQL | `data/tracks.json` | PK: `id`, Unique: `title + artist` | Yes (in SQL) | Inactive in Supabase; queried from JSON file |
| **acoustic_features** | Defined in SQL | Embedded in `tracks.json` | PK: `id`, FK: `track_id` | Yes (in SQL) | Flattened into track objects |
| **queue_votes** | Defined in SQL | `data/queue_votes.json` | Unique: `room_id + queue_item_id + user_id` | Yes (in SQL) | Managed by `src/server/queue.js` map |
| **queue_events** | Defined in SQL | `data/queue_events.json` | PK: `id`, FK: `room_id` | Yes (in SQL) | Append-only JSON array |
| **soundclash_battles** | Defined in SQL | `data/soundclash_battles.json` | PK: `id`, FK: `room_id` | Yes (in SQL) | Managed by `src/server/soundclash.js` |
| **soundclash_history** | Defined in SQL | `data/soundclash_history.json` | PK: `id`, FK: `winner_track_id` | Yes (in SQL) | Append-only JSON array |
| **sessions** | Defined in SQL | `data/sessions.json` | PK: `id`, FK: `user_id` | Yes (in SQL) | Managed by `src/server/analytics.js` |
| **session_events** | Defined in SQL | `data/session_events.json` | PK: `id`, FK: `session_id` | Yes (in SQL) | Append-only JSON array |

---

## 3. Concurrency, File Locking & Race Condition Audit

### Flat-File Concurrency Flaw
In `src/server/queue.js`, `src/server/tracks.js`, `src/server/soundclash.js`, and `src/server/analytics.js`, every write operation follows a naive pattern:

```javascript
function loadData() {
  if (fs.existsSync(FILE)) {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  }
}

function saveData() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8');
}
```

#### Identified Risks:
1. **Lost Updates Under Concurrent Load:**  
   If User A and User B cast queue votes simultaneously, Request A and Request B both read the JSON file in parallel. Request B overwrites the file, destroying Request A's vote. There are no file locks (`flock`), no mutexes, and no transaction isolation.
2. **File Corruption on Process Interruption:**  
   `fs.writeFileSync` truncates and rewrites the file in-place. If the server crashes or receives `SIGTERM` mid-write, the JSON file is left partially written and corrupted.
3. **Ephemeral Storage in Serverless / Container Environments:**  
   If deployed to Vercel, Netlify, or serverless containers, the local container filesystem is ephemeral. All user accounts, sessions, and catalogue modifications will be destroyed upon container restart.

---

## 4. Restart Persistence Verification

We independently verified data persistence across server restarts using `data/*.json`:
1. **User Accounts:** Persisted across server restarts in `data/users.json`.
2. **Session Telemetry:** Persisted across restarts in `data/sessions.json` and `data/session_events.json`.
3. **Queue Votes:** Persisted across restarts in `data/queue_votes.json`.
4. **Catalogue Modifications:** Persisted across restarts in `data/tracks.json`.

**Conclusion:**  
For a single-node local Node.js process (`node server.mjs`), data persists across restarts. However, it cannot be certified for multi-node, serverless, or production-grade deployment until connected to a real PostgreSQL instance.
