import type { Track } from '../types/music';
import type { AssistantTransitionTip } from '../types/assistant';
import {
  REAL_SPOTIFY_APPLE_CATALOG,
  TRENDING_INDIA_TRACKS,
  AUDIUS_FEATURED_TRACKS,
  JAMENDO_INTEGRATED_TRACKS,
  INTERNET_ARCHIVE_TRACKS,
  FIXTURE_TRACKS,
} from '../fixtures/musicFixtures';

// Camelot harmonic key lookup
const KEY_TO_CAMELOT: Record<string, { num: number; mode: 'A' | 'B'; name: string }> = {
  'AB MIN': { num: 1, mode: 'A', name: 'Ab Minor' },
  'G# MIN': { num: 1, mode: 'A', name: 'G# Minor' },
  'EB MIN': { num: 2, mode: 'A', name: 'Eb Minor' },
  'D# MIN': { num: 2, mode: 'A', name: 'D# Minor' },
  'BB MIN': { num: 3, mode: 'A', name: 'Bb Minor' },
  'A# MIN': { num: 3, mode: 'A', name: 'A# Minor' },
  'F MIN': { num: 4, mode: 'A', name: 'F Minor' },
  'C MIN': { num: 5, mode: 'A', name: 'C Minor' },
  'G MIN': { num: 6, mode: 'A', name: 'G Minor' },
  'D MIN': { num: 7, mode: 'A', name: 'D Minor' },
  'A MIN': { num: 8, mode: 'A', name: 'A Minor' },
  'E MIN': { num: 9, mode: 'A', name: 'E Minor' },
  'B MIN': { num: 10, mode: 'A', name: 'B Minor' },
  'F# MIN': { num: 11, mode: 'A', name: 'F# Minor' },
  'GB MIN': { num: 11, mode: 'A', name: 'Gb Minor' },
  'C# MIN': { num: 12, mode: 'A', name: 'C# Minor' },
  'DB MIN': { num: 12, mode: 'A', name: 'Db Minor' },

  'B MAJ': { num: 1, mode: 'B', name: 'B Major' },
  'F# MAJ': { num: 2, mode: 'B', name: 'F# Major' },
  'GB MAJ': { num: 2, mode: 'B', name: 'Gb Major' },
  'DB MAJ': { num: 3, mode: 'B', name: 'Db Major' },
  'C# MAJ': { num: 3, mode: 'B', name: 'C# Major' },
  'AB MAJ': { num: 4, mode: 'B', name: 'Ab Major' },
  'G# MAJ': { num: 4, mode: 'B', name: 'G# Major' },
  'EB MAJ': { num: 5, mode: 'B', name: 'Eb Major' },
  'D# MAJ': { num: 5, mode: 'B', name: 'D# Major' },
  'BB MAJ': { num: 6, mode: 'B', name: 'Bb Major' },
  'A# MAJ': { num: 6, mode: 'B', name: 'A# Major' },
  'F MAJ': { num: 7, mode: 'B', name: 'F Major' },
  'C MAJ': { num: 8, mode: 'B', name: 'C Major' },
  'G MAJ': { num: 9, mode: 'B', name: 'G Major' },
  'D MAJ': { num: 10, mode: 'B', name: 'D Major' },
  'A MAJ': { num: 11, mode: 'B', name: 'A Major' },
  'E MAJ': { num: 12, mode: 'B', name: 'E Major' },
};

function parseCamelotKey(keyStr?: string): { num: number; mode: 'A' | 'B'; name: string } {
  if (!keyStr) return { num: 8, mode: 'A', name: 'A Minor' };
  const clean = keyStr.toUpperCase().trim();

  // Check direct Camelot format e.g. "8A"
  const directMatch = clean.match(/^(\d{1,2})([AB])$/);
  if (directMatch) {
    const num = parseInt(directMatch[1], 10);
    const mode = directMatch[2] as 'A' | 'B';
    return { num, mode, name: `${num}${mode}` };
  }

  // Check standard mapping
  for (const [k, val] of Object.entries(KEY_TO_CAMELOT)) {
    if (clean.includes(k) || clean.replace(/\s+/g, '') === k.replace(/\s+/g, '')) {
      return val;
    }
  }

  return { num: 8, mode: 'A', name: 'A Minor' };
}

export class CatalogueRagRetriever {
  private indexedTracks: Track[] = [];

  constructor() {
    this.buildIndex();
  }

  /**
   * Builds index from real catalogue sources, deduplicating and filtering invalid tracks
   */
  private buildIndex() {
    const combined = [
      ...REAL_SPOTIFY_APPLE_CATALOG,
      ...TRENDING_INDIA_TRACKS,
      ...AUDIUS_FEATURED_TRACKS,
      ...JAMENDO_INTEGRATED_TRACKS,
      ...INTERNET_ARCHIVE_TRACKS,
      ...FIXTURE_TRACKS,
    ];

    const seenIds = new Set<string>();
    const validTracks: Track[] = [];

    for (const t of combined) {
      if (!t || !t.id || !t.title || !t.artist_name || !t.audio) continue;
      if (seenIds.has(t.id)) continue;
      seenIds.add(t.id);

      // Normalize missing values with defaults if needed
      validTracks.push({
        ...t,
        bpm: t.bpm || 120,
        key: t.key || '8A',
        energy: t.energy || 75,
        genre: t.genre || 'Electronic',
        duration: t.duration || 210,
      });
    }

    this.indexedTracks = validTracks;
  }

  /**
   * Get all verified indexed catalogue tracks
   */
  public getAllTracks(): Track[] {
    return this.indexedTracks;
  }

  /**
   * Search catalogue by target mood
   */
  public searchByMood(mood: string, limit: number = 6): Track[] {
    const m = mood.toLowerCase().trim();

    let bpmMin = 70;
    let bpmMax = 160;
    let energyMin = 20;
    let energyMax = 100;

    if (m.includes('energetic') || m.includes('hype') || m.includes('fire') || m.includes('fast')) {
      bpmMin = 126;
      bpmMax = 160;
      energyMin = 80;
      energyMax = 100;
    } else if (m.includes('chill') || m.includes('relaxed') || m.includes('calm') || m.includes('ambient')) {
      bpmMin = 75;
      bpmMax = 105;
      energyMin = 30;
      energyMax = 65;
    } else if (m.includes('happy') || m.includes('euphoric') || m.includes('uplifting') || m.includes('joy')) {
      bpmMin = 115;
      bpmMax = 132;
      energyMin = 70;
      energyMax = 95;
    } else if (m.includes('melancholic') || m.includes('sad') || m.includes('night') || m.includes('deep')) {
      bpmMin = 90;
      bpmMax = 118;
      energyMin = 40;
      energyMax = 70;
    } else if (m.includes('focus') || m.includes('study') || m.includes('work') || m.includes('instrumental')) {
      bpmMin = 80;
      bpmMax = 115;
      energyMin = 35;
      energyMax = 65;
    } else if (m.includes('party') || m.includes('club') || m.includes('dance') || m.includes('rave')) {
      bpmMin = 122;
      bpmMax = 135;
      energyMin = 85;
      energyMax = 100;
    }

    const matches = this.indexedTracks.filter((t) => {
      const bpm = t.bpm || 120;
      const energy = t.energy || 70;
      return bpm >= bpmMin && bpm <= bpmMax && energy >= energyMin && energy <= energyMax;
    });

    if (matches.length >= limit) {
      return matches.slice(0, limit);
    }

    // Fallback if strict range yielded fewer results
    return this.indexedTracks
      .slice()
      .sort((a, b) => (b.energy || 50) - (a.energy || 50))
      .slice(0, limit);
  }

  /**
   * Find tracks similar to a given reference track based on Genre, BPM, Key and Energy
   */
  public findSimilarTracks(refTrack: Track, limit: number = 4): Track[] {
    const refBpm = refTrack.bpm || 124;
    const refEnergy = refTrack.energy || 80;
    const refGenre = (refTrack.genre || '').toLowerCase();
    const refCamelot = parseCamelotKey(refTrack.key);

    const candidates = this.indexedTracks.filter((t) => t.id !== refTrack.id);

    const scored = candidates.map((track) => {
      let score = 0;

      // 1. Genre match (up to 35 pts)
      const g = (track.genre || '').toLowerCase();
      if (g && refGenre && (g.includes(refGenre) || refGenre.includes(g))) {
        score += 35;
      } else {
        score += 15;
      }

      // 2. BPM proximity (up to 30 pts)
      const bpmDist = Math.abs((track.bpm || 120) - refBpm);
      if (bpmDist <= 4) score += 30;
      else if (bpmDist <= 8) score += 20;
      else if (bpmDist <= 14) score += 10;
      else score += Math.max(0, 5 - bpmDist * 0.5);

      // 3. Harmonic Key match (up to 25 pts)
      const candCamelot = parseCamelotKey(track.key);
      if (candCamelot.num === refCamelot.num && candCamelot.mode === refCamelot.mode) {
        score += 25; // Exact key
      } else if (candCamelot.num === refCamelot.num && candCamelot.mode !== refCamelot.mode) {
        score += 22; // Relative Major/Minor
      } else if (
        candCamelot.mode === refCamelot.mode &&
        (candCamelot.num === ((refCamelot.num % 12) + 1) || candCamelot.num === ((refCamelot.num - 2 + 12) % 12) + 1)
      ) {
        score += 20; // Adjacent Camelot key
      } else {
        score += 5;
      }

      // 4. Energy proximity (up to 10 pts)
      const energyDist = Math.abs((track.energy || 75) - refEnergy);
      score += Math.max(0, 10 - energyDist * 0.2);

      return { track, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.track);
  }

  /**
   * Find tracks with BPM compatible to a target BPM
   */
  public findBpmCompatibleTracks(targetBpm: number, tolerancePct: number = 5, limit: number = 5): Track[] {
    const minBpm = targetBpm * (1 - tolerancePct / 100);
    const maxBpm = targetBpm * (1 + tolerancePct / 100);

    const matches = this.indexedTracks.filter((t) => {
      const bpm = t.bpm || 120;
      // Exact or near range
      const directMatch = bpm >= minBpm && bpm <= maxBpm;
      // Half-time / double-time match
      const halfMatch = bpm * 2 >= minBpm && bpm * 2 <= maxBpm;
      const doubleMatch = bpm / 2 >= minBpm && bpm / 2 <= maxBpm;
      return directMatch || halfMatch || doubleMatch;
    });

    matches.sort((a, b) => {
      const diffA = Math.abs((a.bpm || 120) - targetBpm);
      const diffB = Math.abs((b.bpm || 120) - targetBpm);
      return diffA - diffB;
    });

    return matches.slice(0, limit);
  }

  /**
   * Assembles a real track list that totals near a requested duration (e.g. 30 minutes = 1800s)
   */
  public assembleTargetDurationPlaylist(
    moodOrGenre: string,
    targetDurationSeconds: number = 1800
  ): { tracks: Track[]; totalDuration: number } {
    const pool = this.searchByMood(moodOrGenre, 25);
    const selected: Track[] = [];
    let accumulated = 0;

    for (const track of pool) {
      if (accumulated >= targetDurationSeconds - 60) {
        break;
      }
      selected.push(track);
      accumulated += track.duration || 210;
    }

    // If pool didn't meet duration, draw from remaining index
    if (accumulated < targetDurationSeconds - 120) {
      for (const t of this.indexedTracks) {
        if (selected.some((s) => s.id === t.id)) continue;
        selected.push(t);
        accumulated += t.duration || 210;
        if (accumulated >= targetDurationSeconds - 60) break;
      }
    }

    return {
      tracks: selected,
      totalDuration: accumulated,
    };
  }

  /**
   * Search real tracks by keyword across title, artist, album, and genre
   */
  public searchByKeyword(query: string, limit: number = 5): Track[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.indexedTracks.slice(0, limit);

    const tokens = q.split(/\s+/).filter(Boolean);

    const scored = this.indexedTracks.map((track) => {
      let score = 0;
      const title = track.title.toLowerCase();
      const artist = track.artist_name.toLowerCase();
      const album = (track.album_name || '').toLowerCase();
      const genre = (track.genre || '').toLowerCase();

      for (const tok of tokens) {
        if (title.includes(tok)) score += 10;
        if (artist.includes(tok)) score += 8;
        if (genre.includes(tok)) score += 5;
        if (album.includes(tok)) score += 3;
      }

      return { track, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.track);
  }

  /**
   * Detailed DJ transition analysis between two tracks
   */
  public getTransitionAnalysis(trackA: Track, trackB: Track): AssistantTransitionTip {
    const bpmA = trackA.bpm || 124;
    const bpmB = trackB.bpm || 124;
    const deltaBpm = bpmB - bpmA;
    const pctDiff = Math.abs((deltaBpm / bpmA) * 100).toFixed(1);

    const camelotA = parseCamelotKey(trackA.key);
    const camelotB = parseCamelotKey(trackB.key);

    let keyRelationship = 'Distant Modulation';
    let harmonicScore = 60;

    if (camelotA.num === camelotB.num && camelotA.mode === camelotB.mode) {
      keyRelationship = `Same Key (${camelotA.num}${camelotA.mode}) — Perfect Harmonic Lock`;
      harmonicScore = 100;
    } else if (camelotA.num === camelotB.num && camelotA.mode !== camelotB.mode) {
      keyRelationship = `Relative Major/Minor (${camelotA.num}${camelotA.mode} ↔ ${camelotB.num}${camelotB.mode}) — Emotional Shift`;
      harmonicScore = 95;
    } else if (
      camelotA.mode === camelotB.mode &&
      camelotB.num === ((camelotA.num % 12) + 1)
    ) {
      keyRelationship = `+1 Camelot Step (${camelotA.num}${camelotA.mode} → ${camelotB.num}${camelotB.mode}) — Energy Boost`;
      harmonicScore = 92;
    } else if (
      camelotA.mode === camelotB.mode &&
      camelotB.num === ((camelotA.num - 2 + 12) % 12) + 1
    ) {
      keyRelationship = `-1 Camelot Step (${camelotA.num}${camelotA.mode} → ${camelotB.num}${camelotB.mode}) — Deep Mood Transition`;
      harmonicScore = 88;
    }

    const bpmScore = Math.max(0, 100 - parseFloat(pctDiff) * 8);
    const compatibilityScore = Math.round(harmonicScore * 0.55 + bpmScore * 0.45);

    let technique = 'Equal-Power crossfade over 16 bars with 8-bar breakdown overlap.';
    let eqAdvice = 'Drop Deck B Bass to -60dB Kill switch until the main drop of Deck A.';

    if (Math.abs(deltaBpm) > 6) {
      technique = `Tempo adjustment required: shift Deck B pitch by ${deltaBpm > 0 ? '-' : '+'}${pctDiff}% before mixing.`;
      eqAdvice = 'Engage Fast-Cut crossfader during an 8-beat drum roll to mask tempo divergence.';
    } else if (harmonicScore >= 95) {
      technique = 'Long melodic crossfade over 32 bars; melodies harmonize seamlessly.';
      eqAdvice = 'Gradually swap mid-range vocals at the 16-bar mark while maintaining constant master bass power.';
    }

    return {
      currentTrack: trackA,
      nextTrack: trackB,
      bpmComparison: `${bpmA} BPM → ${bpmB} BPM (${deltaBpm >= 0 ? '+' : ''}${deltaBpm} BPM, ${pctDiff}%)`,
      keyRelationship,
      compatibilityScore,
      technique,
      eqAdvice,
    };
  }
}

export const catalogueRagRetriever = new CatalogueRagRetriever();

