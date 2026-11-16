/**
 * AI DJ Studio — Room Capacity & Concurrency Enforcement Authority
 * Enforces strict maximum 50 active participants per DJ Lounge room.
 * Validates atomic joins and rejects the 51st participant.
 */

const MAX_CAPACITY = 50;
const participantsByRoom = new Map(); // roomId -> Set of userIds

export function joinRoomCapacity(roomId, userId) {
  if (!roomId || !userId) {
    throw new Error('Room ID and User ID are required to join room');
  }

  let roomParticipants = participantsByRoom.get(roomId);
  if (!roomParticipants) {
    roomParticipants = new Set();
    participantsByRoom.set(roomId, roomParticipants);
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

  const roomParticipants = participantsByRoom.get(roomId);
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
  const roomParticipants = participantsByRoom.get(roomId);
  const count = roomParticipants ? roomParticipants.size : 0;
  return {
    roomId,
    currentCount: count,
    maxCapacity: MAX_CAPACITY,
    isFull: count >= MAX_CAPACITY,
  };
}
