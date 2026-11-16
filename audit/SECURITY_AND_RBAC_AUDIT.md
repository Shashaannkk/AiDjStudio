# AI DJ Studio — Security & RBAC Audit Report

**Auditor:** Senior Security Auditor & Principal Architect  
**Audit Scope:** Authentication, Authorization, Session Management, JWT Integrity, RBAC, Secret Exposure, and Abuse Resistance  
**Date:** 2026-11-16  

---

## 1. Security Vulnerability Matrix

| Vulnerability ID | Severity | Category | Description | Source File & Location | Status |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **SEC-01** | **P0 (Critical)** | Privilege Escalation | Unauthenticated users can self-assign the `admin` role upon registration | `src/server/auth.js:211`, `server.mjs:168` | **CONFIRMED** |
| **SEC-02** | **P1 (High)** | Cryptographic Weakness | Hardcoded fallback JWT signing secret in source code | `src/server/auth.js:19` | **CONFIRMED** |
| **SEC-03** | **P1 (High)** | Credential Exposure | Hardcoded master admin credentials seeded in source code | `src/server/auth.js:130` | **CONFIRMED** |
| **SEC-04** | **P2 (Medium)** | Data Isolation / RLS | Supabase RLS policies unexecuted in production due to empty configuration | `supabase/schema.sql`, `.env` | **CONFIRMED** |
| **SEC-05** | **P2 (Medium)** | Rate Limiting | Rate limiting operates per IP in-memory, bypassed by IP rotation | `server.mjs:96-99` | **CONFIRMED** |

---

## 2. In-Depth Analysis of Critical Findings

### SEC-01: Unauthenticated Privilege Escalation to Full Administrator Role (P0)

#### Vulnerability Description
In `src/server/auth.js`, the `registerUser` function accepts an unvalidated `role` property directly from the parsed JSON request body:

```javascript
// src/server/auth.js (Line 186, 211)
export function registerUser({ email, password, name, role = 'listener' }) {
  ...
  const user = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: cleanEmail,
    passwordHash,
    salt,
    name: cleanName,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
    role: role === 'admin' ? 'admin' : role === 'co-dj' ? 'co-dj' : 'listener', // <--- ATTACK VECTOR
    createdAt: Date.now(),
  };
```

And in `server.mjs`:
```javascript
// server.mjs (Line 165-170)
if (urlStr === '/api/auth/register' && req.method === 'POST') {
  parseJsonBody(req)
    .then((data) => {
      const result = registerUser(data); // <--- Raw body passed directly
      sendJson(res, 201, result);
    })
```

#### Exploit Reproduction
Sending the following HTTP payload to `/api/auth/register`:
```http
POST /api/auth/register HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "email": "attacker@exploit.com",
  "password": "Password123!",
  "name": "Attacker",
  "role": "admin"
}
```

**Outcome:**
The server returns HTTP 201 Created containing an HS256 JWT access token whose payload contains:
```json
{
  "sub": "usr_1794814019637_a4f2",
  "id": "usr_1794814019637_a4f2",
  "email": "attacker@exploit.com",
  "name": "Attacker",
  "role": "admin",
  "iat": 1794814019,
  "exp": 1794817619
}
```
This token grants immediate, unrestricted access to:
- `PUT /api/admin/tracks/:id` (modifying catalogue tracks)
- `POST /api/admin/tracks` (injecting arbitrary track records)
- `DELETE /api/admin/tracks/:id` (deleting catalogue records)
- `POST /api/admin/tracks/:id/deactivate` (deactivating tracks platform-wide)

#### Recommended Remediation
Remove user control over the role field on public registration:
```javascript
// Remediated registerUser in src/server/auth.js:
export function registerUser({ email, password, name }) {
  // Public registration MUST strictly enforce listener role
  const role = 'listener';
  ...
```

---

### SEC-02: Hardcoded Fallback JWT Secret (P1)

#### Vulnerability Description
Line 19 of `src/server/auth.js` defines:
```javascript
export const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'aidj-studio-cryptographic-jwt-production-secret-2026';
```

Because `.env` does not specify `JWT_SECRET`, the application defaults to the static string `"aidj-studio-cryptographic-jwt-production-secret-2026"`.

#### Security Impact
An attacker can forge valid HS256 tokens offline using standard HMAC-SHA256 libraries with this secret, granting themselves any arbitrary user identity and any role claim without contacting the server.

#### Recommended Remediation
Enforce mandatory environment variable verification at server startup. If `JWT_SECRET` is undefined, the server should throw a fatal configuration error rather than falling back to a static string:
```javascript
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be defined in production environment variables.');
}
```

---

### SEC-03: Hardcoded Master Admin Credentials (P1)

#### Vulnerability Description
Lines 127–136 of `src/server/auth.js` automatically seed a default administrator into `data/users.json`:
- Email: `admin@aidjstudio.com`
- Password: `AdminPassword2026!`

#### Security Impact
Anyone reviewing the source code can authenticate as the primary administrator on any default deployment.

#### Recommended Remediation
Remove hardcoded credential seeding. Admin accounts must be created via a secure, one-time CLI setup script requiring interactive password entry or pre-hashed database migrations.

---

## 3. Cryptographic & Token Verification Evaluation

| Security Requirement | Implementation Detail | Independent Test Result |
| :--- | :--- | :---: |
| **Password Hashing** | `crypto.scryptSync(password, salt, 64)` with 32-byte salt (`crypto.randomBytes(16).toString('hex')`) | **PASS** (Strong KDF, resistant to GPU acceleration) |
| **Timing Attack Resistance** | `crypto.timingSafeEqual` used for password hash comparison and JWT signature validation | **PASS** (Constant-time execution verified) |
| **JWT Expiration** | Enforces strict 3600-second (1 hour) expiration: `payload.exp < Math.floor(Date.now() / 1000)` | **PASS** (Expired tokens rejected with 401) |
| **Signature Tampering** | Re-computes HMAC-SHA256 and rejects modified payloads | **PASS** (Tampered tokens rejected with 401) |
| **Refresh Token Rotation** | 7-day tokens rotated on renewal; revoked tokens purged from store | **PASS** (Replay attempts rejected with 401) |
| **CORS Policy** | Permissive in development (`Access-Control-Allow-Origin: *`) | **PARTIAL** (Must restrict to domain in production) |
| **Rate Limiting** | Sliding window rate limiter (120 req/min per IP) | **PASS** (Limits excessive automated calls) |
