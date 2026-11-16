# AI DJ STUDIO — DETAILED BUGS AND DEFICIENCIES REPORT

**Audit Date:** November 16, 2026  
**Auditor:** Independent Technical Auditor & Principal Software Architect  
**Scope:** Complete Codebase, Backend Services, Audio Engine, Realtime Sync, UI Components, and Persistence Layer.

---

## 1. Executive Summary of Deficiencies

During the independent verification of the AI DJ Studio codebase, 12 specific technical deficiencies and architectural discrepancies were identified and reproduced. These bugs directly refute previous claims of "100% completion with zero defects" and explain why the application is classified as **PARTIALLY COMPLIANT — NOT PRODUCTION READY (81.89% Verified Compliance)**.

The bugs are categorized by severity:
- **P0 Critical (1):** Immediate security risk (Remote Administrative Privilege Escalation).
- **P1 High (4):** High security/audio/functional integrity defects (Static JWT Secret, Hardcoded Admin Credentials, Integer Drift Precision Loss, Human Soundclash UI Disconnection).
- **P2 Medium (4):** Significant operational and UX flaws (Apple 30s Preview Mislabeling, Listener Queue Vote Drop, Mood Classifier Benchmark Circularity, Search Fallback Overwrite).
- **P3 Low (3):** Polish, static stubs, and document gaps (Static Artist Profile Mapping, Static Room Soundclash HTML, Missing Physical PRD PDF).

---

## 2. In-Depth Bug Catalog

---

### BUG-01 [P0] Remote Administrative Privilege Escalation
- **Bug ID:** `SEC-01`
- **Component:** Authentication Server (`src/server/auth.js`)
- **File & Line:** `src/server/auth.js:211`
- **PRD Requirement Impact:** REQ-083 (JWT-based role authentication)

#### Description
The user registration endpoint `POST /api/auth/register` reads the `role` attribute directly from the unauthenticated client's HTTP request body without sanitization, validation, or server-side authorization enforcement.

#### Reproduction
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"attacker@test.com","password":"Password123!","name":"Attacker","role":"admin"}'
```
Response:
```json
{
  "user": {
    "id": "usr_...",
    "email": "attacker@test.com",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
The resulting JWT payload contains:
```json
{
  "id": "usr_...",
  "email": "attacker@test.com",
  "role": "admin",
  "iat": 1763278800,
  "exp": 1763883600
}
```

#### Impact
Any anonymous visitor can register an account with `role: "admin"` and immediately gain full administrative privileges across the application, including deleting or modifying catalogue tracks, changing system configurations, and banning room hosts.

#### Root Cause
In `src/server/auth.js`:
```javascript
// Line 211:
const role = req.body.role || 'listener';
// The server permits any string provided in req.body.role to be written to users.json!
```

---

### BUG-02 [P1] Hardcoded JWT Production Secret Fallback
- **Bug ID:** `SEC-02`
- **Component:** Authentication Server (`src/server/auth.js`)
- **File & Line:** `src/server/auth.js:19`
- **PRD Requirement Impact:** REQ-083 (JWT Security)

#### Description
`JWT_SECRET` in `src/server/auth.js` provides an in-source plaintext default fallback:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'aidj-studio-cryptographic-jwt-production-secret-2026';
```
In the workspace's root `.env` file, `JWT_SECRET` is completely missing.

#### Reproduction
1. Inspect `.env`: Note absence of `JWT_SECRET`.
2. Generate an offline forged JWT using standard Node `crypto` and the hardcoded secret:
```javascript
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({id: 'admin_1', email: 'admin@aidjstudio.com', role: 'admin', exp: 9999999999})).toString('base64url');
const signature = crypto.createHmac('sha256', 'aidj-studio-cryptographic-jwt-production-secret-2026').update(`${header}.${payload}`).digest('base64url');
const forgedToken = `${header}.${payload}.${signature}`;
```
3. Submit forged token to any protected endpoint (`GET /api/auth/me`). The backend accepts the forged token with HTTP 200.

#### Impact
Full bypass of authentication. Any party with read access to the client or public repo can forge valid, non-expiring tokens for any user identity.

---

### BUG-03 [P1] Hardcoded Master Admin Credentials Seeded in Repository
- **Bug ID:** `SEC-03`
- **Component:** Authentication Database Seeder (`src/server/auth.js`)
- **File & Line:** `src/server/auth.js:127-136`
- **PRD Requirement Impact:** REQ-083, REQ-085 (Security & Access Control)

#### Description
When `data/users.json` is initialized or missing the default admin, the backend automatically seeds a master administrator account with credentials:
- **Email:** `admin@aidjstudio.com`
- **Password:** `AdminPassword2026!`

#### Impact
Known default credentials in production environments allow trivial automated unauthorized access if the application is deployed without manual intervention.

---

### BUG-04 [P1] Sub-100ms Playback Synchronization Drift Precision Loss
- **Bug ID:** `AUD-01`
- **Component:** Web Audio Engine (`src/services/audioEngine.ts`) & Zustand Store (`src/stores/usePlayerStore.ts`)
- **File & Line:** `src/services/audioEngine.ts:50` and `src/stores/usePlayerStore.ts:253`
- **PRD Requirement Impact:** REQ-038 (Continuous real-time drift correction maintaining synchronization delta below 100ms)

#### Description
The PRD mandates real-time synchronization drift strictly under 100ms across room participants. Previous reports claimed "42ms verified sync drift". However, in `src/services/audioEngine.ts:50`:
```typescript
this.onTimeUpdateCallback(Math.floor(cur));
```
The audio engine explicitly applies `Math.floor()` to `audio.currentTime`, discarding all millisecond precision before reporting playback position to the Zustand store!

#### Reproduction & Verification
1. In `src/stores/usePlayerStore.ts:253`:
```typescript
const delta = targetPos - currentPos;
```
If `targetPos` sent by the host over WebSocket is `45.850s`, and the listener's actual audio element is at `45.100s`, `audioEngine` rounds `45.100s` down to `45.000s`.
2. The store computes:
$$\text{delta} = 45.850 - 45.000 = 0.850\,\text{s} = 850\,\text{ms}$$
even though the true physical delta was only $45.850 - 45.100 = 750\,\text{ms}$ (or if target was $45.050$, physical delta was $50\,\text{ms}$, but store calculates $-50\,\text{ms}$ or jumps abruptly).
3. The store's drift correction threshold is:
```typescript
if (Math.abs(delta) > 0.1) { // 100ms threshold
  handleDriftCorrection(delta);
}
```
Because `currentPos` only steps in discrete 1.000-second integer increments, `Math.abs(delta)` constantly oscillates above 100ms, triggering spurious rate adjustments (`playbackRate = 1.05` or `0.95`) or unnecessary micro-seeks, causing audible flutter.
4. Independent verification script `scripts/audit-independent-verifier.mjs` proved that previous test `test-phase3-drift.mjs` passed only because it mocked the audio engine with simulated floats, never executing `audioEngine.ts:50`.

---

### BUG-05 [P1] Human DJ Soundclash Mode UI Disconnection
- **Bug ID:** `SND-01`
- **Component:** Soundclash Engine & Room Controller
- **File & Line:** `src/server/soundclash.js` vs `src/stores/usePlayerStore.ts:1395`
- **PRD Requirement Impact:** REQ-051 through REQ-055 (Soundclash Mode between two DJs)

#### Description
The server implementation `src/server/soundclash.js` contains a complete Express API for human DJ Soundclash battles (`/api/soundclash/challenge`, `/api/soundclash/:id/round`, `/api/soundclash/:id/vote`, `/api/soundclash/:id/result`).
However, the client-side store `src/stores/usePlayerStore.ts:1395` never calls `/api/soundclash/*`. Instead, it invokes client-side helper `soundclashEngine.createSoundclash()`, which generates a simulated in-memory AI battle with synthetic bot rounds.

#### Impact
Human DJ vs Human DJ Soundclash battles cannot be conducted in real rooms. The feature only exists as an offline client-side simulation.

---

### BUG-06 [P2] Apple 30-Second Audio Previews Mislabeled as Full-Length Spotify Tracks
- **Bug ID:** `AUD-02`
- **Component:** Music Track Catalogue (`src/data/trendingIndiaTracks.ts`) & Audio Player
- **File & Line:** `src/data/trendingIndiaTracks.ts:10-45`
- **PRD Requirement Impact:** REQ-018, REQ-019 (Full-length audio playback vs preview indicator)

#### Description
Several tracks in `trendingIndiaTracks.ts` list:
- `provider: "spotify"`
- `duration: 208` (3m 28s) or `234` (3m 54s)
However, their `audioUrl` points to Apple iTunes 30-second preview CDN servers (e.g., `audio-ssl.itunes.apple.com/.../mzaf_...aac.p.m4a`).

#### Impact
When played in the dual-deck DJ view or main player, the track stops abruptly after exactly 30 seconds, while the progress scrubber and duration counter continue to indicate 3m 28s. The preview badge is not displayed because the provider field is falsified as `"spotify"` instead of `"apple_preview"`.

---

### BUG-07 [P2] Listener Collaborative Queue Votes Not Broadcast Over WebSocket
- **Bug ID:** `QUE-01`
- **Component:** Room Queue Controller (`src/stores/usePlayerStore.ts`)
- **File & Line:** `src/stores/usePlayerStore.ts:1304`
- **PRD Requirement Impact:** REQ-034 (Collaborative queue voting and re-ordering)

#### Description
In `src/stores/usePlayerStore.ts:1304`:
```typescript
if (state.roomRole === 'host' || state.roomRole === 'co-dj') {
  realtimeRoomService.broadcastQueue(state.roomQueue);
}
```
When a participant with `roomRole: 'listener'` votes on a track in the shared room queue, their local client store re-sorts the queue array locally, but skips the WebSocket broadcast.

#### Impact
The host, co-DJ, and other listeners never receive the vote update. The listener's vote has zero effect on the communal playback order unless the host happens to perform a manual queue action that triggers a broadcast.

---

### BUG-08 [P2] Room Mood Detection Benchmark Circularity & Natural Language Failure
- **Bug ID:** `AI-01`
- **Component:** Mood Classification Engine (`src/services/moodDetectionEngine.ts`)
- **File & Line:** `src/services/moodDetectionEngine.ts:15-80`
- **PRD Requirement Impact:** REQ-041 (Dynamic room mood detection from chat and queue)

#### Description
The mood detection engine uses static string token matching. In previous audit phases, 100% classification accuracy was reported.
Independent testing revealed that `test-benchmarks.ts` achieved 100% accuracy solely by testing synthetic sentences constructed from the engine's hardcoded dictionary words (e.g. `"banger fire drop lit hyping"` for party mood).

When evaluated against natural conversational sentences without exact keyword matches (e.g. `"This beat has such an intimate, late night vibe"` or `"Can we get something faster to dance to?"`), the classification accuracy drops to 0%, falling back to the hardcoded default `"party"`.

---

### BUG-09 [P2] Search View Fallback Overwrites Zero-Result State
- **Bug ID:** `UX-01`
- **Component:** Search View Component (`src/components/views/SearchView.tsx`)
- **File & Line:** `src/components/views/SearchView.tsx:166-168`
- **PRD Requirement Impact:** REQ-026 (Catalogue search and filtering)

#### Description
In `SearchView.tsx:166-168`:
```typescript
const displayedTracks = results.tracks.length === 0 ? initialAllTracks : results.tracks;
```
When a user searches for an obscure artist or nonsense query that returns 0 matching tracks, instead of rendering an informative "No tracks found" empty state, the UI substitutes `initialAllTracks`.

#### Impact
Users are deceived into believing that random catalogue songs matched their search query, degrading user confidence.

---

### BUG-10 [P3] Hardcoded Artist Profiles in ArtistView
- **Bug ID:** `UX-02`
- **Component:** Artist Profile View (`src/components/views/ArtistView.tsx`)
- **File & Line:** `src/components/views/ArtistView.tsx:32-70`
- **PRD Requirement Impact:** REQ-028 (Artist profile view and catalogue browsing)

#### Description
`ArtistView.tsx` defines a static dictionary of 4 artist profiles. Navigating to an artist not included in this hardcoded map displays blank biographies and fallback dummy statistics rather than querying track metadata or backend artist endpoints.

---

### BUG-11 [P3] Static Room Soundclash HTML Placeholders
- **Bug ID:** `UX-03`
- **Component:** Room View Component (`src/components/views/RoomView.tsx`)
- **File & Line:** `src/components/views/RoomView.tsx:410-440`
- **PRD Requirement Impact:** REQ-051 (Soundclash room integration)

#### Description
The Soundclash panel inside `RoomView.tsx` contains static placeholder text and non-interactive round counters that do not update in sync with real battle events.

---

### BUG-12 [P3] Original PRD Physical PDF Document Missing
- **Bug ID:** `PRD-01`
- **Component:** Project Documentation
- **File:** `ai-dj-studio/*.pdf`
- **PRD Requirement Impact:** Source-of-truth compliance verification

#### Description
Recursive filesystem scan across the entire workspace yielded zero `.pdf` files. Physical compliance with the original source document could not be performed directly; verification relied on the 127 transcribed PRD requirements extracted from implementation prompts.

---

## 3. Deficiencies Summary Table

| Defect ID | Severity | Component | File & Line | Status | PRD Requirement |
|:---|:---:|:---|:---|:---:|:---:|
| `SEC-01` | **P0** | Auth Server | `src/server/auth.js:211` | Reproduced | REQ-083 |
| `SEC-02` | **P1** | Auth Config | `src/server/auth.js:19` | Reproduced | REQ-083 |
| `SEC-03` | **P1** | Database Seeder | `src/server/auth.js:127-136` | Reproduced | REQ-085 |
| `AUD-01` | **P1** | Audio Engine / Store | `src/services/audioEngine.ts:50` | Reproduced | REQ-038 |
| `SND-01` | **P1** | Soundclash UI | `src/stores/usePlayerStore.ts:1395` | Reproduced | REQ-051–055 |
| `AUD-02` | **P2** | Track Catalogue | `src/data/trendingIndiaTracks.ts:10` | Reproduced | REQ-018–019 |
| `QUE-01` | **P2** | Queue Store | `src/stores/usePlayerStore.ts:1304` | Reproduced | REQ-034 |
| `AI-01` | **P2** | Mood Classifier | `src/services/moodDetectionEngine.ts:15` | Reproduced | REQ-041 |
| `UX-01` | **P2** | Search View | `src/components/views/SearchView.tsx:166` | Reproduced | REQ-026 |
| `UX-02` | **P3** | Artist View | `src/components/views/ArtistView.tsx:32` | Reproduced | REQ-028 |
| `UX-03` | **P3** | Room View | `src/components/views/RoomView.tsx:410` | Reproduced | REQ-051 |
| `PRD-01` | **P3** | Docs | Workspace root | Reproduced | PRD Source |

