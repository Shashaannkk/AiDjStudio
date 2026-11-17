import { create } from 'zustand';
import type { Track, Playlist, LiveRoom, ChatMessage, TransitionInsight, UserProfile, Artist, RoomRole, RoomParticipant } from '../types/music';
import type { MoodId, RecommendationCandidate } from '../types/recommendation';
import type { RoomMood, RoomMoodState, SoundclashSession } from '../types/roomIntelligence';
import type { AssistantMessage, AssistantAction, AssistantContext } from '../types/assistant';
import { FIXTURE_TRACKS, FIXTURE_ARTISTS, PROVIDER_MUSIC_CATALOG } from '../fixtures/musicFixtures';
import { audioEngine } from '../services/audioEngine';
import { musicService } from '../services/musicService';
import { userService } from '../services/userService';
import { chatService } from '../services/chatService';
import { realtimeRoomService } from '../services/realtimeRoomService';
import { recommendationEngine } from '../services/recommendationEngine';
import { dualDeckMixingEngine } from '../services/dualDeckMixingEngine';
import { moodDetectionEngine, ROOM_MOOD_CONFIG } from '../services/moodDetectionEngine';
import { soundclashEngine } from '../services/soundclashEngine';
import { aiAssistantService } from '../services/aiAssistantService';
import { providerAdapter } from '../services/providerAdapters';
import { analyticsService } from '../services/analyticsService';
import { soundclashService, type HumanSoundclashBattle, type SoundclashHistoryEntry } from '../services/soundclashService';

export type ViewType = 'home' | 'search' | 'library' | 'providers' | 'rooms' | 'playlist' | 'liked' | 'artist' | 'mixer' | 'admin' | 'profile';

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
  selectedMood: MoodId;
  activeRecommendation: RecommendationCandidate | null;
  rejectedTrackIds: Set<string>;
  skippedTrackIds: Map<string, number>;
  autoQueueAiTracks: boolean;

  // Live Room & Social
  activeRoom: LiveRoom | null;
  liveRooms: LiveRoom[];
  roomMessages: ChatMessage[];
  roomRole: RoomRole;
  roomQueue: Track[];
  roomNotification: string | null;
  roomMood: RoomMoodState;
  activeSoundclash: SoundclashSession | null;
  activeHumanBattle: HumanSoundclashBattle | null;
  soundclashHistory: SoundclashHistoryEntry[];
  soundclashMode: 'human' | 'ai';

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
  playFullLengthAlternative: () => void;
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
  setSelectedMood: (mood: MoodId) => void;
  generateRecommendation: () => void;
  acceptRecommendation: (candidate?: RecommendationCandidate) => void;
  rejectRecommendation: (trackId: string) => void;
  toggleAutoQueueAiTracks: () => void;
  recordTrackSkip: (trackId: string) => void;

  // Room Actions
  joinRoom: (room: LiveRoom) => Promise<void>;
  joinRoomByCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  createLiveRoom: (name: string, genre: string, cover?: string) => Promise<LiveRoom>;
  addTrackToRoomQueue: (track: Track) => void;
  removeTrackFromRoomQueue: (trackId: string) => void;
  reorderRoomQueue: (fromIndex: number, toIndex: number) => void;
  updateParticipantRole: (userId: string, role: RoomRole) => void;
  kickParticipant: (userId: string, reason?: string) => void;
  transferRoomOwnership: (newHostId: string) => void;
  closeRoom: () => void;
  clearRoomNotification: () => void;
  sendChatMessage: (text: string) => void;
  setRoomMood: (mood: RoomMood, manual?: boolean) => void;
  evaluateRoomMood: () => void;
  startSoundclash: (durationSec?: number, candidateCount?: number) => SoundclashSession;
  voteInSoundclash: (trackId: string) => void;
  endSoundclash: () => void;
  setSoundclashMode: (mode: 'human' | 'ai') => void;
  createHumanSoundclash: (title?: string, durationSec?: number) => Promise<HumanSoundclashBattle>;
  joinHumanSoundclash: () => Promise<HumanSoundclashBattle>;
  submitHumanSoundclashTrack: (track: Track) => Promise<HumanSoundclashBattle>;
  voteHumanSoundclash: (choice: 'dj1' | 'dj2') => Promise<HumanSoundclashBattle>;
  fetchActiveHumanBattle: () => Promise<void>;
  fetchSoundclashHistory: () => Promise<void>;
  queueVotes: Record<string, { score: number; upvotes: number; downvotes: number; userVotes: Record<string, number> }>;
  voteRoomTrack: (trackId: string, voteValue: 1 | -1 | 0) => Promise<void>;
  fetchQueueVotes: () => Promise<void>;

  // Phase 6: AI DJ Conversational Assistant
  assistantMessages: AssistantMessage[];
  assistantTyping: boolean;
  sendAssistantMessage: (text: string) => Promise<void>;
  executeAssistantAction: (action: AssistantAction) => Promise<void>;
  confirmAssistantAction: (messageId: string) => Promise<void>;
  cancelAssistantAction: (messageId: string) => void;
  clearAssistantMessages: () => void;

  // Navigation & Search Actions
  currentView: ViewType;
  selectedPlaylist: Playlist | null;
  selectedArtist: Artist | null;
  searchQuery: string;
  recentSearches: string[];
  rightPanelOpen: boolean;
  rightPanelView: 'canvas' | 'queue' | 'chat' | 'aidj' | 'assistant';
  lyricsOpen: boolean;
  mobileMenuOpen: boolean;

  setCurrentView: (view: ViewType) => void;
  setSelectedPlaylist: (playlist: Playlist | null) => void;
  setSelectedArtist: (artist: Artist | null) => void;
  navigateToArtist: (artistOrName: Artist | string) => void;
  setSearchQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  toggleRightPanel: () => void;
  setRightPanelView: (mode: 'canvas' | 'queue' | 'chat' | 'aidj' | 'assistant') => void;
  toggleLyrics: () => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
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

  // Register Supabase Realtime Collaborative Room callbacks
  realtimeRoomService.setCallbacks({
    onParticipantsChange: (participants) => {
      set((state) => {
        if (!state.activeRoom) return {};
        const updated = {
          ...state.activeRoom,
          participants,
          listenerCount: participants.length,
        };
        const currentUserId = state.user?.id || 'guest';
        const self = participants.find((p) => p.id === currentUserId);
        return {
          activeRoom: updated,
          roomRole: self?.role || state.roomRole,
        };
      });
    },
    onPlaybackSync: (sync) => {
      const state = get();
      // Listeners and Co-DJs synchronize with the Host authoritative playback
      if (state.roomRole !== 'host' && sync.track) {
        const serverNow = Date.now();
        const elapsed = sync.isPlaying ? Math.max(0, (serverNow - sync.serverTimestamp) / 1000) : 0;
        const targetTime = Math.max(0, sync.position + elapsed);

        if (!state.currentTrack || state.currentTrack.id !== sync.track.id) {
          audioEngine.playTrack(
            sync.track.id,
            sync.track.audio,
            targetTime,
            sync.track.bpm || 120,
            sync.track.duration
          );
          set({
            currentTrack: sync.track,
            isPlaying: sync.isPlaying,
            currentTime: targetTime,
            duration: sync.track.duration,
          });
          if (!sync.isPlaying) {
            audioEngine.pause();
          }
        } else {
          if (state.isPlaying !== sync.isPlaying) {
            if (sync.isPlaying) {
              audioEngine.resume(sync.track.bpm || 120);
              set({ isPlaying: true });
            } else {
              audioEngine.pause();
              set({ isPlaying: false });
            }
          }
          // Precision Drift Correction (<100ms PRD target):
          // Sub-second drift (80ms - 999ms) uses Web Audio playback rate micro-nudging (±2%)
          // Large drift (>= 1.0s) snaps with a clean seek
          const delta = targetTime - state.currentTime;
          const drift = Math.abs(delta);
          if (drift >= 1.0) {
            audioEngine.seek(targetTime);
            audioEngine.setPlaybackRate(1.0);
            set({ currentTime: targetTime });
          } else if (drift >= 0.08) {
            if (delta > 0) {
              audioEngine.setPlaybackRate(1.02); // speed up 2% to catch up smoothly
            } else {
              audioEngine.setPlaybackRate(0.98); // slow down 2% to let host align
            }
          } else {
            audioEngine.setPlaybackRate(1.0); // synchronized within <100ms
          }
        }
      }
    },
    onQueueChange: (queue) => {
      set({ roomQueue: queue });
    },
    onQueueVotesUpdate: (votes) => {
      const state = get();
      const sorted = [...state.roomQueue].sort((a, b) => {
        const scoreA = votes[a.id]?.score || 0;
        const scoreB = votes[b.id]?.score || 0;
        return scoreB - scoreA;
      });
      set({ queueVotes: votes, roomQueue: sorted });
    },
    onChatMessage: (msg) => {
      set((state) => ({
        roomMessages: [...state.roomMessages, msg],
      }));
    },
    onRoomClosed: () => {
      get().leaveRoom();
      set({ roomNotification: 'The host has ended this live room session.' });
    },
    onUserKicked: (targetUserId, reason) => {
      const currentUserId = get().user?.id || 'guest';
      if (targetUserId === currentUserId) {
        get().leaveRoom();
        set({ roomNotification: reason || 'You were removed from the room by the host.' });
      }
    },
    onRoleChanged: (userId, newRole) => {
      const currentUserId = get().user?.id || 'guest';
      if (userId === currentUserId) {
        set({
          roomRole: newRole,
          roomNotification: `Your role in the DJ Room was updated to ${newRole.toUpperCase()}!`,
        });
      }
    },
    onOwnershipTransferred: (newHostId) => {
      const currentUserId = get().user?.id || 'guest';
      if (newHostId === currentUserId) {
        set({
          roomRole: 'host',
          roomNotification: '👑 You are now the Host of this room!',
        });
      }
    },
    onRoomMoodChange: (moodState) => {
      set({ roomMood: moodState });
      const recMood = moodDetectionEngine.mapRoomMoodToRecommendationMood(moodState.mood);
      get().setSelectedMood(recMood);
    },
    onSoundclashUpdate: (session) => {
      set({ activeSoundclash: session });
    },
    onHumanBattleUpdate: (battle) => {
      set({ activeHumanBattle: battle });
    },
  });

  // Auto-join room from URL parameter (?room=CODE)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setTimeout(() => {
        usePlayerStore.getState().joinRoomByCode(roomParam);
      }, 400);
    }
  }

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

  // Subscribe to Supabase auth state changes and hydrate remote database records
  userService.onAuthChange(async (user) => {
    if (user) {
      const userLikedIds = userService.getLikedTrackIds(user.id);
      const userPlaylists = userService.getUserPlaylists(user.id);
      const likedTracks = allKnownTracks.filter((t) => userLikedIds.has(t.id));
      set({
        user,
        likedTrackIds: userLikedIds,
        likedTracks,
        userPlaylists,
      });

      // Load remote data from Supabase if available
      try {
        const [dbLikedTracks, dbPlaylists] = await Promise.all([
          userService.getLikedTracksAsync(user.id),
          userService.fetchPlaylistsAsync(user.id),
        ]);
        if (dbLikedTracks.length > 0) {
          const mergedIds = new Set([...Array.from(userLikedIds), ...dbLikedTracks.map((t) => t.id)]);
          set({
            likedTracks: dbLikedTracks,
            likedTrackIds: mergedIds,
          });
        }
        if (dbPlaylists.length > 0) {
          set({ userPlaylists: dbPlaylists });
        }
      } catch (err) {
        console.warn('Supabase profile data sync error:', err);
      }
    } else {
      const guestLikedIds = userService.getLikedTrackIds('guest');
      const guestPlaylists = userService.getUserPlaylists('guest');
      set({
        user: null,
        likedTrackIds: guestLikedIds,
        likedTracks: allKnownTracks.filter((t) => guestLikedIds.has(t.id)),
        userPlaylists: guestPlaylists,
      });
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
    selectedMood: 'all' as MoodId,
    activeRecommendation: recommendationEngine.recommendNext({
      currentTrack: initialTrack,
      queue: initialQueue,
      history: [initialTrack],
      likedTrackIds: initialLikedIds,
      mood: 'all',
    }),
    rejectedTrackIds: new Set<string>(),
    skippedTrackIds: new Map<string, number>(),
    autoQueueAiTracks: true,

    activeRoom: null,
    liveRooms: initialRooms,
    roomMessages: chatService.getRoomMessages('room_late_night_lounge'),
    roomRole: 'listener' as RoomRole,
    roomQueue: [],
    roomNotification: null,
    roomMood: {
      mood: 'party',
      confidence: 85,
      isManualOverride: false,
      detectedFrom: {
        topEmojis: ['🎉', '🔥'],
        matchedKeywords: ['dance', 'party'],
        sampleSize: 0,
      },
      updatedAt: Date.now(),
    },
    activeSoundclash: null,
    activeHumanBattle: null,
    soundclashHistory: [],
    soundclashMode: 'human',
    queueVotes: {},

    user: initialUser,
    authModalOpen: false,
    authMode: 'login',

    // Phase 6: Conversational Assistant State
    assistantMessages: aiAssistantService.getMessages(),
    assistantTyping: false,

    currentView: 'home',
    selectedPlaylist: null,
    selectedArtist: null,
    searchQuery: '',
    recentSearches: ['Doja Cat', 'The Weeknd', 'Synthwave', 'Bollywood'],
    rightPanelOpen: false,
    rightPanelView: 'queue',
    lyricsOpen: false,
    mobileMenuOpen: false,

    openAuthModal: (mode = 'login') => {
      set({ authModalOpen: true, authMode: mode });
    },

    closeAuthModal: () => {
      set({ authModalOpen: false });
    },

    login: (userData: UserProfile) => {
      userService.saveCurrentUser(userData);
      analyticsService.startSession(userData.id);
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

      // Asynchronously fetch from Supabase if configured and merge
      Promise.all([
        userService.getLikedTracksAsync(userData.id),
        userService.fetchPlaylistsAsync(userData.id),
      ])
        .then(([dbLikedTracks, dbPlaylists]) => {
          if (dbLikedTracks.length > 0) {
            const mergedIds = new Set([...Array.from(userLikedIds), ...dbLikedTracks.map((t) => t.id)]);
            set({
              likedTracks: dbLikedTracks,
              likedTrackIds: mergedIds,
            });
          }
          if (dbPlaylists.length > 0) {
            set({ userPlaylists: dbPlaylists });
          }
        })
        .catch((e) => {
          console.warn('Notice loading Supabase user data:', e);
        });
    },

    logout: () => {
      analyticsService.endSession();
      userService.signOut();
      userService.saveCurrentUser(null);
      const guestLikedIds = userService.getLikedTrackIds('guest');
      const guestPlaylists = userService.getUserPlaylists('guest');
      set({
        user: null,
        likedTrackIds: guestLikedIds,
        likedTracks: allKnownTracks.filter((t) => guestLikedIds.has(t.id)),
        userPlaylists: guestPlaylists,
      });
    },

    playTrack: (rawTrack: Track) => {
      // Silence any playing decks before starting single track player
      dualDeckMixingEngine.stopAll();

      const track = providerAdapter.normalizeTrack(rawTrack);
      const state = get();
      analyticsService.recordEvent('track_play', track.id, { bpm: track.bpm, key: track.key, genre: track.genre });
      const bpm = track.bpm || 120;
      const playableDuration = providerAdapter.getPlayableDuration(track);

      // Start from second 0:00 through the complete duration
      audioEngine.playTrack(track.id, track.audio, 0, bpm, playableDuration);

      // Persist to listening history (local + Supabase)
      const userId = state.user?.id || 'guest';
      userService.recordListeningHistory(userId, track);

      // If in collaborative room and authorized, broadcast playback change
      if (state.activeRoom && (state.roomRole === 'host' || state.roomRole === 'co-dj')) {
        realtimeRoomService.broadcastPlaybackState(track, true, 0, 'track_change');
      }

      const activeQueue = state.activeRoom ? state.roomQueue : state.queue;
      const nextInQueue = activeQueue[0];
      let insight: TransitionInsight | null = null;
      if (nextInQueue) {
        const bpmScore = recommendationEngine.calculateBpmScore(track.bpm, nextInQueue.bpm);
        const harmonicScore = recommendationEngine.calculateHarmonicScore(track.key, nextInQueue.key);
        insight = {
          fromTrackTitle: track.title,
          toTrackTitle: nextInQueue.title,
          compatibilityScore: Math.round((bpmScore.score + harmonicScore.score) / 2),
          bpmDifference: bpmScore.effectiveDiff,
          suggestedAction: bpmScore.description,
          harmonicMatch: harmonicScore.relationship,
          energyShift: (nextInQueue.energy || 75) > (track.energy || 75) ? 'up' : 'down',
        };
      }

      const newHistory = [track, ...state.history.filter((t) => t.id !== track.id)].slice(0, 50);

      // Deterministically generate fresh top recommendation for this playing track
      const freshRec = recommendationEngine.recommendNext({
        currentTrack: track,
        queue: activeQueue,
        history: newHistory,
        likedTrackIds: state.likedTrackIds,
        skippedTrackIds: state.skippedTrackIds,
        rejectedTrackIds: state.rejectedTrackIds,
        mood: state.selectedMood,
      });

      // Pre-load current track into Deck A and upcoming track into Deck B of dual deck engine
      dualDeckMixingEngine.loadTrack('A', track);
      if (freshRec) {
        dualDeckMixingEngine.loadTrack('B', freshRec.track);
      } else if (nextInQueue) {
        dualDeckMixingEngine.loadTrack('B', nextInQueue);
      }

      set({
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        duration: playableDuration,
        history: newHistory,
        transitionInsight: insight,
        activeRecommendation: freshRec,
        aiDjStatus: state.aiDjEnabled ? 'beat-matched' : 'idle',
      });
    },

    playFullLengthAlternative: () => {
      const state = get();
      const current = state.currentTrack;
      if (!current || current.isFullLength) return;

      const alt = current.alternativeFullTrack || providerAdapter.findFullLengthAlternative(current, FIXTURE_TRACKS);
      if (alt) {
        get().playTrack(alt);
      }
    },

    togglePlay: () => {
      const { isPlaying, currentTrack, activeRoom, roomRole, currentView } = get();
      if (!currentTrack) {
        if (FIXTURE_TRACKS.length > 0) {
          get().playTrack(FIXTURE_TRACKS[0]);
        }
        return;
      }

      // Restrict listener controls in collaborative rooms
      if (activeRoom && roomRole === 'listener') {
        set({ roomNotification: 'Only Host or Co-DJ can control party playback.' });
        return;
      }

      if (isPlaying) {
        // Master Stop: Pause all audio engines immediately
        audioEngine.pause();
        dualDeckMixingEngine.stopAll();
        set({ isPlaying: false, aiDjStatus: 'idle' });
      } else {
        // Resume appropriately based on active view
        if (currentView === 'mixer') {
          audioEngine.pause();
          const masterDeck = dualDeckMixingEngine.getState().activeMasterDeck;
          dualDeckMixingEngine.playDeck(masterDeck);
          set({ isPlaying: true, aiDjStatus: get().aiDjEnabled ? 'beat-matched' : 'idle' });
        } else {
          dualDeckMixingEngine.stopAll();
          audioEngine.resume(currentTrack.bpm || 120);
          set({ isPlaying: true, aiDjStatus: get().aiDjEnabled ? 'beat-matched' : 'idle' });
        }
      }

      // Broadcast playback state to room participants
      if (activeRoom && (roomRole === 'host' || roomRole === 'co-dj')) {
        realtimeRoomService.broadcastPlaybackState(
          currentTrack,
          !isPlaying,
          get().currentTime,
          !isPlaying ? 'play' : 'pause'
        );
      }
    },

    nextTrack: () => {
      const {
        queue,
        roomQueue,
        activeRoom,
        roomRole,
        isShuffle,
        playTrack,
        currentTrack,
        currentTime,
        recordTrackSkip,
        activeRecommendation,
      } = get();

      // Track early skips (< 30 seconds into playback)
      if (currentTrack && currentTime < 30) {
        recordTrackSkip(currentTrack.id);
      }

      // In active collaborative room: pop next track from shared room queue
      if (activeRoom && roomQueue.length > 0) {
        if (roomRole === 'listener') {
          set({ roomNotification: 'Only Host or Co-DJ can skip party tracks.' });
          return;
        }
        const next = roomQueue[0];
        const remaining = roomQueue.slice(1);
        set({ roomQueue: remaining });
        realtimeRoomService.broadcastQueue(remaining, 'remove');
        playTrack(next);
        return;
      }

      if (queue.length > 0) {
        let nextIdx = 0;
        if (isShuffle && queue.length > 1) {
          nextIdx = Math.floor(Math.random() * queue.length);
        }
        const next = queue[nextIdx];
        const newQueue = queue.filter((_, i) => i !== nextIdx);
        set({ queue: newQueue });
        playTrack(next);
      } else {
        // Fallback to top AI-recommended track
        const candidate = activeRecommendation || recommendationEngine.recommendNext({
          currentTrack: get().currentTrack,
          history: get().history,
          likedTrackIds: get().likedTrackIds,
          skippedTrackIds: get().skippedTrackIds,
          rejectedTrackIds: get().rejectedTrackIds,
          mood: get().selectedMood,
        });

        if (candidate) {
          playTrack(candidate.track);
        } else {
          const next = FIXTURE_TRACKS.find((t) => t.id !== get().currentTrack?.id) || FIXTURE_TRACKS[0];
          playTrack(next);
        }
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
      const state = get();
      if (state.activeRoom && state.roomRole === 'listener') {
        set({ roomNotification: 'Only Host or Co-DJ can seek party playback.' });
        return;
      }
      audioEngine.seek(seconds);
      set({ currentTime: Math.round(seconds) });
      if (state.activeRoom && (state.roomRole === 'host' || state.roomRole === 'co-dj')) {
        realtimeRoomService.broadcastPlaybackState(
          state.currentTrack,
          state.isPlaying,
          seconds,
          'seek'
        );
      }
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
        const isCurrentlyLiked = newLikedIds.has(trackId);

        if (isCurrentlyLiked) {
          newLikedIds.delete(trackId);
          newLikedTracks = newLikedTracks.filter((t) => t.id !== trackId);
        } else {
          newLikedIds.add(trackId);
          if (targetTrack && !newLikedTracks.some((t) => t.id === trackId)) {
            newLikedTracks = [targetTrack, ...newLikedTracks];
          }
        }

        // Persist to local storage & Supabase
        const userId = state.user?.id || 'guest';
        userService.saveLikedTrackIds(userId, newLikedIds);
        if (targetTrack) {
          userService.saveLikedTrack(userId, targetTrack, !isCurrentlyLiked);
        }

        const updatedRec = recommendationEngine.recommendNext({
          currentTrack: state.currentTrack,
          queue: state.activeRoom ? state.roomQueue : state.queue,
          history: state.history,
          likedTrackIds: newLikedIds,
          skippedTrackIds: state.skippedTrackIds,
          rejectedTrackIds: state.rejectedTrackIds,
          mood: state.selectedMood,
        });

        return {
          likedTrackIds: newLikedIds,
          likedTracks: newLikedTracks,
          activeRecommendation: updatedRec,
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

      // Persist to Supabase if logged in
      if (state.user) {
        userService
          .persistPlaylist(userId, newPlaylist.name, newPlaylist.description, newPlaylist.image)
          .then((supabaseId) => {
            if (supabaseId) {
              newPlaylist.id = supabaseId;
            }
          })
          .catch(() => {});
      }

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
            // Persist track to Supabase
            if (state.user) {
              userService.persistPlaylistTrack(playlistId, track, newTracks.length - 1).catch(() => {});
            }
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
            // Delete track from Supabase
            if (state.user) {
              userService.removePlaylistTrackFromSupabase(playlistId, trackId).catch(() => {});
            }
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
      const state = get();
      const nextTrack =
        (state.queue.length > 0 ? state.queue[0] : null) ||
        (state.activeRoom && state.roomQueue.length > 0 ? state.roomQueue[0] : null) ||
        state.activeRecommendation?.track ||
        recommendationEngine.recommendNext({
          currentTrack: state.currentTrack,
          queue: state.activeRoom ? state.roomQueue : state.queue,
          history: state.history,
          likedTrackIds: state.likedTrackIds,
          skippedTrackIds: state.skippedTrackIds,
          rejectedTrackIds: state.rejectedTrackIds,
          mood: state.selectedMood,
        })?.track;

      if (!nextTrack) return;

      set({ aiDjStatus: 'mixing' });

      // Trigger high-fidelity crossfade on audio engine
      audioEngine.crossfadeToTrack(
        nextTrack.id,
        nextTrack.audio,
        0,
        nextTrack.bpm || 120,
        nextTrack.duration,
        1.5
      );

      // Pre-load and crossfade dual-deck mixing studio
      const mixer = dualDeckMixingEngine.getState();
      const targetDeck = mixer.activeMasterDeck === 'A' ? 'B' : 'A';
      dualDeckMixingEngine.loadTrack(targetDeck, nextTrack).then(() => {
        dualDeckMixingEngine.startAutoTransition(mixer.activeMasterDeck, targetDeck, 2);
      });

      setTimeout(() => {
        const cur = get();
        const fromQueue = cur.queue.length > 0 && cur.queue[0].id === nextTrack.id;
        const fromRoomQueue = cur.activeRoom && cur.roomQueue.length > 0 && cur.roomQueue[0].id === nextTrack.id;

        const updatedHistory = cur.currentTrack
          ? [cur.currentTrack, ...cur.history.filter((t) => t.id !== cur.currentTrack?.id)].slice(0, 50)
          : cur.history;

        // Persist to listening history
        const userId = cur.user?.id || 'guest';
        userService.recordListeningHistory(userId, nextTrack);

        // If in collaborative room and host/co-dj, broadcast
        if (cur.activeRoom && (cur.roomRole === 'host' || cur.roomRole === 'co-dj')) {
          realtimeRoomService.broadcastPlaybackState(nextTrack, true, 0, 'track_change');
        }

        // Generate next recommendation for the new track
        const remainingQueue = fromQueue ? cur.queue.slice(1) : cur.queue;
        const freshRec = recommendationEngine.recommendNext({
          currentTrack: nextTrack,
          queue: remainingQueue,
          history: updatedHistory,
          likedTrackIds: cur.likedTrackIds,
          skippedTrackIds: cur.skippedTrackIds,
          rejectedTrackIds: cur.rejectedTrackIds,
          mood: cur.selectedMood,
        });

        set({
          currentTrack: nextTrack,
          isPlaying: true,
          aiDjStatus: 'beat-matched',
          history: updatedHistory,
          queue: fromQueue ? cur.queue.slice(1) : cur.queue,
          roomQueue: fromRoomQueue ? cur.roomQueue.slice(1) : cur.roomQueue,
          activeRecommendation: freshRec,
        });
      }, 1500);
    },

    setSelectedMood: (mood: MoodId) => {
      set({ selectedMood: mood });
      get().generateRecommendation();
    },

    generateRecommendation: () => {
      const state = get();
      const next = recommendationEngine.recommendNext({
        currentTrack: state.currentTrack,
        queue: state.activeRoom ? state.roomQueue : state.queue,
        history: state.history,
        likedTrackIds: state.likedTrackIds,
        skippedTrackIds: state.skippedTrackIds,
        rejectedTrackIds: state.rejectedTrackIds,
        mood: state.selectedMood,
      });
      set({ activeRecommendation: next });
    },

    acceptRecommendation: (candidate?: RecommendationCandidate) => {
      const state = get();
      const target = candidate || state.activeRecommendation;
      if (!target) return;

      if (state.activeRoom) {
        if (state.roomRole !== 'host' && state.roomRole !== 'co-dj') {
          set({ roomNotification: 'Only Host or Co-DJ can add recommended tracks to the party queue.' });
          return;
        }
        state.addTrackToRoomQueue(target.track);
        set({ roomNotification: `✨ Added "${target.track.title}" to Party Queue (${target.score.overall}% Match)` });
      } else {
        state.addToQueue(target.track);
      }

      // Re-generate fresh recommendation
      const updatedQueue = state.activeRoom ? [...state.roomQueue, target.track] : [...state.queue, target.track];
      const next = recommendationEngine.recommendNext({
        currentTrack: state.currentTrack,
        queue: updatedQueue,
        history: state.history,
        likedTrackIds: state.likedTrackIds,
        skippedTrackIds: state.skippedTrackIds,
        rejectedTrackIds: state.rejectedTrackIds,
        mood: state.selectedMood,
      });
      set({ activeRecommendation: next });
    },

    rejectRecommendation: (trackId: string) => {
      const state = get();
      const newRejected = new Set(state.rejectedTrackIds);
      newRejected.add(trackId);

      const next = recommendationEngine.recommendNext({
        currentTrack: state.currentTrack,
        queue: state.activeRoom ? state.roomQueue : state.queue,
        history: state.history,
        likedTrackIds: state.likedTrackIds,
        skippedTrackIds: state.skippedTrackIds,
        rejectedTrackIds: newRejected,
        mood: state.selectedMood,
      });

      set({
        rejectedTrackIds: newRejected,
        activeRecommendation: next,
      });
    },

    toggleAutoQueueAiTracks: () => {
      set((state) => ({ autoQueueAiTracks: !state.autoQueueAiTracks }));
    },

    recordTrackSkip: (trackId: string) => {
      set((state) => {
        const updated = new Map(state.skippedTrackIds);
        const count = (updated.get(trackId) || 0) + 1;
        updated.set(trackId, count);
        return { skippedTrackIds: updated };
      });
    },

    joinRoom: async (room: LiveRoom) => {
      const state = get();
      const currentUser = state.user;
      const userId = currentUser?.id || `usr_guest_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const isHost = room.hostId === userId;
      const initialRole: RoomRole = isHost ? 'host' : 'listener';

      const participant: RoomParticipant = {
        id: userId,
        name: currentUser ? currentUser.name : 'Guest DJ',
        email: currentUser?.email || '',
        avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
        role: initialRole,
        isHost,
        isOnline: true,
        joinedAt: Date.now(),
      };

      const msgs = chatService.getRoomMessages(room.id);
      set({
        activeRoom: room,
        roomRole: initialRole,
        roomQueue: room.queue || [],
        roomMessages: msgs,
        rightPanelOpen: true,
        rightPanelView: 'chat',
      });

      chatService.fetchRoomMessagesAsync(room.id).then((freshMsgs) => {
        if (freshMsgs && freshMsgs.length > 0) {
          set({ roomMessages: freshMsgs });
        }
      }).catch(() => {});

      // Connect to Realtime channel with Capacity Enforcement (Max 50)
      try {
        await realtimeRoomService.joinRoom(room, participant);
      } catch (err: any) {
        set({
          activeRoom: null,
          roomRole: 'listener',
          roomQueue: [],
          roomNotification: err.message || 'ROOM_CAPACITY_REACHED: Room is currently full (50/50).',
        });
        throw err;
      }

      // Fetch active human soundclash and queue votes if any
      get().fetchActiveHumanBattle();
      get().fetchQueueVotes();

      if (room.currentTrack) {
        state.playTrack(room.currentTrack);
      }
    },

    joinRoomByCode: async (code: string) => {
      const targetRoom = await realtimeRoomService.findRoomByCode(code);
      if (!targetRoom) {
        return { success: false, error: `Room with code "${code.toUpperCase()}" not found or inactive.` };
      }
      try {
        await get().joinRoom(targetRoom);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Unable to join room.' };
      }
    },

    leaveRoom: () => {
      realtimeRoomService.leaveRoom();
      set({
        activeRoom: null,
        roomRole: 'listener',
        roomQueue: [],
      });
    },

    createLiveRoom: async (name: string, genre: string, cover?: string) => {
      const state = get();
      const hostUser = state.user;
      const hostId = hostUser?.id || `usr_${Date.now()}`;
      const hostName = hostUser ? hostUser.name : 'Resident DJ';
      const hostAvatar =
        hostUser?.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
      const roomCode = realtimeRoomService.generateRoomCode();

      const newRoom: LiveRoom = {
        id: `room_${Date.now()}`,
        code: roomCode,
        name: name.trim(),
        hostId,
        hostName,
        hostAvatar,
        cover:
          cover ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
        genre: genre || 'Chill / Lo-Fi',
        listenerCount: 1,
        isLive: true,
        tags: [genre, 'Live Host', 'AI DJ Active', `Code: ${roomCode}`],
        participants: [
          {
            id: hostId,
            name: hostName,
            email: hostUser?.email || '',
            avatar: hostAvatar,
            role: 'host',
            isHost: true,
            isOnline: true,
          },
        ],
        queue: [...state.queue],
        currentTrack: state.currentTrack || FIXTURE_TRACKS[0],
        currentPosition: state.currentTime,
        isPlaying: state.isPlaying,
      };

      const updatedRooms = userService.addLiveRoom(newRoom, hostUser?.id);
      set({
        liveRooms: updatedRooms,
        activeRoom: newRoom,
        roomRole: 'host',
        roomQueue: newRoom.queue,
      });

      await get().joinRoom(newRoom);
      return newRoom;
    },

    addTrackToRoomQueue: (track: Track) => {
      const state = get();
      if (!state.activeRoom) return;
      if (state.roomRole !== 'host' && state.roomRole !== 'co-dj') {
        set({ roomNotification: 'Only Host or Co-DJ can add tracks to the party queue.' });
        return;
      }
      const updated = [...state.roomQueue, track];
      set({ roomQueue: updated });
      realtimeRoomService.broadcastQueue(updated, 'add');
    },

    removeTrackFromRoomQueue: (trackId: string) => {
      const state = get();
      if (!state.activeRoom) return;
      if (state.roomRole !== 'host' && state.roomRole !== 'co-dj') {
        set({ roomNotification: 'Only Host or Co-DJ can remove tracks from the queue.' });
        return;
      }
      const updated = state.roomQueue.filter((t) => t.id !== trackId);
      set({ roomQueue: updated });
      realtimeRoomService.broadcastQueue(updated, 'remove');
    },

    reorderRoomQueue: (fromIdx: number, toIdx: number) => {
      const state = get();
      if (!state.activeRoom) return;
      if (state.roomRole !== 'host' && state.roomRole !== 'co-dj') {
        set({ roomNotification: 'Only Host or Co-DJ can reorder the party queue.' });
        return;
      }
      const newQueue = [...state.roomQueue];
      const [moved] = newQueue.splice(fromIdx, 1);
      newQueue.splice(toIdx, 0, moved);
      set({ roomQueue: newQueue });
      realtimeRoomService.broadcastQueue(newQueue, 'reorder');
    },

    fetchQueueVotes: async () => {
      const state = get();
      if (!state.activeRoom) return;
      const roomId = state.activeRoom.id || state.activeRoom.code;
      try {
        const res = await fetch(`/api/queue/votes?roomId=${encodeURIComponent(roomId)}`);
        if (res.ok) {
          const data = await res.json();
          set({ queueVotes: data.votes || {} });
        }
      } catch {}
    },

    voteRoomTrack: async (trackId: string, voteValue: 1 | -1 | 0) => {
      const state = get();
      if (!state.activeRoom) return;
      const roomId = state.activeRoom.id || state.activeRoom.code;
      const userId = state.user?.id || 'guest';

      try {
        const token = userService.getAuthToken();
        const res = await fetch('/api/queue/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            roomId,
            queueItemId: trackId,
            userId,
            voteValue,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const votes = data.votes || {};

          // Sort queue dynamically by net vote score
          const sorted = [...state.roomQueue].sort((a, b) => {
            const scoreA = votes[a.id]?.score || 0;
            const scoreB = votes[b.id]?.score || 0;
            return scoreB - scoreA;
          });

          set({ queueVotes: votes, roomQueue: sorted });
          
          // QUE-01 Fix: Broadcast authoritative queue votes so ALL room participants (host, co-dj, listeners) receive the update
          realtimeRoomService.broadcastQueueVotes(votes);
          if (state.roomRole === 'host' || state.roomRole === 'co-dj') {
            realtimeRoomService.broadcastQueue(sorted, 'reorder');
          }
        }
      } catch (e) {
        console.warn('Error voting on track in queue:', e);
      }
    },

    updateParticipantRole: (userId: string, role: RoomRole) => {
      realtimeRoomService.updateParticipantRole(userId, role);
    },

    kickParticipant: (userId: string, reason?: string) => {
      realtimeRoomService.kickParticipant(userId, reason);
    },

    transferRoomOwnership: (newHostId: string) => {
      realtimeRoomService.transferOwnership(newHostId);
    },

    closeRoom: () => {
      realtimeRoomService.closeRoom();
      get().leaveRoom();
    },

    clearRoomNotification: () => {
      set({ roomNotification: null });
    },

    sendChatMessage: (text: string) => {
      const { activeRoom, user } = get();
      if (activeRoom) {
        realtimeRoomService.sendChatMessage(text);
      } else {
        const roomId = 'room_late_night_lounge';
        const senderName = user ? user.name : 'Guest DJ';
        const senderEmail = user ? user.email : 'guest@aidjstudio.com';
        const senderAvatar =
          user?.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';

        chatService.sendMessage(roomId, text, senderName, senderAvatar, false, senderEmail);
      }

      // Re-evaluate room mood from latest message stream if not manual override
      const state = get();
      if (!state.roomMood.isManualOverride) {
        state.evaluateRoomMood();
      }
    },

    setRoomMood: (mood: RoomMood, manual = true) => {
      const state = get();
      const updated: RoomMoodState = {
        mood,
        confidence: manual ? 100 : 85,
        isManualOverride: manual,
        detectedFrom: {
          topEmojis: [ROOM_MOOD_CONFIG[mood].emoji],
          matchedKeywords: manual ? ['manual-override'] : [],
          sampleSize: state.roomMessages.length,
        },
        updatedAt: Date.now(),
      };

      set({ roomMood: updated });
      realtimeRoomService.broadcastRoomMood(updated);

      // Adapt AI DJ recommendation engine to match room mood!
      const recMood = moodDetectionEngine.mapRoomMoodToRecommendationMood(mood);
      state.setSelectedMood(recMood);
    },

    evaluateRoomMood: () => {
      const state = get();
      if (!state.activeRoom || state.roomMood.isManualOverride) return;

      const detected = moodDetectionEngine.analyzeChat(state.roomMessages);
      set({ roomMood: detected });
      realtimeRoomService.broadcastRoomMood(detected);

      // Adapt AI DJ recommendation engine
      const recMood = moodDetectionEngine.mapRoomMoodToRecommendationMood(detected.mood);
      state.setSelectedMood(recMood);
    },

    startSoundclash: (durationSec = 30, candidateCount = 3) => {
      const state = get();
      if (!state.activeRoom) throw new Error('Must be in an active room to start Soundclash');

      const session = soundclashEngine.createSoundclash(
        state.activeRoom.id,
        state.currentTrack,
        state.roomQueue,
        state.roomMood.mood,
        durationSec,
        candidateCount
      );

      set({ activeSoundclash: session });
      realtimeRoomService.broadcastSoundclash(session);

      // Post soundclash announcement in chat
      state.sendChatMessage(`⚡ SOUNDCLASH STARTED! Vote now for the next track to drop (${durationSec}s countdown)!`);

      return session;
    },

    voteInSoundclash: (trackId: string) => {
      const state = get();
      if (!state.activeSoundclash || state.activeSoundclash.status !== 'active') return;
      const userId = state.user?.id || 'usr_guest_' + Date.now();

      const updated = soundclashEngine.recordVote(state.activeSoundclash, userId, trackId);
      set({ activeSoundclash: updated });
      realtimeRoomService.broadcastSoundclash(updated);
    },

    endSoundclash: () => {
      const state = get();
      if (!state.activeSoundclash || state.activeSoundclash.status !== 'active') return;

      const { updatedSession, winnerTrack } = soundclashEngine.evaluateWinner(state.activeSoundclash);
      set({ activeSoundclash: updatedSession });
      realtimeRoomService.broadcastSoundclash(updatedSession);

      // Automatically add winner track to the room queue!
      state.addTrackToRoomQueue(winnerTrack);

      // Post celebration announcement in chat
      state.sendChatMessage(`🏆 SOUNDCLASH WINNER: "${winnerTrack.title}" by ${winnerTrack.artist_name} won the vote and is queued next!`);
    },

    setSoundclashMode: (mode: 'human' | 'ai') => {
      set({ soundclashMode: mode });
    },

    createHumanSoundclash: async (title = 'Soundclash: DJ vs DJ Battle Royale! 🔥', durationSec = 45) => {
      const state = get();
      if (!state.activeRoom) throw new Error('Must be in an active room to start Soundclash');
      const dj1 = {
        id: state.user?.id || 'usr_host_' + Date.now(),
        name: state.user?.name || 'Lead DJ',
        avatar: state.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      };
      const battle = await soundclashService.createBattle({
        roomId: state.activeRoom.id,
        title,
        dj1,
        durationSec,
      });
      set({ activeHumanBattle: battle });
      realtimeRoomService.broadcastHumanBattle(battle);
      state.sendChatMessage(`⚔️ HUMAN DJ SOUNDCLASH INITIATED: ${dj1.name} has entered the arena! Who will step up to challenge?`);
      return battle;
    },

    joinHumanSoundclash: async () => {
      const state = get();
      if (!state.activeRoom) throw new Error('Must be in an active room to join Soundclash');
      const challenger = {
        id: state.user?.id || 'usr_challenger_' + Date.now(),
        name: state.user?.name || 'Challenger DJ',
        avatar: state.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      };
      const battle = await soundclashService.registerChallenger(state.activeRoom.id, challenger);
      set({ activeHumanBattle: battle });
      realtimeRoomService.broadcastHumanBattle(battle);
      state.sendChatMessage(`🔥 CHALLENGE ACCEPTED: ${challenger.name} has stepped into the Soundclash arena! Select your weapons!`);
      return battle;
    },

    submitHumanSoundclashTrack: async (track: Track) => {
      const state = get();
      if (!state.activeRoom) throw new Error('Must be in an active room');
      const userId = state.user?.id || 'guest';
      const battle = await soundclashService.submitTrack(state.activeRoom.id, userId, track);
      set({ activeHumanBattle: battle });
      realtimeRoomService.broadcastHumanBattle(battle);
      if (battle.status === 'active') {
        state.sendChatMessage(`⚡ SOUNDCLASH BATTLE COMMENCED! ${battle.dj1.user.name} vs ${battle.dj2?.user.name}! Cast your votes!`);
      } else {
        state.sendChatMessage(`🎵 Track locked in for Soundclash: "${track.title}"!`);
      }
      return battle;
    },

    voteHumanSoundclash: async (choice: 'dj1' | 'dj2') => {
      const state = get();
      if (!state.activeRoom) throw new Error('Must be in an active room');
      const userId = state.user?.id || 'usr_guest_' + Date.now();
      const battle = await soundclashService.castVote(state.activeRoom.id, userId, choice);
      set({ activeHumanBattle: battle });
      realtimeRoomService.broadcastHumanBattle(battle);
      if (battle.status === 'ended' && battle.winner) {
        state.sendChatMessage(`🏆 SOUNDCLASH CHAMPION: ${battle.winner.dj.name} won with "${battle.winner.track?.title}" (${battle.winner.votes} votes)!`);
        if (battle.winner.track) {
          state.addTrackToRoomQueue(battle.winner.track);
        }
      }
      return battle;
    },

    fetchActiveHumanBattle: async () => {
      const state = get();
      if (!state.activeRoom) return;
      try {
        const battle = await soundclashService.getActiveBattle(state.activeRoom.id);
        set({ activeHumanBattle: battle });
      } catch {}
    },

    fetchSoundclashHistory: async () => {
      const state = get();
      try {
        const history = await soundclashService.getHistory(state.activeRoom?.id);
        set({ soundclashHistory: history });
      } catch {}
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

    setRightPanelView: (mode: 'canvas' | 'queue' | 'chat' | 'aidj' | 'assistant') => {
      set({ rightPanelView: mode, rightPanelOpen: true });
    },

    toggleLyrics: () => {
      set((state) => ({ lyricsOpen: !state.lyricsOpen }));
    },

    toggleMobileMenu: () => {
      set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
    },

    setMobileMenuOpen: (open: boolean) => {
      set({ mobileMenuOpen: open });
    },

    // Phase 6: AI DJ Conversational Assistant Actions
    sendAssistantMessage: async (text: string) => {
      if (!text.trim()) return;
      set({ assistantTyping: true });

      const { currentTrack, queue, history, activeRoom, roomRole, roomMood, selectedMood, userPlaylists } = get();
      const context: AssistantContext = {
        currentTrack,
        queue,
        history,
        activeRoom,
        roomRole,
        roomMood,
        selectedMood,
        userPlaylists,
      };

      try {
        await aiAssistantService.sendMessage(text, context);
        set({
          assistantMessages: aiAssistantService.getMessages(),
          assistantTyping: false,
        });
      } catch (err) {
        console.error('Error in sendAssistantMessage:', err);
        set({ assistantTyping: false });
      }
    },

    executeAssistantAction: async (action: AssistantAction) => {
      const {
        playTrack,
        addToQueue,
        addTrackToRoomQueue,
        createPlaylist,
        addTrackToPlaylist,
        activeRoom,
        roomRole,
        setCurrentView,
        setSelectedPlaylist,
      } = get();

      switch (action.type) {
        case 'PLAY_TRACK':
          if (action.track) {
            playTrack(action.track);
          }
          break;

        case 'ADD_TO_QUEUE':
        case 'ADD_TO_ROOM_QUEUE':
          if (action.track) {
            if (activeRoom && (roomRole === 'host' || roomRole === 'co-dj')) {
              addTrackToRoomQueue(action.track);
            } else {
              addToQueue(action.track);
            }
          }
          break;

        case 'LOAD_DECK':
          if (action.track) {
            dualDeckMixingEngine.loadTrack(action.deckId || 'B', action.track);
            setCurrentView('mixer');
          }
          break;

        case 'CREATE_PLAYLIST':
          if (action.playlistName && action.tracks && action.tracks.length > 0) {
            const newPlaylist = createPlaylist(action.playlistName, action.playlistDescription);
            for (const t of action.tracks) {
              addTrackToPlaylist(newPlaylist.id, t);
            }
            setSelectedPlaylist(newPlaylist);
            setCurrentView('playlist');
          }
          break;

        case 'CLEAR_QUEUE':
          // Must go through confirmAssistantAction
          break;
      }
    },

    confirmAssistantAction: async (messageId: string) => {
      const { clearQueue, assistantMessages } = get();
      const targetMsg = assistantMessages.find((m) => m.id === messageId);
      if (!targetMsg || !targetMsg.confirmationPrompt) return;

      if (targetMsg.confirmationPrompt.actionType === 'CLEAR_QUEUE') {
        clearQueue();
        const updated = assistantMessages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: `${m.content}\n\n✅ **Queue Cleared!** All upcoming songs have been removed from your active queue.`,
                confirmationPrompt: undefined,
              }
            : m
        );
        set({ assistantMessages: updated });
      }
    },

    cancelAssistantAction: (messageId: string) => {
      const { assistantMessages } = get();
      const updated = assistantMessages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content: `${m.content}\n\n❌ *Action cancelled by user.*`,
              confirmationPrompt: undefined,
            }
          : m
      );
      set({ assistantMessages: updated });
    },

    clearAssistantMessages: () => {
      aiAssistantService.clearMessages();
      set({ assistantMessages: aiAssistantService.getMessages() });
    },
  };
});
