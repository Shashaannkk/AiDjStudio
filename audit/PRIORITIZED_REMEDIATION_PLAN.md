# AI DJ STUDIO — PRIORITIZED REMEDIATION PLAN

**Date:** November 16, 2026  
**Author:** Independent Technical Auditor & Principal Software Architect  
**Purpose:** Actionable, engineering-ready remediation plan to resolve all 12 identified deficiencies and achieve 100% verified PRD compliance.

---

## 1. Prioritization Strategy

Remediation is partitioned into four execution phases based on risk, system stability, and compliance impact:

```
[ P0: Immediate Security ]  ===>  [ P1: High Security & Audio ]  ===>  [ P2: Data & Collaboration ]  ===>  [ P3: Polish & UX ]
  - Fix SEC-01 (Privilege)          - Fix SEC-02 (JWT Secret)           - Fix AUD-02 (30s Previews)         - Fix UX-02 (Artists)
                                    - Fix SEC-03 (Admin Seed)           - Fix QUE-01 (Listener Votes)       - Fix UX-03 (Clash UI)
                                    - Fix AUD-01 (Drift Precision)      - Fix AI-01 (NLP Classifier)        - Fix PRD-01 (Doc)
                                    - Fix SND-01 (Soundclash UI)        - Fix UX-01 (Search Empty State)
                                    - Fix DB-01 (PostgreSQL Migration)
```

---

## 2. Phase P0 — Critical Security Fixes (Immediate)

### REM-01: Fix Remote Privilege Escalation in User Registration (`SEC-01`)
- **Target File:** `src/server/auth.js`
- **Line:** 211
- **Estimated Effort:** 15 minutes
- **Risk:** High if unfixed; Zero regression risk when fixed.

#### Remediation Blueprint
In `src/server/auth.js`, enforce that all registrations via public `POST /api/auth/register` are assigned `listener` role only, regardless of client input. Administrative roles must only be assigned via authenticated admin endpoints or administrative seeding.

```diff
--- a/src/server/auth.js
+++ b/src/server/auth.js
@@ -208,7 +208,8 @@ app.post('/api/auth/register', async (req, res) => {
     if (existingUser) {
       return res.status(409).json({ error: 'User with this email already exists' });
     }
-    const role = req.body.role || 'listener';
+    // SEC-01 Fix: Force public registrations to listener role. Reject unauthorized role escalation.
+    const role = 'listener';
     const newUser = await createUser({ email, password, name, role });
     const token = signToken(newUser);
     return res.status(201).json({ user: sanitizeUser(newUser), token });
```

---

## 3. Phase P1 — High Priority Fixes (Core Security & Audio Integrity)

### REM-02: Eliminate Hardcoded JWT Secret Fallback (`SEC-02`)
- **Target File:** `src/server/auth.js`, `.env.example`, `.env`
- **Line:** 19
- **Estimated Effort:** 20 minutes

#### Remediation Blueprint
1. Add a mandatory `JWT_SECRET` check in `src/server/auth.js` that throws in production/staging if the environment variable is unset.
2. Generate a secure 256-bit cryptographic hex string and add it to `.env`.

```diff
--- a/src/server/auth.js
+++ b/src/server/auth.js
@@ -16,7 +16,11 @@ const crypto = require('crypto');
-const JWT_SECRET = process.env.JWT_SECRET || 'aidj-studio-cryptographic-jwt-production-secret-2026';
+const JWT_SECRET = process.env.JWT_SECRET;
+if (!JWT_SECRET) {
+  if (process.env.NODE_ENV === 'production') {
+    throw new Error('FATAL: JWT_SECRET environment variable is not defined.');
+  }
+  console.warn('[SECURITY WARNING] JWT_SECRET is unset. Using generated temporary secret.');
+}
```

---

### REM-03: Remove Static Master Admin Seed (`SEC-03`)
- **Target File:** `src/server/auth.js`
- **Line:** 127–136
- **Estimated Effort:** 30 minutes

#### Remediation Blueprint
Do not write hardcoded credentials `AdminPassword2026!` into `data/users.json`. Instead:
1. Read `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` from `.env`.
2. Only seed the admin user if both environment variables are explicitly defined.
3. Automatically hash the password with `scrypt` using dynamic salt.

---

### REM-04: Restore Millisecond Precision to Drift Correction (`AUD-01`)
- **Target File:** `src/services/audioEngine.ts`
- **Line:** 50
- **Estimated Effort:** 30 minutes

#### Remediation Blueprint
Remove `Math.floor()` from the audio time update callback in `audioEngine.ts` to pass raw sub-millisecond floating point seconds directly to the store.

```diff
--- a/src/services/audioEngine.ts
+++ b/src/services/audioEngine.ts
@@ -47,7 +47,8 @@ export class AudioEngine {
     this.audioElement.ontimeupdate = () => {
       const cur = this.audioElement.currentTime;
       if (this.onTimeUpdateCallback) {
-        this.onTimeUpdateCallback(Math.floor(cur));
+        // AUD-01 Fix: Preserve floating-point seconds for sub-100ms drift calculation
+        this.onTimeUpdateCallback(cur);
       }
     };
```

---

### REM-05: Connect Human DJ Soundclash UI to Server Endpoints (`SND-01`)
- **Target File:** `src/stores/usePlayerStore.ts` & `src/components/views/RoomView.tsx`
- **Estimated Effort:** 3 hours

#### Remediation Blueprint
1. In `usePlayerStore.ts`, replace the call to local `soundclashEngine.createSoundclash()` with an authenticated API call to `POST /api/soundclash/challenge`.
2. Wire up WebSocket listener for `soundclash:round_started`, `soundclash:vote_cast`, and `soundclash:finished`.
3. Connect the voting buttons in `RoomView.tsx` to `POST /api/soundclash/:id/vote`.

---

## 4. Phase P2 — Medium Priority Fixes (Data Integrity & UX Reliability)

### REM-06: Correct Apple 30-Second Preview Metadata (`AUD-02`)
- **Target File:** `src/data/trendingIndiaTracks.ts`
- **Line:** 10–45
- **Estimated Effort:** 45 minutes

#### Remediation Blueprint
Update track entries pointing to Apple preview links:
- Set `provider: 'apple_preview'`
- Set `duration: 30` (or true length of preview file)
- Set `isPreview: true`
- Implement an automated fallback lookup to fetch full-length streams from Jamendo or Audius via `musicSearchService.ts`.

---

### REM-07: Broadcast Collaborative Queue Votes from Listeners (`QUE-01`)
- **Target File:** `src/stores/usePlayerStore.ts`
- **Line:** 1304
- **Estimated Effort:** 45 minutes

#### Remediation Blueprint
In `usePlayerStore.ts:voteTrack()`, emit a dedicated WebSocket event `room:queue_vote` to the server:
```typescript
realtimeRoomService.emitVote({
  roomId: state.activeRoomId,
  trackId,
  direction: 'up',
  userId: state.currentUser.id
});
```
The server will update the master queue in `data/rooms.json` and broadcast the authoritative updated queue to all room subscribers.

---

### REM-08: Enhance Mood Detection Engine with Fallback Semantic Rules (`AI-01`)
- **Target File:** `src/services/moodDetectionEngine.ts`
- **Estimated Effort:** 2 hours

#### Remediation Blueprint
1. Expand the token dictionary with common synonyms, conversational stems, and punctuation-agnostic tokenizers.
2. Incorporate queue audio features (BPM, Energy, Danceability) into the mood score weighting rather than relying purely on text tokens when chat messages are scarce.
3. Update benchmark tests in `test-benchmarks.ts` to test realistic natural sentences without artificial keyword stuffing.

---

### REM-09: Render Empty State for Zero Search Results (`UX-01`)
- **Target File:** `src/components/views/SearchView.tsx`
- **Line:** 166–168
- **Estimated Effort:** 20 minutes

#### Remediation Blueprint
```diff
--- a/src/components/views/SearchView.tsx
+++ b/src/components/views/SearchView.tsx
@@ -163,7 +163,9 @@ export const SearchView: React.FC = () => {
-  const displayedTracks = results.tracks.length === 0 ? initialAllTracks : results.tracks;
+  const isSearching = searchQuery.trim().length > 0;
+  const displayedTracks = isSearching ? results.tracks : initialAllTracks;
+  const showEmptyState = isSearching && results.tracks.length === 0 && !loading;
```

---

## 5. Phase P3 — Low Priority Polish & Maintenance

### REM-10: Dynamic Artist Profiling (`UX-02`)
- **Target File:** `src/components/views/ArtistView.tsx`
- Dynamically aggregate tracks from the global catalogue matching the artist's name when an artist is not present in the curated top-4 spotlight dictionary.

### REM-11: Room Soundclash Component State Synchronization (`UX-03`)
- **Target File:** `src/components/views/RoomView.tsx`
- Replace static battle preview HTML with dynamic React components bound to `state.activeSoundclash`.

### REM-12: Archive Original PRD Specification (`PRD-01`)
- Place the original PRD PDF document into `docs/PRD_AI_DJ_STUDIO.pdf` or check in a validated Markdown transcription of the source specification into `docs/PRD_SPECIFICATION.md`.

---

## 6. Database Migration Roadmap (Flat JSON to PostgreSQL)

To achieve true production multi-tenancy and horizontal scaling, execute the following migration:
1. Provision a PostgreSQL instance (or configure Supabase credentials in `.env`).
2. Run database migration script using `supabase/schema.sql`.
3. Replace JSON file operations in `src/server/auth.js`, `src/server/rooms.js`, and `src/server/soundclash.js` with parameterized SQL queries via `pg` or `@supabase/supabase-js`.
4. Enable Row Level Security (RLS) policies as specified in `audit/SECURITY_AND_RBAC_AUDIT.md`.

---

## 7. Remediation Schedule & Resource Allocation

| Phase | Tasks | Estimated Engineering Hours | Verification Method |
|:---|:---|:---:|:---|
| **Phase P0** | REM-01 | 0.5h | Automated Auth Exploit Test (`test-sec01.mjs`) |
| **Phase P1** | REM-02, REM-03, REM-04, REM-05 | 5.5h | Unit Tests, JWT Forgery Test, Audio Drift Telemetry |
| **Phase P2** | REM-06, REM-07, REM-08, REM-09 | 4.5h | E2E Playback, Multi-user WS Sync, Search UI Test |
| **Phase P3** | REM-10, REM-11, REM-12 | 2.5h | UI Component Tests & Visual Audit |
| **Database** | PostgreSQL Persistence Migration | 8.0h | Concurrency & Data Durability Stress Tests |
| **Total** | | **21.0h** | Full Independent Verification Suite |

