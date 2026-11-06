export interface LyricLine {
  time: number;
  text: string;
}

export type MusicProvider =
  | 'spotify'
  | 'apple'
  | 'soundcloud'
  | 'beatport'
  | 'jamendo'
  | 'audius'
  | 'archive'
  | 'aidj';

export interface Track {
  id: string;
  title: string;
  artist_name: string;
  album_name?: string;
  image: string;
  duration: number; // in seconds
  audio: string;
  genre?: string;
  bpm?: number;
  key?: string;
  energy?: number; // 0 - 100%
  liked?: boolean;
  playCount?: number;
  streamCount?: string;
  explicit?: boolean;
  videoPoster?: string;
  canvasVideo?: string;
  lyrics?: LyricLine[];
  provider?: MusicProvider;
  releaseYear?: string;
  addedAt?: string;
}

export interface Artist {
  id: string;
  name: string;
  avatar: string;
  bannerImage: string;
  monthlyListeners: string;
  verified: boolean;
  bio?: string;
  genres?: string[];
  popularTracks: Track[];
  albums?: { title: string; year: string; image: string }[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  image: string;
  trackCount: number;
  category?: 'mix' | 'curated' | 'user' | 'genre';
  tracks?: Track[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan?: string;
}

export interface RoomParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost?: boolean;
}

export interface LiveRoom {
  id: string;
  name: string;
  hostName: string;
  hostAvatar: string;
  cover: string;
  genre: string;
  listenerCount: number;
  isLive: boolean;
  tags: string[];
  participants: RoomParticipant[];
  currentTrack?: Track;
}

export interface ChatMessage {
  id: string;
  userName: string;
  userEmail?: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  isAi?: boolean;
}

export interface TransitionInsight {
  fromTrackTitle: string;
  toTrackTitle: string;
  compatibilityScore: number;
  bpmDifference: number;
  suggestedAction: string;
  harmonicMatch: string;
  energyShift: 'up' | 'down' | 'steady';
}

export interface AIDJConfig {
  enabled: boolean;
  mode: 'auto-mix' | 'party-boost' | 'smooth-transitions' | 'lo-fi-focus';
  smartCrossfadeSec: number;
  autoBpmSync: boolean;
  voiceCommentary: boolean;
}
