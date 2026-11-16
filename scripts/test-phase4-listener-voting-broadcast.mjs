/**
 * AI DJ Studio — Regression Test Suite for QUE-01 (Listener Queue Voting Broadcast & Reconciliation)
 */

import { castQueueVote, getQueueVotes, sortQueueByVotes } from '../src/server/queue.js';

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

console.log('--- AI DJ STUDIO: QUE-01 LISTENER QUEUE VOTING & BROADCAST REGRESSION TESTS ---');

const testRoomId = `room_queue_${Date.now()}`;
const queue = [
  { id: 'track_alpha', title: 'Alpha Beats', bpm: 120 },
  { id: 'track_beta', title: 'Beta Groove', bpm: 124 },
  { id: 'track_gamma', title: 'Gamma Wave', bpm: 128 },
];

// TEST 1: Listener votes cast authoritatively on server
console.log('\nTest Suite 1: Authenticated Listener Voting');
const listener1 = 'usr_listener_bob';
const listener2 = 'usr_listener_carol';

// Bob upvotes Gamma Wave
const v1 = castQueueVote(testRoomId, 'track_gamma', listener1, 1);
assert(v1['track_gamma']?.score === 1, 'Listener Bob upvotes track_gamma -> score +1');
assert(v1['track_gamma']?.upvotes === 1, 'Upvote count recorded accurately');

// Carol also upvotes Gamma Wave
const v2 = castQueueVote(testRoomId, 'track_gamma', listener2, 1);
assert(v2['track_gamma']?.score === 2, 'Listener Carol upvotes track_gamma -> score +2');

// Bob switches vote from upvote to downvote
const v3 = castQueueVote(testRoomId, 'track_gamma', listener1, -1);
assert(v3['track_gamma']?.score === 0, 'Bob switches to downvote -> net score becomes 0 (1 up, 1 down)');
assert(v3['track_gamma']?.downvotes === 1, 'Downvote registered for listener');

// TEST 2: Authoritative Sorting Across Clients
console.log('\nTest Suite 2: Queue Sorting by Net Score');
// Upvote track_beta
castQueueVote(testRoomId, 'track_beta', listener1, 1);
castQueueVote(testRoomId, 'track_beta', listener2, 1);

const sorted = sortQueueByVotes(queue, testRoomId);
assert(sorted[0].id === 'track_beta', 'Track Beta with +2 net votes sorted to position 1');
assert(sorted[1].id === 'track_alpha', 'Track Alpha with 0 votes retains earlier position');
assert(sorted[2].id === 'track_gamma', 'Track Gamma with 0 net votes retains later position');

// TEST 3: State Reconciliation after Reconnection
console.log('\nTest Suite 3: State Reconciliation');
const reconciled = getQueueVotes(testRoomId);
assert(reconciled['track_beta']?.score === 2, 'Reconnecting client retrieves authoritative score (+2)');
assert(reconciled['track_beta']?.userVotes[listener1] === 1, 'Individual listener vote preserved');
assert(reconciled['track_beta']?.userVotes[listener2] === 1, 'Second listener vote preserved');

console.log(`\n========================================`);
console.log(`QUE-01 REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
