import assert from 'node:assert/strict';
import {
  startSession,
  endSession,
  recordSessionEvent,
  getUserAnalytics,
  getPlatformAnalytics,
} from '../src/server/analytics.js';

let passedCount = 0;
let totalCount = 0;

function it(desc, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}:`, err.message);
    throw err;
  }
}

async function itAsync(desc, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`  [PASS] ${desc}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}:`, err.message);
    throw err;
  }
}

console.log('\n=== RUNNING PHASE 9 & 10: SESSION ANALYTICS & DYNAMIC METRICS TESTS ===\n');

(async () => {
  // Test 1: Start a new user session
  let testSessionId = null;
  await itAsync('REQ-031 / REQ-032: Starts a new analytics session for a user', async () => {
    const session = startSession({ userId: 'user_test_analytics_1', roomId: 'room_deep_house' });
    assert(session, 'Session object must be returned');
    assert(session.id, 'Session must have a unique ID');
    assert.equal(session.userId, 'user_test_analytics_1');
    assert.equal(session.roomId, 'room_deep_house');
    assert(session.startedAt, 'Session must record startedAt timestamp');
    testSessionId = session.id;
  });

  // Test 2: Record granular events during session
  await itAsync('REQ-035 / REQ-037: Records track play and skip events with metadata', async () => {
    const event1 = recordSessionEvent({
      sessionId: testSessionId,
      userId: 'user_test_analytics_1',
      eventType: 'track_play',
      trackId: 'track_test_101',
      details: { bpm: 126, key: '8A', energy: 0.85 },
    });
    assert(event1, 'Play event must be recorded');
    assert.equal(event1.eventType, 'track_play');
    assert.equal(event1.trackId, 'track_test_101');

    const event2 = recordSessionEvent({
      sessionId: testSessionId,
      userId: 'user_test_analytics_1',
      eventType: 'queue_add',
      trackId: 'track_test_102',
      details: { position: 1 },
    });
    assert(event2, 'Queue event must be recorded');

    const event3 = recordSessionEvent({
      sessionId: testSessionId,
      userId: 'user_test_analytics_1',
      eventType: 'vote_cast',
      trackId: 'track_test_102',
      details: { vote: 1 },
    });
    assert(event3, 'Vote event must be recorded');
  });

  // Test 3: End session and verify duration calculation
  await itAsync('REQ-032: Ends session and computes duration in minutes/seconds', async () => {
    const ended = endSession(testSessionId);
    assert(ended, 'Session must be returned after ending');
    assert(ended.endedAt, 'Session must record endedAt timestamp');
    assert(typeof ended.durationSec === 'number', 'Duration must be computed in seconds');
  });

  // Test 4: Dynamic User Analytics computation
  await itAsync('REQ-033 / REQ-034: Computes user analytics (Preferred BPM, Top Key, Activity counts)', async () => {
    // Record multiple tracks to establish modal BPM and Key
    recordSessionEvent({
      sessionId: testSessionId,
      userId: 'user_test_analytics_1',
      eventType: 'track_play',
      trackId: 'track_103',
      details: { bpm: 126, key: '8A' },
    });
    recordSessionEvent({
      sessionId: testSessionId,
      userId: 'user_test_analytics_1',
      eventType: 'track_play',
      trackId: 'track_104',
      details: { bpm: 124, key: '8A' },
    });

    const userStats = getUserAnalytics('user_test_analytics_1');
    assert(userStats, 'User analytics must be returned');
    assert.equal(userStats.userId, 'user_test_analytics_1');
    assert(userStats.totalSessions >= 1, 'Total sessions must be at least 1');
    assert(typeof userStats.totalListeningMinutes === 'number', 'Listening minutes must be number');
    assert(userStats.preferredBpm >= 120 && userStats.preferredBpm <= 130, 'Preferred BPM must reflect played tracks');
    assert.equal(userStats.topKey, '8A', 'Top key must match modal harmonic key (8A)');
    assert(userStats.tracksPlayedCount >= 3, 'Tracks played must be tracked');
    assert(userStats.queueActionsCount >= 1, 'Queue actions must be tracked');
    assert(userStats.votesCastCount >= 1, 'Votes cast must be tracked');
  });

  // Test 5: Fallback defaults for new users
  it('REQ-031 / REQ-038: Returns graceful defaults for user with zero sessions', () => {
    const fallbackStats = getUserAnalytics('brand_new_user_xyz');
    assert(fallbackStats, 'Should return analytics object for new user');
    assert.equal(fallbackStats.userId, 'brand_new_user_xyz');
    assert.equal(fallbackStats.preferredBpm, 124, 'Default BPM should be 124');
    assert.equal(fallbackStats.topKey, '8A', 'Default Key should be 8A');
    assert.equal(fallbackStats.totalSessions, 0);
  });

  // Test 6: Platform wide analytics
  it('REQ-036: Computes aggregate platform analytics for admin/system dashboard', () => {
    const platformStats = getPlatformAnalytics();
    assert(platformStats, 'Platform analytics must be returned');
    assert(typeof platformStats.totalSessions === 'number');
    assert(typeof platformStats.totalEventsRecorded === 'number');
    assert(typeof platformStats.totalTracksPlayed === 'number');
    assert(typeof platformStats.totalVotesCast === 'number');
  });

  console.log(`\n>>> PHASE 9 & 10 TESTS COMPLETE: ${passedCount}/${totalCount} PASSED (0 failed)\n`);
})();
