/**
 * AI DJ Studio — Collaborative Party Room Connection & Join Test Suite
 * Validates:
 * 1. Room creation by both authenticated DJ and guest host.
 * 2. Room lookup by code across isolated client contexts.
 * 3. Case-insensitivity and URL parameter sanitization.
 * 4. Room presence and capacity gating during multi-user join/leave.
 */

import assert from 'node:assert';
import { handleApiRequest } from '../server.mjs';

function makeMockRequest({ url, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve) => {
    const rawBody = body ? JSON.stringify(body) : '';
    const req = {
      url,
      method,
      headers: {
        'content-type': 'application/json',
        host: 'localhost:10001',
        ...headers,
      },
      on(event, handler) {
        if (event === 'data' && rawBody) {
          handler(Buffer.from(rawBody));
        }
        if (event === 'end') {
          handler();
        }
        return this;
      },
    };

    let statusCode = 200;
    let responseHeaders = {};
    let responseBody = '';

    const res = {
      writeHead(code, h) {
        statusCode = code;
        responseHeaders = { ...responseHeaders, ...h };
        return this;
      },
      setHeader(k, v) {
        responseHeaders[k.toLowerCase()] = v;
      },
      write(chunk) {
        responseBody += chunk.toString();
      },
      end(chunk) {
        if (chunk) responseBody += chunk.toString();
        let parsed = null;
        try {
          parsed = JSON.parse(responseBody);
        } catch {
          parsed = responseBody;
        }
        resolve({
          status: statusCode,
          headers: responseHeaders,
          body: parsed,
        });
      },
    };

    handleApiRequest(req, res);
  });
}

async function runTests() {
  console.log('\n--- AI DJ STUDIO: PARTY ROOM CONNECTION & JOIN SUITE ---');

  // Step 1: Register an authenticated Host User A
  const regRes = await makeMockRequest({
    url: '/api/auth/register',
    method: 'POST',
    body: {
      email: `host_${Date.now()}@test.com`,
      password: 'PartyPassword123!',
      name: 'DJ Test Host',
    },
  });
  assert.strictEqual(regRes.status, 201, 'Host user registration must succeed');
  const hostToken = regRes.body.accessToken;
  assert.strictEqual(Boolean(regRes.body.user), true);

  // Step 2: Host User A creates a live room
  const createRes = await makeMockRequest({
    url: '/api/rooms',
    method: 'POST',
    headers: { Authorization: `Bearer ${hostToken}` },
    body: {
      name: 'Electric Neon Rooftop',
      genre: 'EDM / Festival',
      cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    },
  });
  assert.strictEqual(createRes.status, 201, 'Room creation must return 201 Created');
  assert.strictEqual(Boolean(createRes.body.room), true, 'Response must contain room object');
  const room = createRes.body.room;
  const roomCode = room.code;
  const roomId = room.id;
  assert.strictEqual(typeof roomCode, 'string', 'Room code must be a string');
  assert.strictEqual(roomCode.length >= 4, true, 'Room code must have valid length');
  console.log(`[PASS] Host A created room "${room.name}" with code [${roomCode}] (ID: ${roomId})`);

  // Step 3: Listener User B (unauthenticated, separate browser) looks up room by code
  const lookupRes = await makeMockRequest({
    url: `/api/rooms/${encodeURIComponent(roomCode)}`,
    method: 'GET',
  });
  assert.strictEqual(lookupRes.status, 200, 'User B must find room by code');
  assert.strictEqual(lookupRes.body.room.id, roomId, 'Found room must match ID');
  assert.strictEqual(lookupRes.body.room.code, roomCode, 'Found room must match Code');
  assert.strictEqual(lookupRes.body.room.name, 'Electric Neon Rooftop', 'Room name must match');
  console.log(`[PASS] Listener B looked up room by uppercase code [${roomCode}]`);

  // Step 4: Listener User B looks up room by lowercase code
  const lowerLookupRes = await makeMockRequest({
    url: `/api/rooms/${encodeURIComponent(roomCode.toLowerCase())}`,
    method: 'GET',
  });
  assert.strictEqual(lowerLookupRes.status, 200, 'Case-insensitive lookup must succeed');
  assert.strictEqual(lowerLookupRes.body.room.id, roomId);
  console.log(`[PASS] Listener B looked up room by lowercase code [${roomCode.toLowerCase()}]`);

  // Step 5: Listener User B joins room via code
  const joinRes = await makeMockRequest({
    url: '/api/rooms/join',
    method: 'POST',
    body: {
      roomId: roomCode, // Joined via room code!
      userId: `listener_user_b_${Date.now()}`,
    },
  });
  assert.strictEqual(joinRes.status, 200, 'Join room capacity must return 200');
  assert.strictEqual(joinRes.body.success, true);
  assert.strictEqual(joinRes.body.currentCount >= 2, true, 'Capacity must reflect both Host and Listener');
  console.log(`[PASS] Listener B joined room using room code. Count: ${joinRes.body.currentCount}/50`);

  // Step 6: Guest Host creates a room without auth token
  const guestCreateRes = await makeMockRequest({
    url: '/api/rooms',
    method: 'POST',
    body: {
      name: 'Late Night Chill Lounge',
      genre: 'Chill / Lo-Fi',
      hostName: 'Guest DJ Alex',
    },
  });
  assert.strictEqual(guestCreateRes.status, 201, 'Guest room creation must succeed with 201');
  const guestRoom = guestCreateRes.body.room;
  const guestCode = guestRoom.code;
  console.log(`[PASS] Guest host created room "${guestRoom.name}" with code [${guestCode}]`);

  // Step 7: Friend looks up Guest room by code
  const guestLookupRes = await makeMockRequest({
    url: `/api/rooms/${encodeURIComponent(guestCode)}`,
    method: 'GET',
  });
  assert.strictEqual(guestLookupRes.status, 200, 'Friend must find guest room by code');
  assert.strictEqual(guestLookupRes.body.room.name, 'Late Night Chill Lounge');
  console.log(`[PASS] Friend successfully found Guest room by code [${guestCode}]`);

  // Step 8: Non-existent code returns 404
  const notFoundRes = await makeMockRequest({
    url: '/api/rooms/NONEXISTENT999',
    method: 'GET',
  });
  assert.strictEqual(notFoundRes.status, 404, 'Non-existent room code must return 404');
  console.log('[PASS] Non-existent room code correctly returns 404');

  // Step 9: Listener leaves room
  const leaveRes = await makeMockRequest({
    url: '/api/rooms/leave',
    method: 'POST',
    body: {
      roomId: roomCode,
      userId: `listener_user_b_${Date.now()}`,
    },
  });
  assert.strictEqual(leaveRes.status, 200, 'Leave room must return 200');
  console.log('[PASS] Listener left room cleanly');

  console.log('\n>>> ALL 9 PARTY ROOM TESTS PASSED WITH 100% SUCCESS <<<\n');
}

runTests().catch((err) => {
  console.error('[TEST FAILURE]:', err);
  process.exit(1);
});
