/**
 * AI DJ Studio — Integration Test Suite for SND-01: Human DJ Soundclash (Frontend to Backend)
 */

import {
  createHumanSoundclash,
  registerChallenger,
  submitBattleTrack,
  castBattleVote,
  getActiveBattle,
  getSoundclashHistory,
  evaluateBattleWinner,
} from '../src/server/soundclash.js';
import { soundclashService } from '../src/services/soundclashService.ts';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('--- AI DJ STUDIO: SND-01 SOUNDCLASH FRONTEND-BACKEND INTEGRATION TESTS ---');

// In-process router for testing soundclashService without external network ports
soundclashService.setFetchHandler(async (urlStr, init = {}) => {
  const url = new URL(urlStr, 'http://localhost');
  const path = url.pathname;
  const method = init.method || 'GET';
  const body = init.body ? JSON.parse(init.body) : {};

  try {
    if (path === '/api/soundclash/create' && method === 'POST') {
      const battle = createHumanSoundclash(body);
      return new Response(JSON.stringify({ battle }), { status: 201 });
    }

    if (path === '/api/soundclash/challenge' && method === 'POST') {
      const battle = registerChallenger(body.roomId, body.challenger);
      return new Response(JSON.stringify({ battle }), { status: 200 });
    }

    if (path === '/api/soundclash/submit' && method === 'POST') {
      const battle = submitBattleTrack(body.roomId, body.userId, body.track);
      return new Response(JSON.stringify({ battle }), { status: 200 });
    }

    if (path === '/api/soundclash/vote' && method === 'POST') {
      const battle = castBattleVote(body.roomId, body.userId, body.choice);
      return new Response(JSON.stringify({ battle }), { status: 200 });
    }

    if (path === '/api/soundclash/active' && method === 'GET') {
      const roomId = url.searchParams.get('roomId');
      const battle = getActiveBattle(roomId);
      return new Response(JSON.stringify({ battle }), { status: 200 });
    }

    if (path === '/api/soundclash/history' && method === 'GET') {
      const roomId = url.searchParams.get('roomId');
      const history = getSoundclashHistory(roomId);
      return new Response(JSON.stringify({ history }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});

async function runTests() {
  const testRoomId = `room_test_${Date.now()}`;
  const dj1 = { id: 'usr_dj1', name: 'DJ Apex', avatar: 'https://example.com/dj1.jpg' };
  const dj2 = { id: 'usr_dj2', name: 'DJ Pulse', avatar: 'https://example.com/dj2.jpg' };

  // TEST 1: Create Battle via soundclashService
  console.log('\nTest Suite 1: Battle Creation & Contender Registration');
  const battle = await soundclashService.createBattle({
    roomId: testRoomId,
    title: 'Soundclash: Heavyweight Bout',
    dj1,
    durationSec: 45,
  });

  assert(Boolean(battle.id), 'soundclashService.createBattle creates battle with ID');
  assert(battle.status === 'waiting_for_challenger', 'Battle initially awaits challenger registration');
  assert(battle.dj1.user.name === 'DJ Apex', 'Lead DJ registered correctly');

  // Self-challenge rejection
  try {
    await soundclashService.registerChallenger(testRoomId, dj1);
    assert(false, 'Should prevent self-challenge');
  } catch (err) {
    assert(err.message.includes('cannot challenge yourself'), 'Prevents user from challenging themselves');
  }

  // Register Challenger
  const challenged = await soundclashService.registerChallenger(testRoomId, dj2);
  assert(challenged.dj2?.user.name === 'DJ Pulse', 'Challenger registered successfully');
  assert(challenged.status === 'pending_submission', 'Status transitions to pending_submission');

  // TEST 2: Weapon Track Submission from Catalogue
  console.log('\nTest Suite 2: Track Weapons Submission');
  const track1 = { id: 'track_1', title: 'Cyber Bass', artist_name: 'Synthwave', bpm: 128, key: '8A', energy: 88 };
  const track2 = { id: 'track_2', title: 'Solar Flare', artist_name: 'Solaris', bpm: 130, key: '9A', energy: 95 };

  const sub1 = await soundclashService.submitTrack(testRoomId, dj1.id, track1);
  assert(sub1.dj1.track?.title === 'Cyber Bass', 'DJ 1 weapon registered');
  assert(sub1.status === 'pending_submission', 'Awaits second weapon before battle commences');

  const sub2 = await soundclashService.submitTrack(testRoomId, dj2.id, track2);
  assert(sub2.dj2?.track?.title === 'Solar Flare', 'DJ 2 weapon registered');
  assert(sub2.status === 'active', 'Battle activates automatically once both weapons are submitted');
  assert(sub2.endsAt > Date.now(), 'Countdown timer initialized');

  // TEST 3: Voting & Single Vote Enforcement
  console.log('\nTest Suite 3: Crowd Voting & Single Vote Rule');
  const vote1 = await soundclashService.castVote(testRoomId, 'voter_alice', 'dj1');
  assert(vote1.dj1.votes === 1 && vote1.totalVotes === 1, 'Alice votes for DJ 1');

  const vote2 = await soundclashService.castVote(testRoomId, 'voter_bob', 'dj2');
  assert(vote2.dj2.votes === 1 && vote2.totalVotes === 2, 'Bob votes for DJ 2');

  // Vote switching by Alice from dj1 to dj2
  const switched = await soundclashService.castVote(testRoomId, 'voter_alice', 'dj2');
  assert(switched.dj1.votes === 0, 'Alice vote removed from DJ 1');
  assert(switched.dj2.votes === 2, 'Alice vote added to DJ 2');
  assert(switched.totalVotes === 2, 'Total votes invariant after vote switch');

  // TEST 4: Active Battle Recovery & Historical Archiving
  console.log('\nTest Suite 4: Active Battle Recovery & Permanent History');
  const active = await soundclashService.getActiveBattle(testRoomId);
  assert(active.id === battle.id, 'getActiveBattle returns current active battle');

  // Conclude battle
  const concluded = evaluateBattleWinner(testRoomId);
  assert(concluded.status === 'ended', 'Battle marked ended');
  assert(concluded.winner.choice === 'dj2', 'DJ 2 identified as winner by popular vote');
  assert(concluded.winner.dj.name === 'DJ Pulse', 'Winner metadata accurately recorded');

  // History retrieval
  const history = await soundclashService.getHistory(testRoomId);
  assert(history.length >= 1, 'getHistory returns archived battle records');
  assert(history[0].winner.dj.name === 'DJ Pulse', 'History records winner correctly');

  console.log(`\n========================================`);
  console.log(`SND-01 INTEGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Unhandled test execution error:', e);
  process.exit(1);
});
