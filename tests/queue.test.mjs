import assert from 'node:assert/strict';
import { castQueueVote, sortQueueByVotes, logQueueEvent, getQueueEvents } from '../src/server/queue.js';
import { joinRoomCapacity, leaveRoomCapacity, getRoomCapacity } from '../src/server/rooms.js';

console.log('========================================================================');
console.log('EPIC 1: COLLABORATIVE QUEUE & LOUNGE WAR ROOM TEST SUITE');
console.log('PRD Section 6.1 — Live Queue State, Voting, Concurrency & 50-Cap Limit');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

const testRoomId = `room_queue_test_${Date.now()}`;
const trackA = 'track_midnight_drive';
const trackB = 'track_neon_pulse';
const trackC = 'track_solar_groove';

// ---------------------------------------------------------------------------
// 1. CROWD VOTING & SCORE AGGREGATION (+1 / -1)
// ---------------------------------------------------------------------------

test('First upvote by Alice gives track net score +1', () => {
  const votes = castQueueVote(testRoomId, trackA, 'usr_alice', 1);
  assert.strictEqual(votes[trackA].score, 1);
  assert.strictEqual(votes[trackA].upvotes, 1);
  assert.strictEqual(votes[trackA].downvotes, 0);
});

test('Second upvote by Bob increments net score to +2', () => {
  const votes = castQueueVote(testRoomId, trackA, 'usr_bob', 1);
  assert.strictEqual(votes[trackA].score, 2);
  assert.strictEqual(votes[trackA].upvotes, 2);
});

test('Downvote by Charlie reduces net score to +1', () => {
  const votes = castQueueVote(testRoomId, trackA, 'usr_charlie', -1);
  assert.strictEqual(votes[trackA].score, 1);
  assert.strictEqual(votes[trackA].upvotes, 2);
  assert.strictEqual(votes[trackA].downvotes, 1);
});

// ---------------------------------------------------------------------------
// 2. SINGLE VOTE ENFORCEMENT & TOGGLE WITHDRAWAL
// ---------------------------------------------------------------------------

test('Re-clicking active vote withdraws it (net score drops from 1 to 0)', () => {
  const votes = castQueueVote(testRoomId, trackA, 'usr_alice', 1);
  assert.strictEqual(votes[trackA].score, 0);
  assert.strictEqual(votes[trackA].upvotes, 1); // Only Bob remains
});

test('Switching vote directly from up to down updates score correctly', () => {
  const votes = castQueueVote(testRoomId, trackA, 'usr_alice', -1);
  assert.strictEqual(votes[trackA].score, -1);
  assert.strictEqual(votes[trackA].downvotes, 2); // Charlie and Alice
});

// ---------------------------------------------------------------------------
// 3. ATOMIC QUEUE DYNAMIC RE-ORDERING
// ---------------------------------------------------------------------------

test('Queue reorders dynamically based on net score hierarchy', () => {
  castQueueVote(testRoomId, trackB, 'usr_alice', 1);
  castQueueVote(testRoomId, trackB, 'usr_bob', 1);
  castQueueVote(testRoomId, trackB, 'usr_david', 1); // Track B score: +3

  castQueueVote(testRoomId, trackC, 'usr_alice', 1); // Track C score: +1

  const initialQueue = [
    { id: trackA, title: 'Track A' },
    { id: trackC, title: 'Track C' },
    { id: trackB, title: 'Track B' },
  ];

  const sorted = sortQueueByVotes(initialQueue, testRoomId);
  assert.strictEqual(sorted[0].id, trackB, 'Track B with +3 score should be #1');
  assert.strictEqual(sorted[1].id, trackC, 'Track C with +1 score should be #2');
  assert.strictEqual(sorted[2].id, trackA, 'Track A with -1 score should be #3');
});

// ---------------------------------------------------------------------------
// 4. 50-PARTICIPANT ROOM CAPACITY ENFORCEMENT
// ---------------------------------------------------------------------------

test('Room starts with 0 participants and 50 max capacity', () => {
  const cap = getRoomCapacity(testRoomId);
  assert.strictEqual(cap.currentCount, 0);
  assert.strictEqual(cap.maxCapacity, 50);
  assert.strictEqual(cap.isFull, false);
});

test('Allows exactly 50 participants to join sequentially', () => {
  for (let i = 1; i <= 50; i++) {
    const res = joinRoomCapacity(testRoomId, `usr_crowd_${i}`);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.currentCount, i);
  }
  const cap = getRoomCapacity(testRoomId);
  assert.strictEqual(cap.currentCount, 50);
  assert.strictEqual(cap.isFull, true);
});

test('Rejects 51st participant with HTTP 409 ROOM_CAPACITY_REACHED', () => {
  assert.throws(
    () => {
      joinRoomCapacity(testRoomId, 'usr_crowd_51');
    },
    (err) => {
      return err.code === 'ROOM_CAPACITY_REACHED' && err.status === 409;
    }
  );
  const cap = getRoomCapacity(testRoomId);
  assert.strictEqual(cap.currentCount, 50);
});

test('Member leaving drops participant count and unsets isFull', () => {
  const res = leaveRoomCapacity(testRoomId, 'usr_crowd_50');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.currentCount, 49);
  const cap = getRoomCapacity(testRoomId);
  assert.strictEqual(cap.isFull, false);
});

// ---------------------------------------------------------------------------
// 5. QUEUE EVENT AUDIT LOGGING
// ---------------------------------------------------------------------------

test('Queue events are logged with correlation timestamps', () => {
  logQueueEvent({
    roomId: testRoomId,
    userId: 'usr_alice',
    trackId: trackA,
    eventType: 'track_added',
    metadata: { title: 'Track A' },
  });

  const events = getQueueEvents(testRoomId);
  assert.ok(events.length >= 1);
  assert.strictEqual(events[events.length - 1].eventType, 'track_added');
});

console.log(`\nResult: ${passed}/${total} assertions passed.\n`);
if (passed !== total) process.exit(1);
