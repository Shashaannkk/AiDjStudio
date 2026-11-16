import type { Track } from './music';

export type DeckId = 'A' | 'B';

export type CrossfadeCurve = 'equal-power' | 'linear' | 'fast-cut' | 'smooth-blend';

export type MixingMode = 'manual' | 'auto';

export interface DeckEQ {
  low: number; // -24 dB to +6 dB (nominal 0 dB)
  mid: number; // -24 dB to +6 dB (nominal 0 dB)
  high: number; // -24 dB to +6 dB (nominal 0 dB)
  lowKill: boolean; // Mutes low frequencies (-60 dB)
  midKill: boolean; // Mutes mid frequencies (-60 dB)
  highKill: boolean; // Mutes high frequencies (-60 dB)
}

export interface DeckAudioAnalysis {
  realtimeEnergy: number; // 0 - 100% RMS energy
  peakVolume: number; // 0.0 - 1.0 VU meter level
  detectedBpm: number;
  beatOnsetDetected: boolean;
  spectralCentroid: number; // Frequency brightness indicator in Hz
  detectedKey?: string; // Estimated musical key from pitch class profiling
}

export interface DeckState {
  deckId: DeckId;
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // Channel fader (0.0 to 1.0)
  gain: number; // Trim/Gain multiplier (0.0 to 2.0x, nominal 1.0)
  eq: DeckEQ;
  originalBpm: number;
  effectiveBpm: number;
  tempoOffsetPercent: number; // Pitch fader (-16% to +16%)
  beatSyncActive: boolean;
  cuePointSec: number;
  isLoaded: boolean;
  isLoading: boolean;
  isReady: boolean;
  analysis: DeckAudioAnalysis;
}

export interface TransitionConfig {
  durationSec: number; // Transition duration in seconds (e.g. 4, 8, 16, 32)
  curve: CrossfadeCurve;
  autoTriggerRemainingSec: number; // Trigger transition when track has N seconds left
  bassSwapEnabled: boolean; // Smoothly cross-modulate EQ low-end during transition
  tempoSyncDuringTransition: boolean;
}

export interface TransitionState {
  isTransitioning: boolean;
  progress: number; // 0.0 to 1.0
  fromDeck: DeckId;
  toDeck: DeckId;
  timeRemainingSec: number;
  phaseDescription: string;
}

export interface DualDeckMixerState {
  deckA: DeckState;
  deckB: DeckState;
  activeMasterDeck: DeckId;
  crossfaderPosition: number; // -1.0 (100% Deck A) to +1.0 (100% Deck B)
  masterVolume: number; // 0.0 to 1.0
  mixingMode: MixingMode;
  transitionConfig: TransitionConfig;
  transitionState: TransitionState;
}

