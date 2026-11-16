import {
  castQueueVote,
  sortQueueByVotes,
  logQueueEvent,
  getQueueEvents,
} from '../src/server/queue.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n--- AI DJ STUDIO: PHASE 4 QUEUE VOTING & EVENT LOGGING TESTS ---\n');

  const testRoomId = `room_voting_test_${Date.now()}`;
  const trackA = 'track_midnight_drive';
  const trackB = 'ja_electric_sunrise';
  const trackC = 'audius_AK3w5q0';

  // TEST 1: Casting Upvotes & Downvotes (REQ-014)
  console.log('Test Suite 1: Upvote & Downvote Tallying');
  const user1 = 'usr_alice';
  const user2 = 'usr_bob';
  const user3 = 'usr_charlie';

  // Alice upvotes Track A (+1)
  const votes1 = castQueueVote(testRoomId, trackA, user1, 1);
  assert(votes1[trackA].score === 1, 'First upvote gives score +1');
  assert(votes1[trackA].upvotes === 1 && votes1[trackA].downvotes === 0, 'Upvote count is 1, downvotes 0');

  // Bob upvotes Track A (+1 -> net score +2)
  const votes2 = castQueueVote(testRoomId, trackA, user2, 1);
  assert(votes2[trackA].score === 2, 'Second upvote increments score to +2');

  // Charlie downvotes Track A (-1 -> net score +1)
  const votes3 = castQueueVote(testRoomId, trackA, user3, -1);
  assert(votes3[trackA].score === 1, 'Downvote reduces net score from +2 to +1');
  assert(votes3[trackA].upvotes === 2 && votes3[trackA].downvotes === 1, '2 upvotes and 1 downvote recorded');

  // TEST 2: Single Vote Per User Enforcement & Vote Reversal (REQ-015)
  console.log('\nTest Suite 2: Single Vote Enforcement & Vote Reversal');
  
  // Alice votes +1 again on Track A -> should withdraw vote (toggle)
  const votesWithdrawn = castQueueVote(testRoomId, trackA, user1, 1);
  assert(votesWithdrawn[trackA].score === 0, 'Re-clicking active vote withdraws it (net score drops from 1 to 0)');
  assert(votesWithdrawn[trackA].upvotes === 1, 'Upvotes dropped to 1');

  // Alice casts an explicit downvote (-1)
  const votesReversed = castQueueVote(testRoomId, trackA, user1, -1);
  assert(votesReversed[trackA].score === -1, 'Alice downvote results in net score -1 (1 up, 2 down)');

  // Charlie switches vote from -1 to +1 (reversal)
  const votesSwitched = castQueueVote(testRoomId, trackA, user3, 1);
  assert(votesSwitched[trackA].score === 1, 'Vote reversal from -1 to +1 updates net score to +1 (2 up, 1 down)');
  assert(votesSwitched[trackA].userVotes[user3] === 1, 'Single vote per user maintained after reversal');

  // TEST 3: Dynamic Vote-Based Queue Sorting (REQ-016)
  console.log('\nTest Suite 3: Vote-Based Dynamic Queue Sorting');
  // Track A net score: +1
  // Give Track B net score: +3 (Alice, Bob, Charlie all upvote Track B)
  castQueueVote(testRoomId, trackB, user1, 1);
  castQueueVote(testRoomId, trackB, user2, 1);
  castQueueVote(testRoomId, trackB, user3, 1);

  // Give Track C net score: -2 (Alice and Bob downvote Track C)
  castQueueVote(testRoomId, trackC, user1, -1);
  castQueueVote(testRoomId, trackC, user2, -1);

  const initialQueue = [
    { id: trackC, title: 'Dubstep Track' },
    { id: trackA, title: 'Midnight Drive' },
    { id: trackB, title: 'Electric Sunrise' },
  ];

  const sortedQueue = sortQueueByVotes(initialQueue, testRoomId);
  assert(sortedQueue[0].id === trackB, 'Track B with score +3 is sorted to 1st position');
  assert(sortedQueue[1].id === trackA, 'Track A with score +1 is sorted to 2nd position');
  assert(sortedQueue[2].id === trackC, 'Track C with score -2 is sorted to 3rd position');

  // TEST 4: Queue Event Audit Logging (REQ-017)
  console.log('\nTest Suite 4: Persistent Queue Event Audit Trail');
  logQueueEvent({
    roomId: testRoomId,
    userId: user1,
    trackId: trackB,
    eventType: 'track_added',
    metadata: { position: 0 },
  });

  const events = getQueueEvents(testRoomId);
  assert(Array.isArray(events) && events.length > 0, 'Retrieves chronological room queue events');
  const voteEvents = events.filter((e) => e.eventType.startsWith('vote_'));
  assert(voteEvents.length > 0, 'Audit trail logs voting events (vote_added, vote_changed, vote_removed)');
  
  const lastEvent = events[events.length - 1];
  assert(lastEvent.trackId === trackB, 'Event records accurate trackId');
  assert(lastEvent.userId === user1, 'Event records accurate userId');
  assert(Boolean(lastEvent.timestamp), 'Event records millisecond timestamp');

  console.log(`\n========================================`);
  console.log(`PHASE 4 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
