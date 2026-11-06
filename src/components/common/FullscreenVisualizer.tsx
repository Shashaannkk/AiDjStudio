import React from 'react';
import { Minimize2, Play, Pause, SkipBack, SkipForward, Heart, Sparkles } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Visualizer } from './Visualizer';

interface FullscreenVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullscreenVisualizer: React.FC<FullscreenVisualizerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    likedTrackIds,
    toggleLike,
    currentTime,
    duration,
  } = usePlayerStore();

  if (!isOpen || !currentTrack) return null;

  const isLiked = likedTrackIds.has(currentTrack.id);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col justify-between p-8 sm:p-12 select-none overflow-hidden animate-fadeIn">
      {/* Dynamic Ambient Background Blur */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <img
          src={currentTrack.image}
          alt=""
          className="w-full h-full object-cover filter blur-[100px] scale-125"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#1DB954]" />
          <span className="text-xs uppercase tracking-widest font-black text-white/80">
            AI DJ Studio Immersive Engine
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Exit fullscreen"
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Center Artwork & Visualizer */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-6">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(29,185,84,0.3)] border border-white/10">
          <img
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Real-time Visualizer Waves */}
        <div className="w-full max-w-md flex justify-center py-2">
          <Visualizer
            isPlaying={isPlaying}
            barCount={32}
            height={48}
            color="#1DB954"
          />
        </div>

        {/* Track Title & Artist */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {currentTrack.title}
          </h2>
          <p className="text-lg text-[#B3B3B3] font-medium">{currentTrack.artist_name}</p>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="relative z-10 max-w-xl w-full mx-auto space-y-4">
        {/* Progress Bar */}
        <div className="w-full flex items-center gap-3 text-xs text-[#B3B3B3]">
          <span>{formatTime(currentTime)}</span>
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1DB954] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => toggleLike(currentTrack.id)}
            aria-label="Like"
            className={`p-2 transition-colors ${
              isLiked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
          </button>

          <button
            onClick={prevTrack}
            aria-label="Previous"
            className="p-2 text-[#B3B3B3] hover:text-white transition-colors"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-16 h-16 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-[#1DB954]/40 transform hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-black stroke-black" />
            ) : (
              <Play className="w-8 h-8 fill-black stroke-black ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            aria-label="Next"
            className="p-2 text-[#B3B3B3] hover:text-white transition-colors"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
