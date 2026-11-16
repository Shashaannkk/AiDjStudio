import type { Track } from './music';

export type RoomMood =
  | 'energetic'
  | 'relaxed'
  | 'happy'
  | 'melancholic'
  | 'focused'
  | 'party';

export interface RoomMoodDetails {
  id: RoomMood;
  label: string;
  emoji: string;
  tagline: string;
  associatedKeywords: string[];
  associatedEmojis: string[];
  targetBpmMin: number;
  targetBpmMax: number;
  targetEnergyMin: number;
  targetEnergyMax: number;
}

export interface RoomMoodState {
  mood: RoomMood;
  confidence: number; // 0 - 100%
  isManualOverride: boolean;
  detectedFrom: {
    topEmojis: string[];
    matchedKeywords: string[];
    sampleSize: number;
  };
  updatedAt: number;
}

export interface SoundclashCandidate {
  track: Track;
  compatibilityScore: number;
  votes: number;
}

export interface SoundclashSession {
  id: string;
  roomId: string;
  title: string;
  candidates: SoundclashCandidate[]; // 2 to 4 real catalogue tracks
  votes: Record<string, string>; // userId -> trackId (strictly prevents duplicate voting)
  durationSec: number; // e.g. 30
  startedAt: number;
  endsAt: number;
  status: 'active' | 'ended';
  winnerTrackId?: string;
  winnerTrack?: Track;
  totalVotes: number;
}

