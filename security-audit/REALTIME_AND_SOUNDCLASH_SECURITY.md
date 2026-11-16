# AI DJ Studio — Real-Time Systems & Soundclash Battle Security

**Scope:** Real-Time Chat SSE Stream, Collaborative Queue Voting, Human DJ vs DJ Soundclash Battles  
**Files:** `server.mjs`, `src/services/chatService.ts`, `src/services/soundclashService.ts`, `src/store/usePlayerStore.ts`  
**Audit Date:** November 16–17, 2026  
**Auditor:** Real-Time Audio Systems & Security Engineer  

---

## 1. Real-Time Chat Stream (Server-Sent Events)

### 1.1 Connection Authentication & Lifetime
- **Endpoint:** `GET /api/chat/stream?roomId=...&token=...` (or `Authorization: Bearer <token>`).
- **Authorization Gating:** Validated by `authenticateRequest(req)`. Rejects connections with missing or expired tokens with HTTP 401.
- **Client Tracking:** Active persistent streams are stored in `sseClients = new Set()`. When a client closes their browser tab or network drops, `req.on('close')` immediately removes the client socket from the set, preventing resource leaks.
- **Payload Sanitization:** Ingested chat messages via `POST /api/chat` are sanitized to neutralize HTML script tags (`<script>` replaced with `[sanitized script]`).
- **Sender Identity Enforcement (SEC-API-01):** The server ignores client-supplied `userId`, `userName`, and `role`, overwriting them with the cryptographically verified JWT claims from the authenticated token.

---

## 2. Collaborative Queue Voting & Dynamic Reordering

### 2.1 Threat Vectors Evaluated
1. **Vote Spoofing / Impersonation (BOLA/IDOR):** An attacker submitting votes using someone else's user ID.
2. **Vote Multiplication / Scripting:** Rapid-fire voting to artificially boost a track to the top of the queue.
3. **Queue Poisoning:** Reordering tracks maliciously to disrupt the live DJ set.

### 2.2 Security Defenses Implemented
- **Identity Binding (SEC-API-02):** In `server.mjs:535-548`, `/api/queue/vote` enforces:
  ```javascript
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    sendJson(res, 401, { error: `Unauthorized (${auth.error})`, status: 401 });
    return true;
  }
  const userId = auth.user.id; // Cryptographically forced from JWT
  ```
- **Vote Tallying Invariants:**
  - One vote per user per track: Stored as `votesByRoom[roomId][queueItemId][userId] = voteValue`.
  - Allowed vote values: `+1` (upvote), `-1` (downvote), `0` (withdraw).
  - Toggling: Clicking upvote on an already upvoted track toggles it to `0` (withdraws the vote), preventing infinite score accumulation.
- **Audit Logging:** Every vote addition, change, or withdrawal is written to the persistent queue event log (`data/queue_votes.json`).

---

## 3. Human DJ Soundclash Battle Engine Security

### 3.1 Battle Workflow & Authorization Model
1. **Battle Creation (`POST /api/soundclash/create`):**
   - Requires valid JWT.
   - Server assigns `dj1 = auth.user`, ensuring the battle creator cannot pretend to be another DJ.
2. **Challenger Registration (`POST /api/soundclash/challenge`):**
   - Requires valid JWT.
   - Server assigns `challenger = auth.user`. Rejects challenger if the user is already `dj1` (preventing playing against oneself).
3. **Weapon/Track Submission (`POST /api/soundclash/submit`):**
   - Requires valid JWT.
   - Server strictly enforces `userId = auth.user.id`. A contender cannot submit a bad track on behalf of their opponent.
4. **Crowd Voting (`POST /api/soundclash/vote`):**
   - Requires valid JWT.
   - Enforces `userId = auth.user.id`. One vote per user per battle. Contenders are prohibited from voting on their own battle.

### 3.2 Battle Archival & Integrity
- Upon battle completion, scores are calculated deterministically.
- Concluded battles are permanently appended to `data/soundclash_history.json`.
- Completed battles become immutable records accessible via `GET /api/soundclash/history`.

---

## 4. Verification Evidence

All real-time and battle security controls are verified by:
- `scripts/test-phase3-soundclash-frontend-backend.mjs` (Human battle integration)
- `scripts/test-phase4-queue-voting.mjs` (Vote tallying invariants)
- `scripts/test-phase7-soundclash.mjs` (Full battle lifecycle)
- `scripts/test-security-remediations.mjs` (Suites 4 & 5 - BOLA and spoofing tests)
