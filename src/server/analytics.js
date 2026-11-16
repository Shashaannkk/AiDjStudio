import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteJsonSync } from './db.js';

/**
 * AI DJ Studio — Persistent Session Analytics & Dynamic Metric Aggregation
 * Implements:
 * - Session initiation, duration tracking, and lifecycle completion
 * - Granular session event logging (track_play, track_skip, queue_add, vote_cast)
 * - Dynamic user metrics calculation (preferred BPM, top key, listening hours)
 * - Real-time platform listening analytics
 */

const DATA_DIR = path.resolve('data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const EVENTS_FILE = path.join(DATA_DIR, 'session_events.json');

let sessionsDb = [];
let eventsDb = [];

function loadData() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      sessionsDb = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    }
  } catch {
    sessionsDb = [];
  }

  try {
    if (fs.existsSync(EVENTS_FILE)) {
      eventsDb = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    }
  } catch {
    eventsDb = [];
  }
}

function saveData() {
  try {
    atomicWriteJsonSync(SESSIONS_FILE, sessionsDb);
    atomicWriteJsonSync(EVENTS_FILE, eventsDb);
  } catch (e) {
    console.error('Failed to persist analytics data:', e.message);
  }
}

loadData();

export function startSession({ userId, roomId = 'main_studio', metadata = {} }) {
  if (!userId) throw new Error('User ID is required to start an analytics session');
  loadData();

  const session = {
    id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    roomId,
    startedAt: Date.now(),
    endedAt: null,
    durationSec: 0,
    tracksPlayed: 0,
    metadata,
  };

  sessionsDb.unshift(session);
  if (sessionsDb.length > 500) sessionsDb = sessionsDb.slice(0, 500);

  recordSessionEvent({
    sessionId: session.id,
    userId,
    eventType: 'session_start',
    details: metadata,
  });

  saveData();
  return session;
}

export function endSession(sessionId) {
  loadData();
  const session = sessionsDb.find((s) => s.id === sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const now = Date.now();
  session.endedAt = now;
  session.durationSec = Math.max(1, Math.round((now - session.startedAt) / 1000));

  recordSessionEvent({
    sessionId,
    userId: session.userId,
    eventType: 'session_end',
    details: { durationSec: session.durationSec },
  });

  saveData();
  return session;
}

export function recordSessionEvent({ sessionId, userId, eventType, trackId, details = {} }) {
  const validEvents = [
    'session_start',
    'session_end',
    'track_play',
    'track_skip',
    'queue_add',
    'vote_cast',
    'soundclash_win',
    'reaction_sent',
  ];

  if (!validEvents.includes(eventType)) {
    throw new Error(`Invalid event type: ${eventType}`);
  }

  const event = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    sessionId: sessionId || 'default_session',
    userId: userId || 'anonymous',
    eventType,
    trackId: trackId || null,
    details,
    timestamp: Date.now(),
  };

  eventsDb.unshift(event);
  if (eventsDb.length > 1000) eventsDb = eventsDb.slice(0, 1000);

  // If track_play, increment session tracks counter
  if (eventType === 'track_play' && sessionId) {
    const sess = sessionsDb.find((s) => s.id === sessionId);
    if (sess) sess.tracksPlayed++;
  }

  saveData();
  return event;
}

export function getUserAnalytics(userId) {
  loadData();
  const userSessions = sessionsDb.filter((s) => s.userId === userId);
  const userEvents = eventsDb.filter((e) => e.userId === userId);

  let totalDurationSec = 0;
  userSessions.forEach((s) => {
    totalDurationSec += s.durationSec || (s.endedAt ? Math.round((s.endedAt - s.startedAt) / 1000) : 0);
  });

  const playEvents = userEvents.filter((e) => e.eventType === 'track_play');
  const bpmList = [];
  const keyCounts = {};
  const genreCounts = {};

  playEvents.forEach((ev) => {
    if (ev.details?.bpm) bpmList.push(Number(ev.details.bpm));
    if (ev.details?.key) {
      keyCounts[ev.details.key] = (keyCounts[ev.details.key] || 0) + 1;
    }
    if (ev.details?.genre) {
      genreCounts[ev.details.genre] = (genreCounts[ev.details.genre] || 0) + 1;
    }
  });

  const averageBpm = bpmList.length > 0 ? Math.round(bpmList.reduce((a, b) => a + b, 0) / bpmList.length) : 124;

  let topKey = '8A';
  let maxKeyCount = 0;
  Object.entries(keyCounts).forEach(([k, count]) => {
    if (count > maxKeyCount) {
      maxKeyCount = count;
      topKey = k;
    }
  });

  return {
    userId,
    totalSessions: userSessions.length,
    totalListeningMinutes: Math.round(totalDurationSec / 60),
    preferredBpm: averageBpm,
    topKey,
    tracksPlayedCount: playEvents.length,
    queueActionsCount: userEvents.filter((e) => e.eventType === 'queue_add').length,
    votesCastCount: userEvents.filter((e) => e.eventType === 'vote_cast').length,
    recentSessions: userSessions.slice(0, 10),
    activityTimeline: userEvents.slice(0, 20),
  };
}

export function getPlatformAnalytics() {
  loadData();
  let totalPlatformSec = 0;
  sessionsDb.forEach((s) => {
    totalPlatformSec += s.durationSec || 0;
  });

  return {
    totalSessions: sessionsDb.length,
    totalListeningHours: Math.round((totalPlatformSec / 3600) * 10) / 10,
    totalEventsRecorded: eventsDb.length,
    totalTracksPlayed: eventsDb.filter((e) => e.eventType === 'track_play').length,
    totalVotesCast: eventsDb.filter((e) => e.eventType === 'vote_cast').length,
    activeSessions: sessionsDb.filter((s) => !s.endedAt).length,
  };
}
