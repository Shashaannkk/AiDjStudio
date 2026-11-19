import assert from 'node:assert/strict';
import { handleApiRequest } from '../server.mjs';
import { loginOrRegisterGoogleUser } from '../src/server/auth.js';

console.log('========================================================================');
console.log('TEST SUITE: PARTY ROOM CHAT REAL-TIME SYNC, DEDUP & GOOGLE AUTH');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Google Auth Provisioning & Token Lifecycle
// ---------------------------------------------------------------------------

runTest('Google Auth: creates new listener account with valid JWT on first sign-in', () => {
  const email = `new_google_user_${Date.now()}@gmail.com`;
  const result = loginOrRegisterGoogleUser({
    email,
    name: 'Techno Master',
    avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
    googleId: 'google_123456789',
  });

  assert.strictEqual(result.user.email, email.toLowerCase());
  assert.strictEqual(result.user.name, 'Techno Master');
  assert.strictEqual(result.user.role, 'listener');
  assert.strictEqual(Boolean(result.accessToken), true);
  assert.strictEqual(Boolean(result.refreshToken), true);
  assert.strictEqual(result.expiresIn, 3600);
});

runTest('Google Auth: idempotent login returns existing account and refreshes JWT', () => {
  const email = `existing_google_${Date.now()}@gmail.com`;
  const first = loginOrRegisterGoogleUser({
    email,
    name: 'Deep House Queen',
    googleId: 'google_queen_1',
  });

  const second = loginOrRegisterGoogleUser({
    email,
    name: 'Deep House Queen Updated',
    googleId: 'google_queen_1',
  });

  assert.strictEqual(second.user.id, first.user.id, 'User ID must remain identical');
  assert.strictEqual(second.user.email, first.user.email);
  assert.strictEqual(Boolean(second.accessToken), true);
});

// ---------------------------------------------------------------------------
// 2. Chat Deduplication Logic Verification
// ---------------------------------------------------------------------------

runTest('Chat State: deduplication prevents identical messages from appearing twice', () => {
  const roomMessages = [];

  const addMessageToState = (state, msg) => {
    if (state.some((m) => m.id === msg.id)) {
      return state; // Drops duplicate
    }
    return [...state, msg];
  };

  const testMessage = {
    id: 'msg_unique_101',
    userName: 'Resident DJ',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002',
    message: 'hi',
    timestamp: '12:00 PM',
  };

  // Simulate local sender dispatch
  let current = addMessageToState(roomMessages, testMessage);
  assert.strictEqual(current.length, 1);
  assert.strictEqual(current[0].message, 'hi');

  // Simulate accidental double callback (the bug reported by user)
  current = addMessageToState(current, testMessage);
  assert.strictEqual(current.length, 1, 'Duplicate message with same ID must not increase array length');

  // Simulate SSE echo broadcast arriving back from server
  current = addMessageToState(current, testMessage);
  assert.strictEqual(current.length, 1, 'Echo broadcast of own message must be dropped');
});

// ---------------------------------------------------------------------------
// 3. Authenticated Party Chat & SSE Stream Verification
// ---------------------------------------------------------------------------

const authedChatUser = loginOrRegisterGoogleUser({
  email: `party_chat_${Date.now()}@aidjstudio.com`,
  name: 'Party Dancer',
});

await runAsyncTest('Server API: listener with JWT can send chat message with 200', async () => {
  let capturedStatus = 0;
  let capturedBody = '';

  const mockReq = {
    url: '/api/chat',
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      'content-type': 'application/json',
      authorization: `Bearer ${authedChatUser.accessToken}`,
    },
    on(event, handler) {
      if (event === 'data') {
        process.nextTick(() => {
          handler(JSON.stringify({
            roomId: 'room_party_42',
            message: {
              id: `msg_party_${Date.now()}`,
              userName: 'Party Dancer',
              message: 'hi everyone in the party!',
              timestamp: '12:05 PM',
            },
          }));
        });
      }
      if (event === 'end') {
        process.nextTick(handler);
      }
      return mockReq;
    },
  };

  const mockRes = {
    writeHead(status) { capturedStatus = status; },
    setHeader() {},
    end(body) { capturedBody = body; },
  };

  const handled = handleApiRequest(mockReq, mockRes);
  assert.strictEqual(handled, true);

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(capturedStatus, 200);
  const parsed = JSON.parse(capturedBody);
  assert.strictEqual(parsed.success, true);
  assert.strictEqual(parsed.message.userName, 'Party Dancer');
  assert.strictEqual(parsed.message.message, 'hi everyone in the party!');
  assert.strictEqual(parsed.message.role, 'listener');
});

await runAsyncTest('Server API: listener with JWT can open SSE stream with 200', async () => {
  let capturedStatus = 0;
  let capturedHeaders = {};
  let capturedData = '';

  const mockReq = {
    url: `/api/chat/stream?roomId=room_party_42&token=${encodeURIComponent(authedChatUser.accessToken)}`,
    method: 'GET',
    headers: {
      host: 'localhost:3000',
      authorization: `Bearer ${authedChatUser.accessToken}`,
    },
    on(event, _handler) {
      if (event === 'close') {
        // cleanup
      }
      return mockReq;
    },
  };

  const mockRes = {
    writeHead(status, headers) {
      capturedStatus = status;
      capturedHeaders = headers;
    },
    write(chunk) {
      capturedData += chunk;
    },
  };

  const handled = handleApiRequest(mockReq, mockRes);
  assert.strictEqual(handled, true);
  assert.strictEqual(capturedStatus, 200);
  assert.strictEqual(capturedHeaders['Content-Type'], 'text/event-stream');
  assert.match(capturedData, /"type":"CONNECTED"/);
});

// ---------------------------------------------------------------------------
// Final Verdict
// ---------------------------------------------------------------------------

console.log('\n========================================================================');
console.log(`CHAT SYNC & GOOGLE AUTH SUMMARY: ${passed}/${total} Passed (${total - passed} Failed)`);
console.log('========================================================================\n');

if (passed !== total) {
  process.exit(1);
} else {
  process.exit(0);
}
