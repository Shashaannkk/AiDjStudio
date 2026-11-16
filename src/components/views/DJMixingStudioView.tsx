import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Sparkles,
  Zap,
  Volume2,
  RefreshCw,
  FolderOpen,
  X,
  Disc,
  Layers,
  Square,
  Search,
  Headphones,
  SlidersHorizontal,
} from 'lucide-react';
import { dualDeckMixingEngine, PERMITTED_TEST_TRACKS } from '../../services/dualDeckMixingEngine';
import { audioEngine } from '../../services/audioEngine';
import { usePlayerStore } from '../../store/usePlayerStore';
import { providerAdapter } from '../../services/providerAdapters';
import type { CrossfadeCurve, DeckId, DualDeckMixerState } from '../../types/audioMixing';
import type { Track } from '../../types/music';
import {
  PROVIDER_MUSIC_CATALOG,
  FIXTURE_TRACKS,
  TRENDING_INDIA_TRACKS,
  REAL_SPOTIFY_APPLE_CATALOG,
  AUDIUS_FEATURED_TRACKS,
  JAMENDO_INTEGRATED_TRACKS,
  INTERNET_ARCHIVE_TRACKS,
} from '../../fixtures/musicFixtures';

const GENRE_CATEGORIES = [
  'All',
  'Trending Hits',
  'Bollywood / Desi',
  'Hip Hop / Trap',
  'EDM / Dance',
  'Pop / Indie',
  'Electronic',
] as const;

export const DJMixingStudioView: React.FC = () => {
  const [mixerState, setMixerState] = useState<DualDeckMixerState>(dualDeckMixingEngine.getState());
  const [loadModalDeck, setLoadModalDeck] = useState<DeckId | null>(null);
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
      } catch {}
      previewAudioRef.current = null;
    }
    setPreviewTrackId(null);
  }, []);

  // Subscribe to real-time audio engine updates (VU meters, play state, positions, transitions)
  useEffect(() => {
    const unsubscribe = dualDeckMixingEngine.subscribe((state) => {
      setMixerState({ ...state });
    });
    return () => {
      unsubscribe();
      stopPreview();
    };
  }, [stopPreview]);

  const allAvailableTracks = useMemo(() => {
    const list = [
      ...TRENDING_INDIA_TRACKS,
      ...REAL_SPOTIFY_APPLE_CATALOG,
      ...PROVIDER_MUSIC_CATALOG,
      ...AUDIUS_FEATURED_TRACKS,
      ...JAMENDO_INTEGRATED_TRACKS,
      ...INTERNET_ARCHIVE_TRACKS,
      ...FIXTURE_TRACKS,
    ];
    const seen = new Set<string>();
    return list.filter((t) => {
      if (!t.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, []);

  const filteredTracks = useMemo(() => {
    let list = allAvailableTracks;

    if (selectedGenre !== 'All') {
      if (selectedGenre === 'Trending Hits') {
        list = list.filter(
          (t) =>
            (t.addedAt && t.addedAt.toLowerCase().includes('trending')) ||
            TRENDING_INDIA_TRACKS.some((ti) => ti.id === t.id)
        );
      } else if (selectedGenre === 'Bollywood / Desi') {
        list = list.filter(
          (t) =>
            (t.genre || '').toLowerCase().includes('punjabi') ||
            (t.genre || '').toLowerCase().includes('bollywood') ||
            (t.genre || '').toLowerCase().includes('desi')
        );
      } else if (selectedGenre === 'Hip Hop / Trap') {
        list = list.filter(
          (t) =>
            (t.genre || '').toLowerCase().includes('hip hop') ||
            (t.genre || '').toLowerCase().includes('trap') ||
            (t.genre || '').toLowerCase().includes('rap')
        );
      } else if (selectedGenre === 'EDM / Dance') {
        list = list.filter(
          (t) =>
            (t.genre || '').toLowerCase().includes('edm') ||
            (t.genre || '').toLowerCase().includes('dance') ||
            (t.genre || '').toLowerCase().includes('house')
        );
      } else if (selectedGenre === 'Pop / Indie') {
        list = list.filter(
          (t) =>
            (t.genre || '').toLowerCase().includes('pop') ||
            (t.genre || '').toLowerCase().includes('indie')
        );
      } else if (selectedGenre === 'Electronic') {
        list = list.filter(
          (t) =>
            (t.genre || '').toLowerCase().includes('electronic') ||
            (t.genre || '').toLowerCase().includes('synth')
        );
      }
    }

    if (trackSearch.trim()) {
      const q = trackSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist_name.toLowerCase().includes(q) ||
          (t.album_name && t.album_name.toLowerCase().includes(q)) ||
          (t.genre && t.genre.toLowerCase().includes(q)) ||
          (t.key && t.key.toLowerCase().includes(q)) ||
          (t.bpm && t.bpm.toString().includes(q))
      );
    }

    return list;
  }, [allAvailableTracks, trackSearch, selectedGenre]);

  const formatTime = (sec?: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTogglePreview = (track: Track, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (previewTrackId === track.id) {
      stopPreview();
    } else {
      stopPreview();
      const audio = new Audio(track.audio);
      audio.volume = 0.85;
      audio.onended = () => setPreviewTrackId(null);
      audio.onerror = () => setPreviewTrackId(null);
      audio.play().catch(() => setPreviewTrackId(null));
      previewAudioRef.current = audio;
      setPreviewTrackId(track.id);
    }
  };

  const handleCloseModal = () => {
    stopPreview();
    setLoadModalDeck(null);
    setTrackSearch('');
    setSelectedGenre('All');
  };

  const handleLoadTrack = (deckId: DeckId, track: Track) => {
    stopPreview();
    dualDeckMixingEngine.loadTrack(deckId, track);
    handleCloseModal();
  };

  const deckA = mixerState.deckA;
  const deckB = mixerState.deckB;
  const transition = mixerState.transitionState;
  const activeMaster = mixerState.activeMasterDeck;
  const activeMasterDeckState = activeMaster === 'A' ? deckA : deckB;
  const targetDeck = activeMaster === 'A' ? 'B' : 'A';
  const targetDeckState = targetDeck === 'A' ? deckA : deckB;
  const secondsRemaining = Math.max(0, activeMasterDeckState.duration - activeMasterDeckState.currentTime);

  const handleToggleDeckA = () => {
    if (deckA.isPlaying) {
      dualDeckMixingEngine.pauseDeck('A');
      if (!deckB.isPlaying) {
        usePlayerStore.setState({ isPlaying: false });
      }
    } else {
      audioEngine.pause();
      stopPreview();
      dualDeckMixingEngine.playDeck('A');
      usePlayerStore.setState({
        isPlaying: true,
        currentTrack: deckA.track || usePlayerStore.getState().currentTrack,
      });
    }
  };

  const handleToggleDeckB = () => {
    if (deckB.isPlaying) {
      dualDeckMixingEngine.pauseDeck('B');
      if (!deckA.isPlaying) {
        usePlayerStore.setState({ isPlaying: false });
      }
    } else {
      audioEngine.pause();
      stopPreview();
      dualDeckMixingEngine.playDeck('B');
      usePlayerStore.setState({
        isPlaying: true,
        currentTrack: deckB.track || usePlayerStore.getState().currentTrack,
      });
    }
  };

  const handleStopAll = () => {
    dualDeckMixingEngine.stopAll();
    audioEngine.pause();
    stopPreview();
    usePlayerStore.setState({ isPlaying: false });
  };

  // Rotation animation duration based on effective BPM (33 1/3 RPM nominal, scaled by tempo)
  const getSpinDuration = (isPlaying: boolean, effectiveBpm: number) => {
    if (!isPlaying) return '0s';
    const dur = 60 / (effectiveBpm / 2);
    return `${Math.max(0.8, dur).toFixed(2)}s`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0D0D0D] text-white p-4 overflow-y-auto no-scrollbar select-none gap-4">
      {/* 1. Studio Header & Global Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#141414] border border-white/5 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1DB954] to-emerald-300 flex items-center justify-center text-black font-black shadow-lg">
            <Disc className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wide text-white">Dual-Deck Mixing Studio</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#1DB954] text-black">
                Web Audio DSP
              </span>
            </div>
            <p className="text-[11px] text-[#B3B3B3]">
              Dual independent audio engines, real-time beat synchronization & harmonic crossfading
            </p>
          </div>
        </div>

        {/* Global Master Volume & Mode Switch */}
        <div className="flex items-center gap-4">
          {/* Master Volume */}
          <div className="flex items-center gap-2 bg-[#1C1C1C] px-3 py-1.5 rounded-xl border border-white/5">
            <Volume2 className="w-4 h-4 text-[#1DB954]" />
            <span className="text-[11px] font-bold text-zinc-400">Master:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mixerState.masterVolume}
              onChange={(e) => dualDeckMixingEngine.setMasterVolume(parseFloat(e.target.value))}
              aria-label="Master Output Volume"
              className="w-24 accent-[#1DB954] cursor-pointer"
            />
            <span className="text-[10px] font-mono text-zinc-300 w-8 text-right">
              {Math.round(mixerState.masterVolume * 100)}%
            </span>
          </div>

          {/* Mixing Mode Switch: Manual vs Auto */}
          <div className="flex items-center gap-1 bg-[#1C1C1C] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => {
                dualDeckMixingEngine.setMixingMode('manual');
                usePlayerStore.setState({ aiDjEnabled: false, aiDjStatus: 'idle' });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mixerState.mixingMode === 'manual'
                  ? 'bg-zinc-800 text-cyan-400 font-extrabold shadow border border-cyan-500/40'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manual DJ</span>
            </button>
            <button
              onClick={() => {
                dualDeckMixingEngine.setMixingMode('auto');
                usePlayerStore.setState({ aiDjEnabled: true, aiDjStatus: 'beat-matched' });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mixerState.mixingMode === 'auto'
                  ? 'bg-[#1DB954] text-black font-extrabold shadow-lg shadow-emerald-500/20'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>Auto AI Mix</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Dual Deck Workspace (Deck A - Left, Center Mixer, Deck B - Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-w-0">
        {/* ========================================================= */}
        {/* DECK A (LEFT CONSOLE - CYAN THEME) */}
        {/* ========================================================= */}
        <div className="xl:col-span-4 bg-[#141414] border border-cyan-500/20 rounded-2xl p-4 shadow-xl flex flex-col justify-between gap-3 min-w-0 overflow-hidden">
          {/* Deck A Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                DECK A
              </span>
              {mixerState.activeMasterDeck === 'A' && (
                <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Master
                </span>
              )}
            </div>

            <button
              onClick={() => setLoadModalDeck('A')}
              className="px-2 py-1 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors border border-white/5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Load Track</span>
            </button>
          </div>

          {/* Track Metadata & Turntable */}
          <div className="flex items-center gap-3">
            {/* Vinyl Disc Animation */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-zinc-900 to-black border-4 border-zinc-800 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden">
              <div
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{
                  animation: deckA.isPlaying ? `spin ${getSpinDuration(deckA.isPlaying, deckA.effectiveBpm)} linear infinite` : 'none',
                }}
              >
                {/* Grooves */}
                <div className="absolute inset-1 rounded-full border border-white/5" />
                <div className="absolute inset-3 rounded-full border border-white/5" />
                <div className="absolute inset-5 rounded-full border border-white/5" />
                {/* Label Artwork */}
                <img
                  src={deckA.track?.image || PERMITTED_TEST_TRACKS.A.image}
                  alt="Deck A Label"
                  className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400 shadow"
                />
              </div>
            </div>

            {/* Info & Timers */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-white truncate">
                {deckA.track?.title || 'No Track Loaded'}
              </h3>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs text-zinc-400 truncate">
                  {deckA.track?.artist_name || 'Select a track to cue'}
                </p>
                {deckA.track && (
                  providerAdapter.isFullLength(deckA.track) ? (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Full
                    </span>
                  ) : (
                    <span
                      className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      title="30-second preview"
                    >
                      Preview
                    </span>
                  )
                )}
              </div>

              {/* Time displays */}
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="text-cyan-400 font-bold">{formatTime(deckA.currentTime)}</span>
                <span>-{formatTime(Math.max(0, deckA.duration - deckA.currentTime))}</span>
              </div>

              {/* Live VU Peak Meter */}
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.round(deckA.analysis.peakVolume * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Telemetry Pills: BPM, Musical Key, Energy */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-1.5 rounded-lg bg-[#1A1A1A] border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase font-bold">BPM</span>
              <strong className="text-cyan-400 font-mono text-xs">
                {deckA.effectiveBpm}
              </strong>
              {deckA.tempoOffsetPercent !== 0 && (
                <span className="text-[9px] text-zinc-400 block font-mono">
                  {deckA.tempoOffsetPercent > 0 ? '+' : ''}
                  {deckA.tempoOffsetPercent.toFixed(1)}%
                </span>
              )}
            </div>

            <div className="p-1.5 rounded-lg bg-[#1A1A1A] border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase font-bold">Key</span>
              <strong className="text-white font-mono text-xs">{deckA.track?.key || '8A'}</strong>
              <span className="text-[9px] text-zinc-400 block truncate">Camelot</span>
            </div>

            <div className="p-1.5 rounded-lg bg-[#1A1A1A] border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase font-bold">Beat Pulse</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span
                  className={`w-3 h-3 rounded-full transition-all ${
                    deckA.analysis.beatOnsetDetected
                      ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] scale-125'
                      : 'bg-zinc-700'
                  }`}
                />
                <span className="text-[9px] font-mono text-zinc-300">
                  {deckA.analysis.realtimeEnergy}%
                </span>
              </div>
            </div>
          </div>

          {/* Pitch / Tempo Fader & Sync */}
          <div className="p-2.5 rounded-xl bg-[#1A1A1A] border border-white/5 flex items-center justify-between gap-3 text-xs">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Tempo Fader</span>
            <input
              type="range"
              min="-16"
              max="16"
              step="0.1"
              value={deckA.tempoOffsetPercent}
              onChange={(e) => dualDeckMixingEngine.setTempoOffset('A', parseFloat(e.target.value))}
              aria-label="Deck A Pitch Fader"
              className="flex-1 accent-cyan-400 cursor-pointer"
            />
            <button
              onClick={() => dualDeckMixingEngine.setTempoOffset('A', 0)}
              title="Reset to 0% pitch"
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 hover:text-white"
            >
              0%
            </button>
            <button
              onClick={() => dualDeckMixingEngine.syncBeat('A')}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-colors cursor-pointer ${
                deckA.beatSyncActive
                  ? 'bg-cyan-400 text-black shadow'
                  : 'bg-zinc-800 text-cyan-400 hover:bg-zinc-700'
              }`}
            >
              SYNC
            </button>
          </div>

          {/* 3-Band Equalizer Knobs */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#181818] border border-white/5 text-[10px]">
            {/* High */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-zinc-400 font-bold">HIGH</span>
              <input
                type="range"
                min="-24"
                max="6"
                step="0.5"
                value={deckA.eq.high}
                onChange={(e) => dualDeckMixingEngine.setDeckEQ('A', 'high', parseFloat(e.target.value))}
                aria-label="Deck A High EQ"
                className="w-16 accent-cyan-400 cursor-pointer"
              />
              <button
                onClick={() => dualDeckMixingEngine.setDeckEQ('A', 'high', 0, !deckA.eq.highKill)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  deckA.eq.highKill ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                KILL
              </button>
            </div>

            {/* Mid */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-zinc-400 font-bold">MID</span>
              <input
                type="range"
                min="-24"
                max="6"
                step="0.5"
                value={deckA.eq.mid}
                onChange={(e) => dualDeckMixingEngine.setDeckEQ('A', 'mid', parseFloat(e.target.value))}
                aria-label="Deck A Mid EQ"
                className="w-16 accent-cyan-400 cursor-pointer"
              />
              <button
                onClick={() => dualDeckMixingEngine.setDeckEQ('A', 'mid', 0, !deckA.eq.midKill)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  deckA.eq.midKill ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                KILL
              </button>
            </div>

            {/* Low */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-zinc-400 font-bold">LOW</span>
              <input
                type="range"
                min="-24"
                max="6"
                step="0.5"
                value={deckA.eq.low}
                onChange={(e) => dualDeckMixingEngine.setDeckEQ('A', 'low', parseFloat(e.target.value))}
                aria-label="Deck A Low EQ"
                className="w-16 accent-cyan-400 cursor-pointer"
              />
              <button
                onClick={() => dualDeckMixingEngine.setDeckEQ('A', 'low', 0, !deckA.eq.lowKill)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  deckA.eq.lowKill ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                KILL
              </button>
            </div>
          </div>

          {/* Transport Controls: CUE, PLAY, CHANNEL VOL */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => dualDeckMixingEngine.jumpToCuePoint('A')}
              className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs transition-colors cursor-pointer"
            >
              CUE
            </button>

            <button
              onClick={handleToggleDeckA}
              className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                deckA.isPlaying
                  ? 'bg-cyan-400 text-black shadow-cyan-500/20'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
            >
              {deckA.isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{deckA.isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            {/* Channel Fader */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-zinc-500 font-bold">VOL</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={deckA.volume}
                onChange={(e) => dualDeckMixingEngine.setChannelVolume('A', parseFloat(e.target.value))}
                aria-label="Deck A Channel Volume"
                className="w-16 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER CONSOLE: MIXER, CROSSFADER & TRANSITIONS */}
        {/* ========================================================= */}
        <div className="xl:col-span-4 bg-[#141414] border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col justify-between gap-4 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 gap-2">
            <span className="text-xs font-black uppercase text-white flex items-center gap-1.5 shrink-0">
              <Layers className="w-4 h-4 text-[#1DB954]" />
              <span>Center DJ Mixer</span>
            </span>

            <div className="flex items-center gap-1.5">
              {mixerState.mixingMode === 'auto' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-[#1DB954] border border-[#1DB954]/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 fill-[#1DB954]" />
                  <span>AI Autopilot</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Manual DJ</span>
                </span>
              )}

              {(deckA.isPlaying || deckB.isPlaying) && (
                <button
                  onClick={handleStopAll}
                  title="Stop both decks immediately"
                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Square className="w-2.5 h-2.5 fill-rose-400" />
                  <span>Stop All</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Auto-Transition Status Card */}
          {transition.isTransitioning ? (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-emerald-950/40 border border-[#1DB954]/50 text-center space-y-2 shadow-lg shadow-[#1DB954]/10">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5 text-[#1DB954]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>AI DJ Transition: Deck {transition.fromDeck} → Deck {transition.toDeck}</span>
                </span>
                <span className="font-mono text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded border border-[#1DB954]/30">
                  {transition.timeRemainingSec}s left
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-[#1DB954] transition-all duration-100"
                  style={{ width: `${Math.round(transition.progress * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-200 font-medium">{transition.phaseDescription}</p>
            </div>
          ) : mixerState.mixingMode === 'auto' ? (
            /* AUTO AI MIX MODE PANEL */
            <div className="p-3 rounded-xl bg-gradient-to-b from-[#18261C] to-[#121A15] border border-[#1DB954]/30 space-y-3 shadow-lg">
              {/* Telemetry Row */}
              <div className="flex items-center justify-between text-[11px] border-b border-white/5 pb-2">
                <span className="text-zinc-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>AI Autopilot System:</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-[#1DB954] border border-[#1DB954]/30">
                  {activeMasterDeckState.isPlaying ? 'Active Monitoring' : 'Cued & Ready'}
                </span>
              </div>

              {/* Master / Slave Beat-Lock Indicator */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-center">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Master (Deck {activeMaster})</span>
                  <span className="font-mono font-black text-white text-xs">{activeMasterDeckState.effectiveBpm} BPM</span>
                  <span className="text-zinc-500 block text-[9px] truncate">{activeMasterDeckState.track?.title || 'Permitted Test A'}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-emerald-500/20 text-center">
                  <span className="text-emerald-400 block text-[9px] uppercase font-bold">Slave (Deck {targetDeck})</span>
                  <span className="font-mono font-black text-emerald-300 text-xs">{targetDeckState.effectiveBpm} BPM</span>
                  <span className="text-emerald-400 block text-[9px] font-bold">🔒 Beat-Locked</span>
                </div>
              </div>

              {/* Next Drop Countdown */}
              <div className="p-2 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-bold text-[11px]">Auto-Drop Trigger:</span>
                {activeMasterDeckState.isPlaying ? (
                  <span className="font-mono text-emerald-400 font-bold text-[11px]">
                    In ~{secondsRemaining}s (at ≤15s mark)
                  </span>
                ) : (
                  <span className="text-zinc-500 text-[10px]">Press Play on Deck {activeMaster} to count down</span>
                )}
              </div>

              {/* Execute AI Mix Button */}
              <button
                onClick={() => dualDeckMixingEngine.startAutoTransition()}
                title="Trigger Smooth Blend"
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-[#1DB954] to-emerald-400 hover:opacity-90 text-black font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Trigger Smooth Blend / Execute AI Mix ({activeMaster} → {targetDeck})</span>
              </button>

              {/* Settings row: Duration & Curve */}
              <div className="space-y-1.5 pt-1 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-bold">Auto-Transition Duration:</span>
                  <div className="flex items-center gap-1">
                    {[4, 8, 16, 32].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => dualDeckMixingEngine.setTransitionConfig({ durationSec: dur })}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                          mixerState.transitionConfig.durationSec === dur
                            ? 'bg-[#1DB954] text-black'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-bold">Crossfade Curve:</span>
                  <select
                    value={mixerState.transitionConfig.curve}
                    onChange={(e) =>
                      dualDeckMixingEngine.setTransitionConfig({
                        curve: e.target.value as CrossfadeCurve,
                      })
                    }
                    aria-label="Crossfade Curve Shape"
                    className="bg-zinc-800 text-white text-[10px] font-bold py-1 px-2 rounded border border-white/5 cursor-pointer"
                  >
                    <option value="equal-power">Equal Power (Constant Loudness)</option>
                    <option value="smooth-blend">Smooth Blend (House S-Curve)</option>
                    <option value="fast-cut">Fast Cut (Scratch Cut)</option>
                    <option value="linear">Linear Fade</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* MANUAL DJ MODE PANEL */
            <div className="p-3 rounded-xl bg-[#1A1A1A] border border-white/5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-[11px] border-b border-white/5 pb-2">
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Manual DJ Desk</span>
                </span>
                <span className="text-zinc-400 text-[10px] font-semibold">100% Tactile Control</span>
              </div>

              <p className="text-[11px] text-zinc-300 leading-snug">
                Zero automated crossfader movement or BPM forcing. You have full physical control over pitch faders, crossfader cuts, and 3-band EQ kills.
              </p>

              {/* Crossfader Quick-Snap Jumps */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold block">Crossfader Snap Presets:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => dualDeckMixingEngine.setCrossfaderPosition(-1.0)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      mixerState.crossfaderPosition <= -0.95
                        ? 'bg-cyan-500 text-black font-extrabold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    Deck A (100%)
                  </button>
                  <button
                    onClick={() => dualDeckMixingEngine.setCrossfaderPosition(0)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      Math.abs(mixerState.crossfaderPosition) < 0.1
                        ? 'bg-white text-black font-extrabold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    Center (50/50)
                  </button>
                  <button
                    onClick={() => dualDeckMixingEngine.setCrossfaderPosition(1.0)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      mixerState.crossfaderPosition >= 0.95
                        ? 'bg-emerald-500 text-black font-extrabold'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    Deck B (100%)
                  </button>
                </div>
              </div>

              {/* Optional Manual Assisted Glide */}
              <button
                onClick={() => dualDeckMixingEngine.startAutoTransition(activeMaster, targetDeck, 3)}
                className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Smooth Crossfade Glide ({activeMaster} → {targetDeck}, 3s)</span>
              </button>
            </div>
          )}

          {/* Crossfader Controls */}
          <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
              <span className={mixerState.crossfaderPosition < 0 ? 'text-cyan-400 font-black' : 'text-zinc-500'}>
                DECK A {mixerState.crossfaderPosition < 0 && `(${Math.round(Math.abs(mixerState.crossfaderPosition) * 100)}%)`}
              </span>
              <button
                onClick={() => dualDeckMixingEngine.setCrossfaderPosition(0)}
                className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:text-white cursor-pointer"
              >
                CENTER (0.0)
              </button>
              <span className={mixerState.crossfaderPosition > 0 ? 'text-emerald-400 font-black' : 'text-zinc-500'}>
                DECK B {mixerState.crossfaderPosition > 0 && `(${Math.round(mixerState.crossfaderPosition * 100)}%)`}
              </span>
            </div>

            {/* Real Horizontal Crossfader */}
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={mixerState.crossfaderPosition}
              onChange={(e) => dualDeckMixingEngine.setCrossfaderPosition(parseFloat(e.target.value))}
              aria-label="DJ Crossfader Slider"
              className="w-full h-3 accent-[#1DB954] cursor-pointer"
            />

            {/* Travel indicator ticks */}
            <div className="flex justify-between text-[9px] text-zinc-600 font-mono px-1">
              <span>Deck A (-1.0)</span>
              <span>-0.5</span>
              <span>0.0 (Blend)</span>
              <span>+0.5</span>
              <span>Deck B (+1.0)</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DECK B (RIGHT CONSOLE - EMERALD THEME) */}
        {/* ========================================================= */}
        <div className="xl:col-span-4 bg-[#141414] border border-emerald-500/20 rounded-2xl p-4 shadow-xl flex flex-col justify-between gap-3 min-w-0 overflow-hidden">
          {/* Deck B Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                DECK B
              </span>
              {mixerState.activeMasterDeck === 'B' && (
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Master
                </span>
              )}
            </div>

            <button
              onClick={() => setLoadModalDeck('B')}
              className="px-2 py-1 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors border border-white/5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load Track</span>
            </button>
          </div>

          {/* Track Metadata & Turntable */}
          <div className="flex items-center gap-3">
            {/* Vinyl Disc Animation */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-zinc-900 to-black border-4 border-zinc-800 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden">
              <div
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{
                  animation: deckB.isPlaying ? `spin ${getSpinDuration(deckB.isPlaying, deckB.effectiveBpm)} linear infinite` : 'none',
                }}
              >
                {/* Grooves */}
                <div className="absolute inset-1 rounded-full border border-white/5" />
                <div className="absolute inset-3 rounded-full border border-white/5" />
                <div className="absolute inset-5 rounded-full border border-white/5" />
                {/* Label Artwork */}
                <img
                  src={deckB.track?.image || PERMITTED_TEST_TRACKS.B.image}
                  alt="Deck B Label"
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow"
                />
              </div>
            </div>

            {/* Info & Timers */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-white truncate">
                {deckB.track?.title || 'No Track Loaded'}
              </h3>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs text-zinc-400 truncate">
                  {deckB.track?.artist_name || 'Select a track to cue'}
                </p>
                {deckB.track && (
                  providerAdapter.isFullLength(deckB.track) ? (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Full
                    </span>
                  ) : (
                    <span
                      className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      title="30-second preview"
                    >
                      Preview
                    </span>
                  )
                )}
              </div>

              {/* Time displays */}
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="text-emerald-400 font-bold">{formatTime(deckB.currentTime)}</span>
                <span>-{formatTime(Math.max(0, deckB.duration - deckB.currentTime))}</span>
              </div>

              {/* Live VU Peak Meter */}
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.round(deckB.analysis.peakVolume * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Telemetry Pills: BPM, Musical Key, Energy */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-1.5 rounded-lg bg-[#1A1A1A] border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase font-bold">BPM</span>
              <strong className="text-emerald-400 font-mono text-xs">
                {deckB.effectiveBpm}
              </strong>
              {deckB.tempoOffsetPercent !== 0 && (
                <span className="text-[9px] text-zinc-400 block font-mono">
                  {deckB.tempoOffsetPercent > 0 ? '+' : ''}
                  {deckB.tempoOffsetPercent.toFixed(1)}%
                </span>
              )}
            </div>

            <div className="p-1.5 rounded-lg bg-[#1A1A1A] border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase font-bold">Key</span>
              <strong className="text-white font-mono text-xs">{deckB.track?.key || '9A'}</strong>
              <span className="text-[9px] text-zinc-400 block truncate">Camelot</span>
            </div>

            <div className="p-1.5 rounded-lg bg-[#1A1A1A] border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase font-bold">Beat Pulse</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span
                  className={`w-3 h-3 rounded-full transition-all ${
                    deckB.analysis.beatOnsetDetected
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] scale-125'
                      : 'bg-zinc-700'
                  }`}
                />
                <span className="text-[9px] font-mono text-zinc-300">
                  {deckB.analysis.realtimeEnergy}%
                </span>
              </div>
            </div>
          </div>

          {/* Pitch / Tempo Fader & Sync */}
          <div className="p-2.5 rounded-xl bg-[#1A1A1A] border border-white/5 flex items-center justify-between gap-3 text-xs">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Tempo Fader</span>
            <input
              type="range"
              min="-16"
              max="16"
              step="0.1"
              value={deckB.tempoOffsetPercent}
              onChange={(e) => dualDeckMixingEngine.setTempoOffset('B', parseFloat(e.target.value))}
              aria-label="Deck B Pitch Fader"
              className="flex-1 accent-emerald-400 cursor-pointer"
            />
            <button
              onClick={() => dualDeckMixingEngine.setTempoOffset('B', 0)}
              title="Reset to 0% pitch"
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 hover:text-white"
            >
              0%
            </button>
            <button
              onClick={() => dualDeckMixingEngine.syncBeat('B')}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-colors cursor-pointer ${
                deckB.beatSyncActive
                  ? 'bg-emerald-400 text-black shadow'
                  : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'
              }`}
            >
              SYNC
            </button>
          </div>

          {/* 3-Band Equalizer Knobs */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#181818] border border-white/5 text-[10px]">
            {/* High */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-zinc-400 font-bold">HIGH</span>
              <input
                type="range"
                min="-24"
                max="6"
                step="0.5"
                value={deckB.eq.high}
                onChange={(e) => dualDeckMixingEngine.setDeckEQ('B', 'high', parseFloat(e.target.value))}
                aria-label="Deck B High EQ"
                className="w-16 accent-emerald-400 cursor-pointer"
              />
              <button
                onClick={() => dualDeckMixingEngine.setDeckEQ('B', 'high', 0, !deckB.eq.highKill)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  deckB.eq.highKill ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                KILL
              </button>
            </div>

            {/* Mid */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-zinc-400 font-bold">MID</span>
              <input
                type="range"
                min="-24"
                max="6"
                step="0.5"
                value={deckB.eq.mid}
                onChange={(e) => dualDeckMixingEngine.setDeckEQ('B', 'mid', parseFloat(e.target.value))}
                aria-label="Deck B Mid EQ"
                className="w-16 accent-emerald-400 cursor-pointer"
              />
              <button
                onClick={() => dualDeckMixingEngine.setDeckEQ('B', 'mid', 0, !deckB.eq.midKill)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  deckB.eq.midKill ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                KILL
              </button>
            </div>

            {/* Low */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-zinc-400 font-bold">LOW</span>
              <input
                type="range"
                min="-24"
                max="6"
                step="0.5"
                value={deckB.eq.low}
                onChange={(e) => dualDeckMixingEngine.setDeckEQ('B', 'low', parseFloat(e.target.value))}
                aria-label="Deck B Low EQ"
                className="w-16 accent-emerald-400 cursor-pointer"
              />
              <button
                onClick={() => dualDeckMixingEngine.setDeckEQ('B', 'low', 0, !deckB.eq.lowKill)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  deckB.eq.lowKill ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                KILL
              </button>
            </div>
          </div>

          {/* Transport Controls: CUE, PLAY, CHANNEL VOL */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => dualDeckMixingEngine.jumpToCuePoint('B')}
              className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs transition-colors cursor-pointer"
            >
              CUE
            </button>

            <button
              onClick={handleToggleDeckB}
              className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                deckB.isPlaying
                  ? 'bg-emerald-400 text-black shadow-emerald-500/20'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
            >
              {deckB.isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{deckB.isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            {/* Channel Fader */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-zinc-500 font-bold">VOL</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={deckB.volume}
                onChange={(e) => dualDeckMixingEngine.setChannelVolume('B', parseFloat(e.target.value))}
                aria-label="Deck B Channel Volume"
                className="w-16 accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Full DJ Library Browser & Loader Modal */}
      {loadModalDeck && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] space-y-3">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>DJ Music Library</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-zinc-300">
                      {allAvailableTracks.length} Songs Loaded
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Target: Loading into <strong className={loadModalDeck === 'A' ? 'text-cyan-400' : 'text-emerald-400'}>Deck {loadModalDeck}</strong> (or choose below)
                  </p>
                </div>
              </div>

              {/* Target Deck Switcher & Close */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#202020] p-0.5 rounded-lg border border-white/5 text-xs font-bold">
                  <button
                    onClick={() => setLoadModalDeck('A')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      loadModalDeck === 'A' ? 'bg-cyan-500 text-black font-extrabold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Deck A
                  </button>
                  <button
                    onClick={() => setLoadModalDeck('B')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      loadModalDeck === 'B' ? 'bg-emerald-500 text-black font-extrabold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Deck B
                  </button>
                </div>

                <button
                  onClick={handleCloseModal}
                  aria-label="Close track loader"
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search songs by title, artist, genre, BPM (e.g. 128), or key (e.g. 8A)..."
                value={trackSearch}
                onChange={(e) => setTrackSearch(e.target.value)}
                autoFocus
                aria-label="Search catalogue track"
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#222222] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1DB954]"
              />
              {trackSearch && (
                <button
                  onClick={() => setTrackSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category / Genre Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {GENRE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedGenre(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedGenre === cat
                      ? 'bg-[#1DB954] text-black shadow'
                      : 'bg-[#222222] hover:bg-[#2A2A2A] text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Track List */}
            <div className="space-y-1.5 overflow-y-auto no-scrollbar flex-1 pr-1 max-h-[380px] sm:max-h-[440px]">
              {filteredTracks.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No tracks found matching "{trackSearch}". Try a different title, artist, or genre.
                </div>
              ) : (
                filteredTracks.map((track) => {
                  const isPreviewing = previewTrackId === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isPreviewing
                          ? 'bg-[#252525] border-[#1DB954]/50 shadow-md'
                          : 'bg-[#1E1E1E] hover:bg-[#252525] border-white/5'
                      }`}
                    >
                      {/* Left: Artwork with Preview Button + Track Meta */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        {/* Artwork with Interactive Listen / Preview overlay */}
                        <div
                          onClick={(e) => handleTogglePreview(track, e)}
                          title={isPreviewing ? 'Pause preview' : 'Listen / Preview track'}
                          className="relative w-11 h-11 rounded-lg overflow-hidden bg-black shrink-0 cursor-pointer group"
                        >
                          <img
                            src={track.image}
                            alt={track.title}
                            className={`w-full h-full object-cover transition-opacity ${
                              isPreviewing ? 'opacity-40' : 'group-hover:opacity-60'
                            }`}
                          />
                          <div
                            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                              isPreviewing ? 'opacity-100 bg-[#1DB954]/20' : 'opacity-0 group-hover:opacity-100 bg-black/40'
                            }`}
                          >
                            {isPreviewing ? (
                              <Pause className="w-5 h-5 text-[#1DB954] fill-[#1DB954]" />
                            ) : (
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Title, Artist, & Badges */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-white truncate">
                              {track.title}
                            </span>
                            {providerAdapter.isFullLength(track) ? (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                Full
                              </span>
                            ) : (
                              <span
                                className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0"
                                title="Apple Music 30-second preview"
                              >
                                30s Preview
                              </span>
                            )}
                            {isPreviewing && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#1DB954] text-black animate-pulse flex items-center gap-1 shrink-0">
                                <Headphones className="w-2.5 h-2.5" />
                                <span>Auditioning</span>
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                            <span className="font-medium text-zinc-300">{track.artist_name}</span>
                            <span>•</span>
                            <span className="text-[#1DB954] font-mono font-bold text-[10px]">{track.bpm || 120} BPM</span>
                            <span>•</span>
                            <span className="font-mono text-zinc-400 text-[10px]">{track.key || '8A'}</span>
                            {track.genre && (
                              <>
                                <span>•</span>
                                <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">{track.genre}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions: Preview Button + Load Deck A / Load Deck B */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Listen / Preview Button */}
                        <button
                          type="button"
                          onClick={(e) => handleTogglePreview(track, e)}
                          title={isPreviewing ? 'Pause audition preview' : 'Listen / Preview'}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isPreviewing
                              ? 'bg-[#1DB954] text-black font-extrabold shadow'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {isPreviewing ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          <span className="hidden sm:inline">{isPreviewing ? 'Playing' : 'Listen'}</span>
                        </button>

                        {/* Load into Deck A button */}
                        <button
                          type="button"
                          onClick={() => handleLoadTrack('A', track)}
                          title="Load track into Deck A"
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            loadModalDeck === 'A'
                              ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md'
                              : 'bg-zinc-800 hover:bg-cyan-950/40 text-cyan-400 border border-cyan-500/20'
                          }`}
                        >
                          Load A
                        </button>

                        {/* Load into Deck B button */}
                        <button
                          type="button"
                          onClick={() => handleLoadTrack('B', track)}
                          title="Load track into Deck B"
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            loadModalDeck === 'B'
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md'
                              : 'bg-zinc-800 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          Load B
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
