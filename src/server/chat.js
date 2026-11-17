/**
 * AI DJ Studio — Real-Time Chat Persistence & Broadcast Subsystem
 * Enforces room isolation and server-authoritative message archiving.
 */

import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteJsonSync } from './db.js';
import { postgresAdapter } from './postgresAdapter.js';

const CHAT_FILE = path.resolve('data', 'room_messages.json');

// Map: roomId -> ChatMessage[]
const messagesByRoom = new Map();

function loadChat() {
  try {
    if (fs.existsSync(CHAT_FILE)) {
      const raw = fs.readFileSync(CHAT_FILE, 'utf8');
      const obj = raw ? JSON.parse(raw) : {};
      for (const [roomId, msgs] of Object.entries(obj)) {
        if (Array.isArray(msgs)) {
          messagesByRoom.set(roomId, msgs);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load chat records:', err.message);
  }
}

function saveChat() {
  try {
    const obj = {};
    for (const [roomId, msgs] of messagesByRoom.entries()) {
      obj[roomId] = msgs;
    }
    atomicWriteJsonSync(CHAT_FILE, obj);
  } catch (err) {
    console.error('Failed to persist chat messages:', err.message);
  }
}

loadChat();

export function getRoomMessages(roomId) {
  loadChat();
  const cleanRoomId = String(roomId || 'room_late_night_lounge').trim();
  return messagesByRoom.get(cleanRoomId) || [];
}

export function addRoomMessage(roomId, message) {
  const cleanRoomId = String(roomId || 'room_late_night_lounge').trim();
  if (!message || typeof message !== 'object') {
    throw new Error('Message object is required');
  }

  loadChat();
  const current = messagesByRoom.get(cleanRoomId) || [];
  const updated = [...current, message].slice(-100); // Last 100 messages per room
  messagesByRoom.set(cleanRoomId, updated);
  saveChat();

  if (postgresAdapter.getStatus().configured) {
    postgresAdapter.addRoomMessage(cleanRoomId, message).catch(() => {});
  }

  return message;
}

export function getAllActiveRoomsWithMessages() {
  return messagesByRoom;
}
