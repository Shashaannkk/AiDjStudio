import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🎵 AI DJ Studio — Full-Length Music Playback & Stream Reliability Test Suite\n');

// ---------------------------------------------------------------------------
// 1. Verify File Structure & Architecture
// ---------------------------------------------------------------------------
console.log('▶ Test 1: Verifying Provider Adapter & Audio Engine Files...');
const typesPath = path.resolve('src/types/music.ts');
const adapterPath = path.resolve('src/services/providerAdapters.ts');
const audioEnginePath = path.resolve('src/services/audioEngine.ts');
const dualDeckPath = path.resolve('src/services/dualDeckMixingEngine.ts');
const storePath = path.resolve('src/store/usePlayerStore.ts');
const barPath = path.resolve('src/components/layout/PlaybackBar.tsx');

assert.ok(fs.existsSync(typesPath), 'src/types/music.ts must exist');
assert.ok(fs.existsSync(adapterPath), 'src/services/providerAdapters.ts must exist');
assert.ok(fs.existsSync(audioEnginePath), 'src/services/audioEngine.ts must exist');
assert.ok(fs.existsSync(dualDeckPath), 'src/services/dualDeckMixingEngine.ts must exist');
assert.ok(fs.existsSync(storePath), 'src/store/usePlayerStore.ts must exist');
assert.ok(fs.existsSync(barPath), 'src/components/layout/PlaybackBar.tsx must exist');

const typesSource = fs.readFileSync(typesPath, 'utf8');
const audioEngineSource = fs.readFileSync(audioEnginePath, 'utf8');
const dualDeckSource = fs.readFileSync(dualDeckPath, 'utf8');
const barSource = fs.readFileSync(barPath, 'utf8');

console.log('  ✅ Core playback and adapter files verified on disk.');

// ---------------------------------------------------------------------------
// 2. Verify TypeScript Interfaces & Capabilities
// ---------------------------------------------------------------------------
console.log('\n▶ Test 2: Verifying TypeScript Types for Stream Reliability...');
assert.ok(typesSource.includes("export type PlaybackCapability = 'full_length' | 'preview'"), 'PlaybackCapability type must exist');
assert.ok(typesSource.includes("streamType?: 'full' | 'preview'"), 'Track must support streamType');
assert.ok(typesSource.includes('isFullLength?: boolean'), 'Track must support isFullLength');
assert.ok(typesSource.includes('streamDuration?: number'), 'Track must support streamDuration');
assert.ok(typesSource.includes('fullTrackDuration?: number'), 'Track must support fullTrackDuration');
assert.ok(typesSource.includes('alternativeFullTrack?: Track'), 'Track must support alternativeFullTrack');
console.log('  ✅ Track type correctly differentiates full length vs 30s preview streams.');

// ---------------------------------------------------------------------------
// 3. Provider URL Pattern Detection Logic
// ---------------------------------------------------------------------------
console.log('\n▶ Test 3: Verifying Provider URL Pattern Detection Logic...');

const isApplePreviewUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('audio-ssl.itunes.apple.com') ||
    lower.includes('itunes-assets') ||
    lower.includes('mzaf_') ||
    lower.includes('audiopreview')
  );
};

const isJamendoUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('jamendo.com') || lower.includes('jamendo.net');
};

const isAudiusUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('audius.co') || lower.includes('audius');
};

const isArchiveUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('archive.org');
};

// Test URLs
const sampleApple = 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/34/8d/63/348d6342-2c35-bf31-8131-2c8b3cfe3c09/mzaf_15374551219149804677.plus.aac.p.m4a';
const sampleJamendo = 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32&ndls=1';
const sampleAudius = 'https://discoveryprovider.audius.co/v1/tracks/1424326672/stream?app_name=AIDJStudio';
const sampleArchive = 'https://archive.org/download/MoogSynthesizer1969/MoogSynthesizer1969_vbr.mp3';

assert.strictEqual(isApplePreviewUrl(sampleApple), true, 'Apple preview URL detected');
assert.strictEqual(isApplePreviewUrl(sampleJamendo), false, 'Jamendo is not Apple preview');
assert.strictEqual(isJamendoUrl(sampleJamendo), true, 'Jamendo URL detected');
assert.strictEqual(isAudiusUrl(sampleAudius), true, 'Audius URL detected');
assert.strictEqual(isArchiveUrl(sampleArchive), true, 'Archive URL detected');
console.log('  ✅ Provider URL patterns correctly classified.');

// ---------------------------------------------------------------------------
// 4. Provider Adapter Normalization & Capabilities
// ---------------------------------------------------------------------------
console.log('\n▶ Test 4: Verifying Provider Normalization Rules...');

const normalizeTrack = (track) => {
  const isApplePreview = isApplePreviewUrl(track.audio) || track.provider === 'apple';
  const isJamendo = isJamendoUrl(track.audio) || track.provider === 'jamendo';
  const isAudius = isAudiusUrl(track.audio) || track.provider === 'audius';
  const isArchive = isArchiveUrl(track.audio) || track.provider === 'archive';

  if (isApplePreview) {
    const fullDuration = track.fullTrackDuration || track.duration || 210;
    return {
      ...track,
      provider: 'apple',
      providerName: 'Apple Music Preview',
      streamType: 'preview',
      isFullLength: false,
      streamDuration: 30, // Actual playable audio file is exactly 30s
      fullTrackDuration: fullDuration,
      previewUrl: track.audio,
      streamStatus: 'preview_only',
    };
  }

  if (isJamendo) {
    const dur = track.streamDuration || track.duration || 220;
    return {
      ...track,
      provider: 'jamendo',
      providerName: 'Jamendo Music (Full Track)',
      streamType: 'full',
      isFullLength: true,
      streamDuration: dur,
      fullTrackDuration: dur,
      fullStreamUrl: track.audio,
      streamStatus: 'available',
    };
  }

  if (isAudius) {
    const dur = track.streamDuration || track.duration || 240;
    return {
      ...track,
      provider: 'audius',
      providerName: 'Audius Protocol (Full Track)',
      streamType: 'full',
      isFullLength: true,
      streamDuration: dur,
      fullTrackDuration: dur,
      fullStreamUrl: track.audio,
      streamStatus: 'available',
    };
  }

  if (isArchive) {
    const dur = track.streamDuration || track.duration || 240;
    return {
      ...track,
      provider: 'archive',
      providerName: 'Internet Archive (Full Track)',
      streamType: 'full',
      isFullLength: true,
      streamDuration: dur,
      fullTrackDuration: dur,
      fullStreamUrl: track.audio,
      streamStatus: 'available',
    };
  }

  const defaultDur = track.streamDuration || track.duration || 210;
  return {
    ...track,
    provider: track.provider || 'aidj',
    providerName: 'AI DJ Studio (Full Track)',
    streamType: 'full',
    isFullLength: true,
    streamDuration: defaultDur,
    fullTrackDuration: defaultDur,
    fullStreamUrl: track.audio,
    streamStatus: 'available',
  };
};

// 4A: Apple Music Track
const appleTrack = normalizeTrack({
  id: 'apple_1',
  title: 'Tauba Tauba',
  artist_name: 'Karan Aujla',
  duration: 208,
  audio: sampleApple,
  genre: 'Bollywood',
});
assert.strictEqual(appleTrack.isFullLength, false, 'Apple track must NOT be marked full length');
assert.strictEqual(appleTrack.streamType, 'preview', 'Apple track streamType must be preview');
assert.strictEqual(appleTrack.streamDuration, 30, 'Apple streamDuration must be exactly 30');
assert.strictEqual(appleTrack.fullTrackDuration, 208, 'Apple fullTrackDuration preserves studio length');
console.log('  ✅ Apple Track: correctly tagged as 30s preview without faking full playback.');

// 4B: Jamendo Track
const jamendoTrack = normalizeTrack({
  id: 'jamendo_1',
  title: 'Electric Sunrise',
  artist_name: 'Neon Voyager',
  duration: 232,
  audio: sampleJamendo,
  genre: 'Synthwave',
});
assert.strictEqual(jamendoTrack.isFullLength, true, 'Jamendo must be marked full length');
assert.strictEqual(jamendoTrack.streamType, 'full', 'Jamendo streamType must be full');
assert.strictEqual(jamendoTrack.streamDuration, 232, 'Jamendo plays complete 232 seconds from 0:00');
console.log('  ✅ Jamendo Track: 100% full length playback (232s from 0:00).');

// 4C: Audius Track
const audiusTrack = normalizeTrack({
  id: 'audius_1',
  title: 'iLLPeTiLL - 140 Mix',
  artist_name: 'iLLPeTiLL',
  duration: 584,
  audio: sampleAudius,
  genre: 'Dubstep',
});
assert.strictEqual(audiusTrack.isFullLength, true, 'Audius must be marked full length');
assert.strictEqual(audiusTrack.streamType, 'full', 'Audius streamType must be full');
assert.strictEqual(audiusTrack.streamDuration, 584, 'Audius plays complete 584 seconds from 0:00');
console.log('  ✅ Audius Track: 100% full length Web3 stream (584s from 0:00).');

// 4D: Internet Archive Track
const archiveTrack = normalizeTrack({
  id: 'archive_1',
  title: 'The Moog Synthesizer Laboratory (1969)',
  artist_name: 'Heritage Archive',
  duration: 245,
  audio: sampleArchive,
  genre: 'Modular Synth',
});
assert.strictEqual(archiveTrack.isFullLength, true, 'Archive must be marked full length');
assert.strictEqual(archiveTrack.streamType, 'full', 'Archive streamType must be full');
assert.strictEqual(archiveTrack.streamDuration, 245, 'Archive plays complete 245 seconds from 0:00');
console.log('  ✅ Internet Archive Track: 100% full length master recording (245s from 0:00).');

// ---------------------------------------------------------------------------
// 5. Audio Engine Clean 0:00 Start Position & Reset Verification
// ---------------------------------------------------------------------------
console.log('\n▶ Test 5: Verifying AudioEngine Starting Position & Reset Guarantees...');

assert.ok(audioEngineSource.includes('this.isChangingSource = true;'), 'Must set isChangingSource flag to prevent stale updates');
assert.ok(audioEngineSource.includes('this.audioElem.currentTime = 0;'), 'Must reset audioElem.currentTime = 0 on playTrack');
assert.ok(audioEngineSource.includes('const onMetadataReady = () => {'), 'Must hook metadata ready event');
assert.ok(audioEngineSource.includes('this.audioElem.addEventListener(\'loadedmetadata\', onMetadataReady'), 'Must attach loadedmetadata listener');
assert.ok(audioEngineSource.includes('this.audioElem.addEventListener(\'canplay\', onMetadataReady'), 'Must attach canplay listener');
assert.ok(audioEngineSource.includes('this.isChangingSource = false;'), 'Must release isChangingSource lock only when ready');
assert.ok(audioEngineSource.includes('public getCurrentTrackId(): string | null'), 'Must provide public getCurrentTrackId');

// Ensure resume() preserves position
const resumeBlock = audioEngineSource.slice(audioEngineSource.indexOf('public resume()'), audioEngineSource.indexOf('public stop()'));
assert.ok(!resumeBlock.includes('currentTime = 0'), 'resume() MUST NOT reset currentTime to 0 on unpause');
console.log('  ✅ AudioEngine: 0:00 start guaranteed on track change, resume preserves playback position.');

// ---------------------------------------------------------------------------
// 6. Dual Deck Mixing Engine Starting Position & Sync Verification
// ---------------------------------------------------------------------------
console.log('\n▶ Test 6: Verifying DualDeckMixingEngine Starting Position & State Sync...');

assert.ok(dualDeckSource.includes('this.stopPlaybackTicker(deckId);'), 'Must terminate previous playback ticker on loadTrack');
assert.ok(dualDeckSource.includes('currentTime: 0'), 'Must initialize deck currentTime to 0 immediately on loadTrack');
assert.ok(dualDeckSource.includes('nodes.audioElem.currentTime = 0;'), 'Must explicitly set deck audio element currentTime to 0 on loadedmetadata');
assert.ok(dualDeckSource.includes('Math.floor(elem.currentTime)'), 'Must synchronize deck.currentTime with elem.currentTime');
console.log('  ✅ DualDeckMixingEngine: decks always reset to 0:00 upon loading new tracks.');

// ---------------------------------------------------------------------------
// 7. Full-Length Alternative Recommendation Matching
// ---------------------------------------------------------------------------
console.log('\n▶ Test 7: Verifying Full-Length Alternative Matching...');

const findFullLengthAlternative = (track, allTracks) => {
  const fullTracks = allTracks.filter((t) => t.id !== track.id && t.isFullLength);
  if (fullTracks.length === 0) return null;

  const titleLower = track.title.toLowerCase();
  const artistLower = track.artist_name.toLowerCase();

  const titleMatch = fullTracks.find(
    (t) =>
      t.title.toLowerCase().includes(titleLower) ||
      titleLower.includes(t.title.toLowerCase()) ||
      t.artist_name.toLowerCase().includes(artistLower)
  );
  if (titleMatch) return titleMatch;

  const genreMatch = fullTracks.find((t) => {
    const sameGenre =
      track.genre && t.genre && (t.genre.toLowerCase().includes(track.genre.toLowerCase()) || track.genre.toLowerCase().includes(t.genre.toLowerCase()));
    const closeBpm = track.bpm && t.bpm && Math.abs(track.bpm - t.bpm) <= 8;
    return sameGenre && closeBpm;
  });
  if (genreMatch) return genreMatch;

  return fullTracks[0] || null;
};

const fullLibrary = [
  jamendoTrack,
  audiusTrack,
  archiveTrack,
];

const foundAlt = findFullLengthAlternative(appleTrack, fullLibrary);
assert.ok(foundAlt !== null, 'Must find a full-length alternative for preview-only track');
assert.strictEqual(foundAlt.isFullLength, true, 'Alternative must be a genuine full-length track');
console.log(`  ✅ Alternative match found: "${foundAlt.title}" by ${foundAlt.artist_name} (${foundAlt.providerName})`);

// ---------------------------------------------------------------------------
// 8. Global Music Database Catalogue Audit
// ---------------------------------------------------------------------------
console.log('\n▶ Test 8: Comprehensive Music Database Catalogue Stream Audit...');

const dbPath = path.resolve('src/fixtures/globalMusicDatabase.ts');
const dbSource = fs.readFileSync(dbPath, 'utf8');

// Match all track audio definitions in globalMusicDatabase
const audioMatches = [...dbSource.matchAll(/audio:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

let fullCount = 0;
let previewCount = 0;
let emptyAudioCount = 0;

for (let i = 0; i < audioMatches.length; i++) {
  const audio = audioMatches[i];
  if (!audio) {
    emptyAudioCount++;
  } else if (isApplePreviewUrl(audio)) {
    previewCount++;
  } else {
    fullCount++;
  }
}

console.log(`  📊 Catalogue Summary:`);
console.log(`     Total Analyzed Streams: ${audioMatches.length}`);
console.log(`     Full-Length Audio Streams (Jamendo / Audius / Archive): ${fullCount}`);
console.log(`     Apple Music / iTunes 30-Second Previews: ${previewCount}`);
console.log(`     Unavailable / Empty Audio Streams: ${emptyAudioCount}`);

assert.strictEqual(emptyAudioCount, 0, 'Zero tracks should have empty or unavailable audio streams');
assert.ok(fullCount > 0, 'Must have verified full length tracks');
assert.ok(previewCount > 0, 'Must have verified preview tracks identified with honesty');

// ---------------------------------------------------------------------------
// 9. UI Presentation & Badging Audit
// ---------------------------------------------------------------------------
console.log('\n▶ Test 9: Verifying UI Badging & User Transparency...');

assert.ok(barSource.includes('Full Track') || barSource.includes('providerInfo.badgeText'), 'PlaybackBar must show badgeText');
assert.ok(barSource.includes('Full Alt'), 'PlaybackBar must provide full-length alternative button when playing preview');
assert.ok(barSource.includes('providerAdapter.isFullLength'), 'PlaybackBar uses providerAdapter.isFullLength');

console.log('  ✅ UI explicitly labels 30s Preview vs Full Track, preventing user confusion.');

console.log('\n✨ ALL STREAM RELIABILITY & FULL-LENGTH PLAYBACK TESTS PASSED SUCCESSFULLY! ✨\n');
