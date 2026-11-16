import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteJsonSync } from './db.js';

/**
 * AI DJ Studio — Collaborative Queue Voting, Event Audit & Concurrency Management
 * Implements:
 * - Upvote (+1) and Downvote (-1) tallying per track in active room queue
 * - Single-vote-per-user enforcement with vote reversal and withdrawal
 * - Queue sorting by vote differential with stable tie-breaking
 * - Persistent queue event audit logging
 */

const DATA_DIR = path.resolve('data');
const VOTES_FILE = path.join(DATA_DIR, 'queue_votes.json');
const EVENTS_FILE = path.join(DATA_DIR, 'queue_events.json');

// Memory caches
let votesByRoom = {}; // roomId -> { [queueItemId]: { [userId]: 1 | -1 } }
let eventsByRoom = {}; // roomId -> [ QueueEvent ]

function loadData() {
  try {
    if (fs.existsSync(VOTES_FILE)) {
      votesByRoom = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
    }
  } catch {
    votesByRoom = {};
  }

  try {
    if (fs.existsSync(EVENTS_FILE)) {
      eventsByRoom = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    }
  } catch {
    eventsByRoom = {};
  }
}

function saveData() {
  try {
    atomicWriteJsonSync(VOTES_FILE, votesByRoom);
    atomicWriteJsonSync(EVENTS_FILE, eventsByRoom);
  } catch (e) {
    console.error('Failed to persist queue data:', e.message);
  }
}

loadData();

export function castQueueVote(roomId, queueItemId, userId, voteValue) {
  if (!roomId || !queueItemId || !userId) {
    throw new Error('Room ID, Queue Item ID, and User ID are required');
  }

  const voteNum = parseInt(voteValue, 10);
  if (voteNum !== 1 && voteNum !== -1 && voteNum !== 0) {
    throw new Error('Vote value must be 1 (upvote), -1 (downvote), or 0 (neutral/withdraw)');
  }

  loadData();
  if (!votesByRoom[roomId]) votesByRoom[roomId] = {};
  if (!votesByRoom[roomId][queueItemId]) votesByRoom[roomId][queueItemId] = {};

  const currentVote = votesByRoom[roomId][queueItemId][userId] || 0;

  if (voteNum === 0 || currentVote === voteNum) {
    // Withdraw vote
    delete votesByRoom[roomId][queueItemId][userId];
    logQueueEvent({
      roomId,
      userId,
      trackId: queueItemId,
      eventType: 'vote_removed',
      metadata: { previousVote: currentVote },
    });
  } else {
    votesByRoom[roomId][queueItemId][userId] = voteNum;
    logQueueEvent({
      roomId,
      userId,
      trackId: queueItemId,
      eventType: currentVote === 0 ? 'vote_added' : 'vote_changed',
      metadata: { newVote: voteNum, previousVote: currentVote },
    });
  }

  saveData();

  return getQueueVotes(roomId);
}

export function getQueueVotes(roomId) {
  loadData();
  const roomVotes = votesByRoom[roomId] || {};
  const scores = {};

  Object.entries(roomVotes).forEach(([itemId, userVotes]) => {
    let up = 0;
    let down = 0;
    Object.values(userVotes).forEach((v) => {
      if (v === 1) up++;
      else if (v === -1) down++;
    });
    scores[itemId] = {
      score: up - down,
      upvotes: up,
      downvotes: down,
      userVotes,
    };
  });

  return scores;
}

export function sortQueueByVotes(queue, roomId) {
  const votes = getQueueVotes(roomId);
  return [...queue].sort((a, b) => {
    const scoreA = votes[a.id]?.score || 0;
    const scoreB = votes[b.id]?.score || 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // Stable tie-break by original position
    return 0;
  });
}

export function logQueueEvent({ roomId, userId, trackId, eventType, metadata = {} }) {
  const event = {
    id: `qev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    roomId,
    userId,
    trackId,
    eventType,
    metadata,
    timestamp: Date.now(),
  };

  if (!eventsByRoom[roomId]) eventsByRoom[roomId] = [];
  eventsByRoom[roomId].push(event);

  // Keep latest 200 events per room
  if (eventsByRoom[roomId].length > 200) {
    eventsByRoom[roomId] = eventsByRoom[roomId].slice(-200);
  }

  saveData();
  return event;
}

export function getQueueEvents(roomId) {
  loadData();
  return eventsByRoom[roomId] || [];
}
