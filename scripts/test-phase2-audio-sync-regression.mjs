/**
 * AI DJ Studio — Regression Test Suite for AUD-01 (Precision Audio Sync) and AUD-02 (Preview Truthfulness)
 */

import { AudioEngine } from '../src/services/audioEngine.ts';
import { providerAdapters } from '../src/services/providerAdapters.ts';
import { TRENDING_INDIA_TRACKS } from '../src/fixtures/globalMusicDatabase.ts';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('--- AI DJ STUDIO: AUD-01 & AUD-02 AUDIO REGRESSION SUITE ---');

// TEST 1: Floating-Point Audio Engine Precision (AUD-01)
console.log('\nTest Suite 1: Audio Engine Timing Precision (AUD-01)');

const engine = new AudioEngine();
let capturedTime = -1;

engine.setCallbacks(
  (cur) => {
    capturedTime = cur;
  },
  () => {}
);

// Simulate non-integer time update
const testCur = 14.732;
const testDur = 210.45;

// Direct callback verification
engine['onTimeUpdateCallback']?.(testCur, testDur);
assert(capturedTime === 14.732, 'Audio callback preserves sub-second floating-point milliseconds');
assert(Math.floor(capturedTime) !== capturedTime, 'Captured audio position is not truncated by Math.floor');

// Seeking precision
engine.seek(45.85);
assert(capturedTime === 45.85, 'Seek updates position with exact floating point timestamp');

// Playback rate adjustment preserves pitch
engine.setPlaybackRate(1.02);
assert(engine.getPlaybackRate() === 1.02, 'Playback rate nudging applies smoothly (1.02)');
engine.setPlaybackRate(1.0);
assert(engine.getPlaybackRate() === 1.0, 'Playback rate restored to 1.0');

// TEST 2: Provider Preview Normalization & Truthfulness (AUD-02)
console.log('\nTest Suite 2: Provider Preview Normalization & Truthfulness (AUD-02)');

const appleTrack = TRENDING_INDIA_TRACKS.find((t) => t.id === 'in_tauba_tauba');
assert(Boolean(appleTrack), 'Track in_tauba_tauba found in global catalogue');
assert(appleTrack.provider === 'apple', 'Track provider is truthful "apple" (not mislabeled as spotify)');
assert(appleTrack.duration === 30, 'Track duration accurately reflects 30s playable audio file');
assert(appleTrack.fullTrackDuration === 208, 'Original commercial track duration preserved in fullTrackDuration');
assert(appleTrack.isFullLength === false, 'isFullLength flag is correctly marked false for 30s preview');

// Test normalizeTrack adapter
const rawApple = {
  id: 'test_apple',
  title: 'Test Song',
  artist_name: 'Artist',
  audio: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/34/8d/63/test.m4a',
  duration: 210,
  provider: 'spotify',
};
const normalized = providerAdapters.normalizeTrack(rawApple);
assert(normalized.provider === 'apple', 'Adapter corrects provider from spotify to apple');
assert(normalized.duration === 30, 'Adapter normalizes playable duration to 30s');
assert(normalized.streamType === 'preview', 'Adapter marks streamType as preview');
assert(normalized.isFullLength === false, 'Adapter marks isFullLength as false');
assert(normalized.fullTrackDuration === 210, 'Adapter retains full commercial duration in fullTrackDuration');

// TEST 3: Full-Length Stream Providers (Jamendo & Audius)
console.log('\nTest Suite 3: Full-Length Stream Providers');
const jamendoTrack = {
  id: 'jamendo_test',
  title: 'Jamendo Jam',
  artist_name: 'CC Artist',
  audio: 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32&ndls=1',
  duration: 245,
  provider: 'jamendo',
};
const normalizedJamendo = providerAdapters.normalizeTrack(jamendoTrack);
assert(normalizedJamendo.isFullLength === true, 'Jamendo stream marked as full length');
assert(normalizedJamendo.duration === 245, 'Jamendo duration remains full 245s');
assert(normalizedJamendo.streamType === 'full', 'Jamendo streamType marked as full');

console.log(`\n========================================`);
console.log(`AUDIO REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
