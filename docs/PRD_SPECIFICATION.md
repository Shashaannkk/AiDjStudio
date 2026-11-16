# AI DJ Studio — Product Requirements Document (PRD) Specification

**Document Version:** 2.0 (Authoritative Formalized Specification)  
**Classification:** Core System Architecture & Requirement Source of Truth  
**Project:** AI DJ Studio (`ai-dj-studio`)  
**Date:** November 16, 2026

---

## 1. Product Vision & Mission Statement

AI DJ Studio is an intelligent, collaborative social music platform combining dual-deck Web Audio DJ mixing, automated acoustic feature analysis, real-time multi-listener room synchronization, crowd-voted queue curation, dynamic room mood sentiment detection, and head-to-head Human DJ Soundclash battles.

---

## 2. System Architecture & High-Level Topology

```
+-----------------------------------------------------------------------------------+
|                                CLIENT APPLICATION                                 |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | React 19 UI Engine |  | Zustand Player Store |  | Dual-Deck Web Audio Engine|  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|            |                        |                           |                 |
|            +-------------------+----+---------------------------+                 |
|                                |                                                  |
|                   +------------v-------------+                                    |
|                   | Unified Music Service    |                                    |
|                   | (Jamendo, Audius, Apple) |                                    |
|                   +------------+-------------+                                    |
+--------------------------------|--------------------------------------------------+
                                 | HTTP / WebSockets / Realtime
+--------------------------------v--------------------------------------------------+
|                            BACKEND & REALTIME SERVICES                            |
|  +-----------------------+  +----------------------+  +------------------------+  |
|  | Express REST API      |  | Realtime Room Hub    |  | Room Capacity Authority|  |
|  | - Auth (Scrypt/HS256) |  | - State Broadcast    |  | - 50 Participant Cap   |  |
|  | - Tracks & Acoustics  |  | - Queue Reorder Sync |  | - Atomic Join Gating   |  |
|  | - Soundclash Battles  |  | - Drift Correction   |  |                        |  |
|  | - Session Telemetry   |  |                      |  |                        |  |
|  +-----------------------+  +----------------------+  +------------------------+  |
|                                 |                                                 |
|  +------------------------------v----------------------------------------------+  |
|  | Persistence & Storage Subsystem (`src/server/db.js`)                         |  |
|  | - PostgreSQL / Supabase Relational Schema (18 Tables + Triggers + RLS)       |  |
|  | - Crash-Resilient Atomic File Persistence with In-Process Write Mutexes     |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Functional Domains & Requirement Specifications

### Domain 1: Authentication & Authorization (REQ-001 – REQ-015)
- **REQ-001 (Registration):** Public registration creates user profiles with scrypt-hashed passwords. Client-supplied roles are strictly rejected; all new accounts default to `listener`.
- **REQ-002 (Login):** Validates credentials using timing-safe comparison, returning 1-hour HS256 JWT access tokens and 7-day refresh tokens.
- **REQ-011 (Server-side RBAC):** Role hierarchy enforced server-side (`listener` < `co-dj` < `host` < `admin`).
- **REQ-015 (Security & Token Authority):** Ephemeral 256-bit or environment `JWT_SECRET` required; static default secret fallbacks prohibited.

### Domain 2: Full-Length Music Playback & Audio Streaming (REQ-016 – REQ-020)
- **REQ-016 (Full-Length Audio):** All full-length audio tracks (Jamendo, Audius, Internet Archive) must play continuously from 0:00 to their natural conclusion without artificial 30s cutoffs.
- **REQ-017 (Preview Transparency):** Apple / iTunes 30-second previews must be explicitly labeled (`isFullLength: false`, `streamType: 'preview'`, `duration: 30`, `streamDuration: 30`).
- **REQ-018 (Track State Reset):** Loading any track must reset `currentTime` to 0.000s unless explicitly resuming.

### Domain 3: DJ Lounges & Room Management (REQ-021 – REQ-030)
- **REQ-021 (50-Participant Capacity):** Strict hard cap of 50 concurrent participants per room. The 51st participant is atomically rejected with HTTP 409 (`ROOM_CAPACITY_REACHED`).
- **REQ-026 (Realtime Room Updates):** Active rooms synchronize playback state, chat, participants, and queues via low-latency duplex messaging.

### Domain 4: Collaborative Queue & Live Voting (REQ-031 – REQ-037)
- **REQ-031 (Queue Voting):** Upvoting (+1) and Downvoting (-1) dynamically re-sorts the communal queue by net vote count with stable tie-breaking.
- **REQ-032 (Listener Broadcast):** Listener votes are immediately recorded server-side and broadcast to all connected clients over WebSockets.
- **REQ-035 (Concurrent Modification Safety):** Atomic file persistence (`atomicWriteJsonSync`) eliminates race conditions and file truncation.

### Domain 5: Realtime Playback Synchronization & Drift Control (REQ-038)
- **REQ-038 (Sub-100ms Drift Correction):** Continuous audio playback time must preserve raw sub-second floating-point precision (`preservesPitch = true`). Drift delta exceeding ±100ms triggers subtle rate modulation (0.95x–1.05x) without audible pitch warping.

### Domain 6: Soundclash Battles (REQ-039 – REQ-050)
- **REQ-039 (Human DJ Battle Creation):** Contenders register (DJ 1 vs DJ 2) and select track weapons from the catalogue.
- **REQ-045 (Crowd Voting & Resolution):** Room participants cast single votes during a 30s–45s countdown. At round end, the battle concludes with an authoritative winner and permanent history archiving.

### Domain 7: Room Mood & Sentiment Intelligence (REQ-076 – REQ-081)
- **REQ-081 (Sentiment Accuracy >= 85%):** Natural language stemming, multi-word phrase detection, negation handling, and queue acoustic priors classify room mood into 6 states (`energetic`, `relaxed`, `happy`, `melancholic`, `focused`, `party`).

### Domain 8: Dual-Deck Mixing Studio (REQ-056 – REQ-075)
- **REQ-056 (Independent Decks):** Deck A and Deck B feature independent play/pause, volume faders, 3-band EQs (Low, Mid, High), BPM pitch sliders, and central crossfader.

### Domain 9: Recommendation Engine & Segue Chains (REQ-100 – REQ-108)
- **REQ-101 (Recommendation Formula):** 50% Harmonic Compatibility (Camelot Wheel) + 30% Energy Fit + 20% Recency Freshness.
- **REQ-108 (Precision@5 >= 60%):** Strict ±8% BPM candidate eligibility filtering guarantees harmonic and tempo transition standard compliance.

### Domain 10: Session Analytics & Auditing (REQ-109 – REQ-118)
- **REQ-109 (Telemetry):** Tracks session start, duration, listening hours, preferred BPM, modal key, and participant activity.

### Domain 11: Admin & Catalogue Governance (REQ-119 – REQ-127)
- **REQ-120 (Admin CRUD):** Admin dashboard allows track creation, acoustic metadata tagging, deactivation, and reported content resolution.
