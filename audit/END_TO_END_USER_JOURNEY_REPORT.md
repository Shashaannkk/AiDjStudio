# AI DJ Studio — End-to-End User Journey Audit Report

**Auditor:** Principal QA Systems Engineer  
**Audit Scope:** End-to-End Simulation of Journeys A through H  
**Date:** 2026-11-16  

---

## Journey A — New Listener
*Flow:* Register $\to$ Login $\to$ Join room $\to$ Listen to music $\to$ Vote $\to$ Chat $\to$ Leave $\to$ View history.
- **Preconditions:** Fresh browser session, clean state.
- **Actions:**
  1. Open registration modal, enter email and password.
  2. Authenticate and receive session tokens.
  3. Browse Live Rooms, enter room code.
  4. Stream audio from room playback bar.
  5. Cast upvote on track in collaborative queue.
  6. Post chat message in room feed.
  7. Leave room and navigate to User Dashboard / Analytics view.
- **Actual Results:**  
  Registration, login, room join, and chat execute smoothly. Streaming works. However:
  - Upvote sorts the listener's local queue but **does not broadcast the re-sorted queue to the host or other members (`QUE-01`)**.
  - History is saved in `data/sessions.json` and displays correctly in the dashboard.
- **Status:** **PARTIAL (Collaborative voting sync gap)**

---

## Journey B — Host
*Flow:* Login $\to$ Create room $\to$ Add tracks $\to$ Start playback $\to$ Manage queue $\to$ Invite $\to$ End session $\to$ Analytics.
- **Preconditions:** Authenticated host account.
- **Actions:**
  1. Click "Host a Real-Time DJ Room" in `LiveRoomsView`.
  2. Receive unique 6-character room code (`DJ-XXXX`).
  3. Add tracks from library to room queue.
  4. Initiate playback; master sync broadcasts to channel.
  5. Copy invite link (`?room=CODE`).
  6. End session; view session summary in User Dashboard.
- **Actual Results:**  
  Room generation, queue addition, playback broadcast, and session duration tracking execute cleanly.
- **Status:** **PASS**

---

## Journey C — Co-DJ
*Flow:* Join room $\to$ Receive role $\to$ Add/reorder tracks $\to$ Collaborate $\to$ Role restrictions.
- **Preconditions:** Listener joins room; Host promotes listener to Co-DJ.
- **Actions:**
  1. Host updates participant role to `'co-dj'`.
  2. Co-DJ reorders queue and triggers queue updates.
  3. Co-DJ attempts host-only actions (closing room).
- **Actual Results:**  
  Role elevation works. Co-DJ can reorder queue and broadcast. Closing room is correctly restricted to Host.
- **Status:** **PASS**

---

## Journey D — Human DJ vs DJ Soundclash
*Flow:* Create battle $\to$ Assign 2 human DJs $\to$ Submit tracks $\to$ Battle $\to$ Vote $\to$ Winner $\to$ History.
- **Preconditions:** Live room active with Host and Co-DJ.
- **Actions:**
  1. User attempts to start human DJ contender battle from room interface.
  2. Assign DJ 1 and DJ 2 contenders.
  3. Contenders submit weapon tracks.
- **Actual Results:**  
  **FAIL (`SND-01`):** The room interface only has a button calling `startSoundclash()` which triggers an in-memory AI track battle. There is **zero UI in the application** to challenge another human DJ, register contenders, or submit weapon tracks. The backend human battle endpoints in `src/server/soundclash.js` are never called.
- **Status:** **FAIL (Feature disconnected from UI)**

---

## Journey E — Platform Administrator
*Flow:* Login as admin $\to$ Create track $\to$ Edit acoustic metadata $\to$ Verify recommendation $\to$ Deactivate $\to$ Verify update.
- **Preconditions:** Authenticated with admin role claim.
- **Actions:**
  1. Access `/admin` dashboard.
  2. Open "Track Catalogue" tab; click "Add Track".
  3. Fill title, artist, audio URL, BPM, Camelot Key (`11A`), and energy (`92`).
  4. Save track; verify presence in recommendation engine.
  5. Toggle deactivation switch.
- **Actual Results:**  
  Admin dashboard unlocked. Modal saves track to `data/tracks.json`. Recommendation engine reflects added track. Deactivation toggle hides track from active pool.
- **Status:** **PASS**

---

## Journey F — Failure Recovery
*Flow:* Start playback $\to$ Disconnect network $\to$ Reconnect $\to$ Restore session $\to$ Verify sync.
- **Preconditions:** Active playback in room.
- **Actions:**
  1. Simulate network disconnect.
  2. Restore network after 15 seconds.
  3. Observe reconnect behavior.
- **Actual Results:**  
  EventSource auto-reconnects. Playback drift exceeds 1.0s, triggering a hard seek to target position. Session recovers.
- **Status:** **PASS**

---

## Journey G — Multi-Device Realtime Playback
*Flow:* Host on Device 1 $\to$ Listener on Device 2 $\to$ Verify sync < 100ms.
- **Preconditions:** Two physically separate devices.
- **Actions:**
  1. Device 1 hosts room.
  2. Device 2 joins via room code.
  3. Measure acoustic output synchronization.
- **Actual Results:**  
  **FAIL (`AUD-01`):** In cross-network mode without Supabase credentials, devices fall back to local mode and do not sync across separate computers. When simulated on local network, `audioEngine.ts:50` integer flooring introduces up to 999ms tempo oscillation.
- **Status:** **FAIL**

---

## Journey H — Security Abuse & Exploitation
*Flow:* Privilege escalation $\to$ Token tampering $\to$ Forged secrets $\to$ Replay.
- **Preconditions:** Unauthenticated attacker.
- **Actions:**
  1. Send `POST /api/auth/register` with `role: 'admin'`.
  2. Check role of issued token.
  3. Attempt administrative operations with issued token.
- **Actual Results:**  
  **FAIL (`SEC-01`):** Server registers attacker as full administrator. Attacker successfully deletes catalogue tracks and modifies acoustic features.
- **Status:** **FAIL (Critical Security Vulnerability)**
