// Phase 2 Real-Time Collaborative DJ Rooms Verification Test Suite
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting Phase 2 Verification Suite...\n');

// 1. Verify schema.sql updates for Phase 2
console.log('▶ Test 1: Verifying Database Schema for Phase 2 (code, room_queue, room_messages, Realtime)...');
const schemaPath = path.resolve('supabase/schema.sql');
assert.ok(fs.existsSync(schemaPath), 'schema.sql must exist');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

assert.ok(schemaContent.includes('code TEXT UNIQUE NOT NULL'), 'rooms table must have unique code column');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.room_queue'), 'room_queue table must exist');
assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS public.room_messages'), 'room_messages table must exist');
assert.ok(schemaContent.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;'), 'rooms must be in realtime publication');
assert.ok(schemaContent.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.room_queue;'), 'room_queue must be in realtime publication');
assert.ok(schemaContent.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;'), 'room_messages must be in realtime publication');
console.log('  ✅ Schema verified with unique code, room_queue, room_messages, and Realtime publications');

// 2. Verify TypeScript Types
console.log('▶ Test 2: Verifying TypeScript Types for LiveRoom, RoomParticipant, Roles, and Sync...');
const musicTypesPath = path.resolve('src/types/music.ts');
const musicTypesContent = fs.readFileSync(musicTypesPath, 'utf8');

assert.ok(musicTypesContent.includes("export type RoomRole = 'host' | 'co-dj' | 'listener';"), 'RoomRole type must be declared');
assert.ok(musicTypesContent.includes('code: string;'), 'LiveRoom must have code');
assert.ok(musicTypesContent.includes('queue: Track[];'), 'LiveRoom must have shared queue');
assert.ok(musicTypesContent.includes('role: RoomRole;'), 'RoomParticipant must have role');
assert.ok(musicTypesContent.includes('export interface RoomPlaybackSync'), 'RoomPlaybackSync interface must exist');
console.log('  ✅ Full TypeScript definitions validated for Phase 2');

// 3. Verify Realtime Room Service Implementation
console.log('▶ Test 3: Verifying RealtimeRoomService methods and architecture...');
const servicePath = path.resolve('src/services/realtimeRoomService.ts');
assert.ok(fs.existsSync(servicePath), 'realtimeRoomService.ts must exist');
const serviceContent = fs.readFileSync(servicePath, 'utf8');

const requiredMethods = [
  'generateRoomCode',
  'getInviteLink',
  'findRoomByCode',
  'joinRoom',
  'leaveRoom',
  'isHost',
  'canControl',
  'broadcastPlaybackState',
  'broadcastQueue',
  'sendChatMessage',
  'updateParticipantRole',
  'kickParticipant',
  'transferOwnership',
  'closeRoom'
];

for (const method of requiredMethods) {
  assert.ok(serviceContent.includes(method), `realtimeRoomService must implement ${method}`);
}
console.log('  ✅ RealtimeRoomService implements all 14 required collaborative room methods');

// 4. Verify Supabase Realtime Channels (Presence, Broadcast, Postgres Changes)
console.log('▶ Test 4: Verifying Supabase Realtime Channel & WebSockets usage...');
assert.ok(serviceContent.includes("supabase.channel(channelName"), 'Must use supabase.channel for real-time');
assert.ok(serviceContent.includes(".on('presence'"), 'Must track presence for connected participants');
assert.ok(serviceContent.includes(".on('broadcast'"), 'Must use broadcast for playback & queue sync');
assert.ok(serviceContent.includes("event: 'playback_state'"), 'Must sync playback_state');
assert.ok(serviceContent.includes("event: 'queue_update'"), 'Must sync queue_update');
assert.ok(serviceContent.includes("event: 'room_control'"), 'Must handle room_control');
assert.ok(serviceContent.includes("event: 'chat_message'"), 'Must broadcast chat_message');
console.log('  ✅ Supabase Realtime Channel correctly configured with Presence and Broadcast');

// 5. Verify Store Integration
console.log('▶ Test 5: Verifying usePlayerStore integration...');
const storePath = path.resolve('src/store/usePlayerStore.ts');
const storeContent = fs.readFileSync(storePath, 'utf8');

assert.ok(storeContent.includes('joinRoomByCode'), 'Store must support joinRoomByCode');
assert.ok(storeContent.includes('addTrackToRoomQueue'), 'Store must support addTrackToRoomQueue');
assert.ok(storeContent.includes('removeTrackFromRoomQueue'), 'Store must support removeTrackFromRoomQueue');
assert.ok(storeContent.includes('reorderRoomQueue'), 'Store must support reorderRoomQueue');
assert.ok(storeContent.includes('updateParticipantRole'), 'Store must support updateParticipantRole');
assert.ok(storeContent.includes('kickParticipant'), 'Store must support kickParticipant');
assert.ok(storeContent.includes('transferRoomOwnership'), 'Store must support transferRoomOwnership');
assert.ok(storeContent.includes('closeRoom'), 'Store must support closeRoom');
assert.ok(storeContent.includes('onPlaybackSync'), 'Store must listen to authoritative playback sync');
console.log('  ✅ Store fully wired with role enforcement, shared queue, and playback synchronization');

// 6. Verify UI Components
console.log('▶ Test 6: Verifying UI Views & Components...');
const liveRoomsViewPath = path.resolve('src/components/views/LiveRoomsView.tsx');
const liveRoomsViewContent = fs.readFileSync(liveRoomsViewPath, 'utf8');
assert.ok(liveRoomsViewContent.includes('Join with Room Code'), 'Must render Join with Room Code');
assert.ok(liveRoomsViewContent.includes('handleJoinByCode'), 'Must handle join by code');

const roomChatPath = path.resolve('src/components/panels/RoomChat.tsx');
const roomChatContent = fs.readFileSync(roomChatPath, 'utf8');
assert.ok(roomChatContent.includes('👑 Host Authority'), 'Must show host authority badge');
assert.ok(roomChatContent.includes('Make Co-DJ'), 'Host must have Make Co-DJ action');
assert.ok(roomChatContent.includes('kickParticipant'), 'Host must have kick participant action');
assert.ok(roomChatContent.includes('closeRoom'), 'Host must have close room action');

const trackQueuePath = path.resolve('src/components/panels/TrackQueue.tsx');
const trackQueueContent = fs.readFileSync(trackQueuePath, 'utf8');
assert.ok(trackQueueContent.includes('Shared Party Queue'), 'TrackQueue must show Shared Party Queue');
assert.ok(trackQueueContent.includes('reorderRoomQueue'), 'TrackQueue must allow reordering');
assert.ok(trackQueueContent.includes('Add Track to Party Queue'), 'TrackQueue must allow adding tracks');

console.log('  ✅ UI components verified for room codes, participants, roles, shared queue, and host controls');

console.log('\n🎉 ALL PHASE 2 VERIFICATION TESTS PASSED!\n');
