import {
  createHumanSoundclash,
  registerChallenger,
  submitBattleTrack,
  castBattleVote,
  evaluateBattleWinner,
  getSoundclashHistory,
} from '../src/server/soundclash.js';

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
  console.log('\n--- AI DJ STUDIO: PHASE 7 HUMAN DJ SOUNDCLASH TESTS ---\n');

  const testRoom = `room_clash_test_${Date.now()}`;
  const dj1 = { id: 'dj_pulse', name: 'DJ Pulse', avatar: 'https://avatar1.jpg' };
  const dj2 = { id: 'dj_shadow', name: 'DJ Shadow', avatar: 'https://avatar2.jpg' };

  // TEST 1: Initiating Human Soundclash (REQ-024)
  console.log('Test Suite 1: Human DJ Battle Registration');
  const battle = createHumanSoundclash({
    roomId: testRoom,
    title: 'Peak Hour Soundclash: DJ Pulse vs DJ Shadow! 🔥',
    dj1,
    durationSec: 30,
  });

  assert(Boolean(battle.id), 'Soundclash battle created with unique ID');
  assert(battle.status === 'waiting_for_challenger', 'Battle initially awaits challenger registration');
  assert(battle.dj1.user.name === 'DJ Pulse', 'DJ 1 registered correctly');

  // Prevent self-challenge
  try {
    registerChallenger(testRoom, dj1);
    assert(false, 'Should prevent self-challenge');
  } catch (err) {
    assert(err.message.includes('cannot challenge yourself'), 'Prevents user from challenging themselves');
  }

  // Register legitimate challenger
  const withChallenger = registerChallenger(testRoom, dj2);
  assert(withChallenger.dj2?.user.name === 'DJ Shadow', 'DJ 2 registered as contender');
  assert(withChallenger.status === 'pending_submission', 'Status moves to pending_submission');

  // TEST 2: Track Weapons Submission (REQ-025)
  console.log('\nTest Suite 2: Track Weapons Submission from Catalogue');
  const track1 = {
    id: 'track_midnight_drive',
    title: 'Midnight Drive',
    artist_name: 'Luna Skye',
    bpm: 124,
    key: '11A',
    energy: 82,
  };
  const track2 = {
    id: 'ja_electric_sunrise',
    title: 'Electric Sunrise',
    artist_name: 'Neon Voyager',
    bpm: 128,
    key: '8A',
    energy: 88,
  };

  // DJ 1 submits track
  const afterSub1 = submitBattleTrack(testRoom, dj1.id, track1);
  assert(afterSub1.dj1.track.id === track1.id, 'DJ 1 weapon registered');
  assert(afterSub1.status === 'pending_submission', 'Awaits DJ 2 submission before activating countdown');

  // DJ 2 submits track
  const afterSub2 = submitBattleTrack(testRoom, dj2.id, track2);
  assert(afterSub2.dj2.track.id === track2.id, 'DJ 2 weapon registered');
  assert(afterSub2.status === 'active', 'Battle activates automatically once both weapons are submitted');
  assert(afterSub2.endsAt > Date.now(), 'Countdown timer initialized');

  // TEST 3: Live Audience Voting (REQ-026)
  console.log('\nTest Suite 3: Live Audience Voting & Tallying');
  // 3 listeners vote
  castBattleVote(testRoom, 'listener_1', 'dj1');
  castBattleVote(testRoom, 'listener_2', 'dj2');
  const vote3 = castBattleVote(testRoom, 'listener_3', 'dj2');

  assert(vote3.dj1.votes === 1, 'DJ 1 has 1 vote');
  assert(vote3.dj2.votes === 2, 'DJ 2 has 2 votes');
  assert(vote3.totalVotes === 3, 'Total votes equals 3');

  // Vote switching (listener 1 switches from dj1 to dj2)
  const voteSwitch = castBattleVote(testRoom, 'listener_1', 'dj2');
  assert(voteSwitch.dj1.votes === 0, 'DJ 1 votes decrement to 0 after switch');
  assert(voteSwitch.dj2.votes === 3, 'DJ 2 votes increment to 3');
  assert(voteSwitch.totalVotes === 3, 'Single vote per user maintained after switch');

  // TEST 4: Winner Resolution & History Archiving (REQ-026, REQ-027)
  console.log('\nTest Suite 4: Winner Determination & Permanent History Archiving');
  const ended = evaluateBattleWinner(testRoom);
  assert(ended.status === 'ended', 'Battle status marked as ended');
  assert(ended.winner.choice === 'dj2', 'DJ 2 identified as winner by popular vote');
  assert(ended.winner.dj.name === 'DJ Shadow', 'Winner metadata accurately contains DJ Shadow');

  // Verify permanent history archiving
  const history = getSoundclashHistory(testRoom);
  assert(Array.isArray(history) && history.length > 0, 'Permanent battle history is queryable');
  const record = history[0];
  assert(record.battleId === battle.id, 'History record stores correct battleId');
  assert(record.winner.dj.name === 'DJ Shadow', 'History record stores winner name');
  assert(record.dj1.name === 'DJ Pulse' && record.dj2.name === 'DJ Shadow', 'History stores both contenders');
  assert(record.totalVotes === 3, 'History stores final vote count');

  console.log(`\n========================================`);
  console.log(`PHASE 7 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
