import { create } from 'zustand';
import type { Track, Playlist, LiveRoom, ChatMessage, TransitionInsight, UserProfile, Artist } from '../types/music';
import { FIXTURE_TRACKS, FIXTURE_ARTISTS, PROVIDER_MUSIC_CATALOG } from '../fixtures/musicFixtures';
import { audioEngine } from '../services/audioEngine';
import { musicService } from '../services/musicService';
import { userService } from '../services/userService';
import { chatService } from '../services/chatService';

export type ViewType = 'home' | 'search' | 'library' | 'providers' | 'rooms' | 'playlist' | 'liked' | 'artist';

interface PlayerState {
  // Playback
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Track[];
  history: Track[];

  // User Library & Playlists
  likedTrackIds: Set<string>;
  likedTracks: Track[];
  userPlaylists: Playlist[];

  // AI DJ & Smart Mixing
  aiDjEnabled: boolean;
  aiDjStatus: 'idle' | 'analyzing' | 'mixing' | 'beat-matched';
  transitionInsight: TransitionInsight | null;

  // Live Room & Social
  activeRoom: LiveRoom | null;
  liveRooms: LiveRoom[];
  roomMessages: ChatMessage[];

  // Auth & Profile
  user: UserProfile | null;
  authModalOpen: boolean;
  authMode: 'login' | 'signup';

  // Actions
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  login: (userData: UserProfile) => void;
  logout: () => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLike: (trackOrId: Track | string) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;

  // User Playlist Actions
  createPlaylist: (name: string, description?: string) => Playlist;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;

  // AI DJ Actions
  toggleAiDj: () => void;
  triggerAiTransition: () => void;

  // Room Actions
  joinRoom: (room: LiveRoom) => void;
  leaveRoom: () => void;
  createLiveRoom: (name: string, genre: string, cover?: string) => LiveRoom;
  sendChatMessage: (text: string) => void;

  // Navigation & Search Actions
  currentView: ViewType;
  selectedPlaylist: Playlist | null;
  selectedArtist: Artist | null;
  searchQuery: string;
  recentSearches: string[];
  rightPanelOpen: boolean;
  rightPanelView: 'canvas' | 'queue' | 'chat';
  lyricsOpen: boolean;

  setCurrentView: (view: ViewType) => void;
  setSelectedPlaylist: (playlist: Playlist | null) => void;
  setSelectedArtist: (artist: Artist | null) => void;
  navigateToArtist: (artistOrName: Artist | string) => void;
  setSearchQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  toggleRightPanel: () => void;
  setRightPanelView: (mode: 'canvas' | 'queue' | 'chat') => void;
  toggleLyrics: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Load persisted user on app startup
  const initialUser = userService.getCurrentUser();
  const initialLikedIds = userService.getLikedTrackIds(initialUser?.id || 'guest');
  const initialPlaylists = userService.getUserPlaylists(initialUser?.id || 'guest');
  const initialRooms = userService.getLiveRooms();

  // Set default current track to Midnight Drive
  const initialTrack = FIXTURE_TRACKS[0];
  const initialQueue = FIXTURE_TRACKS.slice(1, 5);

  // Set up audioEngine callbacks
  audioEngine.setCallbacks(
    (time, dur) => {
      if (dur && !isNaN(dur) && dur > 0) {
        set({ currentTime: time, duration: Math.round(dur) });
      } else {
        set({ currentTime: time });
      }
    },
    () => {
      // Auto advance to next track on ended
      const { repeatMode, nextTrack, seekTo, playTrack, currentTrack } = get();
      if (repeatMode === 'one' && currentTrack) {
        seekTo(0);
        playTrack(currentTrack);
      } else {
        nextTrack();
      }
    }
  );

  // Subscribe to real-time chat broadcast channel across tabs/windows
  chatService.subscribeToMessages((msg, roomId) => {
    const { activeRoom } = get();
    if (!activeRoom || activeRoom.id === roomId) {
      set((state) => ({
        roomMessages: [...state.roomMessages, msg],
      }));
    }
  });

  // Subscribe to cross-tab user data synchronization
  userService.onSync((event) => {
    if (event.type === 'AUTH_STATE_CHANGED') {
      const user = event.user;
      const likedIds = userService.getLikedTrackIds(user?.id || 'guest');
      const playlists = userService.getUserPlaylists(user?.id || 'guest');
      set({ user, likedTrackIds: likedIds, userPlaylists: playlists });
    } else if (event.type === 'LIKES_CHANGED') {
      const currentUserId = get().user?.id || 'guest';
      if (event.userId === currentUserId) {
        set({ likedTrackIds: new Set(event.likedIds) });
      }
    } else if (event.type === 'ROOMS_CHANGED') {
      set({ liveRooms: event.rooms });
    }
  });

  const allKnownTracks = [
    ...PROVIDER_MUSIC_CATALOG,
    ...FIXTURE_TRACKS,
    ...FIXTURE_ARTISTS.flatMap((a) => a.popularTracks),
  ];
  const initialLikedTracks = allKnownTracks.filter((t) => initialLikedIds.has(t.id));

  return {
    currentTrack: initialTrack,
    isPlaying: false,
    currentTime: 0,
    duration: initialTrack.duration,
    volume: 0.8,
    isMuted: false,
    isShuffle: false,
    repeatMode: 'off',
    queue: initialQueue,
    history: [initialTrack],

    likedTrackIds: initialLikedIds,
    likedTracks: initialLikedTracks,
    userPlaylists: initialPlaylists,

    aiDjEnabled: true,
    aiDjStatus: 'beat-matched',
    transitionInsight: {
      fromTrackTitle: 'Midnight Drive',
      toTrackTitle: 'Ocean Waves',
      compatibilityScore: 94,
      bpmDifference: 26,
      suggestedAction: 'Smooth 8-bar harmonic low-pass filter crossfade',
      harmonicMatch: 'A Minor to C Major (Camelot 8A -> 8B)',
      energyShift: 'down',
    },

    activeRoom: null,
    liveRooms: initialRooms,
    roomMessages: chatService.getRoomMessages('room_late_night_lounge'),

    user: initialUser,
    authModalOpen: false,
    authMode: 'login',

    currentView: 'home',
    selectedPlaylist: null,
    selectedArtist: null,
    searchQuery: '',
    recentSearches: ['Doja Cat', 'The Weeknd', 'Synthwave', 'Bollywood'],
    rightPanelOpen: false,
    rightPanelView: 'queue',
    lyricsOpen: false,

    openAuthModal: (mode = 'login') => {
      set({ authModalOpen: true, authMode: mode });
    },

    closeAuthModal: () => {
      set({ authModalOpen: false });
    },

    login: (userData: UserProfile) => {
      userService.saveCurrentUser(userData);
      const userLikedIds = userService.getLikedTrackIds(userData.id);
      const userPlaylists = userService.getUserPlaylists(userData.id);
      const likedTracks = allKnownTracks.filter((t) => userLikedIds.has(t.id));

      set({
        user: userData,
        likedTrackIds: userLikedIds,
        likedTracks,
        userPlaylists,
        authModalOpen: false,
      });
    },

    logout: () => {
      userService.saveCurrentUser(null);
      const guestLikedIds = userService.getLikedTrackIds('guest');
      const guestPlaylists = userService.getUserPlaylists('guest');
      set({
        user: null,
        likedTrackIds: guestLikedIds,
        userPlaylists: guestPlaylists,
      });
    },

    playTrack: (track: Track) => {
      const state = get();
      const bpm = track.bpm || 120;
      audioEngine.playTrack(track.id, track.audio, 0, bpm, track.duration);

      const nextInQueue = state.queue[0];
      let insight: TransitionInsight | null = null;
      if (nextInQueue) {
        const bpmDiff = Math.abs((track.bpm || 120) - (nextInQueue.bpm || 120));
        insight = {
          fromTrackTitle: track.title,
          toTrackTitle: nextInQueue.title,
          compatibilityScore: Math.max(70, Math.min(99, 100 - bpmDiff * 1.5)),
          bpmDifference: bpmDiff,
          suggestedAction:
            bpmDiff < 10
              ? 'Seamless 4-bar beat-matched blend'
              : 'Harmonic 8-bar filtered transition with tempo ramp',
          harmonicMatch: `${track.key || 'C Maj'} -> ${nextInQueue.key || 'A Min'}`,
          energyShift: (nextInQueue.energy || 75) > (track.energy || 75) ? 'up' : 'down',
        };
      }

      set({
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        duration: track.duration,
        history: [track, ...state.history.filter((t) => t.id !== track.id)].slice(0, 50),
        transitionInsight: insight,
        aiDjStatus: state.aiDjEnabled ? 'beat-matched' : 'idle',
      });
    },

    togglePlay: () => {
      const { isPlaying, currentTrack } = get();
      if (!currentTrack) {
        if (FIXTURE_TRACKS.length > 0) {
          get().playTrack(FIXTURE_TRACKS[0]);
        }
        return;
      }

      if (isPlaying) {
        audioEngine.pause();
        set({ isPlaying: false, aiDjStatus: 'idle' });
      } else {
        audioEngine.resume(currentTrack.bpm || 120);
        set({ isPlaying: true, aiDjStatus: get().aiDjEnabled ? 'beat-matched' : 'idle' });
      }
    },

    nextTrack: () => {
      const { queue, currentTrack, isShuffle, playTrack } = get();
      if (queue.length > 0) {
        let nextIdx = 0;
        if (isShuffle && queue.length > 1) {
          nextIdx = Math.floor(Math.random() * queue.length);
        }
        const next = queue[nextIdx];
        const newQueue = queue.filter((_, i) => i !== nextIdx);
        playTrack(next);
        set({ queue: newQueue });
      } else {
        // Fallback to recommended tracks if queue empty
        const next = FIXTURE_TRACKS.find((t) => t.id !== currentTrack?.id) || FIXTURE_TRACKS[0];
        playTrack(next);
      }
    },

    prevTrack: () => {
      const { history, playTrack, currentTime, seekTo } = get();
      if (currentTime > 3) {
        seekTo(0);
        return;
      }
      if (history.length > 1) {
        const prev = history[1];
        set({ history: history.slice(1) });
        playTrack(prev);
      } else {
        seekTo(0);
      }
    },

    seekTo: (seconds: number) => {
      audioEngine.seek(seconds);
      set({ currentTime: Math.round(seconds) });
    },

    setVolume: (val: number) => {
      audioEngine.setVolume(val);
      set({ volume: val, isMuted: val === 0 });
    },

    toggleMute: () => {
      const { isMuted, volume } = get();
      if (isMuted) {
        audioEngine.setVolume(volume || 0.8);
        set({ isMuted: false });
      } else {
        audioEngine.setVolume(0);
        set({ isMuted: true });
      }
    },

    toggleShuffle: () => {
      set((state) => ({ isShuffle: !state.isShuffle }));
    },

    toggleRepeat: () => {
      set((state) => {
        const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
        const currentIdx = modes.indexOf(state.repeatMode);
        const nextMode = modes[(currentIdx + 1) % modes.length];
        audioEngine.setLoop(nextMode === 'one');
        return { repeatMode: nextMode };
      });
    },

    toggleLike: (trackOrId: Track | string) => {
      set((state) => {
        const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId.id;
        const targetTrack: Track | undefined =
          typeof trackOrId === 'object'
            ? trackOrId
            : state.currentTrack?.id === trackId
            ? state.currentTrack
            : allKnownTracks.find((t) => t.id === trackId);

        const newLikedIds = new Set(state.likedTrackIds);
        let newLikedTracks = [...state.likedTracks];

        if (newLikedIds.has(trackId)) {
          newLikedIds.delete(trackId);
          newLikedTracks = newLikedTracks.filter((t) => t.id !== trackId);
        } else {
          newLikedIds.add(trackId);
          if (targetTrack && !newLikedTracks.some((t) => t.id === trackId)) {
            newLikedTracks = [targetTrack, ...newLikedTracks];
          }
        }

        // Persist to user store
        const userId = state.user?.id || 'guest';
        userService.saveLikedTrackIds(userId, newLikedIds);

        return {
          likedTrackIds: newLikedIds,
          likedTracks: newLikedTracks,
        };
      });
    },

    addToQueue: (track: Track) => {
      set((state) => ({ queue: [...state.queue, track] }));
    },

    removeFromQueue: (index: number) => {
      set((state) => ({
        queue: state.queue.filter((_, i) => i !== index),
      }));
    },

    clearQueue: () => {
      set({ queue: [] });
    },

    createPlaylist: (name: string, description = '') => {
      const state = get();
      const userId = state.user?.id || 'guest';
      const newPlaylist: Playlist = {
        id: `pl_user_${Date.now()}`,
        name: name.trim(),
        description: description.trim() || 'Created by you on AI DJ Studio',
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
        trackCount: 0,
        category: 'user',
        tracks: [],
      };

      const updated = [newPlaylist, ...state.userPlaylists];
      userService.saveUserPlaylists(userId, updated);
      set({ userPlaylists: updated });
      return newPlaylist;
    },

    addTrackToPlaylist: (playlistId: string, track: Track) => {
      set((state) => {
        const userId = state.user?.id || 'guest';
        const updated = state.userPlaylists.map((pl) => {
          if (pl.id === playlistId) {
            const currentTracks = pl.tracks || [];
            if (currentTracks.some((t) => t.id === track.id)) return pl;
            const newTracks = [...currentTracks, track];
            return {
              ...pl,
              trackCount: newTracks.length,
              tracks: newTracks,
            };
          }
          return pl;
        });

        userService.saveUserPlaylists(userId, updated);
        return { userPlaylists: updated };
      });
    },

    removeTrackFromPlaylist: (playlistId: string, trackId: string) => {
      set((state) => {
        const userId = state.user?.id || 'guest';
        const updated = state.userPlaylists.map((pl) => {
          if (pl.id === playlistId) {
            const newTracks = (pl.tracks || []).filter((t) => t.id !== trackId);
            return {
              ...pl,
              trackCount: newTracks.length,
              tracks: newTracks,
            };
          }
          return pl;
        });

        userService.saveUserPlaylists(userId, updated);
        return { userPlaylists: updated };
      });
    },

    toggleAiDj: () => {
      set((state) => {
        const nextState = !state.aiDjEnabled;
        return {
          aiDjEnabled: nextState,
          aiDjStatus: nextState ? 'beat-matched' : 'idle',
        };
      });
    },

    triggerAiTransition: () => {
      const { queue, playTrack } = get();
      if (queue.length > 0) {
        const nextTrack = queue[0];
        set({ aiDjStatus: 'mixing' });
        audioEngine.crossfadeToTrack(
          nextTrack.id,
          nextTrack.audio,
          0,
          nextTrack.bpm || 120,
          nextTrack.duration,
          1.2
        );
        setTimeout(() => {
          set({ aiDjStatus: 'beat-matched' });
          playTrack(nextTrack);
          set((state) => ({ queue: state.queue.slice(1) }));
        }, 1200);
      }
    },

    joinRoom: (room: LiveRoom) => {
      const msgs = chatService.getRoomMessages(room.id);
      set({
        activeRoom: room,
        roomMessages: msgs,
        currentView: 'home',
        rightPanelOpen: true,
        rightPanelView: 'chat',
      });
      if (room.currentTrack) {
        get().playTrack(room.currentTrack);
      }
    },

    leaveRoom: () => {
      set({ activeRoom: null });
    },

    createLiveRoom: (name: string, genre: string, cover?: string) => {
      const state = get();
      const hostUser = state.user;
      const newRoom: LiveRoom = {
        id: `room_${Date.now()}`,
        name: name.trim(),
        hostName: hostUser ? hostUser.name : 'Shashank',
        hostAvatar:
          hostUser?.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
        cover:
          cover ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
        genre: genre || 'Chill / Lo-Fi',
        listenerCount: 1,
        isLive: true,
        tags: [genre, 'Live Host', 'AI DJ Active'],
        participants: [
          {
            id: hostUser?.id || `usr_${Date.now()}`,
            name: hostUser ? hostUser.name : 'Shashank',
            avatar:
              hostUser?.avatar ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
            isHost: true,
          },
        ],
        currentTrack: state.currentTrack || FIXTURE_TRACKS[0],
      };

      const updatedRooms = userService.addLiveRoom(newRoom);
      set({ liveRooms: updatedRooms });
      get().joinRoom(newRoom);
      return newRoom;
    },

    sendChatMessage: (text: string) => {
      const { activeRoom, user } = get();
      const roomId = activeRoom ? activeRoom.id : 'room_late_night_lounge';
      const senderName = user ? user.name : 'Guest DJ';
      const senderEmail = user ? user.email : 'guest@aidjstudio.com';
      const senderAvatar =
        user?.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';

      chatService.sendMessage(roomId, text, senderName, senderAvatar, false, senderEmail);
    },

    setCurrentView: (view: ViewType) => {
      set({ currentView: view });
    },

    setSelectedPlaylist: (playlist: Playlist | null) => {
      set({ selectedPlaylist: playlist, currentView: playlist ? 'playlist' : 'home' });
    },

    setSelectedArtist: (artist: Artist | null) => {
      set({ selectedArtist: artist, currentView: artist ? 'artist' : 'home' });
    },

    navigateToArtist: async (artistOrName: Artist | string) => {
      if (typeof artistOrName === 'string') {
        const artist = await musicService.getArtistByName(artistOrName);
        if (artist) {
          set({ selectedArtist: artist, currentView: 'artist' });
        }
      } else if (artistOrName) {
        set({ selectedArtist: artistOrName, currentView: 'artist' });
      }
    },

    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },

    addRecentSearch: (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      set((state) => ({
        recentSearches: [
          trimmed,
          ...state.recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
        ].slice(0, 8),
      }));
    },

    removeRecentSearch: (query: string) => {
      set((state) => ({
        recentSearches: state.recentSearches.filter((s) => s !== query),
      }));
    },

    clearRecentSearches: () => {
      set({ recentSearches: [] });
    },

    toggleRightPanel: () => {
      set((state) => ({ rightPanelOpen: !state.rightPanelOpen }));
    },

    setRightPanelView: (mode: 'canvas' | 'queue' | 'chat') => {
      set({ rightPanelView: mode, rightPanelOpen: true });
    },

    toggleLyrics: () => {
      set((state) => ({ lyricsOpen: !state.lyricsOpen }));
    },
  };
});
