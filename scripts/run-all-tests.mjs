import { execSync } from 'node:child_process';

const suites = [
  { name: 'Phase 1: Critical Auth & Security (SEC-01, SEC-02, SEC-03)', cmd: 'node scripts/test-phase1-auth-security.mjs' },
  { name: 'Phase 2: Database Tracks & Provider Normalization (AUD-02)', cmd: 'node scripts/test-phase2-tracks.mjs' },
  { name: 'Phase 2: Audio Sync & Millisecond Precision (AUD-01)', cmd: 'node scripts/run-ts.mjs scripts/test-phase2-audio-sync-regression.mjs' },
  { name: 'Phase 3: Playback Drift Simulation', cmd: 'node scripts/test-phase3-drift.mjs' },
  { name: 'Phase 3: Human Soundclash Frontend-Backend Integration (SND-01)', cmd: 'node scripts/run-ts.mjs scripts/test-phase3-soundclash-frontend-backend.mjs' },
  { name: 'Phase 4: Collaborative Queue Dynamic Reordering', cmd: 'node scripts/test-phase4-queue-voting.mjs' },
  { name: 'Phase 4: Listener Collaborative Vote Broadcast (QUE-01)', cmd: 'node scripts/run-ts.mjs scripts/test-phase4-listener-voting-broadcast.mjs' },
  { name: 'Phase 5: Database Persistence & Concurrency Mutex (DB-01)', cmd: 'node scripts/test-phase5-database-persistence.mjs' },
  { name: 'Phase 5: Recommendation 50/30/20 Formula & Strict ±8% BPM Gate', cmd: 'node scripts/run-ts.mjs scripts/test-phase5-recommendation-formula.mjs' },
  { name: 'Phase 6: Multi-Track Segue Chains & Harmonic Pathfinding', cmd: 'node scripts/run-ts.mjs scripts/test-phase6-segue-chains.ts' },
  { name: 'Phase 7: Human DJ Battle Engine & Archival', cmd: 'node scripts/test-phase7-soundclash.mjs' },
  { name: 'Phase 8: Room Capacity Enforcement (50 Max / 409 Rejected)', cmd: 'node scripts/test-phase8-room-capacity.mjs' },
  { name: 'Phase 9: Session Analytics, History & Metric Aggregation', cmd: 'node scripts/test-phase9-analytics.mjs' },
  { name: 'Phase 10: PostgreSQL & Supabase Integration & Production Gating', cmd: 'node scripts/test-phase10-database-integration.mjs' },
  { name: 'Phase 11: PRD Benchmarks (Precision@5 & Natural Language AI-01)', cmd: 'node scripts/run-ts.mjs scripts/test-benchmarks.ts' },
  { name: 'Phase 12: Master 15-Domain E2E Integration Suite', cmd: 'node scripts/run-ts.mjs scripts/test-master-e2e-integration.mjs' },
  { name: 'Phase 13: GitHub Security & Credential Hardening', cmd: 'node scripts/test-phase13-github-security-audit.mjs' },
];

console.log('========================================================================');
console.log('      AI DJ STUDIO — COMPLETE AUDIT REMEDIATION TEST RUNNER             ');
console.log('========================================================================\n');

let totalSuites = suites.length;
let passedSuites = 0;
let failedSuites = 0;
const results = [];

for (const suite of suites) {
  process.stdout.write(`Running: ${suite.name} ... `);
  try {
    const stdout = execSync(suite.cmd, { stdio: 'pipe', encoding: 'utf8' });
    console.log('PASSED');
    passedSuites++;
    results.push({ name: suite.name, status: 'PASS', output: stdout });
  } catch (err) {
    console.log('FAILED');
    failedSuites++;
    results.push({ name: suite.name, status: 'FAIL', error: err.stdout || err.stderr || err.message });
  }
}

console.log('\n========================================================================');
console.log(`TEST SUMMARY: ${passedSuites}/${totalSuites} Test Suites Passed (${failedSuites} Failed)`);
console.log('========================================================================\n');

if (failedSuites > 0) {
  console.error('FAILURES DETECTED:');
  for (const r of results.filter((r) => r.status === 'FAIL')) {
    console.error(`\nSuite: ${r.name}`);
    console.error(r.error);
  }
  process.exit(1);
} else {
  console.log('ALL TEST SUITES PASSED WITH ZERO ERRORS.\n');
}
