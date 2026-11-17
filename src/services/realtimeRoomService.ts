import type { RealtimeChannel } from '@supabase/supabase-js';
import type { LiveRoom, RoomParticipant, RoomRole, Track, ChatMessage, RoomPlaybackSync } from '../types/music';
import type { RoomMoodState, SoundclashSession } from '../types/roomIntelligence';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { chatService } from './chatService';

export interface RoomServiceCallbacks {
  onParticipantsChange?: (participants: RoomParticipant[]) => void;
  onPlaybackSync?: (sync: RoomPlaybackSync) => void;
  onQueueChange?: (queue: Track[]) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onRoomClosed?: () => void;
  onUserKicked?: (targetUserId: string, reason?: string) => void;
  onRoleChanged?: (userId: string, newRole: RoomRole) => void;
  onOwnershipTransferred?: (newHostId: string) => void;
  onRoomMoodChange?: (moodState: RoomMoodState) => void;
  onSoundclashUpdate?: (session: SoundclashSession | null) => void;
  onHumanBattleUpdate?: (battle: any | null) => void;
  onQueueVotesUpdate?: (votes: Record<string, any>) => void;
}

class RealtimeRoomService {
  private activeChannel: RealtimeChannel | null = null;
  private currentRoom: LiveRoom | null = null;
  private currentUserParticipant: RoomParticipant | null = null;
  private callbacks: RoomServiceCallbacks = {};
  private lastBroadcastTimestamp = 0;
  private processedMessageIds: Set<string> = new Set();

  /**
   * Generate clean 6-character room code (e.g. DJ-7X4K or BEAT88)
   */
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get direct invitation link for a room code
   */
  public getInviteLink(roomCode: string): string {
    if (typeof window === 'undefined') return `?room=${roomCode}`;
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${encodeURIComponent(roomCode)}`;
  }

  /**
   * Register callbacks for room state events
   */
  public setCallbacks(cbs: RoomServiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  /**
   * Find a room by code (queries Supabase rooms or fallback fixtures)
   */
  public async findRoomByCode(code: string): Promise<LiveRoom | null> {
    const cleanCode = code.trim().toUpperCase();
    const supabase = getSupabaseClient();

    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*, profiles(id, display_name, avatar_url, email)')
          .eq('code', cleanCode)
          .eq('is_live', true)
          .single();

        if (!error && data) {
          const profile = (data as any).profiles;
          return {
            id: data.id,
            code: data.code,
            name: data.name,
            hostId: data.host_id,
            hostName: profile?.display_name || 'Host DJ',
            hostAvatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
            cover: data.cover_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
            genre: data.genre || 'Open Format',
            listenerCount: 1,
            isLive: data.is_live,
            tags: [data.genre, 'Live Room', 'Supabase Realtime'],
            participants: [
              {
                id: data.host_id,
                name: profile?.display_name || 'Host DJ',
                email: profile?.email || '',
                avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
                role: 'host',
                isHost: true,
                isOnline: true,
              },
            ],
            queue: [],
            isPlaying: data.is_playing || false,
            currentPosition: data.current_position_sec || 0,
          };
        }
      } catch (err) {
        console.warn('Notice querying Supabase rooms by code, checking local stores:', err);
      }
    }

    // Backend API check
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(cleanCode)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.room) return json.room;
      }
    } catch {}

    try {
      const stored = localStorage.getItem('aidj_live_rooms');
      if (stored) {
        const rooms: LiveRoom[] = JSON.parse(stored);
        const match = rooms.find(
          (r) => r.code?.toUpperCase() === cleanCode || r.id.toLowerCase() === cleanCode.toLowerCase()
        );
        if (match) return match;
      }
    } catch {}

    return null;
  }

  /**
   * Connect to a collaborative DJ room via Supabase Realtime Channel
   */
  public async joinRoom(
    room: LiveRoom,
    participant: RoomParticipant
  ): Promise<boolean> {
    // Leave previous channel if connected
    if (this.activeChannel) {
      await this.leaveRoom();
    }

    // Verify room capacity boundary (strict 50 participant maximum)
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id || room.code,
          userId: participant.id,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        throw new Error(data.error || 'ROOM_CAPACITY_REACHED: Room has reached its maximum limit of 50 participants.');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('ROOM_CAPACITY_REACHED')) {
        throw err;
      }
    }

    this.currentRoom = room;
    this.currentUserParticipant = participant;
    const channelName = `room:${room.code || room.id}`;
    const supabase = getSupabaseClient();

    if (supabase && isSupabaseConfigured()) {
      try {
        const channel = supabase.channel(channelName, {
          config: {
            presence: { key: participant.id },
            broadcast: { self: false, ack: false },
          },
        });

        // 1. Presence Sync & Tracking
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const onlineParticipants: RoomParticipant[] = [];

            Object.keys(state).forEach((key) => {
              const presences = state[key] as any[];
              if (Array.isArray(presences)) {
                presences.forEach((p) => {
                  onlineParticipants.push({
                    id: p.user_id || key,
                    name: p.name || 'Anonymous DJ',
                    email: p.email,
                    avatar: p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
                    role: (p.role as RoomRole) || (p.isHost ? 'host' : 'listener'),
                    isHost: Boolean(p.isHost || p.role === 'host'),
                    isOnline: true,
                    joinedAt: p.joinedAt || Date.now(),
                  });
                });
              }
            });

            if (this.currentRoom) {
              this.currentRoom.participants = onlineParticipants;
              this.currentRoom.listenerCount = onlineParticipants.length;
            }
            this.callbacks.onParticipantsChange?.(onlineParticipants);
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            if (Array.isArray(newPresences)) {
              newPresences.forEach((p: any) => {
                if (p.user_id !== participant.id) {
                  const joinMsg: ChatMessage = {
                    id: `sys_join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    userName: 'System Alert',
                    userAvatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
                    message: `🎉 ${p.name || 'A new listener'} joined the party!`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isSystem: true,
                  };
                  this.callbacks.onChatMessage?.(joinMsg);

                  // If current user is Host, immediately push playback state so the joiner syncs immediately
                  if (this.isHost()) {
                    this.broadcastPlaybackState();
                  }
                }
              });
            }
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            if (Array.isArray(leftPresences)) {
              leftPresences.forEach((p: any) => {
                if (p.user_id !== participant.id) {
                  const leaveMsg: ChatMessage = {
                    id: `sys_leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    userName: 'System Alert',
                    userAvatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
                    message: `👋 ${p.name || 'A participant'} left the room.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isSystem: true,
                  };
                  this.callbacks.onChatMessage?.(leaveMsg);
                }
              });
            }
          });

        // 2. Playback Synchronization Broadcasts
        channel.on('broadcast', { event: 'playback_state' }, ({ payload }) => {
          if (!payload) return;
          // Ignore own playback broadcasts
          if (payload.hostId === participant.id) return;
          this.callbacks.onPlaybackSync?.(payload as RoomPlaybackSync);
        });

        // Handle join catch-up request
        channel.on('broadcast', { event: 'request_sync' }, () => {
          if (this.isHost()) {
            this.broadcastPlaybackState();
          }
        });

        // 3. Shared Queue Broadcasts
        channel.on('broadcast', { event: 'queue_update' }, ({ payload }) => {
          if (payload?.queue && Array.isArray(payload.queue)) {
            if (this.currentRoom) {
              this.currentRoom.queue = payload.queue;
            }
            this.callbacks.onQueueChange?.(payload.queue);
          }
        });

        // Collaborative Queue Votes Broadcast (QUE-01)
        channel.on('broadcast', { event: 'queue_votes_update' }, ({ payload }) => {
          if (payload?.votes) {
            this.callbacks.onQueueVotesUpdate?.(payload.votes);
          }
        });

        // 4. Live Chat Broadcasts
        channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          if (payload?.id && !this.processedMessageIds.has(payload.id)) {
            this.processedMessageIds.add(payload.id);
            this.callbacks.onChatMessage?.(payload as ChatMessage);
          }
        });

        // 5. Host Room Controls Broadcasts
        channel.on('broadcast', { event: 'room_control' }, ({ payload }) => {
          if (!payload) return;
          switch (payload.type) {
            case 'KICK_USER':
              if (payload.targetUserId === participant.id) {
                this.leaveRoom();
                this.callbacks.onUserKicked?.(payload.targetUserId, payload.reason);
              }
              break;
            case 'ROLE_CHANGED':
              if (payload.targetUserId === participant.id) {
                if (this.currentUserParticipant) {
                  this.currentUserParticipant.role = payload.newRole;
                }
                this.callbacks.onRoleChanged?.(payload.targetUserId, payload.newRole);
              }
              break;
            case 'ROOM_CLOSED':
              this.leaveRoom();
              this.callbacks.onRoomClosed?.();
              break;
            case 'OWNERSHIP_TRANSFERRED':
              if (this.currentRoom) {
                this.currentRoom.hostId = payload.newHostId;
              }
              if (payload.newHostId === participant.id) {
                if (this.currentUserParticipant) {
                  this.currentUserParticipant.role = 'host';
                  this.currentUserParticipant.isHost = true;
                }
              }
              this.callbacks.onOwnershipTransferred?.(payload.newHostId);
              break;
          }
        });

        // 6. Phase 5: Room Mood Broadcasts
        channel.on('broadcast', { event: 'room_mood' }, ({ payload }) => {
          if (payload) {
            this.callbacks.onRoomMoodChange?.(payload as RoomMoodState);
          }
        });

        // 7. Phase 5: Soundclash Broadcasts
        channel.on('broadcast', { event: 'soundclash_session' }, ({ payload }) => {
          this.callbacks.onSoundclashUpdate?.(payload as SoundclashSession | null);
        });

        // 8. Phase 7: Human DJ Soundclash Battles (SND-01)
        channel.on('broadcast', { event: 'human_soundclash_battle' }, ({ payload }) => {
          this.callbacks.onHumanBattleUpdate?.(payload);
        });

        // Subscribe to channel and track presence
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: participant.id,
              name: participant.name,
              email: participant.email || '',
              avatar: participant.avatar,
              role: participant.role,
              isHost: Boolean(participant.isHost || participant.role === 'host'),
              joinedAt: Date.now(),
            });

            // If listener, request latest authoritative playback sync snapshot
            if (!this.isHost()) {
              channel.send({
                type: 'broadcast',
                event: 'request_sync',
                payload: { requesterId: participant.id },
              });
            }
          }
        });

        this.activeChannel = channel;
        return true;
      } catch (err) {
        console.warn('Supabase Realtime connection failed, using local room mode:', err);
      }
    }

    // Local / Offline fallback mode
    if (this.currentRoom) {
      if (!this.currentRoom.participants.some((p) => p.id === participant.id)) {
        this.currentRoom.participants.push(participant);
      }
      this.callbacks.onParticipantsChange?.(this.currentRoom.participants);
    }
    return true;
  }

  /**
   * Leave the active room and clean up channel subscription
   */
  public async leaveRoom(): Promise<void> {
    if (this.currentRoom && this.currentUserParticipant) {
      try {
        fetch('/api/rooms/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.currentRoom.id || this.currentRoom.code,
            userId: this.currentUserParticipant.id,
          }),
        }).catch(() => {});
      } catch {}
    }

    if (this.activeChannel) {
      try {
        await this.activeChannel.untrack();
        await this.activeChannel.unsubscribe();
      } catch (e) {
        console.warn('Error unsubscribing from room channel:', e);
      }
      this.activeChannel = null;
    }
    this.currentRoom = null;
    this.currentUserParticipant = null;
  }

  /**
   * Check if current participant is Host
   */
  public isHost(): boolean {
    if (!this.currentUserParticipant) return false;
    return this.currentUserParticipant.role === 'host' || Boolean(this.currentUserParticipant.isHost);
  }

  /**
   * Check if current participant can control playback & queue (Host or Co-DJ)
   */
  public canControl(): boolean {
    if (!this.currentUserParticipant) return false;
    return this.currentUserParticipant.role === 'host' || this.currentUserParticipant.role === 'co-dj';
  }

  /**
   * Broadcast Authoritative Playback State to all listeners in room
   */
  public broadcastPlaybackState(
    track?: Track | null,
    isPlaying?: boolean,
    position?: number,
    action: RoomPlaybackSync['action'] = 'sync_state'
  ): void {
    if (!this.activeChannel || !this.isHost() || !this.currentRoom) return;

    // Throttle duplicate broadcasts (min 300ms between sync snapshots)
    const now = Date.now();
    if (action === 'sync_state' && now - this.lastBroadcastTimestamp < 300) {
      return;
    }
    this.lastBroadcastTimestamp = now;

    const payload: RoomPlaybackSync = {
      hostId: this.currentUserParticipant?.id || this.currentRoom.hostId,
      track: track !== undefined ? track : this.currentRoom.currentTrack || null,
      isPlaying: isPlaying !== undefined ? isPlaying : Boolean(this.currentRoom.isPlaying),
      position: position !== undefined ? Number(position) : (this.currentRoom.currentPosition || 0),
      serverTimestamp: now,
      action,
    };

    this.activeChannel.send({
      type: 'broadcast',
      event: 'playback_state',
      payload,
    });

    // Update in database if configured
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured() && this.currentRoom.id) {
      supabase
        .from('rooms')
        .update({
          current_track_id: payload.track?.id || null,
          current_position_sec: payload.position,
          is_playing: payload.isPlaying,
          playback_updated_at: new Date().toISOString(),
        })
        .eq('id', this.currentRoom.id)
        .then(() => {}, () => {});
    }
  }

  /**
   * Broadcast updated Shared Queue
   */
  public broadcastQueue(queue: Track[], action: 'add' | 'remove' | 'reorder' = 'reorder'): void {
    if (!this.activeChannel || !this.canControl()) return;

    if (this.currentRoom) {
      this.currentRoom.queue = queue;
    }

    this.activeChannel.send({
      type: 'broadcast',
      event: 'queue_update',
      payload: {
        queue,
        updatedBy: this.currentUserParticipant?.id || 'dj',
        action,
      },
    });
  }

  /**
   * Broadcast Authoritative Queue Votes to all room participants (QUE-01)
   */
  public broadcastQueueVotes(votes: Record<string, any>): void {
    if (this.activeChannel) {
      this.activeChannel.send({
        type: 'broadcast',
        event: 'queue_votes_update',
        payload: { votes },
      });
    }
  }

  /**
   * Send a Live Chat message in the room
   */
  public sendChatMessage(text: string): ChatMessage | null {
    if (!this.currentRoom || !this.currentUserParticipant) return null;

    const roomId = this.currentRoom.id;
    const msg = chatService.sendMessage(
      roomId,
      text,
      this.currentUserParticipant.name,
      this.currentUserParticipant.avatar,
      false,
      this.currentUserParticipant.email
    );

    this.processedMessageIds.add(msg.id);
    this.callbacks.onChatMessage?.(msg);

    if (this.activeChannel) {
      this.activeChannel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: msg,
      });
    }

    // Persist to room_messages table in Supabase
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured() && this.currentRoom.id) {
      supabase
        .from('room_messages')
        .insert({
          room_id: this.currentRoom.id,
          user_id: this.currentUserParticipant.id.startsWith('usr_') ? null : this.currentUserParticipant.id,
          user_name: msg.userName,
          user_email: msg.userEmail || null,
          user_avatar: msg.userAvatar,
          message: msg.message,
          is_ai: false,
          is_system: false,
        })
        .then(() => {}, () => {});
    }

    return msg;
  }

  /**
   * Host Control: Change participant role (promote to Co-DJ or demote to Listener)
   */
  public updateParticipantRole(targetUserId: string, newRole: RoomRole): void {
    if (!this.activeChannel || !this.isHost()) return;

    this.activeChannel.send({
      type: 'broadcast',
      event: 'room_control',
      payload: {
        type: 'ROLE_CHANGED',
        targetUserId,
        newRole,
        updatedBy: this.currentUserParticipant?.id,
      },
    });

    if (this.currentRoom) {
      this.currentRoom.participants = this.currentRoom.participants.map((p) =>
        p.id === targetUserId ? { ...p, role: newRole, isHost: newRole === 'host' } : p
      );
      this.callbacks.onParticipantsChange?.(this.currentRoom.participants);
    }
  }

  /**
   * Host Control: Remove/Kick participant from room
   */
  public kickParticipant(targetUserId: string, reason = 'Removed by Room Host'): void {
    if (!this.activeChannel || !this.isHost()) return;

    this.activeChannel.send({
      type: 'broadcast',
      event: 'room_control',
      payload: {
        type: 'KICK_USER',
        targetUserId,
        reason,
      },
    });

    if (this.currentRoom) {
      this.currentRoom.participants = this.currentRoom.participants.filter(
        (p) => p.id !== targetUserId
      );
      this.callbacks.onParticipantsChange?.(this.currentRoom.participants);
    }
  }

  /**
   * Host Control: Transfer room ownership to another participant
   */
  public transferOwnership(newHostId: string): void {
    if (!this.activeChannel || !this.isHost() || !this.currentRoom) return;

    const newHost = this.currentRoom.participants.find((p) => p.id === newHostId);
    if (!newHost) return;

    this.activeChannel.send({
      type: 'broadcast',
      event: 'room_control',
      payload: {
        type: 'OWNERSHIP_TRANSFERRED',
        newHostId,
        newHostName: newHost.name,
      },
    });

    // Demote current user to co-dj and promote target to host
    if (this.currentUserParticipant) {
      this.currentUserParticipant.role = 'co-dj';
      this.currentUserParticipant.isHost = false;
    }
    this.currentRoom.hostId = newHostId;
    this.currentRoom.hostName = newHost.name;
    this.currentRoom.hostAvatar = newHost.avatar;

    // Update in Supabase
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured() && this.currentRoom.id) {
      supabase
        .from('rooms')
        .update({ host_id: newHostId })
        .eq('id', this.currentRoom.id)
        .then(() => {}, () => {});
    }

    this.callbacks.onOwnershipTransferred?.(newHostId);
  }

  /**
   * Host Control: Close the room for all participants
   */
  public async closeRoom(): Promise<void> {
    if (!this.activeChannel || !this.isHost() || !this.currentRoom) return;

    this.activeChannel.send({
      type: 'broadcast',
      event: 'room_control',
      payload: {
        type: 'ROOM_CLOSED',
        hostId: this.currentUserParticipant?.id,
      },
    });

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured() && this.currentRoom.id) {
      supabase
        .from('rooms')
        .update({ is_live: false })
        .eq('id', this.currentRoom.id)
        .then(() => {}, () => {});
    }

    await this.leaveRoom();
    this.callbacks.onRoomClosed?.();
  }

  /**
   * Broadcast Room Mood update to all connected room members
   */
  public broadcastRoomMood(moodState: RoomMoodState): void {
    if (this.activeChannel) {
      this.activeChannel.send({
        type: 'broadcast',
        event: 'room_mood',
        payload: moodState,
      });
    }
  }

  /**
   * Broadcast Soundclash Session update (start, vote, end) to all room members
   */
  public broadcastSoundclash(session: SoundclashSession | null): void {
    if (this.activeChannel) {
      this.activeChannel.send({
        type: 'broadcast',
        event: 'soundclash_session',
        payload: session,
      });
    }
  }

  /**
   * Broadcast Human DJ Soundclash Battle state to all room members
   */
  public broadcastHumanBattle(battle: any | null): void {
    if (this.activeChannel) {
      this.activeChannel.send({
        type: 'broadcast',
        event: 'human_soundclash_battle',
        payload: battle,
      });
    }
  }

  public getActiveRoom(): LiveRoom | null {
    return this.currentRoom;
  }

  public getCurrentRole(): RoomRole {
    return this.currentUserParticipant?.role || 'listener';
  }
}

export const realtimeRoomService = new RealtimeRoomService();
