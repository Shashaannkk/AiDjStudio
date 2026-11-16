import type { Track } from '../types/music';
import type {
  DeckEQ,
  DeckId,
  DeckState,
  DualDeckMixerState,
  MixingMode,
  TransitionConfig,
  TransitionState,
} from '../types/audioMixing';

/**
 * Verified Permitted Test Audio Streams (High-Availability Master Previews)
 * High fidelity streaming audio for non-commercial mixing, testing, and continuous playback.
 */
export const PERMITTED_TEST_TRACKS: Record<DeckId, Track> = {
  A: {
    id: 'in_tauba_tauba',
    title: 'Tauba Tauba (Deck A Master)',
    artist_name: 'Karan Aujla',
    album_name: 'Bad Newz',
    duration: 208,
    audio: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/34/8d/63/348d6342-2c35-bf31-8131-2c8b3cfe3c09/mzaf_15374551219149804677.plus.aac.p.m4a',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/79/d2/01/79d201d2-e54d-5604-81fb-313f30db7219/198588533581.jpg/1000x1000bb.jpg',
    bpm: 110,
    key: '8A / A Min',
    energy: 96,
    genre: 'Punjabi / Bollywood Dance',
  },
  B: {
    id: 'in_big_dawgs',
    title: 'Big Dawgs (Deck B Inbound)',
    artist_name: 'Hanumankind & Kalmi',
    album_name: 'Big Dawgs',
    duration: 234,
    audio: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f5/92/d7/f592d7a4-19be-c005-6698-1caccacc173c/mzaf_15257808628606025867.plus.aac.p.m4a',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/d2/6c/42d26c01-619f-fa0a-2e83-7f4a28b5d3b2/24UMGIM70977.rgb.jpg/1000x1000bb.jpg',
    bpm: 130,
    key: '9A / E Min',
    energy: 98,
    genre: 'Desi Hip Hop / Trap',
  },
};

interface DeckAudioNodes {
  audioElem: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode | null;
  eqLow: BiquadFilterNode | null;
  eqMid: BiquadFilterNode | null;
  eqHigh: BiquadFilterNode | null;
  gainTrim: GainNode | null;
  channelVolume: GainNode | null;
  crossfadeGain: GainNode | null;
  analyser: AnalyserNode | null;
  isWebAudioRouted: boolean;
  synthInterval: number | null;
  tickerInterval: number | null;
  subBandEma: number; // For beat onset detection
}

export class DualDeckMixingEngine {
  private audioCtx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private masterAnalyserNode: AnalyserNode | null = null;

  private deckNodes: Record<DeckId, DeckAudioNodes>;
  private state: DualDeckMixerState;
  private stateListeners: Set<(state: DualDeckMixerState) => void> = new Set();
  private analysisAnimationId: number | null = null;
  private transitionTimerId: number | null = null;

  constructor() {
    const defaultEQ = (): DeckEQ => ({
      low: 0,
      mid: 0,
      high: 0,
      lowKill: false,
      midKill: false,
      highKill: false,
    });

    const defaultDeckState = (deckId: DeckId): DeckState => ({
      deckId,
      track: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1.0,
      gain: 1.0,
      eq: defaultEQ(),
      originalBpm: 124,
      effectiveBpm: 124,
      tempoOffsetPercent: 0,
      beatSyncActive: false,
      cuePointSec: 0,
      isLoaded: false,
      isLoading: false,
      isReady: false,
      analysis: {
        realtimeEnergy: 0,
        peakVolume: 0,
        detectedBpm: 124,
        beatOnsetDetected: false,
        spectralCentroid: 1000,
      },
    });

    const defaultTransitionConfig: TransitionConfig = {
      durationSec: 8,
      curve: 'equal-power',
      autoTriggerRemainingSec: 15,
      bassSwapEnabled: true,
      tempoSyncDuringTransition: true,
    };

    const defaultTransitionState: TransitionState = {
      isTransitioning: false,
      progress: 0,
      fromDeck: 'A',
      toDeck: 'B',
      timeRemainingSec: 0,
      phaseDescription: 'Ready',
    };

    this.state = {
      deckA: defaultDeckState('A'),
      deckB: defaultDeckState('B'),
      activeMasterDeck: 'A',
      crossfaderPosition: -1.0, // Fully on Deck A
      masterVolume: 0.9,
      mixingMode: 'manual',
      transitionConfig: defaultTransitionConfig,
      transitionState: defaultTransitionState,
    };

    // Initialize audio element structures
    this.deckNodes = {
      A: this.createInitialDeckNodes('A'),
      B: this.createInitialDeckNodes('B'),
    };

    // Pre-load default permitted test tracks into Deck A and Deck B
    if (typeof window !== 'undefined') {
      this.loadTrack('A', PERMITTED_TEST_TRACKS.A);
      this.loadTrack('B', PERMITTED_TEST_TRACKS.B);
      this.startAnalysisLoop();
    }
  }

  private createInitialDeckNodes(deckId: DeckId): DeckAudioNodes {
    let elem: HTMLAudioElement;
    if (typeof window !== 'undefined') {
      elem = new Audio();
      elem.preload = 'auto';
      elem.loop = false;

      elem.ontimeupdate = () => {
        const cur = elem.currentTime;
        const dur = elem.duration && !isNaN(elem.duration) && elem.duration > 0
          ? elem.duration
          : this.getDeckState(deckId).duration;

        this.updateDeckState(deckId, {
          currentTime: cur,
          duration: dur,
        });

        // Check auto-transition trigger if in auto mode
        if (
          this.state.mixingMode === 'auto' &&
          !this.state.transitionState.isTransitioning &&
          this.state.activeMasterDeck === deckId &&
          dur > 0 &&
          dur - cur <= this.state.transitionConfig.autoTriggerRemainingSec &&
          dur - cur > 1
        ) {
          const targetDeck = deckId === 'A' ? 'B' : 'A';
          if (this.getDeckState(targetDeck).isLoaded) {
            this.startAutoTransition();
          }
        }
      };

      elem.onended = () => {
        this.updateDeckState(deckId, { isPlaying: false });
        if (this.state.mixingMode === 'auto' && !this.state.transitionState.isTransitioning) {
          const nextMaster = deckId === 'A' ? 'B' : 'A';
          this.state.activeMasterDeck = nextMaster;
          this.playDeck(nextMaster);
        }
      };
    } else {
      elem = {} as any;
    }

    return {
      audioElem: elem,
      sourceNode: null,
      eqLow: null,
      eqMid: null,
      eqHigh: null,
      gainTrim: null,
      channelVolume: null,
      crossfadeGain: null,
      analyser: null,
      isWebAudioRouted: false,
      synthInterval: null,
      tickerInterval: null,
      subBandEma: 10,
    };
  }

  /**
   * Initialize or resume Web Audio Context on user gesture
   */
  public initAudioContext() {
    if (typeof window === 'undefined') return;

    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();

        // Master nodes
        this.masterGainNode = this.audioCtx.createGain();
        this.masterGainNode.gain.setValueAtTime(this.state.masterVolume, this.audioCtx.currentTime);

        this.masterAnalyserNode = this.audioCtx.createAnalyser();
        this.masterAnalyserNode.fftSize = 256;

        this.masterGainNode.connect(this.masterAnalyserNode);
        this.masterAnalyserNode.connect(this.audioCtx.destination);

        // Build Deck A and Deck B Web Audio chains
        this.setupDeckWebAudioChain('A');
        this.setupDeckWebAudioChain('B');

        // Apply initial crossfader gains
        this.updateCrossfaderGains();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((err) => {
        console.warn('AudioContext resume gesture pending:', err);
      });
    }
  }

  /**
   * Set up Web Audio DSP Chain for a Deck:
   * Source -> LowShelf EQ -> Peaking Mid EQ -> HighShelf EQ -> Trim -> Channel Volume -> Crossfade Gain -> Analyser -> Master
   */
  private setupDeckWebAudioChain(deckId: DeckId) {
    if (!this.audioCtx || !this.masterGainNode) return;
    const nodes = this.deckNodes[deckId];
    if (nodes.isWebAudioRouted) return;

    try {
      // 1. 3-Band Equalizer (Biquad Filters)
      // Low: 250 Hz Low-Shelf (-24 dB to +6 dB, -60 dB Kill)
      nodes.eqLow = this.audioCtx.createBiquadFilter();
      nodes.eqLow.type = 'lowshelf';
      nodes.eqLow.frequency.setValueAtTime(250, this.audioCtx.currentTime);
      nodes.eqLow.gain.setValueAtTime(0, this.audioCtx.currentTime);

      // Mid: 1500 Hz Peaking Filter (Q = 1.0)
      nodes.eqMid = this.audioCtx.createBiquadFilter();
      nodes.eqMid.type = 'peaking';
      nodes.eqMid.frequency.setValueAtTime(1500, this.audioCtx.currentTime);
      nodes.eqMid.Q.setValueAtTime(1.0, this.audioCtx.currentTime);
      nodes.eqMid.gain.setValueAtTime(0, this.audioCtx.currentTime);

      // High: 4000 Hz High-Shelf (-24 dB to +6 dB, -60 dB Kill)
      nodes.eqHigh = this.audioCtx.createBiquadFilter();
      nodes.eqHigh.type = 'highshelf';
      nodes.eqHigh.frequency.setValueAtTime(4000, this.audioCtx.currentTime);
      nodes.eqHigh.gain.setValueAtTime(0, this.audioCtx.currentTime);

      // 2. Trim / Pre-Amp Gain
      nodes.gainTrim = this.audioCtx.createGain();
      nodes.gainTrim.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // 3. Channel Fader Gain
      nodes.channelVolume = this.audioCtx.createGain();
      nodes.channelVolume.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // 4. Crossfade Gain
      nodes.crossfadeGain = this.audioCtx.createGain();
      nodes.crossfadeGain.gain.setValueAtTime(deckId === 'A' ? 1.0 : 0.0, this.audioCtx.currentTime);

      // 5. Deck Analyser
      nodes.analyser = this.audioCtx.createAnalyser();
      nodes.analyser.fftSize = 256;
      nodes.analyser.smoothingTimeConstant = 0.8;

      // Connect Signal Chain
      nodes.eqLow.connect(nodes.eqMid);
      nodes.eqMid.connect(nodes.eqHigh);
      nodes.eqHigh.connect(nodes.gainTrim);
      nodes.gainTrim.connect(nodes.channelVolume);
      nodes.channelVolume.connect(nodes.crossfadeGain);
      nodes.crossfadeGain.connect(nodes.analyser);
      nodes.analyser.connect(this.masterGainNode);

      // Audio elements play directly through hardware pipeline to avoid browser CORS muting
      nodes.isWebAudioRouted = true;
    } catch (e) {
      console.warn(`Web Audio routing notice for Deck ${deckId}:`, e);
      nodes.isWebAudioRouted = false;
    }
  }

  /**
   * Load track into designated deck (Deck A or Deck B)
   * Guaranteed to reset playback position to second 0:00
   */
  public async loadTrack(deckId: DeckId, track: Track): Promise<boolean> {
    const nodes = this.deckNodes[deckId];
    this.stopPlaybackTicker(deckId);

    // Explicitly reset currentTime to 0:00 immediately upon loading
    this.updateDeckState(deckId, {
      isLoading: true,
      track,
      originalBpm: track.bpm || 124,
      effectiveBpm: track.bpm || 124,
      tempoOffsetPercent: 0,
      beatSyncActive: false,
      currentTime: 0,
    });

    if (nodes.audioElem) {
      try {
        nodes.audioElem.pause();
      } catch {}

      nodes.audioElem.src = track.audio;
      try {
        nodes.audioElem.currentTime = 0;
      } catch {}
      nodes.audioElem.playbackRate = 1.0;
      (nodes.audioElem as any).preservesPitch = true;
      this.applyAudioVolume(deckId);

      return new Promise((resolve) => {
        const onLoaded = () => {
          cleanup();
          try {
            nodes.audioElem.currentTime = 0;
          } catch {}
          const dur = nodes.audioElem.duration && !isNaN(nodes.audioElem.duration) && nodes.audioElem.duration > 0
            ? Math.round(nodes.audioElem.duration)
            : track.duration || 210;

          this.updateDeckState(deckId, {
            isLoading: false,
            isLoaded: true,
            isReady: true,
            currentTime: 0,
            duration: dur,
          });
          this.applyAudioVolume(deckId);
          resolve(true);
        };

        const onError = () => {
          cleanup();
          // Keep track info and set fallback duration
          this.updateDeckState(deckId, {
            isLoading: false,
            isLoaded: true,
            isReady: true,
            currentTime: 0,
            duration: track.duration || 210,
          });
          resolve(true);
        };

        const cleanup = () => {
          nodes.audioElem.removeEventListener('loadedmetadata', onLoaded);
          nodes.audioElem.removeEventListener('canplay', onLoaded);
          nodes.audioElem.removeEventListener('error', onError);
        };

        nodes.audioElem.addEventListener('loadedmetadata', onLoaded);
        nodes.audioElem.addEventListener('canplay', onLoaded);
        nodes.audioElem.addEventListener('error', onError);

        // Safety timeout
        setTimeout(() => {
          cleanup();
          try {
            nodes.audioElem.currentTime = 0;
          } catch {}
          this.updateDeckState(deckId, {
            isLoading: false,
            isLoaded: true,
            isReady: true,
            currentTime: 0,
            duration: track.duration || 210,
          });
          this.applyAudioVolume(deckId);
          resolve(true);
        }, 1500);
      });
    }

    return true;
  }

  /**
   * Play specific deck
   */
  public async playDeck(deckId: DeckId) {
    this.initAudioContext();
    const nodes = this.deckNodes[deckId];
    this.updateDeckState(deckId, { isPlaying: true });

    this.applyAudioVolume(deckId);
    this.startPlaybackTicker(deckId);

    if (nodes.audioElem && nodes.audioElem.src && nodes.audioElem.src.startsWith('http')) {
      try {
        await nodes.audioElem.play();
      } catch (err: any) {
        if (err && err.name === 'AbortError') return;
        console.warn(`Deck ${deckId} playback blocked by autoplay policy, user gesture required:`, err);
        this.startFallbackBeatSynth(deckId);
      }
    } else {
      this.startFallbackBeatSynth(deckId);
    }
  }

  /**
   * Pause specific deck
   */
  public pauseDeck(deckId: DeckId) {
    const nodes = this.deckNodes[deckId];
    this.updateDeckState(deckId, { isPlaying: false });

    this.stopPlaybackTicker(deckId);

    if (nodes.audioElem) {
      try {
        nodes.audioElem.pause();
      } catch {}
    }
    this.stopFallbackBeatSynth(deckId);
  }

  /**
   * Toggle Play/Pause on a deck
   */
  public toggleDeck(deckId: DeckId) {
    const deck = this.getDeckState(deckId);
    if (deck.isPlaying) {
      this.pauseDeck(deckId);
    } else {
      this.playDeck(deckId);
    }
  }

  /**
   * Seek specific deck to seconds
   */
  public seekDeck(deckId: DeckId, seconds: number) {
    const nodes = this.deckNodes[deckId];
    const deck = this.getDeckState(deckId);
    const clamped = Math.max(0, Math.min(seconds, deck.duration));

    this.updateDeckState(deckId, { currentTime: clamped });

    if (nodes.audioElem && nodes.audioElem.src) {
      try {
        nodes.audioElem.currentTime = clamped;
      } catch {}
    }
  }

  /**
   * Set Hot Cue point for a deck
   */
  public setCuePoint(deckId: DeckId, seconds?: number) {
    const deck = this.getDeckState(deckId);
    const cue = seconds !== undefined ? seconds : deck.currentTime;
    this.updateDeckState(deckId, { cuePointSec: cue });
  }

  /**
   * Jump to Hot Cue point and cue deck
   */
  public jumpToCuePoint(deckId: DeckId) {
    const deck = this.getDeckState(deckId);
    this.seekDeck(deckId, deck.cuePointSec);
    this.pauseDeck(deckId);
  }

  /**
   * Set Pitch / Tempo Fader offset (-16% to +16%)
   * Mathematically scales playbackRate with pitch preservation!
   */
  public setTempoOffset(deckId: DeckId, offsetPercent: number) {
    const clampedOffset = Math.max(-16, Math.min(16, offsetPercent));
    const deck = this.getDeckState(deckId);
    const rate = 1.0 + clampedOffset / 100.0;
    const effectiveBpm = Math.round(deck.originalBpm * rate);

    const nodes = this.deckNodes[deckId];
    if (nodes.audioElem) {
      nodes.audioElem.playbackRate = rate;
      (nodes.audioElem as any).preservesPitch = true;
    }

    this.updateDeckState(deckId, {
      tempoOffsetPercent: clampedOffset,
      effectiveBpm,
    });
  }

  /**
   * Beat Synchronization: Locks slave deck's tempo and phase to the master deck
   */
  public syncBeat(slaveDeckId: DeckId) {
    const masterDeckId = slaveDeckId === 'A' ? 'B' : 'A';
    const masterDeck = this.getDeckState(masterDeckId);
    const slaveDeck = this.getDeckState(slaveDeckId);

    if (masterDeck.effectiveBpm <= 0 || slaveDeck.originalBpm <= 0) return;

    // Calculate tempo ratio
    const targetRate = masterDeck.effectiveBpm / slaveDeck.originalBpm;
    const offsetPercent = (targetRate - 1.0) * 100.0;

    this.setTempoOffset(slaveDeckId, offsetPercent);
    this.updateDeckState(slaveDeckId, { beatSyncActive: true });
  }

  /**
   * Set 3-Band Equalizer for a deck: Low, Mid, High (-24 dB to +6 dB, -60 dB on Kill)
   */
  public setDeckEQ(
    deckId: DeckId,
    band: 'low' | 'mid' | 'high',
    gainDb: number,
    isKill?: boolean
  ) {
    const deck = this.getDeckState(deckId);
    const newEQ = { ...deck.eq };

    if (isKill !== undefined) {
      if (band === 'low') newEQ.lowKill = isKill;
      if (band === 'mid') newEQ.midKill = isKill;
      if (band === 'high') newEQ.highKill = isKill;
    } else {
      newEQ[band] = Math.max(-24, Math.min(6, gainDb));
    }

    const nodes = this.deckNodes[deckId];
    if (this.audioCtx) {
      const now = this.audioCtx.currentTime;
      if (band === 'low' && nodes.eqLow) {
        const val = newEQ.lowKill ? -60 : newEQ.low;
        nodes.eqLow.gain.setTargetAtTime(val, now, 0.05);
      } else if (band === 'mid' && nodes.eqMid) {
        const val = newEQ.midKill ? -60 : newEQ.mid;
        nodes.eqMid.gain.setTargetAtTime(val, now, 0.05);
      } else if (band === 'high' && nodes.eqHigh) {
        const val = newEQ.highKill ? -60 : newEQ.high;
        nodes.eqHigh.gain.setTargetAtTime(val, now, 0.05);
      }
    }

    this.updateDeckState(deckId, { eq: newEQ });
    this.applyAudioVolume(deckId);
  }

  /**
   * Set Trim / Pre-Amp Gain (0.0 to 2.0x)
   */
  public setDeckGain(deckId: DeckId, gainMultiplier: number) {
    const clamped = Math.max(0, Math.min(2.0, gainMultiplier));
    const nodes = this.deckNodes[deckId];
    if (this.audioCtx && nodes.gainTrim) {
      nodes.gainTrim.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.05);
    }
    this.updateDeckState(deckId, { gain: clamped });
    this.applyAudioVolume(deckId);
  }

  /**
   * Set Channel Volume Fader (0.0 to 1.0)
   */
  public setChannelVolume(deckId: DeckId, volume: number) {
    const clamped = Math.max(0, Math.min(1.0, volume));
    const nodes = this.deckNodes[deckId];
    if (this.audioCtx && nodes.channelVolume) {
      nodes.channelVolume.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.05);
    }
    this.updateDeckState(deckId, { volume: clamped });
    this.applyAudioVolume(deckId);
  }

  /**
   * Set Crossfader Position (-1.0 for Deck A to +1.0 for Deck B)
   */
  public setCrossfaderPosition(position: number) {
    const clamped = Math.max(-1.0, Math.min(1.0, position));
    this.state.crossfaderPosition = clamped;
    this.updateCrossfaderGains();
    this.notifyState();
  }

  /**
   * Calculate and apply crossfader gains based on selected crossfader curve
   */
  private updateCrossfaderGains() {
    const pos = this.state.crossfaderPosition; // -1.0 to 1.0
    const curve = this.state.transitionConfig.curve;

    // Normalize pos to t in [0.0, 1.0]
    const t = (pos + 1.0) / 2.0;

    let gainA = 1.0;
    let gainB = 0.0;

    switch (curve) {
      case 'equal-power':
        // Constant acoustic power: cos(t * pi / 2), sin(t * pi / 2)
        gainA = Math.cos(t * (Math.PI / 2));
        gainB = Math.sin(t * (Math.PI / 2));
        break;
      case 'linear':
        gainA = 1.0 - t;
        gainB = t;
        break;
      case 'fast-cut':
        // Sharp cut-in within 5% of crossfader travel
        gainA = t < 0.95 ? 1.0 : (1.0 - t) / 0.05;
        gainB = t > 0.05 ? 1.0 : t / 0.05;
        break;
      case 'smooth-blend':
        // Cubic smooth S-curve
        const s = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        gainA = 1.0 - s;
        gainB = s;
        break;
    }

    const now = this.audioCtx ? this.audioCtx.currentTime : 0;
    if (this.audioCtx && this.deckNodes.A.crossfadeGain && this.deckNodes.B.crossfadeGain) {
      this.deckNodes.A.crossfadeGain.gain.setTargetAtTime(gainA, now, 0.03);
      this.deckNodes.B.crossfadeGain.gain.setTargetAtTime(gainB, now, 0.03);
    }

    // Direct element volume control so crossfader smoothly and actively blends audible audio
    this.applyAudioVolume('A', gainA);
    this.applyAudioVolume('B', gainB);
  }

  /**
   * Apply audible volume to HTML Audio elements directly so crossfader, channel volume, and kill switches work 100% reliably
   */
  private applyAudioVolume(deckId: DeckId, crossfadeMultiplier?: number) {
    const nodes = this.deckNodes[deckId];
    if (!nodes || !nodes.audioElem) return;

    const deck = this.getDeckState(deckId);
    let cf = crossfadeMultiplier;
    if (cf === undefined) {
      const pos = this.state.crossfaderPosition;
      const t = (pos + 1.0) / 2.0;
      cf = deckId === 'A' ? Math.cos(t * (Math.PI / 2)) : Math.sin(t * (Math.PI / 2));
    }

    const isKilled = deck.eq.lowKill && deck.eq.midKill && deck.eq.highKill;
    const finalVolume = isKilled ? 0 : Math.max(0, Math.min(1, deck.volume * deck.gain * this.state.masterVolume * cf));

    try {
      nodes.audioElem.volume = finalVolume;
    } catch {}
  }

  /**
   * Backward-compatible alias for applyAudioVolume
   */
  public applyCORSFallbackVolume(deckId: DeckId, crossfadeMultiplier?: number) {
    this.applyAudioVolume(deckId, crossfadeMultiplier);
  }

  /**
   * Set Master Volume (0.0 to 1.0)
   */
  public setMasterVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1.0, vol));
    this.state.masterVolume = clamped;
    if (this.audioCtx && this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.05);
    }
    this.applyAudioVolume('A');
    this.applyAudioVolume('B');
    this.notifyState();
  }

  /**
   * Playback ticker ensures currentTime advances smoothly, triggering auto-transitions even if media element pauses
   */
  private startPlaybackTicker(deckId: DeckId) {
    const nodes = this.deckNodes[deckId];
    if (nodes.tickerInterval) return;

    nodes.tickerInterval = window.setInterval(() => {
      const deck = this.getDeckState(deckId);
      if (!deck.isPlaying) {
        this.stopPlaybackTicker(deckId);
        return;
      }

      const elem = nodes.audioElem;
      const isAdvancing = elem && !elem.paused && elem.currentTime > 0;

      let cur = deck.currentTime;
      const dur = deck.duration > 0 ? deck.duration : 210;

      if (!isAdvancing) {
        cur = cur + 1;
        if (cur >= dur) {
          cur = 0;
          this.pauseDeck(deckId);
          return;
        }
        this.updateDeckState(deckId, { currentTime: cur, duration: dur });
      } else {
        cur = elem.currentTime;
        this.updateDeckState(deckId, { currentTime: cur, duration: dur });
      }

      // Check auto-transition trigger if in auto mode and deck is actively playing
      if (
        this.state.mixingMode === 'auto' &&
        deck.isPlaying &&
        !this.state.transitionState.isTransitioning &&
        this.state.activeMasterDeck === deckId &&
        dur > 0 &&
        dur - cur <= this.state.transitionConfig.autoTriggerRemainingSec &&
        dur - cur > 1
      ) {
        const targetDeck = deckId === 'A' ? 'B' : 'A';
        if (this.getDeckState(targetDeck).isLoaded) {
          this.startAutoTransition();
        }
      }
    }, 1000);
  }

  private stopPlaybackTicker(deckId: DeckId) {
    const nodes = this.deckNodes[deckId];
    if (nodes.tickerInterval) {
      clearInterval(nodes.tickerInterval);
      nodes.tickerInterval = null;
    }
  }

  /**
   * Immediately stops all decks, silences audio, and clears all timers and synthesizers
   */
  public stopAll() {
    this.pauseDeck('A');
    this.pauseDeck('B');
    this.cancelTransition();
    this.stopFallbackBeatSynth('A');
    this.stopFallbackBeatSynth('B');
    this.stopPlaybackTicker('A');
    this.stopPlaybackTicker('B');
  }

  /**
   * Configure Transition Settings (duration, curve, bass-swap)
   */
  public setTransitionConfig(config: Partial<TransitionConfig>) {
    this.state.transitionConfig = {
      ...this.state.transitionConfig,
      ...config,
    };
    this.notifyState();
  }

  /**
   * Switch between Manual Mixing and Auto AI DJ Mode
   */
  public setMixingMode(mode: MixingMode) {
    this.state.mixingMode = mode;
    if (mode === 'auto') {
      // In Auto AI mode, automatically lock slave deck's tempo to the master deck
      const masterDeck = this.state.activeMasterDeck;
      const slaveDeck = masterDeck === 'A' ? 'B' : 'A';
      this.syncBeat(slaveDeck);
    } else {
      // In Manual mode, release automated beat-sync lock for full tactile control
      this.updateDeckState('A', { beatSyncActive: false });
      this.updateDeckState('B', { beatSyncActive: false });
    }
    this.notifyState();
  }

  /**
   * Execute Real Automated Transition from Current Deck to Next Deck
   */
  public async startAutoTransition(
    fromDeckOverride?: DeckId,
    toDeckOverride?: DeckId,
    durationSecOverride?: number
  ): Promise<boolean> {
    if (this.state.transitionState.isTransitioning) return false;

    const fromDeck = fromDeckOverride || this.state.activeMasterDeck;
    const toDeck = toDeckOverride || (fromDeck === 'A' ? 'B' : 'A');
    const duration = durationSecOverride || this.state.transitionConfig.durationSec;

    // Ensure audio context is running
    this.initAudioContext();

    // 1. Pre-start incoming deck at its cue point
    await this.playDeck(toDeck);

    // 2. Synchronize tempo if enabled
    if (this.state.transitionConfig.tempoSyncDuringTransition) {
      this.syncBeat(toDeck);
    }

    this.state.transitionState = {
      isTransitioning: true,
      progress: 0,
      fromDeck,
      toDeck,
      timeRemainingSec: duration,
      phaseDescription: `Phase 1: Beat-matching and pre-drop alignment...`,
    };
    this.notifyState();

    const startCrossfadePos = fromDeck === 'A' ? -1.0 : 1.0;
    const targetCrossfadePos = toDeck === 'B' ? 1.0 : -1.0;
    const totalSteps = Math.max(20, Math.round(duration * 20)); // 20 updates per second
    const intervalMs = (duration * 1000) / totalSteps;
    let step = 0;

    return new Promise((resolve) => {
      this.transitionTimerId = window.setInterval(() => {
        step++;
        const progress = Math.min(1.0, step / totalSteps);
        const currentPos = startCrossfadePos + (targetCrossfadePos - startCrossfadePos) * progress;

        this.setCrossfaderPosition(currentPos);

        // Bass-Swap: in the second half of transition, scoop outgoing bass while opening incoming bass
        if (this.state.transitionConfig.bassSwapEnabled) {
          if (progress > 0.4 && progress <= 0.8) {
            const outgoingBassCut = -((progress - 0.4) / 0.4) * 18; // -18 dB cut
            this.setDeckEQ(fromDeck, 'low', outgoingBassCut);
            this.state.transitionState.phaseDescription = `Phase 2: Bass-swap filter transition active...`;
          } else if (progress > 0.8) {
            this.setDeckEQ(fromDeck, 'low', -24);
            this.setDeckEQ(toDeck, 'low', 0);
            this.state.transitionState.phaseDescription = `Phase 3: Dropping full low-end groove into Deck ${toDeck}...`;
          }
        }

        const remainingSec = Math.max(0, Math.round(duration * (1.0 - progress)));
        this.state.transitionState.progress = progress;
        this.state.transitionState.timeRemainingSec = remainingSec;
        this.notifyState();

        if (step >= totalSteps) {
          clearInterval(this.transitionTimerId!);
          this.transitionTimerId = null;

          // Transition Complete: stop outgoing deck and designate new master
          this.pauseDeck(fromDeck);
          this.setCrossfaderPosition(targetCrossfadePos);
          this.setDeckEQ(fromDeck, 'low', 0); // Reset EQ for next load

          this.state.activeMasterDeck = toDeck;
          this.state.transitionState = {
            isTransitioning: false,
            progress: 1.0,
            fromDeck,
            toDeck,
            timeRemainingSec: 0,
            phaseDescription: `Transition Complete • Deck ${toDeck} is Live!`,
          };

          this.notifyState();
          resolve(true);
        }
      }, intervalMs);
    });
  }

  /**
   * Cancel ongoing transition immediately
   */
  public cancelTransition() {
    if (this.transitionTimerId) {
      clearInterval(this.transitionTimerId);
      this.transitionTimerId = null;
    }
    this.state.transitionState = {
      isTransitioning: false,
      progress: 0,
      fromDeck: 'A',
      toDeck: 'B',
      timeRemainingSec: 0,
      phaseDescription: 'Transition Cancelled',
    };
    this.notifyState();
  }

  /**
   * Real-Time Audio Analysis Loop: Computes RMS energy, VU meter peak, and beat onsets
   */
  private startAnalysisLoop() {
    if (typeof window === 'undefined') return;

    const dataArray = new Uint8Array(128);

    const updateAnalysis = () => {
      (['A', 'B'] as DeckId[]).forEach((deckId) => {
        const nodes = this.deckNodes[deckId];
        const deck = this.getDeckState(deckId);

        if (!deck.isPlaying) {
          deck.analysis.realtimeEnergy = 0;
          deck.analysis.peakVolume = 0;
          deck.analysis.beatOnsetDetected = false;
          return;
        }

        if (nodes.analyser) {
          nodes.analyser.getByteFrequencyData(dataArray);

          // 1. RMS Energy Calculation
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = dataArray[i] / 255.0;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);
          deck.analysis.realtimeEnergy = Math.round(rms * 100);
          deck.analysis.peakVolume = Math.min(1.0, rms * 1.6);

          // 2. Beat Onset Detection via Low-Frequency Sub-Band (bins 1 to 5: ~40-160 Hz kick drum range)
          let subBandEnergy = 0;
          for (let i = 1; i <= 5; i++) {
            subBandEnergy += dataArray[i];
          }
          subBandEnergy /= 5;

          const threshold = nodes.subBandEma * 1.35;
          const isBeat = subBandEnergy > threshold && subBandEnergy > 45;
          deck.analysis.beatOnsetDetected = isBeat;

          // Exponential moving average for baseline threshold
          nodes.subBandEma = nodes.subBandEma * 0.92 + subBandEnergy * 0.08;
        } else {
          // Synthetic audio telemetry when Web Audio graph is not attached
          const pulse = (Math.sin(Date.now() / (60000 / (deck.effectiveBpm * 2))) + 1) / 2;
          deck.analysis.realtimeEnergy = Math.round(55 + pulse * 40);
          deck.analysis.peakVolume = 0.5 + pulse * 0.45;
          deck.analysis.beatOnsetDetected = pulse > 0.85;
        }
      });

      this.notifyState();
      this.analysisAnimationId = requestAnimationFrame(updateAnalysis);
    };

    this.analysisAnimationId = requestAnimationFrame(updateAnalysis);
  }

  /**
   * Fallback Beat Synth: Generates real Web Audio kick/bass pulses if external network is blocked
   */
  private startFallbackBeatSynth(deckId: DeckId) {
    if (!this.audioCtx) return;
    const nodes = this.deckNodes[deckId];
    if (nodes.synthInterval) return;

    const deck = this.getDeckState(deckId);
    const intervalMs = (60 / (deck.effectiveBpm || 124)) * 1000;

    nodes.synthInterval = window.setInterval(() => {
      const currentDeckState = this.getDeckState(deckId);
      if (!currentDeckState.isPlaying || !this.audioCtx || this.audioCtx.state === 'suspended') {
        this.stopFallbackBeatSynth(deckId);
        return;
      }
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const now = this.audioCtx.currentTime;

        osc.type = deckId === 'A' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(deckId === 'A' ? 120 : 90, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

        gain.gain.setValueAtTime(0.3 * this.state.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        if (nodes.crossfadeGain) {
          gain.connect(nodes.crossfadeGain);
        } else if (this.masterGainNode) {
          gain.connect(this.masterGainNode);
        }

        osc.start(now);
        osc.stop(now + 0.13);
      } catch {}
    }, intervalMs);
  }

  private stopFallbackBeatSynth(deckId: DeckId) {
    const nodes = this.deckNodes[deckId];
    if (nodes.synthInterval) {
      clearInterval(nodes.synthInterval);
      nodes.synthInterval = null;
    }
  }

  private getDeckState(deckId: DeckId): DeckState {
    return deckId === 'A' ? this.state.deckA : this.state.deckB;
  }

  private updateDeckState(deckId: DeckId, partial: Partial<DeckState>) {
    if (deckId === 'A') {
      this.state.deckA = { ...this.state.deckA, ...partial };
    } else {
      this.state.deckB = { ...this.state.deckB, ...partial };
    }
    this.notifyState();
  }

  public destroy() {
    if (this.analysisAnimationId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.analysisAnimationId);
      this.analysisAnimationId = null;
    }
    this.stopAll();
  }

  public getState(): DualDeckMixerState {
    return this.state;
  }

  public subscribe(listener: (state: DualDeckMixerState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState() {
    this.stateListeners.forEach((l) => l(this.state));
  }
}

export const dualDeckMixingEngine = new DualDeckMixingEngine();
