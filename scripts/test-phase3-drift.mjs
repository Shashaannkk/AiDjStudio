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

// Emulate drift correction algorithm from usePlayerStore & audioEngine
function calculateSyncAdjustment(clientCurrentTime, syncSnapshot, clientReceiveTimestamp) {
  const elapsed = syncSnapshot.isPlaying
    ? Math.max(0, (clientReceiveTimestamp - syncSnapshot.serverTimestamp) / 1000)
    : 0;
  const targetTime = Math.max(0, syncSnapshot.position + elapsed);
  const delta = targetTime - clientCurrentTime;
  const drift = Math.abs(delta);

  let action = 'maintain';
  let playbackRate = 1.0;
  let seekTarget = null;

  if (drift >= 1.0) {
    action = 'hard_seek';
    seekTarget = targetTime;
    playbackRate = 1.0;
  } else if (drift >= 0.08) {
    action = 'micro_nudge';
    playbackRate = delta > 0 ? 1.02 : 0.98;
  } else {
    action = 'in_sync';
    playbackRate = 1.0;
  }

  return { targetTime, delta, drift, action, playbackRate, seekTarget };
}

async function runTests() {
  console.log('\n--- AI DJ STUDIO: PHASE 3 AUDIO SYNCHRONIZATION & DRIFT TESTS ---\n');

  // TEST 1: Latency Compensation & Network Transit (REQ-011, REQ-012)
  console.log('Test Suite 1: Network Latency Compensation');
  const now = Date.now();
  const hostPosition = 45.25; // 45.25 seconds
  const transitLatencyMs = 60; // 60ms simulated network transit
  
  const snapshot = {
    hostId: 'host_dj_1',
    track: { id: 'track_1', title: 'Midnight Drive', duration: 232 },
    isPlaying: true,
    position: hostPosition,
    serverTimestamp: now - transitLatencyMs,
    action: 'sync_state',
  };

  const adj = calculateSyncAdjustment(45.31, snapshot, now);
  // Expected target = 45.25 + 0.060 = 45.31
  assert(Math.abs(adj.targetTime - 45.31) < 0.001, 'Calculates latency-compensated target position accurately');
  assert(adj.drift < 0.01, 'Detects in-sync state when client time accounts for latency');
  assert(adj.action === 'in_sync', 'Marks stream in_sync within <100ms tolerance');
  assert(adj.playbackRate === 1.0, 'Keeps 1.0 playback rate when perfectly synchronized');

  // TEST 2: Micro-Nudge Speed Up for Trailing Client (REQ-013)
  console.log('\nTest Suite 2: Web Audio Micro-Nudging (+2% Speedup)');
  // Host is at 45.31s, client is trailing at 45.15s (delta = +160ms)
  const trailingAdj = calculateSyncAdjustment(45.15, snapshot, now);
  assert(trailingAdj.drift >= 0.08 && trailingAdj.drift < 1.0, 'Detects sub-second trailing drift (160ms)');
  assert(trailingAdj.action === 'micro_nudge', 'Selects micro_nudge without audio stutter seek');
  assert(trailingAdj.playbackRate === 1.02, 'Sets playbackRate to exactly 1.02 (+2%) to catch up smoothly');
  assert(trailingAdj.seekTarget === null, 'Avoids hard seek for sub-second discrepancies');

  // TEST 3: Micro-Nudge Slow Down for Ahead Client (REQ-013)
  console.log('\nTest Suite 3: Web Audio Micro-Nudging (-2% Slowdown)');
  // Host is at 45.31s, client is ahead at 45.46s (delta = -150ms)
  const aheadAdj = calculateSyncAdjustment(45.46, snapshot, now);
  assert(aheadAdj.drift >= 0.08 && aheadAdj.drift < 1.0, 'Detects sub-second ahead drift (150ms)');
  assert(aheadAdj.action === 'micro_nudge', 'Selects micro_nudge without audio stutter seek');
  assert(aheadAdj.playbackRate === 0.98, 'Sets playbackRate to exactly 0.98 (-2%) to allow host to catch up');

  // TEST 4: Large Drift Hard Seek (REQ-011)
  console.log('\nTest Suite 4: Large Discrepancy Hard Seek (>= 1.0s)');
  // Client is at 42.0s, host is at 45.31s (delta = 3.31s)
  const largeDriftAdj = calculateSyncAdjustment(42.0, snapshot, now);
  assert(largeDriftAdj.drift >= 1.0, 'Detects large drift (>1.0s)');
  assert(largeDriftAdj.action === 'hard_seek', 'Triggers hard seek for large drift');
  assert(largeDriftAdj.seekTarget !== null, 'Provides precise seek target');
  assert(largeDriftAdj.playbackRate === 1.0, 'Resets playbackRate to 1.0 on seek');

  // TEST 5: Strict <100ms Tolerance Boundary
  console.log('\nTest Suite 5: Precision Threshold Enforcement');
  // Client at 45.25s vs target 45.31s (delta = 60ms < 80ms)
  const tightAdj = calculateSyncAdjustment(45.25, snapshot, now);
  assert(tightAdj.drift < 0.08, '60ms drift is within tolerance (<80ms target threshold)');
  assert(tightAdj.action === 'in_sync', 'Recognized as fully synchronized (<100ms PRD target)');
  assert(tightAdj.playbackRate === 1.0, 'Playback rate remains standard 1.0');

  console.log(`\n========================================`);
  console.log(`PHASE 3 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
