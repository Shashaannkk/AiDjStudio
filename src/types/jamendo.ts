/**
 * Jamendo API v3.0 Response Types & Mapping Utilities
 * Prepared for live Jamendo Catalogue Integration
 */

export interface JamendoTrackResponse {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  album_name: string;
  album_id: string;
  license_cc: string;
  position: number;
  releasedate: string;
  album_image: string;
  image: string;
  audio: string;
  audiodownload: string;
  prourl: string;
  shorturl: string;
  shareurl: string;
  waveform: string;
  musicinfo?: {
    vocalinstrumental: string;
    lang: string;
    gender: string;
    acousticelectric: string;
    speed: string;
    tags: {
      genres: string[];
      instruments: string[];
      vartags: string[];
    };
  };
}

export interface JamendoApiResponse<T> {
  headers: {
    status: string;
    code: number;
    error_message: string;
    warnings: string;
    results_count: number;
    next: string;
  };
  results: T[];
}

/**
 * Maps standard Jamendo API track payload to internal AI DJ Studio Track model
 */
import type { Track } from './music';

export function mapJamendoTrackToStudioTrack(jamendo: JamendoTrackResponse): Track {
  return {
    id: `jamendo_${jamendo.id}`,
    title: jamendo.name,
    artist_name: jamendo.artist_name,
    album_name: jamendo.album_name,
    image: jamendo.image || jamendo.album_image,
    duration: jamendo.duration,
    audio: jamendo.audio,
    genre: jamendo.musicinfo?.tags?.genres?.[0] || 'Electronic',
    bpm: jamendo.musicinfo?.speed === 'high' ? 128 : jamendo.musicinfo?.speed === 'medium' ? 110 : 85,
    key: 'C Min',
    energy: jamendo.musicinfo?.speed === 'high' ? 90 : 65,
    liked: false
  };
}
