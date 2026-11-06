import React, { useEffect, useRef } from 'react';
import {
  X,
  Mic2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import type { LyricLine } from '../../types/music';

export const LyricsModal: React.FC = () => {
  const {
    lyricsOpen,
    toggleLyrics,
    currentTrack,
    currentTime,
    duration,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    likedTrackIds,
    toggleLike,
    volume,
    setVolume,
  } = usePlayerStore();

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fallback realistic lyric generator if specific track lacks custom lyrics
  const defaultLyrics: LyricLine[] = [
    { time: 0, text: `♪ (Intro groove — ${currentTrack?.title || 'Track'})` },
    { time: 8, text: 'Rhythm moving through the midnight air' },
    { time: 18, text: 'Feel the bassline take us everywhere' },
    { time: 30, text: 'Electric melodies beneath the streetlights glow' },
    { time: 45, text: 'Turn the volume up and let the frequencies flow' },
    { time: 65, text: 'Every heartbeat synchronized in time' },
    { time: 85, text: 'Singing every chorus, living every line' },
    { time: 110, text: '♪ (AI DJ harmonic mix & filter transition)' },
    { time: 130, text: 'Dancing under digital electric skies' },
    { time: 155, text: 'Until the early morning light begins to rise' },
    { time: 180, text: 'Never let the music stop tonight' },
    { time: 210, text: '♪ (Outro fade & echoes)' },
  ];

  const lyrics = (currentTrack?.lyrics && currentTrack.lyrics.length > 0)
    ? currentTrack.lyrics
    : defaultLyrics;

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Auto-scroll active line into center of view
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!lyricsOpen || !currentTrack) return null;

  const isLiked = likedTrackIds.has(currentTrack.id);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#121212]/95 backdrop-blur-2xl flex flex-col select-none animate-fadeIn overflow-hidden">
      {/* Dynamic Ambient Background Derived from Album Artwork */}
      <div
        className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 pointer-events-none scale-125 transform duration-1000"
        style={{ backgroundImage: `url(${currentTrack.image})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/10 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-lg object-cover shadow-lg border border-white/10 flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1DB954] flex items-center gap-1">
                <Mic2 className="w-3.5 h-3.5" />
                Live Lyrics
              </span>
            </div>
            <h2 className="text-lg font-black text-white truncate">{currentTrack.title}</h2>
            <p className="text-xs text-[#B3B3B3] truncate">{currentTrack.artist_name}</p>
          </div>
        </div>

        <button
          onClick={toggleLyrics}
          aria-label="Close lyrics"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Synchronized Lyrics Container with Click-to-Seek */}
      <main
        ref={containerRef}
        className="relative z-10 flex-1 overflow-y-auto max-w-4xl w-full mx-auto px-8 py-16 space-y-7 no-scrollbar text-left"
      >
        {lyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPast = idx < activeIndex;

          return (
            <div
              key={idx}
              ref={isActive ? activeLineRef : null}
              onClick={() => seekTo(line.time)}
              className={`group flex items-center gap-4 cursor-pointer transition-all duration-300 transform rounded-xl px-4 py-2 ${
                isActive
                  ? 'scale-105 bg-white/[0.04]'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Click-to-seek hover hint */}
              <span className="w-6 text-xs text-[#1DB954] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Play className="w-4 h-4 fill-current" />
              </span>

              <p
                className={`text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight transition-all duration-300 ${
                  isActive
                    ? 'text-white drop-shadow-[0_0_25px_rgba(29,185,84,0.7)] text-[#1DB954]'
                    : isPast
                    ? 'text-white/60 group-hover:text-white/90'
                    : 'text-white/25 group-hover:text-white/70'
                }`}
              >
                {line.text}
              </p>
            </div>
          );
        })}
      </main>

      {/* Floating Bottom Music Bar for In-Lyrics Scrubbing & Playback */}
      <footer className="relative z-10 bg-black/60 backdrop-blur-xl border-t border-white/10 px-8 py-4 max-w-4xl w-full mx-auto rounded-t-2xl mb-2 space-y-2">
        {/* Seek Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#B3B3B3] font-medium w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative flex items-center group cursor-pointer">
            <input
              type="range"
              min={0}
              max={100}
              value={progressPercent}
              onChange={(e) => {
                const newSec = (parseFloat(e.target.value) / 100) * duration;
                seekTo(newSec);
              }}
              aria-label="Seek track"
              className="w-full h-1.5 bg-[#404040] rounded-lg appearance-none cursor-pointer focus:outline-none"
              style={{
                background: `linear-gradient(to right, #1DB954 ${progressPercent}%, #404040 ${progressPercent}%)`,
              }}
            />
          </div>
          <span className="text-xs text-[#B3B3B3] font-medium w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleLike(currentTrack)}
              aria-label="Like track"
              className={`p-2 rounded-full transition-colors ${
                isLiked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
            </button>
            <span className="text-xs text-white/80 font-medium truncate max-w-[200px]">
              {currentTrack.title} • {currentTrack.artist_name}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={prevTrack}
              aria-label="Previous track"
              className="p-2 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg shadow-[#1DB954]/40 transform hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black stroke-black" />
              ) : (
                <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              aria-label="Next track"
              className="p-2 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#B3B3B3]" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-[#404040] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </footer>
    </div>
  );
};
