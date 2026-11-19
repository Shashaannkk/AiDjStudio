import assert from 'node:assert/strict';
import { handleApiRequest } from '../server.mjs';

console.log('========================================================================');
console.log('AI DJ STUDIO — COMPLETE PRE-PUBLISH END-TO-END API TEST SUITE');
console.log('========================================================================\n');

// Configure test environment with user live Supabase project
process.env.VITE_SUPABASE_URL = 'https://plkssrrlbrucnxklnvuy.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_BYK-o_5msVgyrJjYhsXbqA_28L6hBqL';
process.env.SUPABASE_URL = 'https://plkssrrlbrucnxklnvuy.supabase.co';
process.env.SUPABASE_ANON_KEY = 'sb_publishable_BYK-o_5msVgyrJjYhsXbqA_28L6hBqL';

let passedTests = 0;
let totalTests = 0;
const results = [];

function makeMockRequest({ url, method = 'GET', headers = {}, body = null }) {
  let capturedStatus = 0;
  let capturedHeaders = {};
  let capturedBody = '';

  const normalizedHeaders = {
    host: 'localhost:3000',
    'content-type': 'application/json',
  };
  for (const [k, v] of Object.entries(headers || {})) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  const reqListeners = {};
  const req = {
    url,
    method,
    headers: normalizedHeaders,
    on(event, handler) {
      reqListeners[event] = handler;
      return req;
    },
  };

  const res = {
    writeHead(status, headers) {
      capturedStatus = status;
      if (headers) Object.assign(capturedHeaders, headers);
    },
    setHeader(key, val) {
      capturedHeaders[key] = val;
    },
    end(data) {
      if (data) capturedBody += data;
      if (res._resolve) {
        res._resolve({
          status: capturedStatus,
          headers: capturedHeaders,
          body: capturedBody ? (capturedHeaders['Content-Type']?.includes('json') || capturedHeaders['content-type']?.includes('json') ? JSON.parse(capturedBody) : capturedBody) : null,
        });
      }
    },
  };

  const promise = new Promise((resolve, reject) => {
    res._resolve = resolve;
    try {
      const handled = handleApiRequest(req, res);
      if (!handled) {
        resolve({ status: 404, headers: {}, body: { error: 'Not Handled' } });
        return;
      }
      if (body) {
        process.nextTick(() => {
          if (reqListeners['data']) {
            reqListeners['data'](typeof body === 'string' ? body : JSON.stringify(body));
          }
          if (reqListeners['end']) {
            reqListeners['end']();
          }
        });
      }
    } catch (err) {
      reject(err);
    }
  });

  return promise;
}

async function testEndpoint(domain, name, fn) {
  totalTests++;
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`[PASS] [${domain}] ${name} (${duration}ms)`);
    passedTests++;
    results.push({ domain, name, status: 'PASS', duration });
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[FAIL] [${domain}] ${name} (${duration}ms)`);
    console.error(`       Error: ${err.message}`);
    results.push({ domain, name, status: 'FAIL', duration, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// 1. HEALTH & SYSTEM DIAGNOSTICS APIS
// ---------------------------------------------------------------------------

await testEndpoint('Health', 'GET /api/health returns HTTP 200 with active status and database configuration', async () => {
  const res = await makeMockRequest({ url: '/api/health', method: 'GET' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'healthy');
  assert.strictEqual(res.body.version, '2.0.0');
  assert.strictEqual(typeof res.body.database, 'object');
  assert.strictEqual(res.body.database.configured, true);
  assert.strictEqual(res.body.database.provider, 'supabase_postgres');
});

// ---------------------------------------------------------------------------
// 2. AUTHENTICATION & IDENTITY APIS
// ---------------------------------------------------------------------------

let testUserToken = '';
let testRefreshToken = '';
const testUserEmail = `pilot_dj_${Date.now()}@aidjstudio.com`;
const testUserPassword = 'SuperSecretDJPassword2026!';

await testEndpoint('Auth', 'POST /api/auth/register creates user account and returns JWT credentials', async () => {
  const res = await makeMockRequest({
    url: '/api/auth/register',
    method: 'POST',
    body: {
      email: testUserEmail,
      password: testUserPassword,
      name: 'Pilot DJ Resident',
    },
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.email, testUserEmail);
  assert.strictEqual(typeof res.body.accessToken, 'string');
  assert.strictEqual(typeof res.body.refreshToken, 'string');
  testUserToken = res.body.accessToken;
  testRefreshToken = res.body.refreshToken;
});

await testEndpoint('Auth', 'POST /api/auth/login authenticates with valid credentials', async () => {
  const res = await makeMockRequest({
    url: '/api/auth/login',
    method: 'POST',
    body: {
      email: testUserEmail,
      password: testUserPassword,
    },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Boolean(res.body.accessToken), true);
  assert.strictEqual(res.body.user.email, testUserEmail);
  testUserToken = res.body.accessToken;
});

await testEndpoint('Auth', 'GET /api/auth/me verifies Bearer JWT token and returns user profile', async () => {
  const res = await makeMockRequest({
    url: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${testUserToken}` },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, testUserEmail);
});

await testEndpoint('Auth', 'POST /api/auth/refresh issues new session tokens', async () => {
  const res = await makeMockRequest({
    url: '/api/auth/refresh',
    method: 'POST',
    body: { refreshToken: testRefreshToken },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Boolean(res.body.accessToken), true);
});

// ---------------------------------------------------------------------------
// 3. COLLABORATIVE ROOMS & CAPACITY GATING APIS
// ---------------------------------------------------------------------------

let createdRoomId = '';
let createdRoomCode = '';

await testEndpoint('Rooms', 'GET /api/rooms lists active live lounges', async () => {
  const res = await makeMockRequest({ url: '/api/rooms', method: 'GET' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Array.isArray(res.body.rooms), true);
  assert.strictEqual(res.body.rooms.length > 0, true);
});

await testEndpoint('Rooms', 'POST /api/rooms creates room with host authority', async () => {
  const res = await makeMockRequest({
    url: '/api/rooms',
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      name: 'Electric Horizon Lounge',
      genre: 'Progressive House',
    },
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.room.name, 'Electric Horizon Lounge');
  assert.strictEqual(Boolean(res.body.room.code), true);
  createdRoomId = res.body.room.id;
  createdRoomCode = res.body.room.code;
  assert.strictEqual(typeof createdRoomCode, 'string');
});

await testEndpoint('Rooms', 'GET /api/rooms/:id retrieves room live state and listener count', async () => {
  const res = await makeMockRequest({
    url: `/api/rooms/${encodeURIComponent(createdRoomId)}`,
    method: 'GET',
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.room.id, createdRoomId);
  assert.strictEqual(typeof res.body.room.listenerCount, 'number');
});

await testEndpoint('Rooms', 'GET /api/rooms/capacity checks capacity gating (50 max)', async () => {
  const res = await makeMockRequest({
    url: `/api/rooms/capacity?roomId=${encodeURIComponent(createdRoomId)}`,
    method: 'GET',
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.maxCapacity, 50);
  assert.strictEqual(res.body.isFull, false);
});

// ---------------------------------------------------------------------------
// 4. COLLABORATIVE QUEUE & REAL-TIME VOTING APIS
// ---------------------------------------------------------------------------

await testEndpoint('Queue', 'POST /api/queue/vote casts listener upvote/downvote', async () => {
  const res = await makeMockRequest({
    url: '/api/queue/vote',
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      roomId: createdRoomId,
      trackId: 'track_test_101',
      vote: 1,
    },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
});

await testEndpoint('Queue', 'GET /api/queue/votes fetches vote tallies for room', async () => {
  const res = await makeMockRequest({
    url: `/api/queue/votes?roomId=${encodeURIComponent(createdRoomId)}`,
    method: 'GET',
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(typeof res.body.votes, 'object');
});

// ---------------------------------------------------------------------------
// 5. REAL-TIME CHAT & AUDIENCE REACTION APIS
// ---------------------------------------------------------------------------

await testEndpoint('Chat', 'POST /api/chat broadcasts message across listeners', async () => {
  const res = await makeMockRequest({
    url: '/api/chat',
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      roomId: createdRoomId,
      message: {
        id: `msg_${Date.now()}`,
        userName: 'Pilot DJ',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200',
        message: 'Dropping the peak energy transition now! 🔥',
        timestamp: '12:00 PM',
      },
    },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
});

await testEndpoint('Chat', 'GET /api/chat/messages fetches isolated room chat history', async () => {
  const res = await makeMockRequest({
    url: `/api/chat/messages?roomId=${encodeURIComponent(createdRoomId)}`,
    method: 'GET',
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Array.isArray(res.body), true);
  assert.strictEqual(res.body.length > 0, true);
});

// ---------------------------------------------------------------------------
// 6. USER LIBRARY, PLAYLISTS, LIKED SONGS & HISTORY APIS
// ---------------------------------------------------------------------------

let createdPlaylistId = '';

await testEndpoint('Library', 'POST /api/library/playlists creates a custom playlist', async () => {
  const res = await makeMockRequest({
    url: '/api/library/playlists',
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      name: 'Sunset Melodic Deep House',
      description: 'Curated 124 BPM melodic progression',
    },
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.playlist.name, 'Sunset Melodic Deep House');
  createdPlaylistId = res.body.playlist.id;
});

await testEndpoint('Library', 'GET /api/library/playlists returns user-owned playlists', async () => {
  const res = await makeMockRequest({
    url: '/api/library/playlists',
    method: 'GET',
    headers: { Authorization: `Bearer ${testUserToken}` },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Array.isArray(res.body.playlists), true);
  assert.strictEqual(res.body.playlists.some((p) => p.id === createdPlaylistId), true);
});

await testEndpoint('Library', 'POST /api/library/likes toggles track favorite status', async () => {
  const res = await makeMockRequest({
    url: '/api/library/likes',
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      trackId: 'in_tauba_tauba',
    },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.liked, true);
});

await testEndpoint('Library', 'GET /api/library/likes retrieves user liked track IDs', async () => {
  const res = await makeMockRequest({
    url: '/api/library/likes',
    method: 'GET',
    headers: { Authorization: `Bearer ${testUserToken}` },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Array.isArray(res.body.likes), true);
  assert.strictEqual(res.body.likes.includes('in_tauba_tauba'), true);
});

await testEndpoint('Library', 'POST /api/library/history records listening session history', async () => {
  const res = await makeMockRequest({
    url: '/api/library/history',
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      track: {
        id: 'in_tauba_tauba',
        title: 'Tauba Tauba',
        artist_name: 'Karan Aujla',
        duration: 208,
      },
    },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Array.isArray(res.body.history), true);
});

await testEndpoint('Library', 'GET /api/library/history fetches user listening history', async () => {
  const res = await makeMockRequest({
    url: '/api/library/history',
    method: 'GET',
    headers: { Authorization: `Bearer ${testUserToken}` },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Array.isArray(res.body.history), true);
  assert.strictEqual(res.body.history.length > 0, true);
});

// ---------------------------------------------------------------------------
// 7. MUSIC CATALOGUE & MULTI-PROVIDER APIS
// ---------------------------------------------------------------------------

await testEndpoint('Music', 'GET /api/tracks queries catalogue tracks with filtering and BPM metadata', async () => {
  const res = await makeMockRequest({ url: '/api/tracks?limit=10', method: 'GET' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Array.isArray(res.body.tracks), true);
  assert.strictEqual(res.body.tracks.length > 0, true);
});

// ---------------------------------------------------------------------------
// 8. SOUNDCLASH DJ BATTLES & ARCHIVAL APIS
// ---------------------------------------------------------------------------

await testEndpoint('Soundclash', 'GET /api/soundclash/history retrieves completed battle history', async () => {
  const res = await makeMockRequest({ url: '/api/soundclash/history', method: 'GET' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Array.isArray(res.body.history), true);
});

// ---------------------------------------------------------------------------
// 9. AI DJ ASSISTANT & VOICE COMMENTARY APIS
// ---------------------------------------------------------------------------

await testEndpoint('AI DJ', 'POST /api/assistant/chat delivers music assistant intelligence', async () => {
  const res = await makeMockRequest({
    url: '/api/assistant/chat',
    method: 'POST',
    body: {
      messages: [{ role: 'user', content: 'What is the Camelot harmonic key rule for DJ mixing?' }],
      context: { queueLength: 3 },
    },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
});

await testEndpoint('AI DJ', 'POST /api/assistant/commentary generates DJ transition voice script', async () => {
  const res = await makeMockRequest({
    url: '/api/assistant/commentary',
    method: 'POST',
    body: {
      currentTrack: { title: 'Midnight Drive', artist_name: 'Resident DJ', bpm: 124 },
      nextTrack: { title: 'Neon Pulse', artist_name: 'Synthetix', bpm: 126 },
      technique: 'Bassline swap',
      mood: 'energetic',
    },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(Boolean(res.body.success || res.body.fallback), true);
});

// ---------------------------------------------------------------------------
// 10. SESSION TELEMETRY & ANALYTICS APIS
// ---------------------------------------------------------------------------

await testEndpoint('Analytics', 'POST /api/sessions/start & end tracks user DJ sessions', async () => {
  const startRes = await makeMockRequest({
    url: '/api/sessions/start',
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      userId: 'usr_pilot_dj',
      sessionId: `sess_${Date.now()}`,
      roomId: createdRoomId,
    },
  });
  assert.strictEqual(startRes.status, 201);
  assert.strictEqual(startRes.body.success, true);

  const endRes = await makeMockRequest({
    url: '/api/sessions/end',
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      sessionId: startRes.body.session.id,
      durationSec: 180,
      tracksCount: 2,
    },
  });
  assert.strictEqual(endRes.status, 200);
  assert.strictEqual(endRes.body.success, true);
});

// ---------------------------------------------------------------------------
// TEST SUMMARY & FINAL VERDICT
// ---------------------------------------------------------------------------

console.log('\n========================================================================');
console.log(`API TEST SUMMARY: ${passedTests}/${totalTests} Endpoints Passed (${totalTests - passedTests} Failed)`);
console.log('========================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
