import type { ChatMessage, Track } from '../types/music';
import type { RoomMood, RoomMoodDetails, RoomMoodState } from '../types/roomIntelligence';
import type { MoodId } from '../types/recommendation';

export const ROOM_MOOD_CONFIG: Record<RoomMood, RoomMoodDetails> = {
  energetic: {
    id: 'energetic',
    label: 'Energetic & Hyped',
    emoji: '⚡',
    tagline: 'High tempo, hard-hitting drops, and relentless basslines',
    associatedKeywords: [
      'hype', 'fire', 'drop', 'bass', 'insane', 'speed', 'hard',
      'banger', 'power', 'beast', 'fast', 'heavy', 'crush', 'lit',
      'pump', 'pumping', 'intense', 'workout', 'running', 'rush', 'sprint',
    ],
    associatedEmojis: ['🔥', '⚡', '💥', '🏃', '🏋️', '🥊', '🔊'],
    targetBpmMin: 128,
    targetBpmMax: 160,
    targetEnergyMin: 85,
    targetEnergyMax: 100,
  },
  relaxed: {
    id: 'relaxed',
    label: 'Relaxed & Serene',
    emoji: '🌊',
    tagline: 'Calm ambient pads, soothing melodies, and gentle rhythm',
    associatedKeywords: [
      'chill', 'relax', 'smooth', 'calm', 'gentle', 'peace', 'soft',
      'serene', 'cozy', 'laidback', 'floating', 'easy', 'warm', 'breeze',
      'mellow', 'soothing', 'quiet', 'ambient', 'tranquil', 'unwind',
    ],
    associatedEmojis: ['🌊', '🧘', '🏖️', '🍃', '☕', '🕊️', '☁️'],
    targetBpmMin: 75,
    targetBpmMax: 105,
    targetEnergyMin: 35,
    targetEnergyMax: 65,
  },
  happy: {
    id: 'happy',
    label: 'Happy & Euphoric',
    emoji: '❤️',
    tagline: 'Uplifting major chords, feel-good vocal hooks, and joy',
    associatedKeywords: [
      'happy', 'joy', 'love', 'smile', 'fun', 'good vibe', 'uplifting',
      'bright', 'cheers', 'sweet', 'blessed', 'glow', 'sunshine', 'alive',
      'euphoric', 'ecstatic', 'cheerful', 'feel good', 'bliss', 'sunny',
    ],
    associatedEmojis: ['❤️', '💃', '🥳', '🕺', '😍', '😊', '✨', '💖'],
    targetBpmMin: 115,
    targetBpmMax: 132,
    targetEnergyMin: 75,
    targetEnergyMax: 95,
  },
  melancholic: {
    id: 'melancholic',
    label: 'Melancholic & Deep',
    emoji: '🌙',
    tagline: 'Atmospheric minor keys, emotive vocals, and late-night contemplation',
    associatedKeywords: [
      'sad', 'tears', 'cry', 'miss', 'dark', 'deep', 'lonely',
      'heartbreak', 'slow', 'moody', 'night', 'memories', 'rain', 'lost',
      'late night', 'intimate', 'nostalgia', 'nostalgic', 'grief', 'somber', 'wistful',
    ],
    associatedEmojis: ['🌙', '😢', '🌧️', '💔', '🥀', '🖤', '🌌'],
    targetBpmMin: 90,
    targetBpmMax: 118,
    targetEnergyMin: 45,
    targetEnergyMax: 70,
  },
  focused: {
    id: 'focused',
    label: 'Deep Focus & Flow',
    emoji: '🎧',
    tagline: 'Clean instrumental rhythms, subtle beats, and zero distraction',
    associatedKeywords: [
      'study', 'focus', 'work', 'coding', 'flow', 'reading', 'homework',
      'instrumental', 'think', 'clean', 'zone', 'concentration', 'productive',
      'code', 'programming', 'flow state', 'assignment', 'learning', 'tasks',
    ],
    associatedEmojis: ['💻', '🎧', '📚', '📖', '🧠', '🎯', '✍️'],
    targetBpmMin: 80,
    targetBpmMax: 112,
    targetEnergyMin: 40,
    targetEnergyMax: 65,
  },
  party: {
    id: 'party',
    label: 'Party & Club',
    emoji: '🎉',
    tagline: 'Peak dancefloor energy, infectious grooves, and singalongs',
    associatedKeywords: [
      'party', 'dance', 'club', 'weekend', 'drink', 'crowd', 'rave',
      'festival', 'turn up', 'dj', 'hands up', 'let go', 'jumping', 'celebrate',
      'dancefloor', 'dancing', 'bounce', 'groove', 'packed', 'drinks',
    ],
    associatedEmojis: ['🎉', '🚀', '🍻', '🥂', '🍾', '🪩', '🕺', '💃'],
    targetBpmMin: 122,
    targetBpmMax: 135,
    targetEnergyMin: 90,
    targetEnergyMax: 100,
  },
};

// Conversational and semantic stems mapped to each mood
const MOOD_STEMS: Record<RoomMood, string[]> = {
  energetic: [
    'hype', 'fire', 'drop', 'bass', 'insan', 'speed', 'hard',
    'banger', 'power', 'beast', 'fast', 'heavi', 'crush', 'lit',
    'pump', 'intens', 'pound', 'driv', 'explos', 'aggress', 'rush',
    'sprint', 'workout', 'run', 'adrenalin', 'wild', 'peak', 'blast',
  ],
  relaxed: [
    'chill', 'relax', 'smooth', 'calm', 'gentl', 'peac', 'soft',
    'seren', 'cozi', 'laidback', 'float', 'easi', 'warm', 'breez',
    'mellow', 'sooth', 'quiet', 'ambient', 'drift', 'unwind', 'tranquil',
  ],
  happy: [
    'happi', 'joy', 'love', 'smile', 'fun', 'uplift', 'bright',
    'cheer', 'sweet', 'bless', 'glow', 'sunshin', 'aliv', 'euphor',
    'ecstat', 'vibrant', 'bliss', 'delight', 'wholesom', 'sunni',
  ],
  melancholic: [
    'sad', 'tear', 'cri', 'miss', 'dark', 'deep', 'lone',
    'heartbreak', 'slow', 'moodi', 'night', 'memori', 'rain', 'lost',
    'intimat', 'sorrow', 'mourn', 'grief', 'nostalg', 'wistful', 'yearn',
    'somber', 'bittersweet', 'pain', 'hurt',
  ],
  focused: [
    'studi', 'focus', 'work', 'code', 'flow', 'read', 'homework',
    'instrument', 'think', 'clean', 'zone', 'concentr', 'product',
    'learn', 'brain', 'task', 'write', 'program', 'minim', 'assign',
  ],
  party: [
    'parti', 'danc', 'club', 'weekend', 'drink', 'crowd', 'rave',
    'festiv', 'jump', 'celebr', 'bop', 'dancefloor', 'groov', 'bounce',
    'pack', 'bottl', 'floor',
  ],
};

// Conversational multi-word phrases
const KEY_PHRASES: Record<RoomMood, string[]> = {
  energetic: ['beast mode', 'high tempo', 'turn it up', 'pure power', 'insane drop'],
  relaxed: ['late night chill', 'soothing melody', 'gentle breeze', 'easy rhythm', 'tranquil and calm', 'peace in the room'],
  happy: ['good vibes', 'feel good', 'sunshine and smiles', 'uplifting vocal', 'spreading love'],
  melancholic: ['late night vibe', 'intimate vibe', 'heartbreak feels', 'lost in nostalgia', 'dark atmosphere'],
  focused: ['flow state', 'deep study', 'study session', 'coding flow', 'getting straight to work', 'concentration mode'],
  party: ['hands up', 'let go', 'turn up', 'dance floor', 'dance to', 'club banger', 'put your hands'],
};

const NEGATION_WORDS = new Set([
  'not', 'dont', "don't", 'no', 'never', 'isnt', "isn't", 'stop', 'arent', "aren't",
  'hardly', 'barely', 'without', 'less', 'ain’t', "ain't",
]);

/**
 * Lightweight English stemmer for conversational classification
 */
function stemWord(word: string): string {
  let w = word.toLowerCase();
  if (w.endsWith('ing') && w.length > 5) {
    w = w.slice(0, -3);
    if (w.endsWith('pp') || w.endsWith('nn') || w.endsWith('tt')) w = w.slice(0, -1);
  } else if (w.endsWith('ed') && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith('ies') && w.length > 5) {
    w = w.slice(0, -3) + 'i';
  } else if (w.endsWith('es') && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    w = w.slice(0, -1);
  } else if (w.endsWith('ly') && w.length > 4) {
    w = w.slice(0, -2);
  }
  return w;
}

export interface MoodQueueContext {
  tracks?: Track[];
  avgBpm?: number;
  avgEnergy?: number;
}

export class MoodDetectionEngine {
  /**
   * Transient sentiment & emoji analysis on recent room messages with semantic stemming,
   * negation handling, and optional queue acoustic context (AI-01 Remediation).
   */
  public analyzeChat(messages: ChatMessage[], queueContext?: MoodQueueContext): RoomMoodState {
    const defaultState: RoomMoodState = {
      mood: 'party',
      confidence: 75,
      isManualOverride: false,
      detectedFrom: {
        topEmojis: ['🎉', '🔥'],
        matchedKeywords: ['dance', 'party'],
        sampleSize: 0,
      },
      updatedAt: Date.now(),
    };

    const scores: Record<RoomMood, number> = {
      energetic: 0,
      relaxed: 0,
      happy: 0,
      melancholic: 0,
      focused: 0,
      party: 0,
    };

    const emojiCounts: Record<string, number> = {};
    const matchedKeywordSet = new Set<string>();

    const recent = (messages || []).filter((m) => !m.isSystem).slice(-25);

    if (recent.length > 0) {
      recent.forEach((msg, idx) => {
        const rawText = msg.message;
        const lowerText = rawText.toLowerCase();
        // Recency weight: newer messages are weighted higher (up to 2x)
        const recencyWeight = 1.0 + (idx / recent.length);

        // 1. Emoji Analysis
        for (const [moodKey, config] of Object.entries(ROOM_MOOD_CONFIG) as [RoomMood, RoomMoodDetails][]) {
          for (const emoji of config.associatedEmojis) {
            if (rawText.includes(emoji)) {
              scores[moodKey] += 3.5 * recencyWeight;
              emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
            }
          }
        }

        // 2. Multi-word Phrase Matching
        for (const [moodKey, phrases] of Object.entries(KEY_PHRASES) as [RoomMood, string[]][]) {
          for (const phrase of phrases) {
            if (lowerText.includes(phrase)) {
              scores[moodKey] += 4.0 * recencyWeight;
              matchedKeywordSet.add(phrase);
            }
          }
        }

        // 3. Tokenize Words & Stems with Negation Window
        const tokens = lowerText.replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
        let negationStepsRemaining = 0;

        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];

          if (NEGATION_WORDS.has(token)) {
            negationStepsRemaining = 3; // Negate the next 3 tokens
            continue;
          }

          const isNegated = negationStepsRemaining > 0;
          if (isNegated) negationStepsRemaining--;

          const stem = stemWord(token);

          for (const [moodKey, stems] of Object.entries(MOOD_STEMS) as [RoomMood, string[]][]) {
            if (stems.includes(stem) || stems.some((s) => token.startsWith(s))) {
              if (isNegated) {
                // Invert weight: penalty on negated mood, slight boost to opposite
                scores[moodKey] -= 3.0 * recencyWeight;
                const opposite = moodKey === 'energetic' || moodKey === 'party' ? 'relaxed' : 'energetic';
                scores[opposite] += 1.5 * recencyWeight;
              } else {
                scores[moodKey] += 2.2 * recencyWeight;
                matchedKeywordSet.add(token);
              }
            }
          }
        }
      });
    }

    // 4. Acoustic Context Prior (if queue tracks or audio averages are provided)
    if (queueContext) {
      let bpm = queueContext.avgBpm;
      let energy = queueContext.avgEnergy;

      if ((!bpm || !energy) && queueContext.tracks && queueContext.tracks.length > 0) {
        const validTracks = queueContext.tracks.filter((t) => t.bpm && t.energy !== undefined);
        if (validTracks.length > 0) {
          bpm = validTracks.reduce((acc, t) => acc + (t.bpm || 120), 0) / validTracks.length;
          energy = validTracks.reduce((acc, t) => acc + (t.energy || 75), 0) / validTracks.length;
        }
      }

      if (bpm && energy) {
        const acousticWeight = recent.length === 0 ? 5.0 : 1.5;
        if (bpm >= 126 && energy >= 80) {
          scores.energetic += 2.0 * acousticWeight;
          scores.party += 2.0 * acousticWeight;
        } else if (bpm <= 105 && energy <= 65) {
          scores.relaxed += 2.0 * acousticWeight;
          scores.focused += 1.5 * acousticWeight;
        } else if (energy >= 75) {
          scores.happy += 2.0 * acousticWeight;
        }
      }
    }

    // 5. Select Best Scoring Mood
    let bestMood: RoomMood = 'party';
    let maxScore = -999;
    let totalPositiveScore = 0;

    for (const [m, sc] of Object.entries(scores) as [RoomMood, number][]) {
      if (sc > 0) totalPositiveScore += sc;
      if (sc > maxScore) {
        maxScore = sc;
        bestMood = m;
      }
    }

    // Fallback if no positive signals emerged
    if (maxScore <= 0) {
      return {
        ...defaultState,
        detectedFrom: {
          topEmojis: [],
          matchedKeywords: [],
          sampleSize: recent.length,
        },
      };
    }

    // Calculate confidence percentage (55% to 98%)
    const rawRatio = maxScore / (totalPositiveScore + 0.001);
    const sampleBonus = Math.min(25, recent.length * 2.5);
    const confidence = Math.min(98, Math.max(55, Math.round(rawRatio * 75 + sampleBonus)));

    const topEmojis = Object.entries(emojiCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([em]) => em);

    return {
      mood: bestMood,
      confidence,
      isManualOverride: false,
      detectedFrom: {
        topEmojis: topEmojis.length > 0 ? topEmojis : [ROOM_MOOD_CONFIG[bestMood].emoji],
        matchedKeywords: Array.from(matchedKeywordSet).slice(0, 4),
        sampleSize: recent.length,
      },
      updatedAt: Date.now(),
    };
  }

  /**
   * Map Room Mood to the AI DJ recommendation engine's MoodId
   */
  public mapRoomMoodToRecommendationMood(roomMood: RoomMood): MoodId {
    switch (roomMood) {
      case 'energetic':
        return 'workout';
      case 'relaxed':
        return 'chill';
      case 'happy':
        return 'euphoric';
      case 'melancholic':
        return 'late-night';
      case 'focused':
        return 'focus';
      case 'party':
      default:
        return 'party';
    }
  }
}

export const moodDetectionEngine = new MoodDetectionEngine();
