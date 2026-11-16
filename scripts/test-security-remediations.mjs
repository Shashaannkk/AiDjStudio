/**
 * AI DJ Studio — Automated Security Remediation & Penetration Verification Suite
 * Verifies fixes for:
 * - SEC-AUTH-01: Refresh Token Rotation (RTR) & Replay Attack Defense
 * - SEC-AUTH-02: Dedicated Auth Endpoint Rate Limiting (Brute-Force Protection)
 * - SEC-HDR-01: HTTP Security Headers (CSP, HSTS, X-Content-Type-Options, etc.)
 * - SEC-API-01: Missing Authentication & Sender Spoofing on /api/chat POST
 * - SEC-API-02: Broken Object Level Authorization (BOLA/IDOR) on Queue & Soundclash
 * - SEC-SEC-01: Elimination of Client-Side AI API Key Exposure
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import {
  registerUser,
  refreshSession,
  signJwt,
} from '../src/server/auth.js';
import { handleApiRequest } from '../server.mjs';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function createMockHttpExchange(url, method = 'GET', headers = {}, body = null, remoteIp = '198.51.100.42') {
  const req = new EventEmitter();
  req.url = url;
  req.method = method;
  req.headers = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  req.socket = { remoteAddress: remoteIp };

  let statusCode = 200;
  let responseHeaders = {};
  let responseBody = '';

  const res = {
    writeHead(status, hdrs) {
      statusCode = status;
      responseHeaders = { ...responseHeaders, ...hdrs };
    },
    end(data) {
      if (data) responseBody += data;
    },
  };

  const handlePromise = new Promise((resolve) => {
    // Process after microtask to allow data chunks if any
    setImmediate(() => {
      const handled = handleApiRequest(req, res);
      if (body) {
        req.emit('data', typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.emit('end');
      setImmediate(() => {
        let json = null;
        try {
          json = responseBody ? JSON.parse(responseBody) : null;
        } catch {}
        resolve({
          handled,
          statusCode,
          headers: responseHeaders,
          body: responseBody,
          json,
        });
      });
    });
  });

  return handlePromise;
}

console.log('========================================================================');
console.log('AI DJ STUDIO — SECURITY REMEDIATION & PENETRATION TEST SUITE');
console.log('========================================================================\n');

// ---------------------------------------------------------------------------
// TEST 1: Refresh Token Rotation (SEC-AUTH-01, RFC 6749, OWASP ASVS 5.0)
// ---------------------------------------------------------------------------
console.log('Suite 1: Refresh Token Rotation & Replay Attack Defense (SEC-AUTH-01)');

const testEmail = `sec_rtr_${Date.now()}@test.com`;
const reg = registerUser({ email: testEmail, password: 'SecurePassword123!', name: 'RTR Tester' });
const initialRefreshToken = reg.refreshToken;
assert.ok(initialRefreshToken, 'Registration issues initial refresh token');

const refreshed1 = refreshSession(initialRefreshToken);
assert.ok(refreshed1.accessToken, 'Refreshed session returns new access token');
assert.ok(refreshed1.refreshToken, 'Refreshed session returns new rotated refresh token');
assert.notStrictEqual(
  refreshed1.refreshToken,
  initialRefreshToken,
  'Rotated refresh token must be distinct from initial refresh token'
);
console.log('  ✓ PASS: Refresh token successfully rotated on first use');

// Replay attack test: using initialRefreshToken a second time must fail
try {
  refreshSession(initialRefreshToken);
  assert.fail('Replay attack should have thrown an error');
} catch (err) {
  assert.ok(
    err.message.includes('Invalid or expired refresh token'),
    'Consumed refresh token is immediately invalidated'
  );
  console.log('  ✓ PASS: Replay attack with consumed refresh token is rejected');
  passed++;
}

// Chained rotation test: refreshed1.refreshToken can be rotated into refreshToken3
const refreshed2 = refreshSession(refreshed1.refreshToken);
assert.ok(refreshed2.accessToken, 'Chained refresh returns new access token');
assert.notStrictEqual(
  refreshed2.refreshToken,
  refreshed1.refreshToken,
  'Second rotation issues newly generated refresh token'
);
console.log('  ✓ PASS: Multi-generation token chain progresses correctly');
passed++;

// ---------------------------------------------------------------------------
// TEST 2: Dedicated Auth Endpoint Rate Limiting (SEC-AUTH-02)
// ---------------------------------------------------------------------------
console.log('\nSuite 2: Dedicated Authentication Rate Limiting (SEC-AUTH-02)');

await runAsyncTest('Rejects brute-force login attempts exceeding 10 per minute with HTTP 429', async () => {
  const attackerIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;

  // Fire 10 attempts
  for (let i = 1; i <= 10; i++) {
    const exchange = await createMockHttpExchange(
      '/api/auth/login',
      'POST',
      { 'Content-Type': 'application/json' },
      { email: 'target@aidjstudio.com', password: `guess_${i}` },
      attackerIp
    );
    // Should be processed (401 invalid credentials)
    assert.strictEqual(exchange.statusCode, 401, `Attempt ${i} should be evaluated`);
  }

  // 11th attempt must be blocked by dedicated auth rate limiter with HTTP 429
  const blockedExchange = await createMockHttpExchange(
    '/api/auth/login',
    'POST',
    { 'Content-Type': 'application/json' },
    { email: 'target@aidjstudio.com', password: 'guess_11' },
    attackerIp
  );

  assert.strictEqual(blockedExchange.statusCode, 429, '11th login attempt must return HTTP 429 Too Many Requests');
  assert.ok(
    blockedExchange.json?.error?.includes('Too many authentication attempts'),
    'Returns clear rate limit error explanation'
  );
});

// ---------------------------------------------------------------------------
// TEST 3: HTTP Security Headers (SEC-HDR-01)
// ---------------------------------------------------------------------------
console.log('\nSuite 3: HTTP Security Headers Compliance (SEC-HDR-01)');

await runAsyncTest('Emits OWASP ASVS compliant security headers on all responses', async () => {
  const exchange = await createMockHttpExchange('/api/health', 'GET');
  assert.strictEqual(exchange.statusCode, 200);

  const h = exchange.headers;
  assert.strictEqual(h['X-Content-Type-Options'], 'nosniff', 'Must include X-Content-Type-Options: nosniff');
  assert.strictEqual(h['X-Frame-Options'], 'DENY', 'Must include X-Frame-Options: DENY');
  assert.strictEqual(h['X-XSS-Protection'], '0', 'Must disable legacy X-XSS-Protection');
  assert.strictEqual(h['Referrer-Policy'], 'strict-origin-when-cross-origin', 'Must enforce strict-origin-when-cross-origin');
  assert.ok(h['Content-Security-Policy']?.includes("default-src 'self'"), 'CSP must define restrictive default-src');
  assert.ok(h['Strict-Transport-Security']?.includes('max-age=31536000'), 'HSTS must specify 1 year minimum');
});

// ---------------------------------------------------------------------------
// TEST 4: Realtime Chat POST Security (SEC-API-01)
// ---------------------------------------------------------------------------
console.log('\nSuite 4: Real-Time Chat Authentication & Sender Spoofing Defense (SEC-API-01)');

await runAsyncTest('Rejects unauthenticated POST requests to /api/chat with HTTP 401', async () => {
  const exchange = await createMockHttpExchange(
    '/api/chat',
    'POST',
    { 'Content-Type': 'application/json' },
    {
      roomId: 'room_late_night_lounge',
      message: { message: 'Anonymous unauthenticated injection' },
    }
  );

  assert.strictEqual(exchange.statusCode, 401, 'Unauthenticated chat POST must return HTTP 401');
  assert.ok(exchange.json?.error?.includes('Unauthorized'), 'Error message confirms authentication requirement');
});

await runAsyncTest('Sanitizes and enforces authenticated user identity against spoofing in /api/chat', async () => {
  const userToken = signJwt({
    sub: 'usr_legit_101',
    id: 'usr_legit_101',
    email: 'legit@aidjstudio.com',
    name: 'Legitimate DJ',
    avatar: 'https://images.unsplash.com/legit.jpg',
    role: 'listener',
  });

  const exchange = await createMockHttpExchange(
    '/api/chat',
    'POST',
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    {
      roomId: 'room_late_night_lounge',
      message: {
        userId: 'usr_admin_spoofed_999', // Attacker attempts to spoof an admin ID
        userName: 'Fake Super Admin',     // Attacker attempts to spoof an admin name
        role: 'admin',                    // Attacker attempts to claim admin badge
        message: 'Hello crowd! <script>alert("xss")</script>',
      },
    }
  );

  assert.strictEqual(exchange.statusCode, 200, 'Authenticated message accepted');
  const savedMsg = exchange.json?.message;
  assert.strictEqual(savedMsg.userId, 'usr_legit_101', 'Server must overwrite spoofed userId with verified JWT subject');
  assert.strictEqual(savedMsg.userName, 'Legitimate DJ', 'Server must overwrite spoofed userName with verified JWT name');
  assert.strictEqual(savedMsg.role, 'listener', 'Server must overwrite spoofed role with verified JWT role');
  assert.ok(!savedMsg.message.includes('<script>'), 'Server must sanitize malicious HTML script tags');
});

// ---------------------------------------------------------------------------
// TEST 5: Broken Object Level Authorization (BOLA/IDOR) on Queue & Battles (SEC-API-02)
// ---------------------------------------------------------------------------
console.log('\nSuite 5: Broken Object Level Authorization Defense (SEC-API-02)');

await runAsyncTest('Rejects unauthenticated POST requests to /api/queue/vote', async () => {
  const exchange = await createMockHttpExchange(
    '/api/queue/vote',
    'POST',
    { 'Content-Type': 'application/json' },
    { roomId: 'main_room', queueItemId: 'track_1', userId: 'usr_unauth', voteValue: 1 }
  );
  assert.strictEqual(exchange.statusCode, 401, 'Unauthenticated vote must return HTTP 401');
});

await runAsyncTest('Enforces authenticated user identity in /api/queue/vote', async () => {
  const voterId = `usr_voter_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const isolatedRoomId = `sec_room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const trackId = 'trk_party_anthem';

  const voterToken = signJwt({
    sub: voterId,
    id: voterId,
    email: 'voter@aidjstudio.com',
    name: 'Real Voter',
    role: 'listener',
  });

  const exchange = await createMockHttpExchange(
    '/api/queue/vote',
    'POST',
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${voterToken}`,
    },
    {
      roomId: isolatedRoomId,
      queueItemId: trackId,
      userId: 'usr_victim_someone_else', // Attempt to vote on behalf of another user
      voteValue: 1,
    }
  );

  assert.strictEqual(exchange.statusCode, 200);
  const votes = exchange.json?.votes;
  assert.ok(votes, 'Vote result returned');
  assert.strictEqual(votes[trackId]?.userVotes?.[voterId], 1, 'Vote recorded under authenticated JWT user ID');
  assert.strictEqual(votes[trackId]?.userVotes?.['usr_victim_someone_else'], undefined, 'Spoofed user ID was not credited');
});

await runAsyncTest('Rejects unauthenticated requests to Soundclash battle endpoints', async () => {
  const challengeEx = await createMockHttpExchange(
    '/api/soundclash/challenge',
    'POST',
    { 'Content-Type': 'application/json' },
    { roomId: 'room_1', challenger: { id: 'spoof' } }
  );
  assert.strictEqual(challengeEx.statusCode, 401, 'Unauthenticated challenge returns HTTP 401');

  const submitEx = await createMockHttpExchange(
    '/api/soundclash/submit',
    'POST',
    { 'Content-Type': 'application/json' },
    { roomId: 'room_1', userId: 'spoof', track: { id: 't1' } }
  );
  assert.strictEqual(submitEx.statusCode, 401, 'Unauthenticated track submission returns HTTP 401');

  const voteEx = await createMockHttpExchange(
    '/api/soundclash/vote',
    'POST',
    { 'Content-Type': 'application/json' },
    { roomId: 'room_1', userId: 'spoof', choice: 'dj1' }
  );
  assert.strictEqual(voteEx.statusCode, 401, 'Unauthenticated battle vote returns HTTP 401');
});

// ---------------------------------------------------------------------------
// TEST 6: Client-Side Secret Exposure Verification (SEC-SEC-01)
// ---------------------------------------------------------------------------
console.log('\nSuite 6: Client-Side Secret Exposure Elimination (SEC-SEC-01)');

runTest('Verifies VITE_GEMINI_API_KEY is not exposed in recommendationEngine.ts', () => {
  const code = fs.readFileSync(path.resolve('src/services/recommendationEngine.ts'), 'utf8');
  assert.ok(!code.includes('VITE_GEMINI_API_KEY'), 'Must not reference VITE_GEMINI_API_KEY in client bundle');
  assert.ok(code.includes('/api/assistant/commentary'), 'Must delegate commentary generation to backend endpoint');
});

runTest('Verifies server.mjs uses process.env.GEMINI_API_KEY without VITE_ fallback', () => {
  const code = fs.readFileSync(path.resolve('server.mjs'), 'utf8');
  assert.ok(!code.includes('process.env.VITE_GEMINI_API_KEY'), 'Must not rely on VITE_GEMINI_API_KEY in backend');
  assert.ok(code.includes('process.env.GEMINI_API_KEY'), 'Must use backend-only GEMINI_API_KEY');
});

runTest('Verifies .env.example documents GEMINI_API_KEY as server-side only', () => {
  const envExample = fs.readFileSync(path.resolve('.env.example'), 'utf8');
  assert.ok(!envExample.includes('VITE_GEMINI_API_KEY'), '.env.example must not suggest VITE_GEMINI_API_KEY');
  assert.ok(envExample.includes('GEMINI_API_KEY='), '.env.example must specify GEMINI_API_KEY');
});

console.log('\n========================================================================');
console.log(`SECURITY VERIFICATION SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
