/**
 * AI DJ Studio — Real Multi-User End-to-End Integration Test Suite
 * Tests genuine multi-user authentication, server-authoritative live rooms,
 * cross-user chat persistence & isolation, collaborative queue voting,
 * and user library isolation with zero simulated/fixture fallbacks.
 */

import { EventEmitter } from 'node:events';
import { handleApiRequest } from '../server.mjs';

function createMockHttpExchange(url, method = 'GET', headers = {}, body = null, remoteIp = '198.51.100.88') {
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
    setImmediate(() => {
      const handled = handleApiRequest(req, res);
      if (body !== null && body !== undefined) {
        req.emit('data', typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.emit('end');
      setImmediate(() => {
        let json = null;
        try {
          json = responseBody ? JSON.parse(responseBody) : null;
        } catch {
          json = responseBody;
        }
        resolve({
          handled,
          status: statusCode,
          ok: statusCode >= 200 && statusCode < 300,
          headers: responseHeaders,
          data: json,
        });
      });
    });
  });

  return handlePromise;
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ ${message}`);
}

export async function runRealFunctionalityTests() {
  console.log('\n========================================================================');
  console.log('   AI DJ STUDIO — REAL MULTI-USER FUNCTIONALITY INTEGRATION TESTS        ');
  console.log('========================================================================\n');

  // -----------------------------------------------------------------------
  // TEST 1: Multi-User Cryptographic Registration & JWT Authentication
  // -----------------------------------------------------------------------
  console.log('Test 1: Multi-User Registration, Password Verification & Profile Isolation');

  const userEmailA = `alice_${Date.now()}@testdj.com`;
  const userEmailB = `bob_${Date.now()}@testdj.com`;

  // 1.1 Register User A
  const regResA = await createMockHttpExchange('/api/auth/register', 'POST', {}, {
    email: userEmailA,
    password: 'Password123!',
    name: 'Alice Resident DJ',
  }, '198.51.100.11');
  assert(regResA.status === 201, `Alice registered with status 201 (got ${regResA.status})`);
  assert(regResA.data && regResA.data.accessToken, 'Alice received valid JWT access token');
  assert(regResA.data.user.email === userEmailA, 'Alice user record contains verified email');
  const tokenA = regResA.data.accessToken;
  const userA = regResA.data.user;

  // 1.2 Register User B
  const regResB = await createMockHttpExchange('/api/auth/register', 'POST', {}, {
    email: userEmailB,
    password: 'Password456!',
    name: 'Bob Listener',
  }, '198.51.100.12');
  assert(regResB.status === 201, `Bob registered with status 201 (got ${regResB.status})`);
  assert(regResB.data && regResB.data.accessToken, 'Bob received valid JWT access token');
  const tokenB = regResB.data.accessToken;
  const userB = regResB.data.user;

  // 1.3 Verify wrong password fails with 401
  const badLoginRes = await createMockHttpExchange('/api/auth/login', 'POST', {}, {
    email: userEmailA,
    password: 'WrongPassword',
  }, '198.51.100.13');
  assert(badLoginRes.status === 401, 'Invalid password returns 401 Unauthorized');

  // 1.4 Verify authenticated User A can update profile
  const profileUpdateRes = await createMockHttpExchange('/api/auth/profile', 'PATCH', {
    Authorization: `Bearer ${tokenA}`,
  }, {
    name: 'Alice Pro DJ',
    avatar: 'https://images.unsplash.com/photo-alice',
  });
  assert(profileUpdateRes.status === 200, 'Alice profile updated successfully');
  assert(profileUpdateRes.data.user.name === 'Alice Pro DJ', 'Alice name updated to Alice Pro DJ');

  // 1.5 Verify User B profile is distinct and untouched
  const meResB = await createMockHttpExchange('/api/auth/me', 'GET', {
    Authorization: `Bearer ${tokenB}`,
  });
  assert(meResB.status === 200, 'Bob fetched /api/auth/me');
  assert(meResB.data.user.name === 'Bob Listener', 'Bob profile remained completely isolated');

  // -----------------------------------------------------------------------
  // TEST 2: Server-Authoritative Live Rooms & Real Participant Management
  // -----------------------------------------------------------------------
  console.log('\nTest 2: Server-Authoritative Live Room Creation, Joining & Presence');

  // 2.1 User A creates a real live room
  const createRoomRes = await createMockHttpExchange('/api/rooms', 'POST', {
    Authorization: `Bearer ${tokenA}`,
  }, {
    name: 'Late Night Underground Techno',
    genre: 'Techno',
    cover: 'https://images.unsplash.com/techno-cover',
    tags: ['Techno', '130 BPM', 'Live'],
  });
  assert(createRoomRes.status === 201, 'Live room created with status 201');
  const room1 = createRoomRes.data.room;
  assert(room1 && room1.id && room1.code, 'Room has generated persistent ID and unique room code');
  assert(room1.hostId === userA.id, 'Room hostId matches Alice verified ID');
  assert(room1.listenerCount === 1, 'Initial room listener count is 1 (host)');

  // 2.2 Verify room appears in public live rooms list
  const roomsListRes = await createMockHttpExchange('/api/rooms', 'GET');
  assert(roomsListRes.status === 200, 'Public rooms list retrieved');
  const foundRoom = roomsListRes.data.rooms.find((r) => r.id === room1.id);
  assert(foundRoom !== undefined, 'Newly created room is present in /api/rooms list');

  // 2.3 User B joins Room 1
  const joinResB = await createMockHttpExchange(`/api/rooms/${room1.id}/join`, 'POST', {
    Authorization: `Bearer ${tokenB}`,
  });
  assert(joinResB.status === 200, 'Bob joined Room 1 with status 200');
  assert(joinResB.data.room.listenerCount === 2, 'Room listenerCount updated to 2');
  const bInParticipants = joinResB.data.room.participants.some((p) => p.id === userB.id);
  assert(bInParticipants, 'Bob is listed in verified room participants list');

  // 2.4 Verify Room capacity enforcement (Max 50 participants)
  const capacityRes = await createMockHttpExchange(`/api/rooms/capacity?roomId=${room1.id}`, 'GET');
  assert(capacityRes.status === 200, 'Room capacity endpoint works');
  assert(capacityRes.data.currentCount === 2, 'Capacity reflects 2 current participants');
  assert(capacityRes.data.maxCapacity === 50, 'Room max capacity limit is strictly 50');

  // 2.5 User B leaves Room 1
  const leaveResB = await createMockHttpExchange(`/api/rooms/${room1.id}/leave`, 'POST', {
    Authorization: `Bearer ${tokenB}`,
  });
  assert(leaveResB.status === 200, 'Bob left room with status 200');
  assert(leaveResB.data.listenerCount === 1, 'Room listenerCount decremented back to 1');

  // -----------------------------------------------------------------------
  // TEST 3: Real-Time Chat Isolation & Server Message Archiving
  // -----------------------------------------------------------------------
  console.log('\nTest 3: Real-Time Chat Isolation, XSS Sanitization & Archiving');

  // 3.1 User A posts a message in Room 1
  const chatMsgA = await createMockHttpExchange('/api/chat', 'POST', {
    Authorization: `Bearer ${tokenA}`,
  }, {
    roomId: room1.id,
    message: {
      message: 'Welcome everyone to the Techno lounge! <script>alert("XSS")</script>',
    },
  });
  assert(chatMsgA.status === 200, 'Chat message posted successfully');
  assert(
    !chatMsgA.data.message.message.includes('<script>'),
    'Script tag was sanitized from chat message'
  );
  assert(chatMsgA.data.message.userId === userA.id, 'Message author userId is server-verified from JWT');

  // 3.2 User B retrieves Room 1 messages
  const room1MessagesRes = await createMockHttpExchange(`/api/chat/messages?roomId=${room1.id}`, 'GET');
  assert(room1MessagesRes.status === 200, 'Room 1 messages retrieved');
  assert(Array.isArray(room1MessagesRes.data) && room1MessagesRes.data.length >= 1, 'Room 1 has at least 1 message archived');
  assert(
    room1MessagesRes.data[room1MessagesRes.data.length - 1].userId === userA.id,
    'Last message in Room 1 belongs to Alice'
  );

  // 3.3 Verify Room 2 does NOT see Room 1 messages (Strict Room Isolation)
  const room2MessagesRes = await createMockHttpExchange(`/api/chat/messages?roomId=unrelated_room_${Date.now()}`, 'GET');
  assert(room2MessagesRes.status === 200, 'Empty room messages retrieved');
  assert(
    Array.isArray(room2MessagesRes.data) && room2MessagesRes.data.length === 0,
    'Unrelated room has 0 messages (strict room isolation confirmed)'
  );

  // -----------------------------------------------------------------------
  // TEST 4: User Library & Playlist Persistence & Multi-User Isolation
  // -----------------------------------------------------------------------
  console.log('\nTest 4: User Playlists, Likes & Listening History Isolation');

  // 4.1 Fresh user B initially has 0 playlists (no hardcoded fixtures forced)
  const initialPlaylistsB = await createMockHttpExchange('/api/library/playlists', 'GET', {
    Authorization: `Bearer ${tokenB}`,
  });
  assert(initialPlaylistsB.status === 200, 'Fetched initial playlists for Bob');
  assert(
    initialPlaylistsB.data.playlists.length === 0,
    'Bob begins with 0 playlists (no fixture playlists forced on new account)'
  );

  // 4.2 User A creates a playlist
  const createPlRes = await createMockHttpExchange('/api/library/playlists', 'POST', {
    Authorization: `Bearer ${tokenA}`,
  }, {
    name: "Alice's Deep Tech Selections",
    description: 'Underground favorites',
  });
  assert(createPlRes.status === 201, 'Alice created playlist with status 201');
  const plA = createPlRes.data.playlist;
  assert(plA.name === "Alice's Deep Tech Selections", 'Playlist name matches');

  // 4.3 Alice adds track to playlist
  const addTrackRes = await createMockHttpExchange(`/api/library/playlists/${plA.id}/tracks`, 'POST', {
    Authorization: `Bearer ${tokenA}`,
  }, {
    track: {
      id: 'track_jamendo_1885834',
      title: 'Deep In The Night',
      artist_name: 'Soundpulse',
      audio: 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32',
      duration: 215,
    },
  });
  assert(addTrackRes.status === 200, 'Track added to Alice playlist');
  assert(addTrackRes.data.playlist.trackCount === 1, 'Playlist track count incremented to 1');

  // 4.4 Verify Bob does NOT see Alice playlist
  const bobPlaylistsCheck = await createMockHttpExchange('/api/library/playlists', 'GET', {
    Authorization: `Bearer ${tokenB}`,
  });
  assert(
    bobPlaylistsCheck.data.playlists.length === 0,
    'Bob still has 0 playlists; Alice playlist is completely private/isolated'
  );

  // 4.5 User A likes a track
  const likeResA = await createMockHttpExchange('/api/library/likes', 'POST', {
    Authorization: `Bearer ${tokenA}`,
  }, {
    trackId: 'track_jamendo_1885834',
  });
  assert(likeResA.status === 200, 'Track liked by Alice');
  assert(likeResA.data.isLiked === true, 'Track is marked as liked for Alice');

  // 4.6 Verify Bob does NOT have this track liked
  const bobLikesRes = await createMockHttpExchange('/api/library/likes', 'GET', {
    Authorization: `Bearer ${tokenB}`,
  });
  assert(bobLikesRes.status === 200, 'Bob liked tracks fetched');
  assert(
    !bobLikesRes.data.likedTracks.includes('track_jamendo_1885834'),
    'Bob liked tracks list does not contain Alice liked track'
  );

  // 4.7 Record listening history
  const historyResA = await createMockHttpExchange('/api/library/history', 'POST', {
    Authorization: `Bearer ${tokenA}`,
  }, {
    track: {
      id: 'track_jamendo_1885834',
      title: 'Deep In The Night',
      artist_name: 'Soundpulse',
      duration: 215,
    },
  });
  assert(historyResA.status === 200, 'Listening history recorded for Alice');
  assert(historyResA.data.history.length === 1, 'Alice history contains 1 track');

  const bobHistoryRes = await createMockHttpExchange('/api/library/history', 'GET', {
    Authorization: `Bearer ${tokenB}`,
  });
  assert(
    bobHistoryRes.data.history.length === 0,
    'Bob has 0 listening history records (empty state integrity verified)'
  );

  // -----------------------------------------------------------------------
  // TEST 5: Collaborative Queue Voting Real-World Synchronization
  // -----------------------------------------------------------------------
  console.log('\nTest 5: Multi-User Collaborative Queue Voting');

  // 5.1 Alice votes on track
  const voteResA = await createMockHttpExchange('/api/queue/vote', 'POST', {
    Authorization: `Bearer ${tokenA}`,
  }, {
    trackId: 'track_jamendo_1885834',
    vote: 1,
    roomId: room1.id,
  });
  assert(voteResA.status === 200, 'Alice voted for queue track');
  assert(voteResA.data.score === 1, 'Track score is 1 after Alice vote');

  // 5.2 Bob votes on the same track
  const voteResB = await createMockHttpExchange('/api/queue/vote', 'POST', {
    Authorization: `Bearer ${tokenB}`,
  }, {
    trackId: 'track_jamendo_1885834',
    vote: 1,
    roomId: room1.id,
  });
  assert(voteResB.status === 200, 'Bob voted for queue track');
  assert(voteResB.data.score === 2, 'Track score is 2 after multi-user votes');

  // 5.3 Fetch current queue votes
  const getVotesRes = await createMockHttpExchange(`/api/queue/votes?roomId=${room1.id}`, 'GET');
  assert(getVotesRes.status === 200, 'Queue votes fetched');
  assert(
    getVotesRes.data.votes['track_jamendo_1885834'].score === 2,
    'Server-authoritative queue score is 2 across multiple real accounts'
  );

  console.log('\n========================================================================');
  console.log(`REAL FUNCTIONALITY TEST RESULTS: ${passedTests}/${totalTests} Passed (0 Failed)`);
  console.log('========================================================================\n');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('test-real-functionality-e2e.mjs')) {
  runRealFunctionalityTests()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
