import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteJsonSync } from './db.js';

/**
 * AI DJ Studio — Human DJ vs DJ Soundclash Battle Engine & History Archive
 * Implements:
 * - Two-DJ head-to-head battle lifecycle
 * - Contender registration & track submissions from catalogue
 * - Live community voting with single-vote enforcement
 * - Dynamic score calculation & tie-break resolution
 * - Permanent historical battle archiving (data/soundclash_history.json)
 */

const DATA_DIR = path.resolve('data');
const BATTLES_FILE = path.join(DATA_DIR, 'soundclash_battles.json');
const HISTORY_FILE = path.join(DATA_DIR, 'soundclash_history.json');

let activeBattles = {}; // roomId -> Battle
let battleHistory = []; // [ CompletedBattle ]

function loadData() {
  try {
    if (fs.existsSync(BATTLES_FILE)) {
      activeBattles = JSON.parse(fs.readFileSync(BATTLES_FILE, 'utf8'));
    }
  } catch {
    activeBattles = {};
  }

  try {
    if (fs.existsSync(HISTORY_FILE)) {
      battleHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch {
    battleHistory = [];
  }
}

function saveData() {
  try {
    atomicWriteJsonSync(BATTLES_FILE, activeBattles);
    atomicWriteJsonSync(HISTORY_FILE, battleHistory);
  } catch (e) {
    console.error('Failed to persist soundclash data:', e.message);
  }
}

loadData();

export function createHumanSoundclash({
  roomId,
  title,
  dj1, // { id, name, avatar }
  dj2, // { id, name, avatar }
  durationSec = 45,
}) {
  if (!roomId || !dj1) {
    throw new Error('Room ID and Lead DJ are required to initiate a battle');
  }

  loadData();
  const battleId = `clash_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const battle = {
    id: battleId,
    roomId,
    title: title || 'Soundclash: DJ vs DJ Battle Royale! 🔥',
    dj1: {
      user: dj1,
      track: null,
      votes: 0,
    },
    dj2: dj2
      ? {
          user: dj2,
          track: null,
          votes: 0,
        }
      : null,
    status: dj2 ? 'pending_submission' : 'waiting_for_challenger',
    durationSec,
    startedAt: null,
    endsAt: null,
    votes: {}, // userId -> 'dj1' | 'dj2'
    winner: null,
    totalVotes: 0,
  };

  activeBattles[roomId] = battle;
  saveData();
  return battle;
}

export function registerChallenger(roomId, challengerUser) {
  loadData();
  const battle = activeBattles[roomId];
  if (!battle) throw new Error('No active battle found in this room');
  if (battle.status !== 'waiting_for_challenger') {
    throw new Error('Battle already has a registered challenger');
  }
  if (battle.dj1.user.id === challengerUser.id) {
    throw new Error('You cannot challenge yourself in a Soundclash battle');
  }

  battle.dj2 = {
    user: challengerUser,
    track: null,
    votes: 0,
  };
  battle.status = 'pending_submission';
  saveData();
  return battle;
}

export function submitBattleTrack(roomId, userId, track) {
  loadData();
  const battle = activeBattles[roomId];
  if (!battle) throw new Error('No active battle found in this room');
  if (battle.status !== 'pending_submission' && battle.status !== 'waiting_for_challenger') {
    throw new Error('Track submission window has closed');
  }

  if (battle.dj1 && battle.dj1.user.id === userId) {
    battle.dj1.track = track;
  } else if (battle.dj2 && battle.dj2.user.id === userId) {
    battle.dj2.track = track;
  } else {
    throw new Error('You are not registered as a competing DJ in this battle');
  }

  // If both DJs have submitted their weapons of choice, commence the battle countdown!
  if (battle.dj1?.track && battle.dj2?.track) {
    const now = Date.now();
    battle.status = 'active';
    battle.startedAt = now;
    battle.endsAt = now + battle.durationSec * 1000;
  }

  saveData();
  return battle;
}

export function castBattleVote(roomId, userId, choice) {
  if (choice !== 'dj1' && choice !== 'dj2') {
    throw new Error('Vote choice must be either "dj1" or "dj2"');
  }

  loadData();
  const battle = activeBattles[roomId];
  if (!battle) throw new Error('No active battle in this room');
  if (battle.status !== 'active') throw new Error('Battle is not currently accepting votes');

  if (Date.now() > battle.endsAt) {
    return evaluateBattleWinner(roomId);
  }

  battle.votes[userId] = choice;

  // Recount votes
  let v1 = 0;
  let v2 = 0;
  Object.values(battle.votes).forEach((c) => {
    if (c === 'dj1') v1++;
    else if (c === 'dj2') v2++;
  });

  battle.dj1.votes = v1;
  battle.dj2.votes = v2;
  battle.totalVotes = v1 + v2;

  saveData();
  return battle;
}

export function evaluateBattleWinner(roomId) {
  loadData();
  const battle = activeBattles[roomId];
  if (!battle) throw new Error('No active battle in this room');

  const v1 = battle.dj1.votes || 0;
  const v2 = battle.dj2 ? battle.dj2.votes || 0 : 0;

  let winnerChoice = 'dj1';
  if (v2 > v1) {
    winnerChoice = 'dj2';
  } else if (v2 === v1) {
    // Tie breaker: compare track energy
    const e1 = battle.dj1.track?.energy || 80;
    const e2 = battle.dj2?.track?.energy || 80;
    winnerChoice = e2 > e1 ? 'dj2' : 'dj1';
  }

  const winningDJ = winnerChoice === 'dj1' ? battle.dj1 : battle.dj2;

  battle.status = 'ended';
  battle.winner = {
    choice: winnerChoice,
    dj: winningDJ.user,
    track: winningDJ.track,
    votes: winningDJ.votes,
  };

  // Archive to permanent soundclash history
  const historyEntry = {
    id: `hist_${battle.id}`,
    battleId: battle.id,
    roomId: battle.roomId,
    title: battle.title,
    dj1: { name: battle.dj1.user.name, votes: battle.dj1.votes, trackTitle: battle.dj1.track?.title },
    dj2: battle.dj2
      ? { name: battle.dj2.user.name, votes: battle.dj2.votes, trackTitle: battle.dj2.track?.title }
      : null,
    winner: battle.winner,
    totalVotes: battle.totalVotes,
    completedAt: Date.now(),
  };

  battleHistory.unshift(historyEntry);
  if (battleHistory.length > 100) battleHistory = battleHistory.slice(0, 100);

  saveData();
  return battle;
}

export function getActiveBattle(roomId) {
  loadData();
  const battle = activeBattles[roomId];
  if (battle && battle.status === 'active' && Date.now() > battle.endsAt) {
    return evaluateBattleWinner(roomId);
  }
  return battle || null;
}

export function getSoundclashHistory(roomId) {
  loadData();
  if (roomId) {
    return battleHistory.filter((b) => b.roomId === roomId);
  }
  return battleHistory;
}
