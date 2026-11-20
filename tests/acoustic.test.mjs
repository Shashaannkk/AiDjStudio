import assert from 'node:assert/strict';
import { recommendationEngine } from '../src/services/recommendationEngine.ts';

console.log('========================================================================');
console.log('EPIC 2: ACOUSTIC FEATURE MATRIX & HARMONIC MIXING RULES TEST SUITE');
console.log('PRD Section 6.2 — BPM Tolerance Gate (±8%) & Camelot Wheel Compatibility');
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

// ---------------------------------------------------------------------------
// 1. STRICT ±8% BPM ELIGIBILITY GATE & HALF/DOUBLE-TIME MULTIPLIERS
// ---------------------------------------------------------------------------

test('124 BPM base accepts 128 BPM (+3.2% within ±8%)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(124, 128, 0.08), true);
});

test('124 BPM base accepts 120 BPM (-3.2% within ±8%)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(124, 120, 0.08), true);
});

test('124 BPM base accepts 133 BPM (+7.25% within ±8%)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(124, 133, 0.08), true);
});

test('124 BPM base rejects 138 BPM (+11.29% exceeds ±8% gate)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(124, 138, 0.08), false);
});

test('124 BPM base rejects 105 BPM (-15.32% exceeds ±8% gate)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(124, 105, 0.08), false);
});

test('140 BPM base accepts 70 BPM as half-time multiple (0% delta)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(140, 70, 0.08), true);
});

test('140 BPM base accepts 72 BPM as half-time multiple (+2.8% within ±8%)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(140, 72, 0.08), true);
});

test('140 BPM base rejects 80 BPM (exceeds half-time ±8% gate)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(140, 80, 0.08), false);
});

test('70 BPM base accepts 140 BPM as double-time multiple (0% delta)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(70, 140, 0.08), true);
});

test('70 BPM base accepts 145 BPM as double-time multiple (+3.5% within ±8%)', () => {
  assert.strictEqual(recommendationEngine.isBpmEligible(70, 145, 0.08), true);
});

// ---------------------------------------------------------------------------
// 2. 24-KEY CAMELOT WHEEL HARMONIC COMPATIBILITY RULES
// ---------------------------------------------------------------------------

test('Identical key match (8A -> 8A) scores maximum compatibility (100)', () => {
  const result = recommendationEngine.calculateHarmonicScore('8A', '8A');
  assert.strictEqual(result.score, 100);
});

test('Adjacent key +1 fifth (8A -> 9A) scores high compatibility (93)', () => {
  const result = recommendationEngine.calculateHarmonicScore('8A', '9A');
  assert.strictEqual(result.score, 93);
});

test('Adjacent key -1 fifth (8A -> 7A) scores high compatibility (90)', () => {
  const result = recommendationEngine.calculateHarmonicScore('8A', '7A');
  assert.strictEqual(result.score, 90);
});

test('Camelot wheel wraparound boundary (12A -> 1A) scores 93 (+1 step)', () => {
  const result = recommendationEngine.calculateHarmonicScore('12A', '1A');
  assert.strictEqual(result.score, 93);
});

test('Camelot wheel wraparound boundary (1A -> 12A) scores 90 (-1 step)', () => {
  const result = recommendationEngine.calculateHarmonicScore('1A', '12A');
  assert.strictEqual(result.score, 90);
});

test('Relative major/minor swap (8A -> 8B) scores high compatibility (96)', () => {
  const result = recommendationEngine.calculateHarmonicScore('8A', '8B');
  assert.strictEqual(result.score, 96);
});

test('Energy boost modulation (+2 on wheel, 8A -> 10A) scores 78', () => {
  const result = recommendationEngine.calculateHarmonicScore('8A', '10A');
  assert.strictEqual(result.score, 78);
});

test('Distant clash key (8A -> 2B) receives low baseline score (< 50)', () => {
  const result = recommendationEngine.calculateHarmonicScore('8A', '2B');
  assert.ok(result.score < 50, `Clash score must be < 50, got ${result.score}`);
});

// ---------------------------------------------------------------------------
// 3. TRI-PARTITE 50/30/20 WEIGHTED SCORING FORMULA
// ---------------------------------------------------------------------------

test('Tri-partite 50/30/20 formula ranks harmonious tracks over out-of-key tracks', () => {
  const current = { id: 'c1', title: 'Current Song', bpm: 124, key: '8A', energy: 80, audio: 'https://cdn.audio/c1.mp3' };
  const goodMatch = { id: 'g1', title: 'Harmonic Match', bpm: 125, key: '8A', energy: 82, audio: 'https://cdn.audio/g1.mp3' };
  const clashMatch = { id: 'b1', title: 'Clash Song', bpm: 124, key: '2B', energy: 80, audio: 'https://cdn.audio/b1.mp3' };

  const goodScore = recommendationEngine.scoreCandidate(current, goodMatch);
  const clashScore = recommendationEngine.scoreCandidate(current, clashMatch);

  assert.ok(goodScore !== null && clashScore !== null);
  assert.ok(
    goodScore.score.overall > clashScore.score.overall,
    `Good score (${goodScore.score.overall}) must exceed clash score (${clashScore.score.overall})`
  );
  assert.ok(goodScore.score.overall >= 80, `Good match must score >= 80, got ${goodScore.score.overall}`);
});

// ---------------------------------------------------------------------------
// 4. PRD ACCEPTANCE CRITERIA: 100% COMPLIANCE OVER 20+ SEGUE DECISIONS
// ---------------------------------------------------------------------------

test('100% rule compliance over 25 randomized valid/invalid segue candidates', () => {
  const current = { id: 'c_root', title: 'Anchor Track', bpm: 124, key: '8A', energy: 75 };
  const candidates = [
    { id: 't1', bpm: 124, key: '8A', expected: true },
    { id: 't2', bpm: 126, key: '9A', expected: true },
    { id: 't3', bpm: 122, key: '7A', expected: true },
    { id: 't4', bpm: 124, key: '8B', expected: true },
    { id: 't5', bpm: 128, key: '10A', expected: true },
    { id: 't6', bpm: 62, key: '8A', expected: true }, // half-time
    { id: 't7', bpm: 248, key: '8A', expected: true }, // double-time
    { id: 't8', bpm: 150, key: '8A', expected: false }, // BPM fail
    { id: 't9', bpm: 124, key: '2A', expected: false }, // Key clash (6 steps)
    { id: 't10', bpm: 124, key: '4B', expected: false }, // Key clash
    { id: 't11', bpm: 110, key: '8A', expected: false }, // BPM fail
    { id: 't12', bpm: 125, key: '8A', expected: true },
    { id: 't13', bpm: 123, key: '9A', expected: true },
    { id: 't14', bpm: 127, key: '7A', expected: true },
    { id: 't15', bpm: 124, key: '8B', expected: true },
    { id: 't16', bpm: 130, key: '8A', expected: true },
    { id: 't17', bpm: 118, key: '9A', expected: true },
    { id: 't18', bpm: 100, key: '8A', expected: false }, // BPM fail
    { id: 't19', bpm: 124, key: '11B', expected: false }, // Key clash
    { id: 't20', bpm: 124, key: '1A', expected: false }, // Key clash (5 steps)
    { id: 't21', bpm: 125, key: '8A', expected: true },
    { id: 't22', bpm: 124, key: '7A', expected: true },
    { id: 't23', bpm: 126, key: '8B', expected: true },
    { id: 't24', bpm: 145, key: '8A', expected: false }, // BPM fail
    { id: 't25', bpm: 124, key: '5A', expected: false }, // Key clash
  ];

  let compliantCount = 0;
  for (const c of candidates) {
    const isBpmOk = recommendationEngine.isBpmEligible(current.bpm, c.bpm, 0.08);
    const harmRes = recommendationEngine.calculateHarmonicScore(current.key, c.key);
    // In PRD, compatible keys are: exact, adjacent (+/-1), relative major/minor, or +2 whole tone lift
    const isHarmOk = harmRes.score >= 75;
    const isValid = isBpmOk && isHarmOk;

    assert.strictEqual(isValid, c.expected, `Candidate ${c.id} validation mismatch!`);
    compliantCount++;
  }

  assert.strictEqual(compliantCount, 25);
  console.log(`    -> Evaluated 25 segue candidates: 100% PRD Rule Compliance Verified.`);
});

console.log(`\nResult: ${passed}/${total} assertions passed.\n`);
if (passed !== total) process.exit(1);
