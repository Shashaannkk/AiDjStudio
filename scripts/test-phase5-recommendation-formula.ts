import { recommendationEngine } from '../src/services/recommendationEngine.ts';
import type { Track } from '../src/types/music.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n--- AI DJ STUDIO: PHASE 5 RECOMMENDATION FORMULA & STRICT BPM FILTER ---\n');

  // TEST 1: Strict ±8% BPM Eligibility Filter (REQ-018)
  console.log('Test Suite 1: Strict ±8% BPM Eligibility Gate');
  // Base track at 124 BPM
  // 8% of 124 is 9.92 BPM -> Range: [114.08, 133.92]
  assert(recommendationEngine.isBpmEligible(124, 128, 0.08) === true, '128 BPM is within ±8% of 124 BPM (+3.2%)');
  assert(recommendationEngine.isBpmEligible(124, 120, 0.08) === true, '120 BPM is within ±8% of 124 BPM (-3.2%)');
  assert(recommendationEngine.isBpmEligible(124, 133, 0.08) === true, '133 BPM is within ±8% of 124 BPM (+7.2%)');
  assert(recommendationEngine.isBpmEligible(124, 138, 0.08) === false, '138 BPM exceeds +8% threshold (+11.2% -> Disqualified)');
  assert(recommendationEngine.isBpmEligible(124, 105, 0.08) === false, '105 BPM exceeds -8% threshold (-15.3% -> Disqualified)');

  // Half-time compatibility (e.g. 140 BPM with 70 BPM)
  assert(recommendationEngine.isBpmEligible(140, 70, 0.08) === true, '70 BPM is eligible as half-time of 140 BPM (0% delta)');
  assert(recommendationEngine.isBpmEligible(140, 72, 0.08) === true, '72 BPM is eligible as half-time of 140 BPM (+2.8%)');
  assert(recommendationEngine.isBpmEligible(140, 80, 0.08) === false, '80 BPM exceeds ±8% half-time tolerance -> Disqualified');

  // Double-time compatibility (e.g. 70 BPM with 140 BPM)
  assert(recommendationEngine.isBpmEligible(70, 140, 0.08) === true, '140 BPM is eligible as double-time of 70 BPM (0% delta)');
  assert(recommendationEngine.isBpmEligible(70, 145, 0.08) === true, '145 BPM is eligible as double-time of 70 BPM (+3.5%)');

  // Candidate scoring rejects out-of-bounds BPM
  const track124: Track = {
    id: 't_124',
    title: 'Base Groove',
    artist_name: 'DJ Base',
    bpm: 124,
    key: '8A',
    energy: 80,
    duration: 200,
    audio: 'https://test.mp3',
    image: 'https://test.jpg',
  };

  const track150Disqualified: Track = {
    id: 't_150',
    title: 'Speedcore',
    artist_name: 'Fast DJ',
    bpm: 150, // 150 is +20.9% of 124, not half or double
    key: '8A',
    energy: 80,
    duration: 200,
    audio: 'https://test.mp3',
    image: 'https://test.jpg',
  };

  const scoredOut = recommendationEngine.scoreCandidate(track150Disqualified, {
    currentTrack: track124,
    queue: [],
    history: [],
    likedTrackIds: new Set(),
    skippedTrackIds: new Map(),
    rejectedTrackIds: new Set(),
  });
  assert(scoredOut === null, 'scoreCandidate returns null (disqualified) for track with BPM differing by >8%');

  // TEST 2: PRD Recommendation Formula (REQ-019)
  console.log('\nTest Suite 2: PRD 50% Harmonic + 30% Energy + 20% Recency Formula');
  
  // Test Candidate: Exact Key match (Harmonic = 100), Steady energy (Energy = 100), Fresh (Recency = 100)
  const trackExact: Track = {
    id: 't_exact',
    title: 'Perfect Match',
    artist_name: 'Harmony DJ',
    bpm: 124,
    key: '8A',
    energy: 80,
    duration: 210,
    audio: 'https://test.mp3',
    image: 'https://test.jpg',
  };

  const scoredExact = recommendationEngine.scoreCandidate(trackExact, {
    currentTrack: track124,
    queue: [],
    history: [],
    likedTrackIds: new Set(),
    skippedTrackIds: new Map(),
    rejectedTrackIds: new Set(),
  });
  assert(scoredExact !== null, 'Candidate is scored successfully');
  if (scoredExact) {
    assert(scoredExact.score.overall >= 98, 'Perfect harmonic, energy, and recency scores yield top tier >=98%');
    assert(scoredExact.score.harmonic === 100, 'Exact key match receives 100 harmonic points');
  }

  // Test Candidate with Relative Major/Minor (Harmonic = 96), different energy, history penalty
  const trackRelative: Track = {
    id: 't_relative',
    title: 'Relative Mood',
    artist_name: 'Vibe Artist',
    bpm: 126,
    key: '8B', // Relative major of 8A
    energy: 90,
    duration: 210,
    audio: 'https://test.mp3',
    image: 'https://test.jpg',
  };

  const scoredRelative = recommendationEngine.scoreCandidate(trackRelative, {
    currentTrack: track124,
    queue: [],
    history: [],
    likedTrackIds: new Set(),
    skippedTrackIds: new Map(),
    rejectedTrackIds: new Set(),
  });
  if (scoredRelative) {
    assert(scoredRelative.score.harmonic === 96, 'Relative Major (8A <-> 8B) receives exactly 96 harmonic points');
  }

  // TEST 3: Precision@5 Benchmark (REQ-020)
  console.log('\nTest Suite 3: Recommendation Precision@5 Benchmark');
  const recommendations = recommendationEngine.recommend({
    currentTrack: track124,
    queue: [],
    history: [],
    likedTrackIds: new Set(),
    skippedTrackIds: new Map(),
    rejectedTrackIds: new Set(),
    limit: 5,
  });

  assert(recommendations.length === 5, 'recommend() returns top 5 candidate recommendations');
  
  // Verify all top 5 satisfy BPM ±8% and have strong compatibility >= 70%
  let validCount = 0;
  recommendations.forEach((r, idx) => {
    const isBpmOk = recommendationEngine.isBpmEligible(track124.bpm, r.track.bpm, 0.08);
    const isScoreOk = r.score.overall >= 70;
    if (isBpmOk && isScoreOk) validCount++;
    assert(isBpmOk, `Recommendation #${idx + 1} (${r.track.title}) satisfies strict ±8% BPM constraint (${r.track.bpm} BPM)`);
  });

  const precisionAt5 = validCount / 5;
  console.log(`  Precision@5 Metric: ${precisionAt5.toFixed(2)} (Requirement: >= 0.60)`);
  assert(precisionAt5 >= 0.60, 'Precision@5 meets or exceeds the required 0.60 (60%) threshold');

  console.log(`\n========================================`);
  console.log(`PHASE 5 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
