import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  Volume1,
  Mic2,
  ListMusic,
  Laptop2,
  Maximize2,
  Minimize2,
  Radio,
  Disc,
  Zap,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { providerAdapter } from '../../services/providerAdapters';

interface PlaybackBarProps {
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    likedTrackIds,
    toggleLike,
    toggleRightPanel,
    toggleLyrics,
    lyricsOpen,
    activeRoom,
    roomRole,
    currentView,
    setCurrentView,
  } = usePlayerStore();

  const [devicePopoverOpen, setDevicePopoverOpen] = useState(false);

  if (!currentTrack) return null;

  const isLiked = likedTrackIds.has(currentTrack.id);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSec = (parseFloat(e.target.value) / 100) * duration;
    seekTo(newSec);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value) / 100);
  };

  return (
    <footer className="h-20 bg-black border-t border-[#282828] px-4 flex items-center justify-between select-none fixed bottom-0 left-0 right-0 z-30">
      {/* 1. Left: Track Info & Like Button */}
      <div className="flex items-center gap-2 sm:gap-3.5 w-1/4 min-w-[140px] sm:min-w-[180px] shrink-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-[#282828] flex-shrink-0 shadow-md">
          <img
            src={currentTrack.image}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0 pr-2">
          <h4
            className="text-xs sm:text-sm font-semibold text-white truncate hover:underline cursor-pointer"
            title={currentTrack.title}
          >
            {currentTrack.title}
          </h4>
          <p
            onClick={() => usePlayerStore.getState().navigateToArtist(currentTrack.artist_name)}
            className="text-[11px] sm:text-xs text-[#B3B3B3] truncate hover:text-[#1DB954] hover:underline cursor-pointer transition-colors"
            title={currentTrack.artist_name}
          >
            {currentTrack.artist_name}
          </p>

          {/* Provider & Playback Capability Pill */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {providerAdapter.isFullLength(currentTrack) ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Full Track</span>
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"
                  title="Apple Music 30-second chorus sample"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>30s Preview</span>
                </span>
                <button
                  onClick={() => usePlayerStore.getState().playFullLengthAlternative()}
                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30 border border-[#1DB954]/40 flex items-center gap-1 cursor-pointer"
                  title="Play verified full-length open alternative"
                >
                  <Zap className="w-2.5 h-2.5 fill-[#1DB954]" />
                  <span className="hidden sm:inline">Full Alt</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => toggleLike(currentTrack)}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          className={`p-1.5 rounded-full transition-transform active:scale-90 flex-shrink-0 ${
            isLiked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
        </button>
      </div>

      {/* 2. Center: Playback Controls & Progress Bar */}
      <div className="flex flex-col items-center max-w-2xl flex-1 px-2 sm:px-4 min-w-0">
        {activeRoom && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/30 text-[10px] font-bold text-[#1DB954] mb-1">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>
              {roomRole === 'host'
                ? 'Broadcasting as Host'
                : roomRole === 'co-dj'
                ? 'Co-DJ Active'
                : `Synced with Host ${activeRoom.hostName}`}
            </span>
          </div>
        )}
        {/* Top: Control Buttons */}
        <div className="flex items-center gap-4 mb-1">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            aria-label="Toggle shuffle"
            className={`p-1.5 transition-colors ${
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
            className="p-1.5 text-[#B3B3B3] hover:text-white transition-colors"
            title="Previous"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play/Pause Button (Premium Spotify Radiant Green Button) */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center transform hover:scale-108 active:scale-95 transition-all duration-200 shadow-lg shadow-[#1DB954]/40 hover:shadow-[#1DB954]/60 mx-1.5 ring-1 ring-white/20"
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
            className="p-1.5 text-[#B3B3B3] hover:text-white transition-colors"
            title="Next"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            aria-label="Toggle repeat"
            className={`p-1.5 transition-colors ${
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

        {/* Bottom: Progress Bar & Timestamps */}
        <div className="w-full flex items-center gap-2 text-[11px] text-[#B3B3B3]">
          <span className="w-8 text-right tabular-nums">{formatTime(currentTime)}</span>

          <div className="flex-1 relative flex items-center group cursor-pointer py-1">
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progressPercent}
              onChange={handleSeek}
              aria-label="Seek track"
              className="w-full h-1 bg-[#404040] rounded-lg appearance-none cursor-pointer group-hover:h-1.5 transition-all focus:outline-none"
              style={{
                background: `linear-gradient(to right, #1DB954 ${progressPercent}%, #404040 ${progressPercent}%)`,
              }}
            />
          </div>

          <span
            className="w-8 tabular-nums"
            title={
              !providerAdapter.isFullLength(currentTrack)
                ? `Preview stream: ${formatTime(duration)} (Full song: ${formatTime(currentTrack.fullTrackDuration || 210)})`
                : undefined
            }
          >
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* 3. Right: Lyrics, Queue, Device, Volume, Fullscreen */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-3 w-1/4 min-w-[140px] sm:min-w-[180px] shrink-0">
        {/* DJ Mixer Decks Toggle Button */}
        <button
          onClick={() => setCurrentView('mixer')}
          aria-label="Open DJ Decks"
          className={`p-1.5 transition-colors cursor-pointer ${
            currentView === 'mixer' ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
          }`}
          title="Dual-Deck DJ Studio"
        >
          <Disc className={`w-4 h-4 ${currentView === 'mixer' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
        </button>

        {/* Lyrics Button */}
        <button
          onClick={toggleLyrics}
          aria-label="Lyrics"
          className={`hidden sm:inline-flex p-1.5 transition-colors ${
            lyricsOpen ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
          }`}
          title="Lyrics"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Queue Button */}
        <button
          onClick={toggleRightPanel}
          aria-label="Queue & AI DJ Panel"
          className="p-1.5 text-[#B3B3B3] hover:text-white transition-colors"
          title="Queue & AI DJ"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Device Output Popover Toggle */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setDevicePopoverOpen(!devicePopoverOpen)}
            aria-label="Connect to a device"
            className="p-1.5 text-[#B3B3B3] hover:text-white transition-colors"
            title="Playback Device"
          >
            <Laptop2 className="w-4 h-4" />
          </button>

          {devicePopoverOpen && (
            <div className="absolute bottom-10 right-0 w-64 p-3 rounded-lg bg-[#282828] border border-white/10 shadow-2xl z-50 text-xs">
              <h5 className="font-bold text-white mb-2">Connect to a device</h5>
              <div className="flex items-center gap-2 p-2 rounded bg-[#181818] text-[#1DB954]">
                <Laptop2 className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="font-semibold text-white">AI DJ Studio Desktop</span>
                  <span className="text-[10px] text-[#1DB954]">This Computer (Active)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-20 sm:w-28 group">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="p-1 text-[#B3B3B3] hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={volumePercent}
            onChange={handleVolumeChange}
            aria-label="Volume slider"
            className="w-full h-1 bg-[#404040] rounded-lg appearance-none cursor-pointer group-hover:h-1.5 transition-all focus:outline-none"
            style={{
              background: `linear-gradient(to right, #1DB954 ${volumePercent}%, #404040 ${volumePercent}%)`,
            }}
          />
        </div>

        {/* Fullscreen Button */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="hidden sm:inline-flex p-1.5 text-[#B3B3B3] hover:text-white transition-colors"
            title="Fullscreen Mode"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </footer>
  );
};
