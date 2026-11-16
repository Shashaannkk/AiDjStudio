import type { Track, Playlist, LiveRoom, RoomRole } from './music';
import type { RoomMoodState } from './roomIntelligence';
import type { MoodId } from './recommendation';

export type AssistantRole = 'user' | 'assistant' | 'system';

export type AssistantActionType =
  | 'PLAY_TRACK'
  | 'ADD_TO_QUEUE'
  | 'ADD_TO_ROOM_QUEUE'
  | 'LOAD_DECK'
  | 'CREATE_PLAYLIST'
  | 'CLEAR_QUEUE'
  | 'EXPLAIN_TRANSITION';

export interface AssistantAction {
  id: string;
  type: AssistantActionType;
  label: string;
  track?: Track;
  tracks?: Track[];
  playlistName?: string;
  playlistDescription?: string;
  deckId?: 'A' | 'B';
  requiresConfirmation?: boolean;
  confirmed?: boolean;
  executed?: boolean;
}

export interface AssistantTransitionTip {
  currentTrack: Track;
  nextTrack: Track;
  bpmComparison: string;
  keyRelationship: string;
  compatibilityScore: number;
  technique: string;
  eqAdvice: string;
}

export interface AssistantConfirmationPrompt {
  actionType: AssistantActionType;
  title: string;
  warning: string;
  confirmLabel: string;
  cancelLabel: string;
  isDestructive: boolean;
}

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
  timestamp: string;
  createdAt: number;
  suggestedTracks?: Track[];
  actionProposal?: AssistantAction;
  transitionTip?: AssistantTransitionTip;
  confirmationPrompt?: AssistantConfirmationPrompt;
  createdPlaylistId?: string;
  isTyping?: boolean;
  error?: string;
}

export interface AssistantContext {
  currentTrack?: Track | null;
  queue?: Track[];
  history?: Track[];
  activeRoom?: LiveRoom | null;
  roomRole?: RoomRole;
  roomMood?: RoomMoodState;
  selectedMood?: MoodId;
  userPlaylists?: Playlist[];
}

