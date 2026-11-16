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

export type PlaybackCapability = 'full_length' | 'preview';

export interface Track {
  id: string;
  title: string;
  artist_name: string;
  album_name?: string;
  image: string;
  duration: number; // in seconds (Playable stream duration or studio duration)
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

  // Provider Reliability & Full-Length vs Preview Playback Fields
  streamType?: 'full' | 'preview'; // 'full' for complete recording, 'preview' for 30s sample
  isFullLength?: boolean; // true if full recording, false if preview
  streamDuration?: number; // exact playable duration of the audio stream (e.g. 30 for preview)
  fullTrackDuration?: number; // full recording length (e.g. 210 for a 3:30 song)
  previewUrl?: string; // 30s preview URL if available
  fullStreamUrl?: string; // verified full-length stream URL if available
  downloadUrl?: string; // permitted download URL if available
  providerName?: string; // human-readable provider name
  streamStatus?: 'available' | 'preview_only' | 'fallback_available' | 'unavailable';
  alternativeFullTrack?: Track; // linked full-length alternative track
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
  role?: 'listener' | 'co-dj' | 'host' | 'moderator' | 'admin';
  status?: 'active' | 'suspended' | 'banned';
}

export type RoomRole = 'host' | 'co-dj' | 'listener';

export interface RoomParticipant {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  role: RoomRole;
  joinedAt?: string | number;
  isHost?: boolean;
  isOnline?: boolean;
}

export interface LiveRoom {
  id: string;
  code: string;
  name: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  cover: string;
  genre: string;
  listenerCount: number;
  isLive: boolean;
  tags: string[];
  participants: RoomParticipant[];
  queue: Track[];
  currentTrack?: Track;
  currentPosition?: number;
  isPlaying?: boolean;
  playbackTimestamp?: number;
}

export interface ChatMessage {
  id: string;
  userName: string;
  userEmail?: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  isAi?: boolean;
  isSystem?: boolean;
}

export interface RoomPlaybackSync {
  hostId: string;
  track: Track | null;
  isPlaying: boolean;
  position: number;
  serverTimestamp: number;
  action?: 'play' | 'pause' | 'seek' | 'track_change' | 'sync_state';
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
