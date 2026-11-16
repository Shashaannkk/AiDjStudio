# AI DJ Studio — Authentication, Cryptography & RBAC Audit

**Scope:** `src/server/auth.js`, `src/services/userService.ts`, `server.mjs`, `supabase/schema.sql`  
**Standards:** OWASP ASVS 5.0 Chapter 2 (Authentication) & Chapter 4 (Access Control), RFC 6749, RFC 7519  
**Audit Date:** November 16–17, 2026  
**Auditor:** Senior Application Security Engineer  

---

## 1. Cryptographic Authentication Architecture

### 1.1 Password Hashing & Salt Generation
- **Algorithm:** Scrypt (`crypto.scryptSync`) with high-entropy 16-byte random salt generated via `crypto.randomBytes(16)`.
- **Key Length:** 64 bytes (512 bits).
- **Constant-Time Verification:** Password hash comparisons utilize `crypto.timingSafeEqual` over fixed-length binary buffers to eliminate side-channel timing attacks:
  ```javascript
  const calculatedHash = hashPassword(password, user.salt);
  const bufCalc = Buffer.from(calculatedHash);
  const bufStored = Buffer.from(user.passwordHash);
  if (bufCalc.length !== bufStored.length || !crypto.timingSafeEqual(bufCalc, bufStored)) {
    throw new Error('Invalid email or password');
  }
  ```

### 1.2 Access Token Issuance (JWT)
- **Algorithm:** HMAC-SHA256 (HS256).
- **Token Format:** Standard RFC 7519 Three-part JWT (`header.payload.signature`).
- **Signature Verification:** Verifies signatures using `crypto.timingSafeEqual`. Rejects unsigned tokens (`alg: none`) or tokens signed with alternate keys.
- **Expiration:** 3,600 seconds (1 hour). Verified against current server epoch timestamp (`exp > Math.floor(Date.now() / 1000)`).
- **Least-Privilege Role Default:** Public registration (`registerUser`) strictly forces `role = 'listener'`. Privileged roles (`admin`, `moderator`, `host`, `co-dj`) can only be provisioned via explicit authorized operator tooling (`provisionAdminUser`).

### 1.3 Refresh Token Rotation (RTR - RFC 6749 / OWASP ASVS 5.0)
- **Token Generation:** 64-character hex string generated via `crypto.randomBytes(32).toString('hex')`.
- **TTL:** 7 days (604,800,000 ms).
- **Single-Use Invalidation:** Upon presentation to `/api/auth/refresh`, the submitted refresh token is immediately deleted from server storage.
- **Rotated Issuance:** A new, unconsumed refresh token is generated and returned to the client along with the new access token.
- **Replay Protection:** Any attempt to reuse a previously consumed refresh token immediately fails with `Invalid or expired refresh token`.

---

## 2. Role-Based Access Control (RBAC) Hierarchy

| Role | Hierarchy Level | Capabilities & Access Permissions |
|---|---|---|
| **Admin** | Level 5 (Highest) | Full catalogue CRUD (create, update, deactivate, delete); user management; access to `/api/admin/*`; room management; operator controls. |
| **Moderator** | Level 4 | Track editing, deactivation toggle; queue moderation; room kick/mute capabilities. |
| **Host** | Level 3 | DJ Room owner; controls deck playback; manages room queue; approves Co-DJs; initiates Soundclash battles. |
| **Co-DJ** | Level 2 | Co-manages active queue; submits tracks to deck; participates in DJ handoffs. |
| **Listener** | Level 1 (Default) | Browses public catalogue; listens to synchronized audio; votes on queue tracks; chats in rooms; challenges in Soundclash. |

### 2.1 Server-Side Enforcement Mechanisms
1. **Administrative Endpoints:**
   - Evaluated by `server.mjs:361-388`.
   - Requires valid `X-Admin-Key` (verified via constant-time comparison) OR verified JWT containing `auth.user.role === 'admin' || auth.user.role === 'moderator'`.
   - Rejects unprivileged callers with HTTP 403 Forbidden.
2. **Registration Role Escalation Defense (SEC-01):**
   - Public registration handler explicitly rejects requests attempting to pass `role: 'admin'`, `role: 'moderator'`, `role: 'host'`, or `role: 'co-dj'` with error:
     `Public registration cannot assign privileged roles. All new accounts default to listener.`
3. **Database Role Escalation Defense (SEC-DB-02):**
   - PostgreSQL trigger `prevent_profile_role_escalation` on `public.profiles` prevents non-admins from changing their role in Supabase.

---

## 3. Retest & Verification Results

All authentication security controls are automated in:
- `scripts/test-phase1-auth-security.mjs` (Suites 1–6)
- `scripts/test-security-remediations.mjs` (Suites 1 & 2)

**Results:** 100% PASS. All cryptographic and authorization controls operate as designed.
