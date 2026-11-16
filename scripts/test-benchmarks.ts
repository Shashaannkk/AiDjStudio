import assert from 'node:assert/strict';
import { RecommendationEngine } from '../src/services/recommendationEngine';
import { MoodDetectionEngine } from '../src/services/moodDetectionEngine';
import { PROVIDER_MUSIC_CATALOG } from '../src/fixtures/musicFixtures';
import type { ChatMessage, Track } from '../src/types/music';
import type { RoomMood } from '../src/types/roomIntelligence';

console.log('\n=== RUNNING PHASE 11: PRD BENCHMARK VERIFICATION SUITE ===\n');

// -------------------------------------------------------------
// BENCHMARK 1: Recommendation Precision@5 >= 0.60 across diverse seeds
// -------------------------------------------------------------
console.log('--- BENCHMARK 1: Recommendation Precision@5 ---');

const engine = new RecommendationEngine();

// Select 10 diverse seed tracks across tempos and keys
const seedTracks: Track[] = PROVIDER_MUSIC_CATALOG.slice(0, 10);
assert(seedTracks.length >= 10, 'Catalogue must have at least 10 tracks for benchmark');

let totalPrecisionScore = 0;

seedTracks.forEach((seed, idx) => {
  const recommendations = engine.recommend({
    currentTrack: seed,
    limit: 5,
  });

  assert(recommendations.length > 0, `Seed ${seed.title} must produce recommendations`);

  // Count how many of the top 5 meet harmonic and tempo transition standards
  let validCount = 0;
  recommendations.forEach((rec) => {
    const candidate = rec.track;
    // Check BPM compatibility: within ±8% or half/double time
    const ratio = candidate.bpm / seed.bpm;
    const isStandard = Math.abs(ratio - 1.0) <= 0.08001;
    const isHalf = Math.abs(ratio - 0.5) <= 0.08001;
    const isDouble = Math.abs(ratio - 2.0) <= 0.08001;
    const isBpmValid = isStandard || isHalf || isDouble;

    // Check harmonic compatibility
    const hResult = engine.calculateHarmonicScore(seed.key, candidate.key);
    const isHarmonicValid = hResult.score >= 0.5; // Adjacent, relative, or energy boost key

    if (isBpmValid && isHarmonicValid) {
      validCount++;
    }
  });

  const pAt5 = validCount / recommendations.length;
  totalPrecisionScore += pAt5;
  console.log(`  [SEED ${idx + 1}] "${seed.title}" (${seed.bpm} BPM, ${seed.key}): Precision@${recommendations.length} = ${(pAt5 * 100).toFixed(1)}%`);
});

const meanPrecision = totalPrecisionScore / seedTracks.length;
console.log(`\n  >> Mean Precision@5 across ${seedTracks.length} seeds: ${(meanPrecision * 100).toFixed(1)}%`);
assert(meanPrecision >= 0.60, `Mean Precision@5 must be >= 60% (got ${(meanPrecision * 100).toFixed(1)}%)`);
console.log('  [PASS] Benchmark 1 Met: Precision@5 >= 0.60 (Target: 60%, Achieved: ' + (meanPrecision * 100).toFixed(1) + '%)\n');

// -------------------------------------------------------------
// BENCHMARK 2: Room Mood Sentiment Classification Accuracy >= 85%
// -------------------------------------------------------------
console.log('--- BENCHMARK 2: Room Mood Sentiment Classification Accuracy ---');

const moodEngine = new MoodDetectionEngine();

interface MoodTestCase {
  messages: string[];
  expectedMood: RoomMood;
}

const standardizedCorpus: MoodTestCase[] = [
  // Energetic
  {
    messages: ['This drop is insane! 🔥', 'Turn up the bass, pure speed! ⚡', 'Heavy banger right here'],
    expectedMood: 'energetic',
  },
  {
    messages: ['What a massive beat, pure power!', 'Lit drop 💥', 'Maximum hype!'],
    expectedMood: 'energetic',
  },
  {
    messages: ['Crush it with that tempo!', 'Fast and hard hitting 🔊', 'The energy is wild'],
    expectedMood: 'energetic',
  },

  // Relaxed
  {
    messages: ['Such a chill groove 🌊', 'So calm and serene', 'Gentle breeze vibes tonight 🍃'],
    expectedMood: 'relaxed',
  },
  {
    messages: ['Super cozy and laidback', 'Smooth floating pads 🕊️', 'Warm and peaceful'],
    expectedMood: 'relaxed',
  },
  {
    messages: ['Time to unwind and relax ☕', 'Soft easy rhythm', 'Total peace in the room'],
    expectedMood: 'relaxed',
  },

  // Happy
  {
    messages: ['Such good vibes! ❤️', 'Pure joy and sunshine ✨', 'Everyone is smiling 🥳'],
    expectedMood: 'happy',
  },
  {
    messages: ['I love this uplifting vocal melody', 'Feeling blessed and happy 💃', 'Bright sweet track!'],
    expectedMood: 'happy',
  },
  {
    messages: ['Pure fun and celebration 😍', 'So cheerful and good vibe', 'Spreading love and happiness ❤️'],
    expectedMood: 'happy',
  },

  // Melancholic
  {
    messages: ['Late night memories and dark atmosphere 🌙', 'Deep emotions, feeling sad 🌧️', 'Moody rain outside'],
    expectedMood: 'melancholic',
  },
  {
    messages: ['Heartbreak feels in this song 💔', 'Slow and lonely melody', 'Deep tears and longing'],
    expectedMood: 'melancholic',
  },
  {
    messages: ['Such a dark and emotional track 🌌', 'Lost in nostalgia', 'Deep mood tonight 🥀'],
    expectedMood: 'melancholic',
  },

  // Focused
  {
    messages: ['Coding flow state right now 💻', 'Perfect for deep study and homework 📚', 'Zero distraction instrumental'],
    expectedMood: 'focused',
  },
  {
    messages: ['Getting straight to work 🎯', 'Concentration mode unlocked 🧠', 'Clean flow rhythm for writing'],
    expectedMood: 'focused',
  },
  {
    messages: ['Study session on point 🎧', 'Productive afternoon coding', 'Clean zone focus'],
    expectedMood: 'focused',
  },

  // Party
  {
    messages: ['Put your hands up! 🎉', 'Rave all weekend 🪩', 'Club is jumping! 🍾'],
    expectedMood: 'party',
  },
  {
    messages: ['Dance floor is packed 🕺💃', 'Turn up the DJ set! 🚀', 'Party time let go!'],
    expectedMood: 'party',
  },
  {
    messages: ['Festival atmosphere right here 🍻', 'Let us celebrate and dance!', 'Club banger all night 🎉'],
    expectedMood: 'party',
  },

  // Additional mixed cases & Natural Language Conversational Benchmarks (AI-01 Verification)
  {
    messages: ['This tempo is so fast and energetic 🔥', 'Massive drop beast mode!'],
    expectedMood: 'energetic',
  },
  {
    messages: ['Chill calm serene waves 🌊', 'Floating away in peace'],
    expectedMood: 'relaxed',
  },
  {
    messages: ['This beat has such an intimate, late night vibe', 'Deep nostalgic mood outside'],
    expectedMood: 'melancholic',
  },
  {
    messages: ['Can we get something faster to dance to?', 'The dance floor is ready for the drop!'],
    expectedMood: 'party',
  },
  {
    messages: ['Trying to finish this coding assignment before midnight', 'Deep concentration mode'],
    expectedMood: 'focused',
  },
  {
    messages: ['Not feeling the party mood tonight, let us slow down and chill'],
    expectedMood: 'relaxed',
  },
];

let correctClassifications = 0;

standardizedCorpus.forEach((tc, idx) => {
  const chatMessages: ChatMessage[] = tc.messages.map((m, mIdx) => ({
    id: `bench_msg_${idx}_${mIdx}`,
    userId: `user_${mIdx}`,
    userName: `Dancer_${mIdx}`,
    message: m,
    timestamp: Date.now() + mIdx * 1000,
  }));

  const result = moodEngine.analyzeChat(chatMessages);
  const isMatch = result.mood === tc.expectedMood;
  if (isMatch) correctClassifications++;

  console.log(
    `  [CASE ${idx + 1}] Expected: ${tc.expectedMood.padEnd(11)} | Detected: ${result.mood.padEnd(11)} | Confidence: ${result.confidence}% | ${isMatch ? '✓ PASS' : '✗ FAIL'}`
  );
});

const accuracy = correctClassifications / standardizedCorpus.length;
console.log(`\n  >> Mood Classification Accuracy across ${standardizedCorpus.length} test cases: ${(accuracy * 100).toFixed(1)}%`);
assert(accuracy >= 0.85, `Classification accuracy must be >= 85% (got ${(accuracy * 100).toFixed(1)}%)`);
console.log('  [PASS] Benchmark 2 Met: Accuracy >= 85% (Target: 85%, Achieved: ' + (accuracy * 100).toFixed(1) + '%)\n');

console.log('>>> ALL BENCHMARKS VERIFIED AND PASSED SUCCESSFULLY! <<<\n');
