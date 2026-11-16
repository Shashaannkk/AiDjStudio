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
  console.log('\n--- AI DJ STUDIO: PHASE 6 MULTI-TRACK SEGUE CHAIN TESTS ---\n');

  const startTrack: Track = {
    id: 'track_midnight_drive',
    title: 'Midnight Drive',
    artist_name: 'Luna Skye',
    duration: 232,
    bpm: 124,
    key: '11A',
    energy: 82,
    audio: 'https://test.mp3',
    image: 'https://test.jpg',
  };

  // TEST 1: Pathfinding & Chain Generation (REQ-021)
  console.log('Test Suite 1: Multi-Track Segue Chain Pathfinding');
  const result3 = recommendationEngine.generateSegueChain(startTrack, 3);
  assert(result3.chain.length === 3, 'Generates 3-track chain as requested');
  assert(result3.chain[0].id === startTrack.id, 'Chain starts with the provided track');
  assert(result3.steps.length === 2, 'Contains 2 transition steps between 3 tracks');

  // Verify transition constraints for each consecutive pair
  result3.steps.forEach((step, idx) => {
    const isBpmOk = recommendationEngine.isBpmEligible(step.fromTrack.bpm, step.toTrack.bpm, 0.08);
    assert(isBpmOk, `Step ${idx + 1} (${step.fromTrack.title} -> ${step.toTrack.title}) satisfies ±8% BPM constraint`);
    assert(step.transitionScore >= 70, `Step ${idx + 1} achieves high transition score (${step.transitionScore}% >= 70%)`);
    assert(Boolean(step.harmonicRelationship), `Step ${idx + 1} provides harmonic relationship (${step.harmonicRelationship})`);
    assert(Boolean(step.suggestedMixTechnique), `Step ${idx + 1} suggests concrete mix technique (${step.suggestedMixTechnique})`);
  });

  // TEST 2: Chain Deduplication & Exclusion (REQ-021)
  console.log('\nTest Suite 2: Track Deduplication & Exclusion');
  const trackIds = result3.chain.map((t) => t.id);
  const uniqueTrackIds = new Set(trackIds);
  assert(uniqueTrackIds.size === trackIds.length, 'Every track in the segue chain is unique (no repeats)');

  // Respect excluded IDs
  const secondTrackId = result3.chain[1].id;
  const resultExcluded = recommendationEngine.generateSegueChain(startTrack, 3, {
    excludedIds: new Set([secondTrackId]),
  });
  assert(
    !resultExcluded.chain.some((t) => t.id === secondTrackId),
    'Respects excludedIds and paths around excluded tracks'
  );

  // TEST 3: Metadata Aggregation & Longer Chains (REQ-021, REQ-023)
  console.log('\nTest Suite 3: 4-Track Extended Chain & Metrics');
  const result4 = recommendationEngine.generateSegueChain(startTrack, 4);
  assert(result4.chain.length === 4, 'Successfully finds 4-track harmonic path');
  assert(result4.totalDuration > 500, `Aggregates total chain duration (${result4.totalDuration}s)`);
  assert(result4.averageScore >= 75, `Calculates average compatibility score (${result4.averageScore}%)`);

  console.log(`\n========================================`);
  console.log(`PHASE 6 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
