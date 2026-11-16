# AI DJ Studio — Frontend Security & AI Service Gateway Audit

**Scope:** Client-Side Single Page Application, Vite Build Artifacts, AI DJ Voice Commentary, Assistant Chat  
**Files:** `src/services/recommendationEngine.ts`, `src/services/aiAssistantService.ts`, `server.mjs`, `vite.config.ts`, `.env.example`  
**Audit Date:** November 16–17, 2026  
**Auditor:** Senior Full-Stack Security Engineer  

---

## 1. Client-Side Secret Isolation (SEC-SEC-01)

### 1.1 The Vulnerability
In Vite-based applications, any environment variable prefixed with `VITE_` (e.g. `VITE_GEMINI_API_KEY`) is automatically inlined into client JavaScript bundles during build time.
In previous code:
- `.env.example` documented `VITE_GEMINI_API_KEY`.
- `src/services/recommendationEngine.ts` contained:
  ```typescript
  const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (apiKey) {
    await fetch(`https://generativelanguage.googleapis.com/...key=${apiKey}`);
  }
  ```
This exposed the Google Gemini AI Studio API key directly in browser DevTools to all website visitors.

### 1.2 The Remediation Implemented
1. **Server-Side AI Gateway:**
   - Introduced secure server-side endpoint `POST /api/assistant/commentary` in `server.mjs`.
   - The backend server accesses `process.env.GEMINI_API_KEY` exclusively on the Node.js server.
2. **Frontend Clean-up:**
   - Removed all `VITE_GEMINI_API_KEY` occurrences from `src/services/recommendationEngine.ts`.
   - Updated `generateAiCommentary()` to delegate commentary requests to `/api/assistant/commentary`.
   - Maintained deterministic studio speech fallback if offline or unconfigured.
3. **Environment Hardening:**
   - Updated `.env.example` to document `GEMINI_API_KEY` (server-side only) and warned against using `VITE_` prefix.

---

## 2. Cross-Site Scripting (XSS) & Content Security Policy (CSP)

### 2.1 Content-Security-Policy (CSP) Enforcement
Enforced on all HTTP responses via `SECURITY_HEADERS` in `server.mjs`:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: wss:; img-src 'self' data: https: blob:; media-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:;
```
- Restricts origin loading to authorized domains.
- Permits audio media playback from legitimate blob and HTTPS audio providers.

### 2.2 Client-Side Sanitization
- React JSX automatically escapes dangerous HTML entities during DOM rendering.
- Dangerous methods like `dangerouslySetInnerHTML` are not used for user-supplied chat or track inputs.
- Backend chat endpoint strips `<script>` tags on ingestion.

---

## 3. Safe Failover in AI Voice Commentary

If the external Gemini AI service is unavailable, throttled, or returns an error:
1. `recommendationEngine.ts` catches the network notice without crashing the application.
2. The built-in deterministic DJ Studio Host Speech Engine immediately synthesizes contextual commentary using track title, artist, BPM, harmonic compatibility, and mix technique.
3. Audio playback and playlist transitions continue seamlessly without user disruption.
