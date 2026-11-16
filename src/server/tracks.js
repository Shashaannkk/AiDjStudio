import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteJsonSync } from './db.js';

/**
 * AI DJ Studio — Database-Backed Track Catalogue & Acoustic Metadata Service
 * Implements:
 * - Persistent JSON catalogue storage (data/tracks.json)
 * - Track metadata validation and normalization
 * - Acoustic features management (BPM, Camelot Key, Energy, Danceability)
 * - Admin CRUD endpoints (Create, Read, Update, Deactivate, Delete)
 * - Catalogue data quality auditing
 */

const DATA_DIR = path.resolve('data');
const TRACKS_FILE = path.join(DATA_DIR, 'tracks.json');

const KEY_TO_CAMELOT = {
  'AB MIN': '1A', 'G# MIN': '1A', 'EB MIN': '2A', 'D# MIN': '2A',
  'BB MIN': '3A', 'A# MIN': '3A', 'F MIN': '4A', 'C MIN': '5A',
  'G MIN': '6A', 'D MIN': '7A', 'A MIN': '8A', 'E MIN': '9A',
  'B MIN': '10A', 'F# MIN': '11A', 'GB MIN': '11A', 'C# MIN': '12A', 'DB MIN': '12A',
  'B MAJ': '1B', 'F# MAJ': '2B', 'GB MAJ': '2B', 'DB MAJ': '3B', 'C# MAJ': '3B',
  'AB MAJ': '4B', 'G# MAJ': '4B', 'EB MAJ': '5B', 'D# MAJ': '5B', 'BB MAJ': '6B',
  'A# MAJ': '6B', 'F MAJ': '7B', 'C MAJ': '8B', 'G MAJ': '9B', 'D MAJ': '10B',
  'A MAJ': '11B', 'E MAJ': '12B',
};

export function normalizeCamelotKey(keyStr) {
  if (!keyStr) return '8A';
  const clean = String(keyStr).toUpperCase().trim();
  const directMatch = clean.match(/^(\d{1,2})([AB])$/);
  if (directMatch) {
    const num = parseInt(directMatch[1], 10);
    if (num >= 1 && num <= 12) return `${num}${directMatch[2]}`;
  }
  for (const [k, camelot] of Object.entries(KEY_TO_CAMELOT)) {
    if (clean.includes(k) || clean.replace(/\s+/g, '') === k.replace(/\s+/g, '')) {
      return camelot;
    }
  }
  return '8A';
}

let tracksCache = [];

// Seed initial catalogue tracks
const INITIAL_SEED_TRACKS = [
  {
    id: 'track_midnight_drive',
    title: 'Midnight Drive',
    artist_name: 'Luna Skye',
    album_name: 'Neon Horizons',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
    duration: 232,
    audio: 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32&ndls=1',
    genre: 'Synthwave / Electronic',
    bpm: 124,
    key: '11A',
    energy: 82,
    provider: 'jamendo',
    isActive: true,
  },
  {
    id: 'ja_electric_sunrise',
    title: 'Electric Sunrise',
    artist_name: 'Neon Voyager',
    album_name: 'Retrograde Vol. 1',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800&auto=format&fit=crop',
    duration: 232,
    audio: 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32&ndls=1',
    genre: 'Synthwave / Electronic',
    bpm: 128,
    key: '8A',
    energy: 88,
    provider: 'jamendo',
    isActive: true,
  },
  {
    id: 'audius_AK3w5q0',
    title: 'iLLPeTiLL - 140 Mix (Audius Exclusive)',
    artist_name: 'iLLPeTiLL',
    album_name: '140 Dubstep Sessions',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    duration: 584,
    audio: 'https://discoveryprovider.audius.co/v1/tracks/1424326672/stream?app_name=AIDJStudio',
    genre: 'Dubstep / Bass',
    bpm: 140,
    key: '9A',
    energy: 94,
    provider: 'audius',
    isActive: true,
  },
  {
    id: 'in_tauba_tauba',
    title: 'Tauba Tauba (From "Bad Newz")',
    artist_name: 'Karan Aujla',
    album_name: 'Bad Newz',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/79/d2/01/79d201d2-e54d-5604-81fb-313f30db7219/198588533581.jpg/1000x1000bb.jpg',
    duration: 30,
    fullTrackDuration: 208,
    isFullLength: false,
    audio: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/34/8d/63/348d6342-2c35-bf31-8131-2c8b3cfe3c09/mzaf_15374551219149804677.plus.aac.p.m4a',
    genre: 'Punjabi / Bollywood Dance',
    bpm: 110,
    key: '8A',
    energy: 96,
    provider: 'apple',
    isActive: true,
  },
  {
    id: 'in_big_dawgs',
    title: 'Big Dawgs',
    artist_name: 'Hanumankind & Kalmi',
    album_name: 'Big Dawgs',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/d2/6c/42d26c01-619f-fa0a-2e83-7f4a28b5d3b2/24UMGIM70977.rgb.jpg/1000x1000bb.jpg',
    duration: 30,
    fullTrackDuration: 234,
    isFullLength: false,
    audio: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f5/92/d7/f592d7a4-19be-c005-6698-1caccacc173c/mzaf_15257808628606025867.plus.aac.p.m4a',
    genre: 'Desi Hip Hop / Trap',
    bpm: 130,
    key: '9A',
    energy: 98,
    provider: 'apple',
    isActive: true,
  },
  {
    id: 'track_hyper_drive',
    title: 'Hyper Drive',
    artist_name: 'Kavinsky Protocol',
    album_name: 'Outrun 2026',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    duration: 245,
    audio: 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32&ndls=1',
    genre: 'Synthwave / Darksynth',
    bpm: 126,
    key: '10A',
    energy: 91,
    provider: 'jamendo',
    isActive: true,
  },
  {
    id: 'track_deep_serenity',
    title: 'Deep Serenity',
    artist_name: 'Aether Echoes',
    album_name: 'Floating World',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    duration: 310,
    audio: 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32&ndls=1',
    genre: 'Chillout / Ambient',
    bpm: 95,
    key: '8B',
    energy: 48,
    provider: 'jamendo',
    isActive: true,
  },
];

export function loadTracks() {
  try {
    if (fs.existsSync(TRACKS_FILE)) {
      tracksCache = JSON.parse(fs.readFileSync(TRACKS_FILE, 'utf8'));
    } else {
      tracksCache = [...INITIAL_SEED_TRACKS];
      saveTracks();
    }
  } catch {
    tracksCache = [...INITIAL_SEED_TRACKS];
  }
  return tracksCache;
}

export function saveTracks() {
  try {
    atomicWriteJsonSync(TRACKS_FILE, tracksCache);
  } catch (e) {
    console.error('Failed to persist tracks database:', e.message);
  }
}

loadTracks();

export function listTracks({ search, genre, bpmMin, bpmMax, includeInactive = false } = {}) {
  loadTracks();
  let result = includeInactive ? tracksCache : tracksCache.filter((t) => t.isActive !== false);

  if (search) {
    const q = search.toLowerCase().trim();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist_name.toLowerCase().includes(q) ||
        (t.album_name && t.album_name.toLowerCase().includes(q)) ||
        (t.genre && t.genre.toLowerCase().includes(q))
    );
  }

  if (genre) {
    const g = genre.toLowerCase().trim();
    result = result.filter((t) => t.genre && t.genre.toLowerCase().includes(g));
  }

  if (bpmMin !== undefined && !isNaN(bpmMin)) {
    result = result.filter((t) => t.bpm && t.bpm >= Number(bpmMin));
  }

  if (bpmMax !== undefined && !isNaN(bpmMax)) {
    result = result.filter((t) => t.bpm && t.bpm <= Number(bpmMax));
  }

  return result;
}

export function getTrackById(id) {
  loadTracks();
  return tracksCache.find((t) => t.id === id) || null;
}

export function createTrack(trackData) {
  if (!trackData || !trackData.title || !String(trackData.title).trim()) {
    throw new Error('Title is required');
  }
  if (!trackData.artist_name || !String(trackData.artist_name).trim()) {
    throw new Error('Artist name is required');
  }
  if (!trackData.audio || !String(trackData.audio).trim()) {
    throw new Error('Audio stream URL is required');
  }

  const bpm = trackData.bpm ? parseInt(trackData.bpm, 10) : 124;
  if (bpm < 40 || bpm > 260) {
    throw new Error('BPM must be a valid number between 40 and 260');
  }

  const energy = trackData.energy !== undefined ? parseInt(trackData.energy, 10) : 75;
  if (energy < 0 || energy > 100) {
    throw new Error('Energy level must be between 0 and 100');
  }

  const camelotKey = normalizeCamelotKey(trackData.key || trackData.camelot_key || '8A');

  const newTrack = {
    id: trackData.id || `track_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title: trackData.title.trim(),
    artist_name: trackData.artist_name.trim(),
    album_name: (trackData.album_name || '').trim(),
    image: trackData.image || trackData.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
    duration: parseInt(trackData.duration, 10) || parseInt(trackData.duration_sec, 10) || 180,
    audio: trackData.audio.trim(),
    genre: (trackData.genre || 'Electronic').trim(),
    bpm,
    key: camelotKey,
    energy,
    provider: trackData.provider || 'jamendo',
    isActive: trackData.isActive !== false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    acousticFeatures: {
      danceability: trackData.danceability || 0.75,
      valence: trackData.valence || 0.65,
      analysisStatus: 'verified',
      analyzedAt: Date.now(),
    },
  };

  loadTracks();
  tracksCache.unshift(newTrack);
  saveTracks();

  return newTrack;
}

export function updateTrack(id, updateData) {
  loadTracks();
  const index = tracksCache.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error(`Track with ID ${id} not found`);
  }

  const existing = tracksCache[index];
  const camelotKey = updateData.key ? normalizeCamelotKey(updateData.key) : existing.key;

  const updated = {
    ...existing,
    title: updateData.title !== undefined ? updateData.title.trim() : existing.title,
    artist_name: updateData.artist_name !== undefined ? updateData.artist_name.trim() : existing.artist_name,
    album_name: updateData.album_name !== undefined ? updateData.album_name.trim() : existing.album_name,
    image: updateData.image || updateData.image_url || existing.image,
    duration: updateData.duration ? parseInt(updateData.duration, 10) : existing.duration,
    audio: updateData.audio ? updateData.audio.trim() : existing.audio,
    genre: updateData.genre !== undefined ? updateData.genre.trim() : existing.genre,
    bpm: updateData.bpm !== undefined ? parseInt(updateData.bpm, 10) : existing.bpm,
    key: camelotKey,
    energy: updateData.energy !== undefined ? parseInt(updateData.energy, 10) : existing.energy,
    isActive: updateData.isActive !== undefined ? Boolean(updateData.isActive) : existing.isActive,
    updatedAt: Date.now(),
  };

  tracksCache[index] = updated;
  saveTracks();

  return updated;
}

export function deactivateTrack(id) {
  loadTracks();
  const track = tracksCache.find((t) => t.id === id);
  if (!track) throw new Error(`Track with ID ${id} not found`);
  track.isActive = !track.isActive;
  track.updatedAt = Date.now();
  saveTracks();
  return track;
}

export function deleteTrack(id) {
  loadTracks();
  const initialLength = tracksCache.length;
  tracksCache = tracksCache.filter((t) => t.id !== id);
  if (tracksCache.length === initialLength) {
    throw new Error(`Track with ID ${id} not found`);
  }
  saveTracks();
  return { success: true, deletedId: id };
}

export function updateAcousticFeatures(id, { bpm, key, energy, danceability, valence, status }) {
  loadTracks();
  const track = tracksCache.find((t) => t.id === id);
  if (!track) throw new Error(`Track with ID ${id} not found`);

  if (bpm !== undefined) track.bpm = parseInt(bpm, 10);
  if (key !== undefined) track.key = normalizeCamelotKey(key);
  if (energy !== undefined) track.energy = Math.max(0, Math.min(100, parseInt(energy, 10)));

  track.acousticFeatures = {
    ...track.acousticFeatures,
    danceability: danceability !== undefined ? parseFloat(danceability) : track.acousticFeatures?.danceability || 0.75,
    valence: valence !== undefined ? parseFloat(valence) : track.acousticFeatures?.valence || 0.65,
    analysisStatus: status || 'verified',
    analyzedAt: Date.now(),
  };

  track.updatedAt = Date.now();
  saveTracks();
  return track;
}

export function auditCatalogueDataQuality() {
  loadTracks();
  const total = tracksCache.length;
  const active = tracksCache.filter((t) => t.isActive !== false).length;
  const flagged = [];

  tracksCache.forEach((track) => {
    const issues = [];
    if (!track.audio || track.audio.length < 5) issues.push('Missing or invalid audio stream URL');
    if (!track.duration || track.duration <= 0) issues.push('Invalid track duration');
    if (!track.bpm || track.bpm < 40 || track.bpm > 250) issues.push('Missing or out-of-bounds BPM');
    if (!track.key) issues.push('Missing musical or Camelot key');
    if (track.energy === undefined || track.energy < 0 || track.energy > 100) issues.push('Invalid energy metric');

    if (issues.length > 0) {
      flagged.push({
        id: track.id,
        title: track.title,
        artist: track.artist_name,
        issues,
      });
    }
  });

  return {
    totalTracks: total,
    activeTracks: active,
    verifiedTracks: total - flagged.length,
    flaggedTracksCount: flagged.length,
    flaggedTracks: flagged,
    dataQualityPercentage: total > 0 ? Math.round(((total - flagged.length) / total) * 100) : 100,
  };
}
