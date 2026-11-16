import {
  joinRoomCapacity,
  leaveRoomCapacity,
  getRoomCapacity,
} from '../src/server/rooms.js';

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
  console.log('\n--- AI DJ STUDIO: PHASE 8 ROOM 50-PARTICIPANT CAPACITY TESTS ---\n');

  const testRoomId = `room_capacity_${Date.now()}`;

  // TEST 1: Initial Capacity Status
  console.log('Test Suite 1: Initial Capacity State');
  const initial = getRoomCapacity(testRoomId);
  assert(initial.currentCount === 0, 'New room starts with 0 participants');
  assert(initial.maxCapacity === 50, 'Max capacity is strictly configured as 50');
  assert(initial.isFull === false, 'Room is not full');

  // TEST 2: Fill Room to Exact Limit of 50 Participants (REQ-028)
  console.log('\nTest Suite 2: Populating Room Up to 50 Participants');
  for (let i = 1; i <= 50; i++) {
    const res = joinRoomCapacity(testRoomId, `usr_listener_${i}`);
    assert(res.success === true && res.currentCount === i, `Participant #${i} joined successfully (count: ${i}/50)`);
  }

  const atFifty = getRoomCapacity(testRoomId);
  assert(atFifty.currentCount === 50, 'Room contains exactly 50 participants');
  assert(atFifty.isFull === true, 'Room marked as isFull: true');

  // TEST 3: Reject the 51st Participant with ROOM_CAPACITY_REACHED (REQ-029)
  console.log('\nTest Suite 3: Rejection of 51st Participant (HTTP 409)');
  try {
    joinRoomCapacity(testRoomId, 'usr_listener_51');
    assert(false, 'Should reject 51st participant');
  } catch (err) {
    assert(err.code === 'ROOM_CAPACITY_REACHED', 'Throws error with code ROOM_CAPACITY_REACHED');
    assert(err.status === 409, 'Returns HTTP status 409 Conflict');
    assert(err.message.includes('maximum limit of 50 participants'), 'Error message clearly states 50-participant limit');
  }

  // Count remains strictly 50
  const afterReject = getRoomCapacity(testRoomId);
  assert(afterReject.currentCount === 50, 'Participant count remains 50 after rejection');

  // TEST 4: Idempotent Join for Already-Present User
  console.log('\nTest Suite 4: Idempotent Re-join for Active User');
  const existingUserRejoin = joinRoomCapacity(testRoomId, 'usr_listener_10');
  assert(existingUserRejoin.success === true, 'Existing user can refresh presence');
  assert(existingUserRejoin.currentCount === 50, 'Count does not increase for already active user');

  // TEST 5: Slot Freeing on Leave & Backfill (REQ-028, REQ-030)
  console.log('\nTest Suite 5: Leave Room & Capacity Slot Freeing');
  // Participant #1 leaves
  const leaveRes = leaveRoomCapacity(testRoomId, 'usr_listener_1');
  assert(leaveRes.currentCount === 49, 'Leaving room decrements count to 49');
  
  const capacityAfterLeave = getRoomCapacity(testRoomId);
  assert(capacityAfterLeave.isFull === false, 'Room is no longer full (isFull: false)');

  // Now 51st user can join in the freed slot!
  const joinFreedSlot = joinRoomCapacity(testRoomId, 'usr_listener_51');
  assert(joinFreedSlot.success === true, 'New user successfully claims the freed slot');
  assert(joinFreedSlot.currentCount === 50, 'Room capacity returns to 50/50');

  console.log(`\n========================================`);
  console.log(`PHASE 8 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
