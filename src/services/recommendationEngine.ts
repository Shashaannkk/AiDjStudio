import type { Track } from '../types/music';
import type {
  CamelotKey,
  CamelotMode,
  MoodId,
  MoodProfile,
  RecommendationCandidate,
  RecommendationExplanation,
  RecommendationRequest,
  RecommendationScoreBreakdown,
} from '../types/recommendation';
import {
  REAL_SPOTIFY_APPLE_CATALOG,
  TRENDING_INDIA_TRACKS,
  AUDIUS_FEATURED_TRACKS,
  JAMENDO_INTEGRATED_TRACKS,
  INTERNET_ARCHIVE_TRACKS,
  FIXTURE_TRACKS,
  FIXTURE_ARTISTS,
} from '../fixtures/musicFixtures';

/**
 * Standard Musical Key to Camelot Wheel Mapping
 * 12 Minor (A) keys and 12 Major (B) keys.
 */
const KEY_TO_CAMELOT_MAP: Record<string, { number: number; mode: CamelotMode; standard: string }> = {
  // Minor Keys (A)
  'AB MIN': { number: 1, mode: 'A', standard: 'Ab Minor' },
  'G# MIN': { number: 1, mode: 'A', standard: 'G# Minor' },
  'EB MIN': { number: 2, mode: 'A', standard: 'Eb Minor' },
  'D# MIN': { number: 2, mode: 'A', standard: 'D# Minor' },
  'BB MIN': { number: 3, mode: 'A', standard: 'Bb Minor' },
  'A# MIN': { number: 3, mode: 'A', standard: 'A# Minor' },
  'F MIN': { number: 4, mode: 'A', standard: 'F Minor' },
  'C MIN': { number: 5, mode: 'A', standard: 'C Minor' },
  'G MIN': { number: 6, mode: 'A', standard: 'G Minor' },
  'D MIN': { number: 7, mode: 'A', standard: 'D Minor' },
  'A MIN': { number: 8, mode: 'A', standard: 'A Minor' },
  'E MIN': { number: 9, mode: 'A', standard: 'E Minor' },
  'B MIN': { number: 10, mode: 'A', standard: 'B Minor' },
  'F# MIN': { number: 11, mode: 'A', standard: 'F# Minor' },
  'GB MIN': { number: 11, mode: 'A', standard: 'Gb Minor' },
  'C# MIN': { number: 12, mode: 'A', standard: 'C# Minor' },
  'DB MIN': { number: 12, mode: 'A', standard: 'Db Minor' },

  // Major Keys (B)
  'B MAJ': { number: 1, mode: 'B', standard: 'B Major' },
  'F# MAJ': { number: 2, mode: 'B', standard: 'F# Major' },
  'GB MAJ': { number: 2, mode: 'B', standard: 'Gb Major' },
  'DB MAJ': { number: 3, mode: 'B', standard: 'Db Major' },
  'C# MAJ': { number: 3, mode: 'B', standard: 'C# Major' },
  'AB MAJ': { number: 4, mode: 'B', standard: 'Ab Major' },
  'G# MAJ': { number: 4, mode: 'B', standard: 'G# Major' },
  'EB MAJ': { number: 5, mode: 'B', standard: 'Eb Major' },
  'D# MAJ': { number: 5, mode: 'B', standard: 'D# Major' },
  'BB MAJ': { number: 6, mode: 'B', standard: 'Bb Major' },
  'A# MAJ': { number: 6, mode: 'B', standard: 'A# Major' },
  'F MAJ': { number: 7, mode: 'B', standard: 'F Major' },
  'C MAJ': { number: 8, mode: 'B', standard: 'C Major' },
  'G MAJ': { number: 9, mode: 'B', standard: 'G Major' },
  'D MAJ': { number: 10, mode: 'B', standard: 'D Major' },
  'A MAJ': { number: 11, mode: 'B', standard: 'A Major' },
  'E MAJ': { number: 12, mode: 'B', standard: 'E Major' },
};

/**
 * Curated Mood Profiles for Adaptive AI DJ Filtering
 */
export const MOOD_PROFILES: Record<MoodId, MoodProfile> = {
  all: {
    id: 'all',
    label: 'All Vibes',
    emoji: '🎛️',
    tagline: 'Balanced auto-mix across full catalogue',
    targetBpm: 124,
    minBpm: 75,
    maxBpm: 185,
    targetEnergy: 80,
    minEnergy: 40,
    maxEnergy: 100,
    preferredGenres: [],
  },
  party: {
    id: 'party',
    label: 'Party & Peak',
    emoji: '🔥',
    tagline: 'High-octane club dancefloor energy & viral anthems',
    targetBpm: 128,
    minBpm: 115,
    maxBpm: 145,
    targetEnergy: 92,
    minEnergy: 80,
    maxEnergy: 100,
    preferredGenres: ['Dance', 'EDM', 'Pop', 'Desi Hip Hop', 'Trap', 'Club', 'House'],
  },
  chill: {
    id: 'chill',
    label: 'Chillout & Ambient',
    emoji: '🌊',
    tagline: 'Deep ambient pads, serene beats, and soothing relaxation',
    targetBpm: 95,
    minBpm: 75,
    maxBpm: 110,
    targetEnergy: 52,
    minEnergy: 35,
    maxEnergy: 65,
    preferredGenres: ['Chillout', 'Ambient', 'Lo-Fi', 'Downtempo', 'Acoustic'],
  },
  'late-night': {
    id: 'late-night',
    label: 'Late Night Lounge',
    emoji: '🌙',
    tagline: 'Hypnotic synthwaves, atmospheric R&B, and neon grooves',
    targetBpm: 112,
    minBpm: 90,
    maxBpm: 126,
    targetEnergy: 74,
    minEnergy: 55,
    maxEnergy: 85,
    preferredGenres: ['Synthwave', 'R&B', 'Electropop', 'Neon', 'Electronic'],
  },
  workout: {
    id: 'workout',
    label: 'Workout & Beast Mode',
    emoji: '⚡',
    tagline: 'Driving basslines, relentless percussion, and maximum power',
    targetBpm: 132,
    minBpm: 124,
    maxBpm: 175,
    targetEnergy: 95,
    minEnergy: 85,
    maxEnergy: 100,
    preferredGenres: ['Trap', 'Bass', 'Hip Hop', 'EDM', 'Dance', 'Punjabi'],
  },
  focus: {
    id: 'focus',
    label: 'Deep Focus & Study',
    emoji: '🎧',
    tagline: 'Non-intrusive instrumental rhythms for flow state',
    targetBpm: 90,
    minBpm: 80,
    maxBpm: 115,
    targetEnergy: 55,
    minEnergy: 40,
    maxEnergy: 70,
    preferredGenres: ['Lo-Fi', 'Instrumental', 'Ambient', 'Synthwave', 'Electronic'],
  },
  euphoric: {
    id: 'euphoric',
    label: 'Euphoric & Festival',
    emoji: '✨',
    tagline: 'Uplifting chord progressions, massive drops, and festival hooks',
    targetBpm: 128,
    minBpm: 120,
    maxBpm: 135,
    targetEnergy: 94,
    minEnergy: 82,
    maxEnergy: 100,
    preferredGenres: ['EDM', 'Dance', 'Electropop', 'Bollywood Dance', 'Synthwave'],
  },
};

/**
 * Genre Cluster Definitions for Cross-Genre Affinity
 */
const GENRE_CLUSTERS: Record<string, string[]> = {
  electronic: ['synthwave', 'electronic', 'edm', 'electropop', 'dance', 'house', 'techno', 'cyberpunk'],
  hiphop: ['desi hip hop', 'hip hop', 'trap', 'rap', 'punjabi hip hop', 'urban', 'bass'],
  pop: ['pop', 'synthpop', 'dance pop', 'punjabi pop', 'global pop', 'electropop'],
  chill: ['chillout', 'ambient', 'lo-fi', 'downtempo', 'acoustic', 'serenity', 'instrumental'],
  desi: ['bollywood', 'punjabi', 'desi', 'south indian', 'sufi', 'romantic fusion'],
};

/**
 * Production-Grade Deterministic AI DJ Recommendation Engine
 */
export class RecommendationEngine {
  private masterCatalogue: Track[] = [];

  constructor() {
    this.refreshMasterCatalogue();
  }

  /**
   * Refresh and deduplicate all authentic playable catalogue tracks
   */
  public refreshMasterCatalogue(): Track[] {
    const combined = [
      ...REAL_SPOTIFY_APPLE_CATALOG,
      ...TRENDING_INDIA_TRACKS,
      ...AUDIUS_FEATURED_TRACKS,
      ...JAMENDO_INTEGRATED_TRACKS,
      ...INTERNET_ARCHIVE_TRACKS,
      ...FIXTURE_TRACKS,
      ...FIXTURE_ARTISTS.flatMap((a) => a.popularTracks),
    ];

    const seenIds = new Set<string>();
    const valid: Track[] = [];

    for (const t of combined) {
      if (!t || !t.id || seenIds.has(t.id)) continue;
      // Guarantee valid playable audio
      if (!t.audio || t.audio.trim().length < 5 || (t.duration && t.duration <= 0)) continue;
      seenIds.add(t.id);
      valid.push(t);
    }

    this.masterCatalogue = valid;
    return this.masterCatalogue;
  }

  /**
   * Parse any key string (Camelot or Standard notation) into a structured CamelotKey
   * Examples:
   *   "8A / A Min" -> { number: 8, mode: 'A', code: '8A', standardKey: 'A Minor' }
   *   "F# Min" -> { number: 11, mode: 'A', code: '11A', standardKey: 'F# Minor' }
   *   "C Maj" -> { number: 8, mode: 'B', code: '8B', standardKey: 'C Major' }
   */
  public parseKeyToCamelot(keyStr?: string): CamelotKey | null {
    if (!keyStr || typeof keyStr !== 'string') return null;
    const clean = keyStr.trim().toUpperCase();

    // 1. Direct Camelot regex: "8A", "11B", "8A / A MIN"
    const camelotRegex = /\b([1-9]|1[0-2])([AB])\b/i;
    const match = clean.match(camelotRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      const mode = match[2].toUpperCase() as CamelotMode;
      return {
        number: num,
        mode,
        code: `${num}${mode}`,
        standardKey: this.getCamelotStandardKey(num, mode),
      };
    }

    // 2. Standard Musical Key Mapping (e.g., "F# MIN", "A MAJ", "C MINOR")
    const simplified = clean
      .replace(/MINOR/g, 'MIN')
      .replace(/MAJOR/g, 'MAJ')
      .replace(/\s+/g, ' ');

    for (const [k, v] of Object.entries(KEY_TO_CAMELOT_MAP)) {
      if (simplified.includes(k)) {
        return {
          number: v.number,
          mode: v.mode,
          code: `${v.number}${v.mode}`,
          standardKey: v.standard,
        };
      }
    }

    return null;
  }

  /**
   * Lookup standard key name from Camelot number and mode
   */
  public getCamelotStandardKey(num: number, mode: CamelotMode): string {
    const minorNames = [
      'Ab Minor', 'Eb Minor', 'Bb Minor', 'F Minor', 'C Minor', 'G Minor',
      'D Minor', 'A Minor', 'E Minor', 'B Minor', 'F# Minor', 'C# Minor',
    ];
    const majorNames = [
      'B Major', 'F# Major', 'Db Major', 'Ab Major', 'Eb Major', 'Bb Major',
      'F Major', 'C Major', 'G Major', 'D Major', 'A Major', 'E Major',
    ];
    const idx = (num - 1 + 12) % 12;
    return mode === 'A' ? minorNames[idx] : majorNames[idx];
  }

  /**
   * Calculate Harmonic Compatibility Score (0 - 100) using the Camelot Wheel
   */
  public calculateHarmonicScore(
    key1Str?: string,
    key2Str?: string
  ): { score: number; relationship: string; description: string } {
    const k1 = this.parseKeyToCamelot(key1Str);
    const k2 = this.parseKeyToCamelot(key2Str);

    if (!k1 || !k2) {
      return {
        score: 65,
        relationship: 'Standard Key Transition',
        description: 'Key unverified in metadata; blend over percussion intro/outro.',
      };
    }

    // Wheel circular distance (0 - 6)
    const rawDiff = Math.abs(k1.number - k2.number);
    const circularDiff = Math.min(rawDiff, 12 - rawDiff);

    // Same Mode (A <-> A or B <-> B)
    if (k1.mode === k2.mode) {
      if (circularDiff === 0) {
        return {
          score: 100,
          relationship: `Exact Key Match (${k1.code})`,
          description: `Exact harmonic lock in ${k1.code} (${k1.standardKey}). Seamless blend with 0% harmonic friction.`,
        };
      }

      // +1 step forward (Energy Boost)
      const forwardStep = (k1.number % 12) + 1;
      if (k2.number === forwardStep) {
        return {
          score: 93,
          relationship: `Energy Boost (+1 Step: ${k1.code} → ${k2.code})`,
          description: `Camelot +1 step. Uplifting harmonic transition that naturally raises dancefloor energy.`,
        };
      }

      // -1 step backward (Chill Down)
      const backwardStep = ((k1.number - 2 + 12) % 12) + 1;
      if (k2.number === backwardStep) {
        return {
          score: 90,
          relationship: `Deepening Blend (-1 Step: ${k1.code} → ${k2.code})`,
          description: `Camelot -1 step. Warm, relaxing harmonic shift that deepens musical resonance.`,
        };
      }

      // +2 Whole Tone Jump
      if (circularDiff === 2) {
        return {
          score: 78,
          relationship: `Whole Tone Lift (+2 Steps: ${k1.code} → ${k2.code})`,
          description: `High-impact whole tone modulation. Dramatic festival-style energy explosion.`,
        };
      }

      // +7 Semitone Modulation
      if (circularDiff === 5 || circularDiff === 7) {
        return {
          score: 72,
          relationship: `Semitone Modulation (${k1.code} → ${k2.code})`,
          description: `Striking harmonic shift. Best mixed during breakdown before the beat drop.`,
        };
      }

      // Distant Keys
      const distantScore = Math.max(20, Math.round(50 - (circularDiff - 2) * 8));
      return {
        score: distantScore,
        relationship: `Distant Key (${k1.code} vs ${k2.code})`,
        description: `Contrasting keys (${circularDiff} steps apart). Execute quick cut or high-pass filter transition.`,
      };
    }

    // Opposite Mode (A <-> B: Minor to Major or vice versa)
    if (circularDiff === 0) {
      return {
        score: 96,
        relationship: `Relative Major/Minor (${k1.code} ↔ ${k2.code})`,
        description: `Relative Major/Minor pair (${k1.standardKey} ↔ ${k2.standardKey}). Identical chord notes; shifts emotional vibe instantly.`,
      };
    }

    if (circularDiff === 1) {
      return {
        score: 82,
        relationship: `Diagonal Harmonic Mix (${k1.code} → ${k2.code})`,
        description: `Diagonal Camelot transition. Sophisticated modal inflection popular in progressive DJ sets.`,
      };
    }

    const distantOppositeScore = Math.max(15, Math.round(45 - (circularDiff - 1) * 8));
    return {
      score: distantOppositeScore,
      relationship: `Cross-Mode Shift (${k1.code} → ${k2.code})`,
      description: `Cross-mode modulation. Recommended 4-bar drop swap on the downbeat.`,
    };
  }

  /**
   * Calculate BPM Alignment Score (0 - 100) with Half-Time / Double-Time Awareness
   */
  public calculateBpmScore(
    bpm1?: number,
    bpm2?: number
  ): { score: number; effectiveDiff: number; tempoType: string; description: string } {
    const b1 = bpm1 && bpm1 > 40 && bpm1 < 250 ? bpm1 : 124;
    const b2 = bpm2 && bpm2 > 40 && bpm2 < 250 ? bpm2 : 124;

    const diffDirect = Math.abs(b1 - b2);
    const diffDouble = Math.abs(b1 - b2 / 2); // e.g. 140 -> 70
    const diffHalf = Math.abs(b1 - b2 * 2); // e.g. 70 -> 140

    let effectiveDiff = diffDirect;
    let tempoType = 'Direct Match';

    if (diffDouble < effectiveDiff && diffDouble <= 6) {
      effectiveDiff = diffDouble;
      tempoType = 'Half-Time Blend';
    } else if (diffHalf < effectiveDiff && diffHalf <= 6) {
      effectiveDiff = diffHalf;
      tempoType = 'Double-Time Blend';
    }

    let score = 100;
    let description = '';

    if (effectiveDiff <= 1.0) {
      score = 100;
      description = `Near-perfect tempo lock (${b1} → ${b2} BPM, Δ${effectiveDiff.toFixed(1)}). Zero pitch-fader shift needed.`;
    } else if (effectiveDiff <= 3.5) {
      score = 96;
      description = `Tight tempo synchronization (${b1} → ${b2} BPM). Effortless 4-bar beat-matched crossfade.`;
    } else if (effectiveDiff <= 6.0) {
      score = 88;
      description = `Within ±4% turntable pitch-fader range (${b1} → ${b2} BPM). Standard pitch bend blend.`;
    } else if (effectiveDiff <= 11.0) {
      score = 75;
      description = `Moderate tempo shift (${b1} → ${b2} BPM, Δ${effectiveDiff.toFixed(1)}). Recommended 8-bar tempo ramp or delay-freeze transition.`;
    } else if (effectiveDiff <= 18.0) {
      score = 56;
      description = `Wide tempo jump (${b1} → ${b2} BPM). Transition via wash-out reverb or breakdown drop.`;
    } else {
      score = Math.max(10, Math.round(45 - (effectiveDiff - 18) * 1.4));
      description = `Significant tempo difference (${b1} → ${b2} BPM). Best suited for sudden drop-cut on phrase 1.`;
    }

    return { score, effectiveDiff, tempoType, description };
  }

  /**
   * PRD REQ-018: Strict ±8% BPM Eligibility Filter
   * Disqualifies candidate tracks whose tempo diverges by > 8% from current track
   * (or its half-time / double-time equivalents).
   */
  public isBpmEligible(bpm1?: number, bpm2?: number, maxPercent = 0.08): boolean {
    const b1 = bpm1 && bpm1 > 40 && bpm1 < 250 ? bpm1 : 124;
    const b2 = bpm2 && bpm2 > 40 && bpm2 < 250 ? bpm2 : 124;

    const diffDirectPct = Math.abs(b1 - b2) / b1;
    const diffDoublePct = Math.abs(b1 - b2 / 2) / b1;
    const diffHalfPct = Math.abs(b1 - b2 * 2) / b1;

    return (
      diffDirectPct <= maxPercent ||
      diffDoublePct <= maxPercent ||
      diffHalfPct <= maxPercent
    );
  }

  /**
   * Calculate Dancefloor Energy Trajectory Score (0 - 100)
   */
  public calculateEnergyScore(
    currentEnergy?: number,
    candidateEnergy?: number,
    mood?: MoodId
  ): { score: number; energyShift: 'steady' | 'build' | 'mellow' | 'jump'; description: string } {
    const e1 = currentEnergy !== undefined && currentEnergy >= 0 ? currentEnergy : 75;
    const e2 = candidateEnergy !== undefined && candidateEnergy >= 0 ? candidateEnergy : 75;
    const diff = e2 - e1;

    let energyShift: 'steady' | 'build' | 'mellow' | 'jump' = 'steady';
    if (diff > 12) energyShift = 'build';
    else if (diff < -12) energyShift = 'mellow';
    if (Math.abs(diff) > 28) energyShift = 'jump';

    // If a mood profile is active, compare candidate energy against mood target
    if (mood && mood !== 'all') {
      const profile = MOOD_PROFILES[mood];
      if (profile) {
        if (e2 >= profile.minEnergy && e2 <= profile.maxEnergy) {
          const deltaFromTarget = Math.abs(e2 - profile.targetEnergy);
          const moodScore = Math.max(75, Math.round(100 - deltaFromTarget * 1.2));
          return {
            score: moodScore,
            energyShift,
            description: `Energy (${e2}%) is locked inside the ${profile.label} profile range (${profile.minEnergy}%–${profile.maxEnergy}%).`,
          };
        } else {
          const outsideDelta = e2 < profile.minEnergy ? profile.minEnergy - e2 : e2 - profile.maxEnergy;
          const penalizedScore = Math.max(30, Math.round(70 - outsideDelta * 2.0));
          return {
            score: penalizedScore,
            energyShift,
            description: `Energy (${e2}%) diverges from desired ${profile.label} target (${profile.minEnergy}%–${profile.maxEnergy}%).`,
          };
        }
      }
    }

    // Default continuous flow trajectory
    let score = 100;
    let description = '';

    if (Math.abs(diff) <= 8) {
      score = 100;
      description = `Steady energy continuity (${e1}% → ${e2}%). Sustains current dancefloor intensity.`;
    } else if (diff > 8 && diff <= 18) {
      score = 94;
      description = `Invigorating energy build (+${diff}%: ${e1}% → ${e2}%). Drives crowd enthusiasm forward.`;
    } else if (diff < -8 && diff >= -18) {
      score = 88;
      description = `Controlled mellow-down (${diff}%: ${e1}% → ${e2}%). Gentle atmospheric breathing room.`;
    } else if (diff > 18 && diff <= 32) {
      score = 74;
      description = `Sharp energy surge (+${diff}%). Exciting spike, best delivered on a beat drop.`;
    } else if (diff < -18 && diff >= -32) {
      score = 68;
      description = `Noticeable energy dip (${diff}%). Useful for an emotional reset or cool-down segment.`;
    } else {
      score = Math.max(25, Math.round(55 - (Math.abs(diff) - 32) * 1.5));
      description = `Extreme energy shift (${e1}% → ${e2}%). Dynamic contrast requiring quick phrase cut.`;
    }

    return { score, energyShift, description };
  }

  /**
   * Calculate Genre & Stylistic Affinity Score (0 - 100)
   */
  public calculateGenreScore(
    genre1?: string,
    genre2?: string,
    mood?: MoodId
  ): { score: number; description: string } {
    const g1 = (genre1 || 'Electronic / Pop').toLowerCase();
    const g2 = (genre2 || 'Electronic / Pop').toLowerCase();

    // Check Mood Preferred Genres
    if (mood && mood !== 'all') {
      const profile = MOOD_PROFILES[mood];
      if (profile && profile.preferredGenres.length > 0) {
        const matchesMood = profile.preferredGenres.some((mg) => g2.includes(mg.toLowerCase()));
        if (matchesMood) {
          return {
            score: 98,
            description: `Genre "${genre2}" directly aligns with active ${profile.label} curation.`,
          };
        }
      }
    }

    if (g1 === g2) {
      return {
        score: 100,
        description: `Direct genre match ("${genre1}"). Guarantees sonic continuity and rhythmic cohesion.`,
      };
    }

    // Tokenize
    const tokens1 = g1.split(/[/\s,]+/).filter((t) => t.length > 2);
    const tokens2 = g2.split(/[/\s,]+/).filter((t) => t.length > 2);
    const shared = tokens1.filter((t) => tokens2.includes(t));

    if (shared.length > 0) {
      return {
        score: 90,
        description: `Complementary sub-genres ("${genre1}" ↔ "${genre2}"). Shares ${shared.join(', ')} elements.`,
      };
    }

    // Check Genre Clusters
    let cluster1 = '';
    let cluster2 = '';
    for (const [name, list] of Object.entries(GENRE_CLUSTERS)) {
      if (list.some((item) => g1.includes(item))) cluster1 = name;
      if (list.some((item) => g2.includes(item))) cluster2 = name;
    }

    if (cluster1 && cluster2 && cluster1 === cluster2) {
      return {
        score: 82,
        description: `Same sonic family (${cluster1.toUpperCase()}). Rhythmic drums and bass timbres naturally blend.`,
      };
    }

    // Cross-cluster hybrid blend
    if (
      (cluster1 === 'electronic' && cluster2 === 'pop') ||
      (cluster1 === 'pop' && cluster2 === 'electronic') ||
      (cluster1 === 'hiphop' && cluster2 === 'desi') ||
      (cluster1 === 'desi' && cluster2 === 'hiphop')
    ) {
      return {
        score: 72,
        description: `Cross-genre fusion ("${genre1}" into "${genre2}"). Fresh hybrid flavor for the mix.`,
      };
    }

    return {
      score: 45,
      description: `Contrasting genres ("${genre1}" vs "${genre2}"). Bold eclectic pivot for surprise effect.`,
    };
  }

  /**
   * Score a Candidate Track against the Current Context
   * Supports both:
   * - scoreCandidate(candidate, request)
   * - scoreCandidate(currentTrack, candidate, requestOptions)
   */
  public scoreCandidate(
    arg1: Track,
    arg2: Track | RecommendationRequest,
    arg3?: Partial<RecommendationRequest>
  ): RecommendationCandidate | null {
    let candidate: Track;
    let request: RecommendationRequest;

    if (arg3 !== undefined || (arg2 && typeof arg2 === 'object' && 'id' in arg2 && 'bpm' in arg2 && 'title' in arg2)) {
      // Called as: scoreCandidate(currentTrack, candidate, options)
      candidate = arg2 as Track;
      request = {
        ...(arg3 || {}),
        currentTrack: arg1,
      } as RecommendationRequest;
    } else {
      // Called as: scoreCandidate(candidate, request)
      candidate = arg1;
      request = arg2 as RecommendationRequest;
    }

    const {
      currentTrack,
      queue = [],
      history = [],
      likedTrackIds = new Set(),
      skippedTrackIds = new Map(),
      rejectedTrackIds = new Set(),
      mood = 'all',
    } = request;

    // 1. Playable Audio Pre-validation
    if (!candidate.audio || candidate.audio.trim().length < 5 || (candidate.duration && candidate.duration <= 0)) {
      return null;
    }

    // 2. Disqualify currently playing track
    if (currentTrack && candidate.id === currentTrack.id) {
      return null;
    }

    // 3. Disqualify tracks already queued
    const isQueued = queue.some((q) => q.id === candidate.id);
    if (isQueued) {
      return null;
    }

    // 4. Disqualify rejected tracks in current session
    const isRejected = rejectedTrackIds instanceof Set
      ? rejectedTrackIds.has(candidate.id)
      : Array.isArray(rejectedTrackIds) && rejectedTrackIds.includes(candidate.id);
    if (isRejected) {
      return null;
    }

    // 5. PRD REQ-018: Strict ±8% BPM Eligibility Filter
    if (currentTrack?.bpm && candidate.bpm) {
      if (!this.isBpmEligible(currentTrack.bpm, candidate.bpm, 0.08)) {
        return null; // Disqualified by strict ±8% tempo gate
      }
    }

    // Baseline Scores (Weights: Harmonic 50%, Energy 30%, Recency 20%)
    const harmonicRes = this.calculateHarmonicScore(currentTrack?.key, candidate.key);
    const bpmRes = this.calculateBpmScore(currentTrack?.bpm, candidate.bpm);
    const energyRes = this.calculateEnergyScore(currentTrack?.energy, candidate.energy, mood);
    const genreRes = this.calculateGenreScore(currentTrack?.genre, candidate.genre, mood);

    // Duration score
    let durationScore = 100;
    if (candidate.duration < 90) durationScore = 55;
    else if (candidate.duration < 140) durationScore = 80;
    else if (candidate.duration > 420) durationScore = 75;

    // Modifiers
    let likedBonus = 0;
    const isLiked = likedTrackIds instanceof Set
      ? likedTrackIds.has(candidate.id)
      : Array.isArray(likedTrackIds) && likedTrackIds.includes(candidate.id);
    if (isLiked) {
      likedBonus = 10;
    }

    // Skips penalty
    let skipPenalty = 0;
    let skipCount = 0;
    if (skippedTrackIds instanceof Map) {
      skipCount = skippedTrackIds.get(candidate.id) || 0;
    } else if (skippedTrackIds instanceof Set) {
      skipCount = skippedTrackIds.has(candidate.id) ? 1 : 0;
    } else if (Array.isArray(skippedTrackIds)) {
      skipCount = skippedTrackIds.includes(candidate.id) ? 1 : 0;
    }

    if (skipCount > 0) {
      skipPenalty = Math.min(50, skipCount * 25);
    }

    // History penalty (prevent repeating recently played tracks)
    let historyPenalty = 0;
    const historyIdx = history.findIndex((h) => h.id === candidate.id);
    if (historyIdx !== -1) {
      if (historyIdx < 5) historyPenalty = 45; // Played in last 5 tracks
      else if (historyIdx < 12) historyPenalty = 25; // Played in last 12 tracks
      else historyPenalty = 10;
    }

    // PRD REQ-019: Calculate Recency / Session Flow Score (0 - 100)
    let recencyScore = 100;
    if (historyIdx !== -1) {
      if (historyIdx < 5) recencyScore = 15;
      else if (historyIdx < 12) recencyScore = 45;
      else recencyScore = 75;
    }
    if (isLiked) recencyScore = Math.min(100, recencyScore + 10);
    if (skipCount > 0) recencyScore = Math.max(0, recencyScore - Math.min(50, skipCount * 25));

    // Same Artist variety modifier
    let sameArtistPenalty = 0;
    if (currentTrack && currentTrack.artist_name === candidate.artist_name) {
      sameArtistPenalty = 8;
    }

    // Mood Alignment Bonus
    let moodBonus = 0;
    if (mood && mood !== 'all') {
      const profile = MOOD_PROFILES[mood];
      if (profile) {
        const bpmFit = candidate.bpm && candidate.bpm >= profile.minBpm && candidate.bpm <= profile.maxBpm;
        const energyFit = candidate.energy && candidate.energy >= profile.minEnergy && candidate.energy <= profile.maxEnergy;
        if (bpmFit && energyFit) moodBonus = 14;
        else if (bpmFit || energyFit) moodBonus = 7;
      }
    }

    // PRD REQ-019 Recommendation Formula:
    // 50% Harmonic Compatibility + 30% Energy Fit + 20% Recency
    const rawWeighted =
      harmonicRes.score * 0.50 +
      energyRes.score * 0.30 +
      recencyScore * 0.20;

    const modifiedOverall =
      rawWeighted +
      likedBonus +
      moodBonus -
      sameArtistPenalty;

    const finalOverall = Math.max(5, Math.min(99, Math.round(modifiedOverall)));

    // Generate DJ Mix Suggestion
    let suggestedMixTechnique = '4-bar beat-matched bassline crossfade';
    if (bpmRes.effectiveDiff > 8) {
      suggestedMixTechnique = '8-bar filtered transition with tempo ramp';
    } else if (harmonicRes.score >= 95) {
      suggestedMixTechnique = 'Harmonic 8-bar extended EQ blend on mid & high frequencies';
    } else if (energyRes.energyShift === 'build') {
      suggestedMixTechnique = 'High-pass filter sweep into impactful chorus drop';
    }

    // Build User Context String
    const userContextPoints: string[] = [];
    if (isLiked) userContextPoints.push('★ In your Liked Songs');
    if (skipCount > 0) userContextPoints.push(`Skipped ${skipCount}x previously`);
    if (mood !== 'all') userContextPoints.push(`Curated for ${MOOD_PROFILES[mood].label}`);

    const explanation: RecommendationExplanation = {
      headline: `${finalOverall}% Match • ${harmonicRes.relationship} & ${candidate.bpm || 120} BPM`,
      bpmAnalysis: bpmRes.description,
      harmonicAnalysis: harmonicRes.description,
      energyAnalysis: energyRes.description,
      genreAnalysis: genreRes.description,
      userContext: userContextPoints.join(' • '),
      suggestedMixTechnique,
      summaryBulletPoints: [
        harmonicRes.description,
        bpmRes.description,
        energyRes.description,
        genreRes.description,
      ],
    };

    const score: RecommendationScoreBreakdown = {
      overall: finalOverall,
      harmonic: harmonicRes.score,
      bpm: bpmRes.score,
      energy: energyRes.score,
      genre: genreRes.score,
      duration: durationScore,
      modifiers: {
        likedBonus,
        skipPenalty,
        historyPenalty,
        moodBonus,
        sameArtistPenalty,
      },
    };

    return {
      track: candidate,
      score,
      explanation,
      matchedMood: mood,
    };
  }

  /**
   * Recommend Next Suitable Tracks ranked deterministically by Compatibility Score
   */
  public recommend(request: RecommendationRequest): RecommendationCandidate[] {
    const candidatesPool = request.candidatePool && request.candidatePool.length > 0
      ? request.candidatePool
      : this.masterCatalogue;

    const scored: RecommendationCandidate[] = [];

    for (const track of candidatesPool) {
      const result = this.scoreCandidate(track, request);
      if (result) {
        scored.push(result);
      }
    }

    // Sort descending by overall compatibility score
    scored.sort((a, b) => b.score.overall - a.score.overall);

    const limit = request.limit || 8;
    return scored.slice(0, limit);
  }

  /**
   * Recommend the single best next track
   */
  public recommendNext(request: RecommendationRequest): RecommendationCandidate | null {
    const list = this.recommend({ ...request, limit: 1 });
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Natural Language AI DJ Voice Commentary Generator
   * Uses Gemini API when VITE_GEMINI_API_KEY is available;
   * otherwise uses the built-in deterministic DJ radio host speech engine.
   */
  public async generateAiCommentary(
    currentTrack: Track | null | undefined,
    candidate: RecommendationCandidate
  ): Promise<string> {
    const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY;

    if (apiKey && typeof fetch !== 'undefined') {
      try {
        const prompt = `You are an elite, energetic world-class club and radio AI DJ named "AI DJ Studio".
Track currently playing: "${currentTrack?.title || 'Current Vibe'}" by ${currentTrack?.artist_name || 'Resident DJ'} (${currentTrack?.bpm || 120} BPM, Key: ${currentTrack?.key || 'C Maj'}).
Next track you are dropping: "${candidate.track.title}" by ${candidate.track.artist_name} (${candidate.track.bpm} BPM, Key: ${candidate.track.key}, ${candidate.score.overall}% compatibility match).
Mix technique: ${candidate.explanation.suggestedMixTechnique}.
Mood: ${candidate.matchedMood || 'Party'}.

Write a single, punchy, charismatic 1-to-2 sentence DJ shoutout/intro introducing the upcoming track to the crowd. Keep it modern, engaging, and mention the musical vibe without sounding like a robot.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generated && typeof generated === 'string' && generated.trim().length > 10) {
            return generated.trim().replace(/^["']|["']$/g, '');
          }
        }
      } catch (e) {
        console.warn('Notice from Gemini API commentary, using studio host speech generator:', e);
      }
    }

    // Built-in DJ Studio Host Speech Engine (Deterministic, instant, offline-capable)
    const fromTitle = currentTrack?.title || 'the current sound';
    const toTitle = candidate.track.title;
    const toArtist = candidate.track.artist_name;
    const bpm = candidate.track.bpm || 128;
    const match = candidate.score.overall;

    const templates = [
      `"Locking in a ${match}% harmonic match right here! Transitioning out of ${fromTitle} into ${toTitle} by ${toArtist} at a driving ${bpm} BPM."`,
      `"Keeping this room moving with ${toArtist} on ${toTitle} — smooth tempo alignment and ${candidate.explanation.harmonicAnalysis.slice(0, 60)}."`,
      `"Up next on the decks: ${toTitle}. BPM locked at ${bpm}, matching the energy curve perfectly. Turn this up!"`,
      `"Here comes ${toTitle} by ${toArtist}. ${candidate.explanation.suggestedMixTechnique} on the drop — vibe score peaking at ${match}%."`,
    ];

    const pickIdx = Math.abs(toTitle.length + (candidate.track.bpm || 0)) % templates.length;
    return templates[pickIdx];
  }

  /**
   * PRD REQ-021: Multi-Track Segue Chain Pathfinding
   * Generates a multi-step harmonic mix flow starting from startTrack,
   * where each transition strictly adheres to harmonic compatibility (Camelot wheel)
   * and ±8% BPM tempo alignment.
   */
  public generateSegueChain(
    startTrack: Track,
    targetLength = 3,
    options: { mood?: MoodId; excludedIds?: Set<string> } = {}
  ): {
    chain: Track[];
    steps: Array<{
      fromTrack: Track;
      toTrack: Track;
      harmonicRelationship: string;
      bpmDelta: number;
      transitionScore: number;
      suggestedMixTechnique: string;
    }>;
    totalDuration: number;
    averageScore: number;
  } {
    const catalogue = this.masterCatalogue && this.masterCatalogue.length > 0
      ? this.masterCatalogue
      : this.refreshMasterCatalogue();
    const chain: Track[] = [startTrack];
    const steps: Array<{
      fromTrack: Track;
      toTrack: Track;
      harmonicRelationship: string;
      bpmDelta: number;
      transitionScore: number;
      suggestedMixTechnique: string;
    }> = [];

    const usedIds = new Set<string>([startTrack.id, ...(options.excludedIds || [])]);
    let current = startTrack;

    for (let step = 0; step < targetLength - 1; step++) {
      const candidates = catalogue.filter((t: Track) => !usedIds.has(t.id));
      const scoredCandidates: Array<{
        candidate: Track;
        score: number;
        harmonicRes: any;
        bpmRes: any;
      }> = [];

      for (const candidate of candidates) {
        if (!this.isBpmEligible(current.bpm, candidate.bpm, 0.08)) continue;

        const harmonicRes = this.calculateHarmonicScore(current.key, candidate.key);
        if (harmonicRes.score < 70) continue; // Harmonic compatibility threshold

        const energyRes = this.calculateEnergyScore(current.energy, candidate.energy, options.mood);
        const bpmRes = this.calculateBpmScore(current.bpm, candidate.bpm);

        // PRD Formula: 50% Harmonic + 30% Energy + 20% Recency
        const score = harmonicRes.score * 0.50 + energyRes.score * 0.30 + 100 * 0.20;
        scoredCandidates.push({ candidate, score, harmonicRes, bpmRes });
      }

      if (scoredCandidates.length === 0) break;

      // Sort descending by score
      scoredCandidates.sort((a, b) => b.score - a.score);
      const best = scoredCandidates[0];

      let suggestedMixTechnique = '4-bar beat-matched bassline crossfade';
      if (best.harmonicRes.score >= 95) {
        suggestedMixTechnique = 'Harmonic 8-bar extended EQ blend on mid & high frequencies';
      } else if (best.bpmRes.effectiveDiff > 4) {
        suggestedMixTechnique = '8-bar filtered tempo ramp transition';
      }

      steps.push({
        fromTrack: current,
        toTrack: best.candidate,
        harmonicRelationship: best.harmonicRes.relationship,
        bpmDelta: Number(Math.abs((current.bpm || 120) - (best.candidate.bpm || 120)).toFixed(1)),
        transitionScore: Math.round(best.score),
        suggestedMixTechnique,
      });

      chain.push(best.candidate);
      usedIds.add(best.candidate.id);
      current = best.candidate;
    }

    const totalDuration = chain.reduce((acc, t) => acc + (t.duration || 180), 0);
    const averageScore = steps.length > 0
      ? Math.round(steps.reduce((acc, s) => acc + s.transitionScore, 0) / steps.length)
      : 90;

    return { chain, steps, totalDuration, averageScore };
  }

  /**
   * Documentation of the Compatibility Scoring System
   */
  public getScoringDocumentation(): string {
    return `
=== AI DJ STUDIO DETERMINISTIC COMPATIBILITY SCORING SPECIFICATION ===
The AI DJ recommendation engine computes a 0-100 compatibility score using 5 core musical pillars:

1. Harmonic Key Compatibility (Weight: 30%)
   - Analyzed using the 12-hour Camelot Wheel (Mixed In Key standard).
   - Exact Key Match (e.g. 8A -> 8A): 100 points
   - Relative Major/Minor (e.g. 8A <-> 8B): 96 points
   - Adjacent +1 Step Energy Boost (e.g. 8A -> 9A): 93 points
   - Adjacent -1 Step Deepening (e.g. 8A -> 7A): 90 points
   - Diagonal Harmonic Mix (e.g. 8A -> 9B): 82 points
   - Whole Tone Lift (+2 Steps): 78 points
   - Semitone Modulation (+7 Steps): 72 points
   - Distant Keys: Decays smoothly to 20-30 points.

2. BPM Tempo Synchronization (Weight: 25%)
   - Evaluates direct tempo delta (|BPM1 - BPM2|) as well as half-time (x0.5) and double-time (x2.0).
   - Δ <= 1.0 BPM: 100 points
   - Δ <= 3.5 BPM: 96 points
   - Δ <= 6.0 BPM: 88 points (within ±4% turntable pitch-fader tolerance)
   - Δ <= 11.0 BPM: 75 points (mixable via 8-bar tempo ramp)
   - Δ > 18.0 BPM: Decays to 10-45 points.

3. Dancefloor Energy Flow (Weight: 20%)
   - Continuous Flow: Sustained energy within ±8% earns 100 points.
   - Smooth builds (+8% to +18%) earn 94 points.
   - Mood-Anchored Mode: Evaluates candidate against active Mood Profile (Party, Chill, Workout, Focus, Late Night).

4. Genre & Sonic Affinity (Weight: 15%)
   - Same genre: 100 points.
   - Sub-genre token overlap: 90 points.
   - Same sonic cluster (Electronic, Hip-Hop, Pop, Desi, Chill): 82 points.
   - Cross-genre fusion: 72 points.

5. Duration & Structure (Weight: 10%)
   - Standard 3-6 minute structured DJ tracks receive 100 points.
   - Unplayable tracks (< 0s or missing audio) are disqualified (0 points).

Modifiers:
- User Liked Songs Bonus: +10 points
- Active Mood Match Bonus: +14 points
- User Skips Penalty: -25 points per recorded skip
- Recent Listening History Penalty: -45 points if played in last 5 tracks; -25 points if in last 12 tracks
- Same-Artist Variety Modifier: -8 points to promote catalogue diversity
- Disqualifiers: Currently playing track, tracks already queued, or tracks rejected by the user in the session.
`;
  }
}

export const recommendationEngine = new RecommendationEngine();
