import {
  normalizeCamelotKey,
  listTracks,
  getTrackById,
  createTrack,
  deactivateTrack,
  deleteTrack,
  updateAcousticFeatures,
  auditCatalogueDataQuality,
} from '../src/server/tracks.js';

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
  console.log('\n--- AI DJ STUDIO: PHASE 2 TRACK CATALOGUE & ACOUSTIC TESTS ---\n');

  // TEST 1: Camelot Key Normalization (REQ-006, REQ-007)
  console.log('Test Suite 1: Camelot Key Normalization');
  assert(normalizeCamelotKey('8A') === '8A', 'Direct 8A normalization');
  assert(normalizeCamelotKey('11b') === '11B', 'Lower case 11b normalized to uppercase 11B');
  assert(normalizeCamelotKey('A Min') === '8A', 'A Min converted to 8A');
  assert(normalizeCamelotKey('C Maj') === '8B', 'C Maj converted to 8B');
  assert(normalizeCamelotKey('F# Min') === '11A', 'F# Min converted to 11A');
  assert(normalizeCamelotKey('Eb Min') === '2A', 'Eb Min converted to 2A');
  assert(normalizeCamelotKey('InvalidUnknownKey') === '8A', 'Unresolvable key falls back to standard 8A');

  // TEST 2: Metadata Validation & Track Creation (REQ-005, REQ-007, REQ-008)
  console.log('\nTest Suite 2: Track Validation & Creation');
  
  // Missing required fields
  try {
    createTrack({ title: '', artist_name: 'DJ Test', audio: 'https://test.mp3' });
    assert(false, 'Should reject empty title');
  } catch (err) {
    assert(err.message.includes('Title is required'), 'Rejects track without title');
  }

  try {
    createTrack({ title: 'Neon Sunset', artist_name: '', audio: 'https://test.mp3' });
    assert(false, 'Should reject empty artist');
  } catch (err) {
    assert(err.message.includes('Artist name is required'), 'Rejects track without artist');
  }

  try {
    createTrack({ title: 'Neon Sunset', artist_name: 'DJ Test', audio: '' });
    assert(false, 'Should reject empty audio URL');
  } catch (err) {
    assert(err.message.includes('Audio stream URL is required'), 'Rejects track without audio stream URL');
  }

  // Valid creation
  const created = createTrack({
    title: 'Phase 2 Test Anthem',
    artist_name: 'Antigravity Studio',
    album_name: 'Master Verification',
    audio: 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32&ndls=1',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
    duration: 210,
    bpm: 126,
    key: 'A Min',
    energy: 85,
    genre: 'Synthwave',
    provider: 'jamendo',
  });
  assert(Boolean(created.id), 'Track created with unique ID');
  assert(created.key === '8A', 'Musical key "A Min" automatically normalized to Camelot "8A" on creation');
  assert(created.isActive === true, 'Track initialized as active');
  assert(created.acousticFeatures?.danceability === 0.75, 'Acoustic features object initialized');

  // TEST 3: Track Retrieval & Search (REQ-005, REQ-008)
  console.log('\nTest Suite 3: Catalogue Query & Search');
  const foundById = getTrackById(created.id);
  assert(foundById && foundById.id === created.id, 'getTrackById retrieves exact track');
  
  const searchResults = listTracks({ search: 'Phase 2 Test Anthem' });
  assert(searchResults.some((t) => t.id === created.id), 'listTracks finds track by title search');

  const genreResults = listTracks({ genre: 'Synthwave' });
  assert(genreResults.length > 0, 'listTracks filters by genre');

  // TEST 4: Acoustic Features Management (REQ-006)
  console.log('\nTest Suite 4: Acoustic Features Update');
  const updatedAcoustics = updateAcousticFeatures(created.id, {
    bpm: 128,
    key: 'C Maj',
    energy: 92,
    danceability: 0.88,
    valence: 0.72,
    status: 'ml_analyzed',
  });
  assert(updatedAcoustics.bpm === 128, 'BPM updated to 128');
  assert(updatedAcoustics.key === '8B', 'Key "C Maj" normalized to "8B"');
  assert(updatedAcoustics.energy === 92, 'Energy updated to 92');
  assert(updatedAcoustics.acousticFeatures.danceability === 0.88, 'Danceability updated to 0.88');
  assert(updatedAcoustics.acousticFeatures.valence === 0.72, 'Valence updated to 0.72');
  assert(updatedAcoustics.acousticFeatures.analysisStatus === 'ml_analyzed', 'Analysis status recorded');

  // TEST 5: Track Deactivation & Soft Delete (REQ-009)
  console.log('\nTest Suite 5: Deactivation & Soft Delete Lifecycle');
  const deactivated = deactivateTrack(created.id);
  assert(deactivated.isActive === false, 'deactivateTrack sets isActive to false');

  const activeTracksAfter = listTracks({ includeInactive: false });
  assert(!activeTracksAfter.some((t) => t.id === created.id), 'Deactivated track excluded from active catalogue');

  const allTracksWithInactive = listTracks({ includeInactive: true });
  assert(allTracksWithInactive.some((t) => t.id === created.id), 'Deactivated track visible when includeInactive=true');

  const reactivated = deactivateTrack(created.id);
  assert(reactivated.isActive === true, 'Toggling deactivation restores track to active');

  // TEST 6: Track Hard Delete (REQ-008)
  console.log('\nTest Suite 6: Track Hard Delete');
  const deleteRes = deleteTrack(created.id);
  assert(deleteRes.success === true && deleteRes.deletedId === created.id, 'deleteTrack removes track');
  assert(getTrackById(created.id) === null, 'Deleted track no longer exists');

  // TEST 7: Catalogue Data Quality Auditor (REQ-010)
  console.log('\nTest Suite 7: Catalogue Data Quality Auditor');
  const audit = auditCatalogueDataQuality();
  assert(typeof audit.totalTracks === 'number' && audit.totalTracks >= 0, 'Audit reports totalTracks');
  assert(typeof audit.dataQualityPercentage === 'number' && audit.dataQualityPercentage >= 0, 'Audit reports dataQualityPercentage');
  assert(Array.isArray(audit.flaggedTracks), 'Audit provides list of flagged tracks with issues');

  console.log(`\n========================================`);
  console.log(`PHASE 2 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
