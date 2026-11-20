import { execSync } from 'node:child_process';

const suites = [
  { name: 'Epic 1: Collaborative Queue & 50-Cap Room State', cmd: 'node tests/queue.test.mjs' },
  { name: 'Epic 2: Acoustic Feature Matrix & Harmonic Segues', cmd: 'node scripts/run-ts.mjs tests/acoustic.test.mjs' },
  { name: 'Epic 2: Live Chat Sentiment Aggregator (>=85% Acc)', cmd: 'node scripts/run-ts.mjs tests/sentiment.test.mjs' },
  { name: 'Security: Scrypt, HS256 JWT & 4-Tier RBAC', cmd: 'node tests/rbac.test.mjs' },
  { name: 'Production REST API 26-Endpoint Live Suite', cmd: 'node tests/api.test.mjs' },
];

console.log('========================================================================');
console.log('   SPOTIFY PRD SUBMISSION: MASTER VERIFICATION TEST RUNNER              ');
console.log('   AI DJ Studio — Collaborative Live Queue & Sentiment Audio Engine     ');
console.log('========================================================================\n');

let totalSuites = suites.length;
let passedSuites = 0;
let failedSuites = 0;
const results = [];

for (const suite of suites) {
  process.stdout.write(`Running: ${suite.name} ... `);
  const start = Date.now();
  try {
    const stdout = execSync(suite.cmd, { stdio: 'pipe', encoding: 'utf8' });
    const duration = Date.now() - start;
    console.log(`PASSED (${duration}ms)`);
    passedSuites++;
    results.push({ name: suite.name, status: 'PASS', duration, output: stdout });
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`FAILED (${duration}ms)`);
    failedSuites++;
    const errOutput = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n');
    results.push({ name: suite.name, status: 'FAIL', duration, error: errOutput });
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
  console.log('ALL PRD TEST SUITES PASSED WITH ZERO ERRORS (100% SUCCESS RATE).\n');
  process.exit(0);
}
