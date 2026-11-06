import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const NowPlayingPanel: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    likedTrackIds,
    toggleLike,
  } = usePlayerStore();

  if (!currentTrack) {
    return (
      <div className="p-4 rounded-xl bg-[#181818] text-center text-[#B3B3B3] text-xs">
        No track playing. Select a track to begin.
      </div>
    );
  }

  const isLiked = likedTrackIds.has(currentTrack.id);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSec = (parseFloat(e.target.value) / 100) * duration;
    seekTo(newSec);
  };

  return (
    <div className="p-4 rounded-xl bg-[#181818] border border-white/5 mb-4 shadow-md">
      {/* Title */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3] mb-3">
        Now Playing
      </h3>

      {/* Large Square Artwork */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#282828] mb-3.5 shadow-lg group">
        <img
          src={currentTrack.image}
          alt={currentTrack.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Track Title, Artist & Like */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0 pr-2">
          <h4 className="font-bold text-base text-white truncate" title={currentTrack.title}>
            {currentTrack.title}
          </h4>
          <p className="text-xs text-[#B3B3B3] truncate hover:text-white transition-colors" title={currentTrack.artist_name}>
            {currentTrack.artist_name}
          </p>
        </div>

        <button
          onClick={() => toggleLike(currentTrack)}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          className={`p-2 rounded-full transition-transform active:scale-90 ${
            isLiked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
        </button>
      </div>

      {/* Progress Bar & Timestamps */}
      <div className="space-y-1 mb-3">
        <div className="relative flex items-center group cursor-pointer">
          <input
            type="range"
            min={0}
            max={100}
            value={progressPercent}
            onChange={handleSeek}
            aria-label="Seek track position"
            className="w-full h-1 bg-[#404040] rounded-lg appearance-none cursor-pointer focus:outline-none"
            style={{
              background: `linear-gradient(to right, #1DB954 ${progressPercent}%, #404040 ${progressPercent}%)`,
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-[#B3B3B3]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between px-2 pt-1">
        {/* Shuffle */}
        <button
          onClick={toggleShuffle}
          aria-label="Toggle shuffle"
          className={`p-2 rounded-full transition-colors ${
            isShuffle ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
          }`}
          title="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          onClick={prevTrack}
          aria-label="Previous track"
          className="p-2 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
          title="Previous"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>

        {/* Play/Pause Large Green Circle */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-11 h-11 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg shadow-[#1DB954]/30 transform hover:scale-105 active:scale-95 transition-all"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-black stroke-black" />
          ) : (
            <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={nextTrack}
          aria-label="Next track"
          className="p-2 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
          title="Next"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>

        {/* Repeat */}
        <button
          onClick={toggleRepeat}
          aria-label="Toggle repeat"
          className={`p-2 rounded-full transition-colors ${
            repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
          }`}
          title={`Repeat: ${repeatMode}`}
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-4 h-4" />
          ) : (
            <Repeat className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
