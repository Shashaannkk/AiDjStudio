import type { Track } from './music';

export type CamelotMode = 'A' | 'B'; // A = Minor, B = Major

export interface CamelotKey {
  number: number; // 1 - 12
  mode: CamelotMode;
  code: string; // e.g. "8A" or "8B"
  standardKey: string; // e.g. "A Minor" or "C Major"
}

export type MoodId =
  | 'all'
  | 'party'
  | 'chill'
  | 'late-night'
  | 'workout'
  | 'focus'
  | 'euphoric';

export interface MoodProfile {
  id: MoodId;
  label: string;
  emoji: string;
  tagline: string;
  targetBpm: number;
  minBpm: number;
  maxBpm: number;
  targetEnergy: number;
  minEnergy: number;
  maxEnergy: number;
  preferredGenres: string[];
}

export interface RecommendationScoreBreakdown {
  overall: number; // 0 - 100 final score
  harmonic: number; // 0 - 100 (harmonic compatibility)
  bpm: number; // 0 - 100 (tempo alignment with double/half time handling)
  energy: number; // 0 - 100 (vibe & dancefloor energy flow)
  genre: number; // 0 - 100 (stylistic compatibility)
  duration: number; // 0 - 100 (structure & mixability)
  modifiers: {
    likedBonus: number; // e.g. +10
    skipPenalty: number; // e.g. -25
    historyPenalty: number; // e.g. -40 if recently played
    moodBonus: number; // e.g. +15 if matches selected mood
    sameArtistPenalty: number; // e.g. -8 for variety
  };
}

export interface RecommendationExplanation {
  headline: string;
  bpmAnalysis: string;
  harmonicAnalysis: string;
  energyAnalysis: string;
  genreAnalysis: string;
  userContext: string;
  suggestedMixTechnique: string;
  summaryBulletPoints: string[];
}

export interface RecommendationCandidate {
  track: Track;
  score: RecommendationScoreBreakdown;
  explanation: RecommendationExplanation;
  aiCommentary?: string;
  matchedMood?: MoodId;
}

export interface RecommendationRequest {
  currentTrack?: Track | null;
  queue?: Track[];
  history?: Track[];
  likedTrackIds?: Set<string> | string[];
  skippedTrackIds?: Map<string, number> | Set<string> | string[];
  rejectedTrackIds?: Set<string> | string[];
  mood?: MoodId;
  candidatePool?: Track[];
  limit?: number;
}

