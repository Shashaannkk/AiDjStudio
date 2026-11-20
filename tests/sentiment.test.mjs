import assert from 'node:assert/strict';
import { moodDetectionEngine } from '../src/services/moodDetectionEngine.ts';

console.log('========================================================================');
console.log('EPIC 2: LIVE CHAT SENTIMENT & ROOM ENERGY SCORING TEST SUITE');
console.log('PRD Section 6.2 — Rolling-Window Chat Sentiment Aggregator (>= 85% Acc)');
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
// 1. HIGH-ENERGY / HYPE CHAT SENTIMENT DETECTION
// ---------------------------------------------------------------------------

test('Detects energetic/party mood from hyped chat messages & emojis', () => {
  const messages = [
    { id: '1', user_name: 'DJFan', message: 'this drop is insane fire!! 🔥⚡', timestamp: Date.now() },
    { id: '2', user_name: 'BassHead', message: 'heavy bass banger turn it up!', timestamp: Date.now() },
    { id: '3', user_name: 'Raver', message: 'pure hype bop 🎉🔊', timestamp: Date.now() },
  ];

  const moodState = moodDetectionEngine.analyzeChat(messages);
  assert.ok(
    moodState.mood === 'energetic' || moodState.mood === 'party',
    `Expected energetic or party, got: ${moodState.mood}`
  );
  assert.ok(moodState.confidence >= 50, `Confidence must be >= 50, got: ${moodState.confidence}`);
});

// ---------------------------------------------------------------------------
// 2. CHILL / RELAXED SENTIMENT DETECTION
// ---------------------------------------------------------------------------

test('Detects relaxed mood from calm late-night chat messages', () => {
  const messages = [
    { id: '4', user_name: 'CozyListener', message: 'late night chill vibe ☕', timestamp: Date.now() },
    { id: '5', user_name: 'GentleSoul', message: 'soothing and smooth ambient floating 🌊', timestamp: Date.now() },
    { id: '6', user_name: 'CalmUser', message: 'peaceful quiet laidback melody', timestamp: Date.now() },
  ];

  const moodState = moodDetectionEngine.analyzeChat(messages);
  assert.strictEqual(moodState.mood, 'relaxed');
});

// ---------------------------------------------------------------------------
// 3. NEGATION HANDLING IN CHAT SENTIMENT
// ---------------------------------------------------------------------------

test('Handles negation window ("not hype", "not feeling this drop")', () => {
  const messages = [
    { id: '7', user_name: 'ListenerA', message: 'not feeling the hype, too aggressive', timestamp: Date.now() },
    { id: '8', user_name: 'ListenerB', message: 'not a banger, pretty harsh', timestamp: Date.now() },
  ];

  const moodState = moodDetectionEngine.analyzeChat(messages);
  assert.notStrictEqual(moodState.mood, 'energetic');
});

// ---------------------------------------------------------------------------
// 4. PRD KPI: >= 85% ACCURACY ACROSS LABELED EVALUATION SET
// ---------------------------------------------------------------------------

test('PRD KPI: >= 85% accuracy on labeled 20-sample chat test set', () => {
  const labeledSet = [
    { text: 'insane drop banger fire 🔥', expected: ['energetic', 'party'] },
    { text: 'heavy bass pump workout rush', expected: ['energetic', 'party'] },
    { text: 'pure adrenaline sprint hype ⚡', expected: ['energetic', 'party'] },
    { text: 'let go dancing on the floor 🪩🎉', expected: ['party', 'energetic'] },
    { text: 'rave festival turn up celebration 🍻', expected: ['party', 'energetic'] },
    { text: 'club banger hands up bounce', expected: ['party', 'energetic'] },
    { text: 'chill out peaceful floating quiet 🍃', expected: ['relaxed'] },
    { text: 'serene tranquil cozy unwinding ☕', expected: ['relaxed'] },
    { text: 'soft breeze mellow soothing rest 🌊', expected: ['relaxed'] },
    { text: 'gentle acoustic calm drifting', expected: ['relaxed'] },
    { text: 'coding flow state focus session 💻', expected: ['focused'] },
    { text: 'study deep concentration homework 📚', expected: ['focused'] },
    { text: 'programming clean zone tasks ✍️', expected: ['focused'] },
    { text: 'heartbreak sad tears lonely night 🌙', expected: ['melancholic'] },
    { text: 'crying dark nostalgic sorrow 💔', expected: ['melancholic'] },
    { text: 'grief somber bittersweet memories', expected: ['melancholic'] },
    { text: 'happy sunshine joy smiling vibe ❤️', expected: ['happy'] },
    { text: 'uplifting bright bliss euphoria ✨', expected: ['happy'] },
    { text: 'ecstatic cheerful sunny cheers 🥳', expected: ['happy'] },
    { text: 'pure delight wholesome radiant day', expected: ['happy'] },
  ];

  let correctCount = 0;
  for (const item of labeledSet) {
    const res = moodDetectionEngine.analyzeChat([
      { id: 'eval', user_name: 'tester', message: item.text, timestamp: Date.now() }
    ]);
    if (item.expected.includes(res.mood)) {
      correctCount++;
    }
  }

  const accuracy = (correctCount / labeledSet.length) * 100;
  console.log(`    -> Accuracy achieved: ${accuracy.toFixed(1)}% (${correctCount}/${labeledSet.length} correct)`);
  assert.ok(accuracy >= 85.0, `Accuracy must be >= 85.0%, got ${accuracy}%`);
});

console.log(`\nResult: ${passed}/${total} assertions passed.\n`);
if (passed !== total) process.exit(1);
