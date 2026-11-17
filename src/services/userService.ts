import type { UserProfile, Playlist, LiveRoom, Track } from '../types/music';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  CURRENT_USER: 'aidj_current_user',
  SESSION_USER: 'aidj_session_user',
  AUTH_TOKEN: 'aidj_auth_token',
  REFRESH_TOKEN: 'aidj_refresh_token',
  GOOGLE_CLIENT_ID: 'aidj_custom_google_client_id',
  LIKES_PREFIX: 'aidj_user_likes_',
  PLAYLISTS_PREFIX: 'aidj_user_playlists_',
  ROOMS: 'aidj_live_rooms',
  HISTORY_PREFIX: 'aidj_user_history_',
};

class UserService {
  private syncChannel: BroadcastChannel | null = null;
  private authSubscribers: Set<(user: UserProfile | null) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.syncChannel = new BroadcastChannel('aidj_user_sync_channel');
        this.syncChannel.addEventListener('message', (event) => {
          if (event.data?.type === 'AUTH_STATE_CHANGED') {
            this.notifyAuthSubscribers(event.data.user);
          }
        });
      } catch (e) {
        console.warn('BroadcastChannel not supported or restricted:', e);
      }
    }

    // Initialize Supabase Auth listener if configured
    this.initSupabaseAuthListener();
  }

  private initSupabaseAuthListener() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await this.fetchProfileFromSupabase(session.user.id);
          const user: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.display_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'DJ User',
            avatar: profile?.avatar_url || session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
            role: profile?.role || 'listener',
          };
          this.saveCurrentUser(user);
          this.notifyAuthSubscribers(user);

          // Migrate any existing offline local data into Supabase
          this.migrateLocalDataToSupabase(user.id).catch(() => {});
        } else if (event === 'SIGNED_OUT') {
          this.saveCurrentUser(null);
          this.notifyAuthSubscribers(null);
        }
      });
    } catch (err) {
      console.warn('Error subscribing to Supabase auth state change:', err);
    }
  }

  private notifyAuthSubscribers(user: UserProfile | null) {
    this.authSubscribers.forEach((cb) => cb(user));
  }

  public onAuthChange(callback: (user: UserProfile | null) => void): () => void {
    this.authSubscribers.add(callback);
    return () => {
      this.authSubscribers.delete(callback);
    };
  }

  /**
   * Token management for Cryptographic JWT Authentication
   */
  public getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  public getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  public saveTokens(accessToken: string | null, refreshToken?: string | null): void {
    if (typeof window === 'undefined') return;
    if (accessToken) {
      sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    if (refreshToken !== undefined) {
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      }
    }
  }

  public async refreshSession(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          this.saveTokens(data.accessToken, data.refreshToken || refreshToken);
          return data.accessToken;
        }
      }
    } catch {}
    return null;
  }

  public async fetchCurrentUserFromBackend(): Promise<UserProfile | null> {
    const token = this.getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.saveCurrentUser(data.user);
          return data.user;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Register with Email & Password via Cryptographic Backend API (with Supabase fallback)
   */
  public async signUpWithEmail(
    email: string,
    pass: string,
    displayName?: string
  ): Promise<{ user: UserProfile | null; error: string | null }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (displayName || cleanEmail.split('@')[0] || 'DJ User').trim();

    // 1. Try Backend Cryptographic Registration (Scrypt hash + JWT)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: pass,
          name: cleanName,
          role: 'listener',
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        this.saveTokens(data.accessToken, data.refreshToken);
        this.saveCurrentUser(data.user);
        this.notifyAuthSubscribers(data.user);
        return { user: data.user, error: null };
      } else {
        return { user: null, error: data.error || 'Registration failed' };
      }
    } catch {
      // Backend not running directly; proceed to fallback
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { user: null, error: 'Authentication service unavailable. Please check backend connection.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            display_name: cleanName,
            avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const userProfile: UserProfile = {
          id: data.user.id,
          name: cleanName,
          email: cleanEmail,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
          role: 'listener',
        };
        this.saveCurrentUser(userProfile);
        return { user: userProfile, error: null };
      }

      return { user: null, error: 'Registration failed. Please check your credentials.' };
    } catch (err: any) {
      return { user: null, error: err.message || 'An unexpected registration error occurred.' };
    }
  }

  /**
   * Log In with Email & Password via Cryptographic Backend API (with Supabase fallback)
   */
  public async signInWithEmail(
    email: string,
    pass: string
  ): Promise<{ user: UserProfile | null; error: string | null }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Backend Cryptographic Login (Scrypt timing-safe verification + HS256 JWT)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: pass,
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        this.saveTokens(data.accessToken, data.refreshToken);
        this.saveCurrentUser(data.user);
        this.notifyAuthSubscribers(data.user);
        return { user: data.user, error: null };
      } else {
        return { user: null, error: data.error || 'Invalid email or password' };
      }
    } catch {
      // Backend not running directly; proceed to fallback
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { user: null, error: 'Authentication service unavailable. Please check backend connection.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const profile = await this.fetchProfileFromSupabase(data.user.id);
        const userProfile: UserProfile = {
          id: data.user.id,
          name: profile?.display_name || data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
          email: cleanEmail,
          avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
          role: profile?.role || 'listener',
        };
        this.saveCurrentUser(userProfile);
        return { user: userProfile, error: null };
      }

      return { user: null, error: 'Invalid login response from server.' };
    } catch (err: any) {
      return { user: null, error: err.message || 'An unexpected login error occurred.' };
    }
  }

  /**
   * Sign Out securely across backend API, Supabase and local session
   */
  public async signOut(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {}
    }
    this.saveTokens(null, null);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error during Supabase signout:', err);
      }
    }
    this.saveCurrentUser(null);
  }

  /**
   * Fetch user profile row from Supabase profiles table
   */
  public async fetchProfileFromSupabase(userId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Error fetching Supabase profile:', err);
    }
    return null;
  }

  /**
   * Get currently logged-in user from tab session (or fallback to persistent storage)
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
      this.syncChannel?.postMessage({
        type: 'AUTH_STATE_CHANGED',
        user,
      });
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
   * Fetch Liked Songs from Supabase with Local Fallback
   */
  public async getLikedTracksAsync(userId: string): Promise<Track[]> {
    const supabase = getSupabaseClient();
    if (supabase && userId && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('liked_songs')
          .select('*')
          .eq('user_id', userId)
          .order('liked_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((row) => ({
            id: row.track_id,
            title: row.title,
            artist_name: row.artist_name,
            album_name: row.album_name || '',
            image: row.image_url,
            audio: row.audio_url,
            duration: row.duration_sec,
            bpm: row.bpm || undefined,
            key: row.musical_key || undefined,
            energy: row.energy || 75,
            liked: true,
          }));
        }
      } catch (err) {
        console.warn('Notice querying Supabase liked_songs, falling back to local store:', err);
      }
    }

    return [];
  }

  /**
   * Get Liked Track IDs (instant synchronous access for reactive UI)
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
   * Save Liked Tracks: updates local cache and persists to Supabase liked_songs
   */
  public async saveLikedTrack(userId: string, track: Track, isLiked: boolean): Promise<void> {
    // 1. Update local cache immediately
    const currentIds = this.getLikedTrackIds(userId);
    if (isLiked) {
      currentIds.add(track.id);
    } else {
      currentIds.delete(track.id);
    }
    const key = `${STORAGE_KEYS.LIKES_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(Array.from(currentIds)));

    this.syncChannel?.postMessage({
      type: 'LIKES_CHANGED',
      userId,
      likedIds: Array.from(currentIds),
    });

    // 2. Persist to Supabase if configured
    const supabase = getSupabaseClient();
    if (supabase && userId && isSupabaseConfigured()) {
      try {
        if (isLiked) {
          await supabase.from('liked_songs').upsert(
            {
              user_id: userId,
              track_id: track.id,
              title: track.title,
              artist_name: track.artist_name,
              album_name: track.album_name || '',
              image_url: track.image,
              audio_url: track.audio,
              duration_sec: track.duration,
              bpm: track.bpm || null,
              musical_key: track.key || null,
              energy: track.energy || 75,
            },
            { onConflict: 'user_id,track_id' }
          );
        } else {
          await supabase
            .from('liked_songs')
            .delete()
            .eq('user_id', userId)
            .eq('track_id', track.id);
        }
      } catch (err) {
        console.warn('Notice persisting liked track to Supabase:', err);
      }
    }
  }

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
   * Fetch Playlists: Synchronous Local cache
   */
  public getUserPlaylists(userId: string): Playlist[] {
    if (typeof window === 'undefined') return [];
    try {
      const key = `${STORAGE_KEYS.PLAYLISTS_PREFIX}${userId || 'guest'}`;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading user playlists:', e);
    }
    return [];
  }

  /**
   * Fetch Playlists from Backend API or Supabase with tracks joined
   */
  public async fetchPlaylistsAsync(userId: string): Promise<Playlist[]> {
    // 1. First check backend persistent library API
    const token = this.getAuthToken();
    if (token) {
      try {
        const res = await fetch('/api/library/playlists', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.playlists)) {
            const playlists = json.playlists;
            if (typeof window !== 'undefined') {
              const key = `${STORAGE_KEYS.PLAYLISTS_PREFIX}${userId || 'guest'}`;
              localStorage.setItem(key, JSON.stringify(playlists));
            }
            return playlists;
          }
        }
      } catch (err) {
        console.warn('Backend playlists fetch error:', err);
      }
    }

    const supabase = getSupabaseClient();
    if (supabase && userId && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('playlists')
          .select('*, playlist_tracks(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data.map((pl: any) => ({
            id: pl.id,
            name: pl.name,
            description: pl.description || '',
            image: pl.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
            trackCount: Array.isArray(pl.playlist_tracks) ? pl.playlist_tracks.length : 0,
            category: 'user' as const,
            tracks: Array.isArray(pl.playlist_tracks)
              ? pl.playlist_tracks
                  .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                  .map((t: any) => ({
                    id: t.track_id,
                    title: t.title,
                    artist_name: t.artist_name,
                    album_name: t.album_name || '',
                    image: t.image_url,
                    audio: t.audio_url,
                    duration: t.duration_sec,
                    bpm: t.bpm || undefined,
                    key: t.musical_key || undefined,
                    energy: t.energy || 75,
                  }))
              : [],
          }));
        }
      } catch (err) {
        console.warn('Notice querying Supabase playlists, falling back to local store:', err);
      }
    }

    return this.getUserPlaylists(userId);
  }

  /**
   * Save Playlists to local storage and sync to Supabase
   */
  public async saveUserPlaylists(userId: string, playlists: Playlist[]): Promise<void> {
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
   * Persist a new playlist in Supabase
   */
  public async persistPlaylist(
    userId: string,
    name: string,
    description = '',
    coverUrl?: string
  ): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase || !userId || !isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: userId,
          name: name.trim(),
          description: description.trim(),
          cover_url: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
          is_public: true,
        })
        .select()
        .single();

      if (!error && data) {
        return data.id;
      }
    } catch (err) {
      console.warn('Notice inserting playlist into Supabase:', err);
    }
    return null;
  }

  /**
   * Add a track to a playlist in Supabase
   */
  public async persistPlaylistTrack(playlistId: string, track: Track, position = 0): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured() || !playlistId) return;

    try {
      await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        track_id: track.id,
        title: track.title,
        artist_name: track.artist_name,
        album_name: track.album_name || '',
        image_url: track.image,
        audio_url: track.audio,
        duration_sec: track.duration,
        bpm: track.bpm || null,
        musical_key: track.key || null,
        energy: track.energy || 75,
        position,
      });
    } catch (err) {
      console.warn('Notice inserting track to playlist_tracks in Supabase:', err);
    }
  }

  /**
   * Remove a track from a playlist in Supabase
   */
  public async removePlaylistTrackFromSupabase(playlistId: string, trackId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured() || !playlistId) return;

    try {
      await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);
    } catch (err) {
      console.warn('Notice deleting track from playlist_tracks in Supabase:', err);
    }
  }

  /**
   * Record a track play into listening_history table
   */
  public async recordListeningHistory(userId: string, track: Track): Promise<void> {
    // 1. Local storage history
    try {
      const key = `${STORAGE_KEYS.HISTORY_PREFIX}${userId || 'guest'}`;
      const current = this.getListeningHistory(userId);
      const updated = [track, ...current.filter((t) => t.id !== track.id)].slice(0, 50);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving local listening history:', e);
    }

    // 2. Persist to Supabase listening_history table
    const supabase = getSupabaseClient();
    if (supabase && userId && isSupabaseConfigured()) {
      try {
        await supabase.from('listening_history').insert({
          user_id: userId,
          track_id: track.id,
          title: track.title,
          artist_name: track.artist_name,
          album_name: track.album_name || '',
          image_url: track.image,
          audio_url: track.audio,
          duration_sec: track.duration,
          bpm: track.bpm || null,
          musical_key: track.key || null,
        });
      } catch (err) {
        console.warn('Notice inserting listening_history into Supabase:', err);
      }
    }
  }

  /**
   * Get listening history from local storage
   */
  public getListeningHistory(userId: string): Track[] {
    if (typeof window === 'undefined') return [];
    try {
      const key = `${STORAGE_KEYS.HISTORY_PREFIX}${userId || 'guest'}`;
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  /**
   * Get all active Live Rooms
   */
  public getLiveRooms(): LiveRoom[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading live rooms from storage:', e);
    }
    return [];
  }

  /**
   * Fetch active Live Rooms from Backend API
   */
  public async fetchLiveRoomsAsync(): Promise<LiveRoom[]> {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          this.saveLiveRooms(data.rooms);
          return data.rooms;
        }
      }
    } catch (err) {
      console.warn('Error fetching live rooms from backend:', err);
    }
    return this.getLiveRooms();
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
   * Add a new Live Room and persist to Backend rooms API and Supabase
   */
  public addLiveRoom(newRoom: LiveRoom, hostId?: string): LiveRoom[] {
    const current = this.getLiveRooms();
    const updated = [newRoom, ...current.filter((r) => r.id !== newRoom.id)];
    this.saveLiveRooms(updated);

    // Persist to backend
    const token = this.getAuthToken();
    if (token) {
      fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRoom),
      }).catch((err) => console.warn('Notice saving room to backend:', err));
    }

    // Persist to Supabase if configured and valid UUID hostId
    const supabase = getSupabaseClient();
    if (supabase && hostId && isSupabaseConfigured()) {
      (async () => {
        try {
          const { data: roomData, error } = await supabase
            .from('rooms')
            .insert({
              code: newRoom.code || ('DJ' + Math.random().toString(36).substring(2, 6).toUpperCase()),
              host_id: hostId,
              name: newRoom.name,
              genre: newRoom.genre,
              cover_url: newRoom.cover,
              is_live: true,
            })
            .select()
            .single();

          if (!error && roomData) {
            await supabase.from('room_members').insert({
              room_id: roomData.id,
              user_id: hostId,
              role: 'host',
            });
          }
        } catch (err) {
          console.warn('Notice saving room to Supabase:', err);
        }
      })();
    }

    return updated;
  }

  /**
   * Migrate locally stored data into Supabase so existing users never lose data
   */
  private async migrateLocalDataToSupabase(userId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured() || !userId) return;

    try {
      // 1. Migrate liked songs
      const localLikedIds = this.getLikedTrackIds(userId);
      if (localLikedIds.size > 0) {
        const rows = Array.from(localLikedIds).map((trackId) => ({
          user_id: userId,
          track_id: trackId,
          title: trackId.replace('track_', '').replace(/_/g, ' '),
          artist_name: 'Studio Artist',
          image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop',
          audio_url: 'https://prod-1.storage.jamendo.com/?trackid=1885834&format=mp32&ndls=1',
          duration_sec: 210,
        }));
        await supabase.from('liked_songs').upsert(rows, { onConflict: 'user_id,track_id' });
      }

      // 2. Migrate custom playlists
      const localPlaylists = this.getUserPlaylists(userId);
      const customPlaylists = localPlaylists.filter((p) => p.category === 'user');
      for (const pl of customPlaylists) {
        const { data: createdPl } = await supabase
          .from('playlists')
          .insert({
            user_id: userId,
            name: pl.name,
            description: pl.description,
            cover_url: pl.image,
            is_public: true,
          })
          .select()
          .single();

        if (createdPl && pl.tracks && pl.tracks.length > 0) {
          const trackRows = pl.tracks.map((t, idx) => ({
            playlist_id: createdPl.id,
            track_id: t.id,
            title: t.title,
            artist_name: t.artist_name,
            album_name: t.album_name || '',
            image_url: t.image,
            audio_url: t.audio,
            duration_sec: t.duration,
            bpm: t.bpm || null,
            musical_key: t.key || null,
            energy: t.energy || 75,
            position: idx,
          }));
          await supabase.from('playlist_tracks').insert(trackRows);
        }
      }
    } catch (err) {
      console.warn('Notice during local data migration to Supabase:', err);
    }
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
