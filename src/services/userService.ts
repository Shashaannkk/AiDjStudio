import type { UserProfile, Playlist, LiveRoom } from '../types/music';
import { FIXTURE_PLAYLISTS, FIXTURE_LIVE_ROOMS } from '../fixtures/musicFixtures';

const STORAGE_KEYS = {
  CURRENT_USER: 'aidj_current_user',
  SESSION_USER: 'aidj_session_user',
  GOOGLE_CLIENT_ID: 'aidj_custom_google_client_id',
  LIKES_PREFIX: 'aidj_user_likes_',
  PLAYLISTS_PREFIX: 'aidj_user_playlists_',
  ROOMS: 'aidj_live_rooms',
};

class UserService {
  private syncChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.syncChannel = new BroadcastChannel('aidj_user_sync_channel');
      } catch (e) {
        console.warn('BroadcastChannel not supported or restricted:', e);
      }
    }
  }

  /**
   * Get currently logged-in user from tab session (or fallback to persistent storage)
   * This guarantees each browser tab/window can test with a DIFFERENT email account!
   */
  public getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      // 1. Check tab-specific session storage first (isolated per tab/window)
      const sessionData = sessionStorage.getItem(STORAGE_KEYS.SESSION_USER);
      if (sessionData) {
        return JSON.parse(sessionData);
      }

      // 2. Fall back to global persistent storage
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) {
        const user = JSON.parse(data);
        // Bind to this tab's session
        sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
        return user;
      }
    } catch (e) {
      console.warn('Error reading current user from storage:', e);
    }
    return null;
  }

  /**
   * Save user login session (sets tab session and remembers default)
   */
  public saveCurrentUser(user: UserProfile | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (user) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.warn('Error saving current user:', e);
    }
  }

  /**
   * Get or set custom Google Client ID
   */
  public getGoogleClientId(): string {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID);
    if (stored) return stored;
    const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
    return envClientId;
  }

  public setGoogleClientId(clientId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, clientId.trim());
  }

  /**
   * Get Liked Tracks for specific user ID
   */
  public getLikedTrackIds(userId: string): Set<string> {
    if (typeof window === 'undefined' || !userId) {
      return new Set(['track_midnight_drive', 'track_neon_lights', 'track_sunset_drive', 'track_bollywood_beat']);
    }
    try {
      const key = `${STORAGE_KEYS.LIKES_PREFIX}${userId}`;
      const data = localStorage.getItem(key);
      if (data) {
        const arr = JSON.parse(data);
        return new Set(Array.isArray(arr) ? arr : []);
      }
    } catch (e) {
      console.warn('Error reading liked tracks from storage:', e);
    }
    return new Set(['track_midnight_drive', 'track_neon_lights', 'track_sunset_drive', 'track_bollywood_beat']);
  }

  /**
   * Save Liked Tracks for specific user ID
   */
  public saveLikedTrackIds(userId: string, likedIds: Set<string>): void {
    if (typeof window === 'undefined' || !userId) return;
    try {
      const key = `${STORAGE_KEYS.LIKES_PREFIX}${userId}`;
      localStorage.setItem(key, JSON.stringify(Array.from(likedIds)));
      this.syncChannel?.postMessage({
        type: 'LIKES_CHANGED',
        userId,
        likedIds: Array.from(likedIds),
      });
    } catch (e) {
      console.warn('Error saving liked tracks to storage:', e);
    }
  }

  /**
   * Get Playlists for specific user
   */
  public getUserPlaylists(userId: string): Playlist[] {
    if (typeof window === 'undefined') return FIXTURE_PLAYLISTS;
    try {
      const key = `${STORAGE_KEYS.PLAYLISTS_PREFIX}${userId || 'guest'}`;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading user playlists:', e);
    }
    return FIXTURE_PLAYLISTS;
  }

  /**
   * Save Playlists for specific user
   */
  public saveUserPlaylists(userId: string, playlists: Playlist[]): void {
    if (typeof window === 'undefined') return;
    try {
      const key = `${STORAGE_KEYS.PLAYLISTS_PREFIX}${userId || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(playlists));
      this.syncChannel?.postMessage({
        type: 'PLAYLISTS_CHANGED',
        userId,
        playlists,
      });
    } catch (e) {
      console.warn('Error saving user playlists:', e);
    }
  }

  /**
   * Get all active Live Rooms (including user-created and default live community rooms)
   */
  public getLiveRooms(): LiveRoom[] {
    if (typeof window === 'undefined') return FIXTURE_LIVE_ROOMS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading live rooms from storage:', e);
    }
    return FIXTURE_LIVE_ROOMS;
  }

  /**
   * Save and broadcast live room creation or update
   */
  public saveLiveRooms(rooms: LiveRoom[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
      this.syncChannel?.postMessage({
        type: 'ROOMS_CHANGED',
        rooms,
      });
    } catch (e) {
      console.warn('Error saving live rooms:', e);
    }
  }

  /**
   * Add a new Live Room created by user
   */
  public addLiveRoom(newRoom: LiveRoom): LiveRoom[] {
    const current = this.getLiveRooms();
    const updated = [newRoom, ...current.filter((r) => r.id !== newRoom.id)];
    this.saveLiveRooms(updated);
    return updated;
  }

  /**
   * Subscribe to cross-tab / cross-window sync events
   */
  public onSync(callback: (event: any) => void): () => void {
    if (!this.syncChannel) return () => {};
    const handler = (event: MessageEvent) => {
      callback(event.data);
    };
    this.syncChannel.addEventListener('message', handler);
    return () => {
      this.syncChannel?.removeEventListener('message', handler);
    };
  }
}

export const userService = new UserService();
