/**
 * AI DJ Studio — Room Authority & Real-Time Presence Subsystem
 * Enforces strict maximum 50 active participants per DJ Lounge room.
 * Manages server-authoritative room state, lifecycle, and atomic persistence.
 */

import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteJsonSync } from './db.js';
import { postgresAdapter } from './postgresAdapter.js';

const ROOMS_FILE = path.resolve('data', 'rooms.json');
const MAX_CAPACITY = 50;

// In-memory capacity cache for O(1) atomic capacity gating
const participantsByRoom = new Map(); // roomId -> Set of userIds

// In-memory room cache
let roomsCache = [];

function loadRooms() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const raw = fs.readFileSync(ROOMS_FILE, 'utf8');
      roomsCache = raw ? JSON.parse(raw) : [];
    } else {
      roomsCache = [];
    }
  } catch {
    roomsCache = [];
  }

  // Populate participantsByRoom from persistent records on startup
  for (const room of roomsCache) {
    if (!participantsByRoom.has(room.id)) {
      const set = new Set();
      if (Array.isArray(room.participants)) {
        room.participants.forEach((p) => {
          if (p && p.id) set.add(p.id);
        });
      }
      participantsByRoom.set(room.id, set);
    }
  }
}

function saveRooms() {
  try {
    atomicWriteJsonSync(ROOMS_FILE, roomsCache);
  } catch (err) {
    console.error('Failed to persist rooms:', err.message);
  }
}

// Initial load
loadRooms();

// ---------------------------------------------------------------------------
// 1. Capacity Enforcement (PRD REQ-028, REQ-029)
// ---------------------------------------------------------------------------

export function joinRoomCapacity(roomId, userId) {
  if (!roomId || !userId) {
    throw new Error('Room ID and User ID are required to join room');
  }

  loadRooms();
  const room = getRoom(roomId);
  const canonicalId = room ? room.id : roomId;

  let roomParticipants = participantsByRoom.get(canonicalId);
  if (!roomParticipants) {
    roomParticipants = new Set();
    participantsByRoom.set(canonicalId, roomParticipants);
  }

  // If user is already active in this room, refresh presence safely
  if (roomParticipants.has(userId)) {
    return {
      success: true,
      currentCount: roomParticipants.size,
      maxCapacity: MAX_CAPACITY,
    };
  }

  // Atomic capacity boundary check
  if (roomParticipants.size >= MAX_CAPACITY) {
    const error = new Error('ROOM_CAPACITY_REACHED: Room has reached its maximum limit of 50 participants.');
    error.code = 'ROOM_CAPACITY_REACHED';
    error.status = 409;
    throw error;
  }

  roomParticipants.add(userId);

  return {
    success: true,
    currentCount: roomParticipants.size,
    maxCapacity: MAX_CAPACITY,
  };
}

export function leaveRoomCapacity(roomId, userId) {
  if (!roomId || !userId) return { success: true };

  loadRooms();
  const room = getRoom(roomId);
  const canonicalId = room ? room.id : roomId;

  const roomParticipants = participantsByRoom.get(canonicalId);
  if (roomParticipants) {
    roomParticipants.delete(userId);
    return {
      success: true,
      currentCount: roomParticipants.size,
      maxCapacity: MAX_CAPACITY,
    };
  }

  return { success: true, currentCount: 0, maxCapacity: MAX_CAPACITY };
}

export function getRoomCapacity(roomId) {
  loadRooms();
  const room = getRoom(roomId);
  const canonicalId = room ? room.id : roomId;

  const roomParticipants = participantsByRoom.get(canonicalId);
  const count = roomParticipants ? roomParticipants.size : 0;
  return {
    roomId: canonicalId,
    currentCount: count,
    maxCapacity: MAX_CAPACITY,
    isFull: count >= MAX_CAPACITY,
  };
}

// ---------------------------------------------------------------------------
// 2. Full Server-Authoritative Room Lifecycle Operations
// ---------------------------------------------------------------------------

export function listRooms() {
  loadRooms();
  // Filter active live rooms, update real listenerCount from active participants
  return roomsCache.filter((r) => r.isLive !== false).map((r) => {
    const liveSet = participantsByRoom.get(r.id);
    const count = liveSet ? liveSet.size : (r.participants?.length || 0);
    return {
      ...r,
      listenerCount: count,
    };
  });
}

export function getRoom(idOrCode) {
  loadRooms();
  const clean = String(idOrCode || '').trim();
  const room = roomsCache.find(
    (r) => r.id === clean || (r.code && r.code.toUpperCase() === clean.toUpperCase())
  );
  if (!room) return null;

  const liveSet = participantsByRoom.get(room.id);
  const count = liveSet ? liveSet.size : (room.participants?.length || 0);
  return {
    ...room,
    listenerCount: count,
  };
}

export function createRoom(data, hostUser) {
  if (!data || !data.name || typeof data.name !== 'string') {
    throw new Error('Room name is required');
  }

  loadRooms();

  const code = (data.code || ('DJ' + Math.random().toString(36).substring(2, 6).toUpperCase())).trim().toUpperCase();

  // If a live room already exists with this code or ID, return it idempotently
  const existing = roomsCache.find((r) => r.isLive && (r.code === code || (data.id && r.id === data.id)));
  if (existing) {
    return existing;
  }

  const roomId = data.id || `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const hostId = hostUser?.id || data.hostId || 'guest_host';
  const hostName = hostUser?.name || data.hostName || 'Resident DJ';
  const hostAvatar = hostUser?.avatar || data.hostAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';

  const hostParticipant = {
    id: hostId,
    name: hostName,
    email: hostUser?.email || data.hostEmail || `${hostId}@aidjstudio.com`,
    avatar: hostAvatar,
    role: 'host',
    isHost: true,
    isOnline: true,
  };

  const newRoom = {
    id: roomId,
    code,
    name: data.name.trim(),
    genre: data.genre || 'Open Format',
    cover: data.cover || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    hostId,
    hostName,
    hostAvatar,
    isLive: true,
    listenerCount: 1,
    tags: Array.isArray(data.tags) ? data.tags : ['Live DJ', 'Interactive'],
    participants: [hostParticipant],
    queue: Array.isArray(data.queue) ? data.queue : [],
    currentTrack: data.currentTrack || null,
    currentPosition: 0,
    isPlaying: false,
    roomMood: { mood: 'energetic', confidence: 90, sampleSize: 1, isManualOverride: false },
    createdAt: Date.now(),
  };

  roomsCache.unshift(newRoom);
  saveRooms();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.createRoom(newRoom, hostUser).catch((err) => {
      console.warn('[POSTGRES SYNC] Room create error:', err.message);
    });
  }

  // Register in memory capacity
  let set = participantsByRoom.get(roomId);
  if (!set) {
    set = new Set();
    participantsByRoom.set(roomId, set);
  }
  set.add(hostId);

  return newRoom;
}

export function updateRoom(roomId, updates, actingUser = null) {
  loadRooms();
  const index = roomsCache.findIndex((r) => r.id === roomId || r.code === roomId);
  if (index < 0) {
    throw new Error(`Room not found: ${roomId}`);
  }

  const room = roomsCache[index];

  // If actingUser is supplied, verify host or admin
  if (actingUser && actingUser.role !== 'admin' && room.hostId !== actingUser.id) {
    // Check if participant is co-dj
    const p = room.participants?.find((part) => part.id === actingUser.id);
    if (!p || (p.role !== 'co-dj' && p.role !== 'host')) {
      throw new Error('Forbidden: Only room host or Co-DJ can modify room settings');
    }
  }

  const allowedFields = [
    'name',
    'genre',
    'cover',
    'tags',
    'queue',
    'currentTrack',
    'currentPosition',
    'isPlaying',
    'roomMood',
    'isLive',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      room[field] = updates[field];
    }
  }

  room.updatedAt = Date.now();
  roomsCache[index] = room;
  saveRooms();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.updateRoom(roomId, updates).catch((err) => {
      console.warn('[POSTGRES SYNC] Room update error:', err.message);
    });
  }

  return room;
}

export function joinRoom(roomId, user) {
  if (!user || !user.id) {
    throw new Error('Authenticated user required to join room');
  }

  loadRooms();
  const index = roomsCache.findIndex((r) => r.id === roomId || r.code === roomId);
  if (index < 0) {
    throw new Error(`Room not found: ${roomId}`);
  }

  const room = roomsCache[index];

  // Enforce atomic capacity limit (50 max)
  joinRoomCapacity(room.id, user.id);

  if (!Array.isArray(room.participants)) {
    room.participants = [];
  }

  const existingIdx = room.participants.findIndex((p) => p.id === user.id);
  if (existingIdx >= 0) {
    room.participants[existingIdx].isOnline = true;
    room.participants[existingIdx].name = user.name || room.participants[existingIdx].name;
    room.participants[existingIdx].avatar = user.avatar || room.participants[existingIdx].avatar;
  } else {
    const isFirstParticipant = room.participants.length === 0;
    room.participants.push({
      id: user.id,
      name: user.name || 'DJ Listener',
      email: user.email || `${user.id}@aidjstudio.com`,
      avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      role: isFirstParticipant ? 'host' : 'listener',
      isHost: isFirstParticipant,
      isOnline: true,
    });
  }

  const liveSet = participantsByRoom.get(room.id);
  room.listenerCount = liveSet ? liveSet.size : room.participants.length;

  roomsCache[index] = room;
  saveRooms();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.joinRoom(room.id, user).catch(() => {});
  }

  return room;
}

export function leaveRoom(roomId, userId) {
  if (!userId) return { success: true };

  loadRooms();
  const index = roomsCache.findIndex((r) => r.id === roomId || r.code === roomId);
  if (index < 0) return { success: true };

  const room = roomsCache[index];
  leaveRoomCapacity(room.id, userId);

  if (Array.isArray(room.participants)) {
    // If not host, remove from participants; if host, mark offline
    if (room.hostId === userId) {
      const hostPart = room.participants.find((p) => p.id === userId);
      if (hostPart) hostPart.isOnline = false;
    } else {
      room.participants = room.participants.filter((p) => p.id !== userId);
    }
  }

  const liveSet = participantsByRoom.get(room.id);
  room.listenerCount = liveSet ? liveSet.size : (room.participants?.length || 0);

  roomsCache[index] = room;
  saveRooms();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.leaveRoom(room.id, userId).catch(() => {});
  }

  return { success: true, listenerCount: room.listenerCount };
}

export function closeRoom(roomId, hostUserId) {
  loadRooms();
  const index = roomsCache.findIndex((r) => r.id === roomId || r.code === roomId);
  if (index < 0) {
    throw new Error(`Room not found: ${roomId}`);
  }

  const room = roomsCache[index];
  if (hostUserId && room.hostId !== hostUserId) {
    throw new Error('Forbidden: Only room host can close the room');
  }

  room.isLive = false;
  room.closedAt = Date.now();
  roomsCache[index] = room;
  saveRooms();

  // Clean capacity map
  participantsByRoom.delete(room.id);

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.closeRoom(room.id).catch(() => {});
  }

  return { success: true, closedRoomId: room.id };
}
