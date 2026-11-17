/**
 * AI DJ Studio — User Library, Playlists & History Persistence Authority
 * Manages user-specific playlists, favorites, and listening history with atomic persistence.
 */

import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteJsonSync } from './db.js';
import { postgresAdapter } from './postgresAdapter.js';

const PLAYLISTS_FILE = path.resolve('data', 'playlists.json');
const LIKES_FILE = path.resolve('data', 'liked_tracks.json');
const HISTORY_FILE = path.resolve('data', 'listening_history.json');

let playlistsCache = [];
let likesCache = {}; // userId -> string[] of trackIds
let historyCache = {}; // userId -> Track[]

function loadLibrary() {
  try {
    if (fs.existsSync(PLAYLISTS_FILE)) {
      const raw = fs.readFileSync(PLAYLISTS_FILE, 'utf8');
      playlistsCache = raw ? JSON.parse(raw) : [];
    } else {
      playlistsCache = [];
    }
  } catch {
    playlistsCache = [];
  }

  try {
    if (fs.existsSync(LIKES_FILE)) {
      const raw = fs.readFileSync(LIKES_FILE, 'utf8');
      likesCache = raw ? JSON.parse(raw) : {};
    } else {
      likesCache = {};
    }
  } catch {
    likesCache = {};
  }

  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
      historyCache = raw ? JSON.parse(raw) : {};
    } else {
      historyCache = {};
    }
  } catch {
    historyCache = {};
  }
}

function savePlaylists() {
  try {
    atomicWriteJsonSync(PLAYLISTS_FILE, playlistsCache);
  } catch (err) {
    console.error('Failed to persist playlists:', err.message);
  }
}

function saveLikes() {
  try {
    atomicWriteJsonSync(LIKES_FILE, likesCache);
  } catch (err) {
    console.error('Failed to persist likes:', err.message);
  }
}

function saveHistory() {
  try {
    atomicWriteJsonSync(HISTORY_FILE, historyCache);
  } catch (err) {
    console.error('Failed to persist history:', err.message);
  }
}

loadLibrary();

// ---------------------------------------------------------------------------
// 1. Playlists Operations
// ---------------------------------------------------------------------------

export function getUserPlaylists(userId) {
  loadLibrary();
  const cleanId = String(userId || '').trim();
  if (!cleanId) return [];
  return playlistsCache.filter((p) => p.userId === cleanId);
}

export function createPlaylist(userId, data) {
  const cleanId = String(userId || '').trim();
  if (!cleanId) {
    throw new Error('User ID is required to create a playlist');
  }
  if (!data || !data.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Playlist name is required');
  }

  loadLibrary();

  const newPlaylist = {
    id: data.id || `pl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: cleanId,
    name: data.name.trim(),
    description: (data.description || '').trim(),
    image: data.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
    trackCount: Array.isArray(data.tracks) ? data.tracks.length : 0,
    category: 'user',
    tracks: Array.isArray(data.tracks) ? data.tracks : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  playlistsCache.unshift(newPlaylist);
  savePlaylists();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.createPlaylist(cleanId, newPlaylist).catch(() => {});
  }

  return newPlaylist;
}

export function addTrackToPlaylist(userId, playlistId, track) {
  if (!track || !track.id) {
    throw new Error('Valid track is required to add to playlist');
  }

  loadLibrary();
  const index = playlistsCache.findIndex((p) => p.id === playlistId && p.userId === userId);
  if (index < 0) {
    throw new Error(`Playlist not found or you do not have permission: ${playlistId}`);
  }

  const pl = playlistsCache[index];
  if (!Array.isArray(pl.tracks)) pl.tracks = [];

  // Avoid duplicates if track already in playlist
  if (!pl.tracks.some((t) => t.id === track.id)) {
    pl.tracks.push(track);
    pl.trackCount = pl.tracks.length;
    pl.updatedAt = Date.now();
    playlistsCache[index] = pl;
    savePlaylists();

    if (postgresAdapter.getStatus().configured) {
      postgresAdapter.addTrackToPlaylist(playlistId, track).catch(() => {});
    }
  }

  return pl;
}

export function removeTrackFromPlaylist(userId, playlistId, trackId) {
  loadLibrary();
  const index = playlistsCache.findIndex((p) => p.id === playlistId && p.userId === userId);
  if (index < 0) {
    throw new Error(`Playlist not found or you do not have permission: ${playlistId}`);
  }

  const pl = playlistsCache[index];
  if (Array.isArray(pl.tracks)) {
    pl.tracks = pl.tracks.filter((t) => t.id !== trackId);
    pl.trackCount = pl.tracks.length;
    pl.updatedAt = Date.now();
    playlistsCache[index] = pl;
    savePlaylists();

    if (postgresAdapter.getStatus().configured) {
      postgresAdapter.removeTrackFromPlaylist(playlistId, trackId).catch(() => {});
    }
  }

  return pl;
}

export function deletePlaylist(userId, playlistId) {
  loadLibrary();
  const initialLen = playlistsCache.length;
  playlistsCache = playlistsCache.filter((p) => !(p.id === playlistId && p.userId === userId));

  if (playlistsCache.length === initialLen) {
    throw new Error(`Playlist not found or you do not have permission: ${playlistId}`);
  }

  savePlaylists();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.deletePlaylist(playlistId).catch(() => {});
  }

  return { success: true, deletedId: playlistId };
}

// ---------------------------------------------------------------------------
// 2. Liked Songs Operations
// ---------------------------------------------------------------------------

export function getUserLikedTracks(userId) {
  loadLibrary();
  const cleanId = String(userId || '').trim();
  if (!cleanId) return [];
  return likesCache[cleanId] || [];
}

export function toggleLikeTrack(userId, trackId, forceLiked = null) {
  const cleanId = String(userId || '').trim();
  const cleanTrackId = String(trackId || '').trim();
  if (!cleanId || !cleanTrackId) {
    throw new Error('User ID and Track ID are required');
  }

  loadLibrary();
  const userLikes = likesCache[cleanId] || [];
  const currentlyLiked = userLikes.includes(cleanTrackId);

  let newLikes;
  let isNowLiked;

  if (forceLiked !== null) {
    isNowLiked = Boolean(forceLiked);
    if (isNowLiked && !currentlyLiked) {
      newLikes = [...userLikes, cleanTrackId];
    } else if (!isNowLiked && currentlyLiked) {
      newLikes = userLikes.filter((id) => id !== cleanTrackId);
    } else {
      newLikes = userLikes;
    }
  } else {
    // Toggle
    if (currentlyLiked) {
      newLikes = userLikes.filter((id) => id !== cleanTrackId);
      isNowLiked = false;
    } else {
      newLikes = [...userLikes, cleanTrackId];
      isNowLiked = true;
    }
  }

  likesCache[cleanId] = newLikes;
  saveLikes();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.toggleLikeTrack(cleanId, { id: cleanTrackId }).catch(() => {});
  }

  return { liked: isNowLiked, isLiked: isNowLiked, likedTracks: newLikes, likedTrackIds: newLikes };
}

// ---------------------------------------------------------------------------
// 3. Listening History Operations
// ---------------------------------------------------------------------------

export function getUserListeningHistory(userId) {
  loadLibrary();
  const cleanId = String(userId || '').trim();
  if (!cleanId) return [];
  return historyCache[cleanId] || [];
}

export function recordListeningHistory(userId, track) {
  const cleanId = String(userId || '').trim();
  if (!cleanId || !track || !track.id) return [];

  loadLibrary();
  const current = historyCache[cleanId] || [];

  // Filter out duplicate if recently played, prepend track
  const filtered = current.filter((t) => t.id !== track.id);
  const updated = [track, ...filtered].slice(0, 100); // Keep last 100 tracks

  historyCache[cleanId] = updated;
  saveHistory();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.recordListeningHistory(cleanId, track).catch(() => {});
  }

  return updated;
}
