/**
 * AI DJ Studio High-Fidelity Audio Engine
 * High-performance streaming audio player with real-time spectrum analysis.
 * Full-length continuous playback starting from second 0:00 through the complete song.
 */

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private mediaElementSource: MediaElementAudioSourceNode | null = null;
  private isPlaying = false;
  private volume = 0.8;
  private audioElem: HTMLAudioElement | null = null;
  private onTimeUpdateCallback: ((currentTime: number, duration?: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private isLiveStream = false;
  private currentBpm = 120;
  private synthInterval: number | null = null;
  private fallbackTimer: number | null = null;
  private fallbackTime = 0;
  private targetDuration = 210;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElem = new Audio();
      this.audioElem.volume = this.volume;
      this.audioElem.preload = 'auto';
      this.audioElem.crossOrigin = 'anonymous';
      this.audioElem.loop = false; // Never force-loop a clip unless repeat mode is single

      this.audioElem.ontimeupdate = () => {
        if (!this.audioElem) return;
        const cur = this.audioElem.currentTime;
        const dur = this.audioElem.duration && !isNaN(this.audioElem.duration) && this.audioElem.duration > 0
          ? this.audioElem.duration
          : this.targetDuration;

        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(Math.floor(cur), Math.round(dur));
        }
      };

      this.audioElem.onloadedmetadata = () => {
        if (this.audioElem && this.audioElem.duration && !isNaN(this.audioElem.duration)) {
          this.targetDuration = Math.round(this.audioElem.duration);
          if (this.onTimeUpdateCallback) {
            this.onTimeUpdateCallback(Math.floor(this.audioElem.currentTime), this.targetDuration);
          }
        }
      };

      this.audioElem.onended = () => {
        this.isPlaying = false;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      };

      this.audioElem.onerror = (e) => {
        console.warn('Audio stream fallback notice:', e);
        // If external audio stream fails, fallback to procedural high-res sound
        if (this.isPlaying && !this.synthInterval) {
          this.startSynthGroove(this.currentBpm);
          this.startFallbackTimer();
        }
      };
    }
  }

  private initWebAudio() {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioCtx.currentTime);
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);

        // Try to connect HTML Audio element to analyser node if CORS allows
        if (this.audioElem && !this.mediaElementSource) {
          try {
            this.mediaElementSource = this.audioCtx.createMediaElementSource(this.audioElem);
            this.mediaElementSource.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
          } catch {
            // In case of CORS restrictions on audio element, fallback to procedural spectrum
          }
        }
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setCallbacks(
    onTimeUpdate: (time: number, duration?: number) => void,
    onEnded: () => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onEndedCallback = onEnded;
  }

  /**
   * Play track starting from second 0:00 through the entire song duration
   */
  public async playTrack(
    _trackId: string,
    audioUrl?: string,
    startFromSec = 0,
    bpm = 120,
    totalDuration = 210
  ) {
    this.initWebAudio();
    this.isPlaying = true;
    this.currentBpm = bpm;
    this.targetDuration = totalDuration > 0 ? totalDuration : 210;
    this.fallbackTime = startFromSec || 0;

    this.stopSynthGroove();
    this.stopFallbackTimer();

    // Check if live audio stream is available
    if (audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))) {
      if (this.audioElem) {
        this.isLiveStream = true;
        this.audioElem.pause();
        this.audioElem.src = audioUrl;
        this.audioElem.currentTime = startFromSec || 0;

        try {
          await this.audioElem.play();
        } catch (e) {
          console.warn('Direct stream playback notice, engaging synth support:', e);
          this.startSynthGroove(bpm);
          this.startFallbackTimer();
        }
      }
    } else {
      this.isLiveStream = false;
      if (this.audioElem) {
        this.audioElem.pause();
      }
      this.startSynthGroove(bpm);
      this.startFallbackTimer();
    }
  }

  /**
   * DJ Crossfade Transition between current playing track and new track
   * Performs an exponential gain ramp and smooth beat-mix transition.
   */
  public async crossfadeToTrack(
    trackId: string,
    audioUrl?: string,
    startFromSec = 0,
    bpm = 120,
    totalDuration = 210,
    crossfadeDuration = 1.2
  ) {
    if (!this.audioCtx || !this.gainNode || !this.isPlaying) {
      await this.playTrack(trackId, audioUrl, startFromSec, bpm, totalDuration);
      return;
    }

    try {
      const now = this.audioCtx.currentTime;
      // Fade out current track smoothly
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.exponentialRampToValueAtTime(0.001, now + crossfadeDuration * 0.5);

      setTimeout(async () => {
        await this.playTrack(trackId, audioUrl, startFromSec, bpm, totalDuration);
        if (this.audioCtx && this.gainNode) {
          const nextNow = this.audioCtx.currentTime;
          this.gainNode.gain.cancelScheduledValues(nextNow);
          this.gainNode.gain.setValueAtTime(0.001, nextNow);
          this.gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.2, nextNow + crossfadeDuration * 0.5);
        }
      }, crossfadeDuration * 450);
    } catch {
      await this.playTrack(trackId, audioUrl, startFromSec, bpm, totalDuration);
    }
  }

  public pause() {
    this.isPlaying = false;
    if (this.audioElem) {
      this.audioElem.pause();
    }
    this.stopSynthGroove();
    this.stopFallbackTimer();
  }

  public resume(bpm = 120) {
    this.isPlaying = true;
    this.initWebAudio();

    if (this.isLiveStream && this.audioElem && this.audioElem.src && this.audioElem.src.startsWith('http')) {
      this.audioElem.play().catch(() => {
        this.startSynthGroove(bpm);
        this.startFallbackTimer();
      });
    } else {
      this.startSynthGroove(bpm);
      this.startFallbackTimer();
    }
  }

  /**
   * Seek smoothly to any second from 0:00 to the end of the song
   */
  public seek(seconds: number) {
    const clamped = Math.max(0, Math.min(seconds, this.targetDuration));
    this.fallbackTime = clamped;

    if (this.audioElem && this.audioElem.src && this.isLiveStream) {
      try {
        this.audioElem.currentTime = clamped;
      } catch (err) {
        console.warn('Seek offset handled:', err);
      }
    }

    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(Math.round(clamped), this.targetDuration);
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audioElem) {
      this.audioElem.volume = this.volume;
    }
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioCtx.currentTime);
    }
  }

  public setLoop(loop: boolean) {
    if (this.audioElem) {
      this.audioElem.loop = loop;
    }
  }

  public getFrequencyData(array?: Uint8Array): Uint8Array {
    const data = array || new Uint8Array(32);
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(data as any);
      // Check if analyser has non-zero audio data
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      if (sum > 0) return data;
    }

    // Procedural animated spectrum when audio context is silent or cross-origin
    if (this.isPlaying) {
      const time = Date.now() / 120;
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.floor(Math.sin(time + i * 0.45) * 85 + 135);
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        data[i] = 0;
      }
    }
    return data;
  }

  private startFallbackTimer() {
    this.stopFallbackTimer();
    this.fallbackTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.fallbackTime += 0.5;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(Math.round(this.fallbackTime), this.targetDuration);
      }
      if (this.fallbackTime >= this.targetDuration) {
        this.pause();
        this.fallbackTime = 0;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    }, 500);
  }

  private stopFallbackTimer() {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private startSynthGroove(bpm = 120) {
    this.stopSynthGroove();
    const intervalMs = (60 / bpm) * 1000 * 0.5; // 8th notes

    let step = 0;
    this.synthInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.audioCtx) return;
      this.triggerSynthStep(step, bpm);
      step = (step + 1) % 16;
    }, intervalMs);
  }

  private stopSynthGroove() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private triggerSynthStep(step: number, _bpm: number) {
    if (!this.audioCtx || !this.gainNode) return;

    // Four-on-the-floor kick
    if (step % 4 === 0) {
      try {
        const kickOsc = this.audioCtx.createOscillator();
        const kickGain = this.audioCtx.createGain();
        kickOsc.frequency.setValueAtTime(140, this.audioCtx.currentTime);
        kickOsc.frequency.exponentialRampToValueAtTime(35, this.audioCtx.currentTime + 0.08);
        kickGain.gain.setValueAtTime(this.volume * 0.35, this.audioCtx.currentTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);
        kickOsc.connect(kickGain);
        kickGain.connect(this.gainNode);
        kickOsc.start();
        kickOsc.stop(this.audioCtx.currentTime + 0.12);
      } catch {}
    }

    // Melodic rolling bass
    if (step % 2 === 0) {
      try {
        const bassOsc = this.audioCtx.createOscillator();
        const bassGain = this.audioCtx.createGain();
        const rootFreq = 55; // A1
        const notes = [rootFreq, rootFreq, rootFreq * 1.25, rootFreq * 1.5];
        const note = notes[Math.floor(step / 4) % notes.length];
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(note, this.audioCtx.currentTime);
        bassGain.gain.setValueAtTime(this.volume * 0.12, this.audioCtx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.18);
        bassOsc.connect(bassGain);
        bassGain.connect(this.gainNode);
        bassOsc.start();
        bassOsc.stop(this.audioCtx.currentTime + 0.18);
      } catch {}
    }
  }
}

export const audioEngine = new AudioEngine();
