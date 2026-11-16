import React from 'react';
import { Play, Pause, Heart, Sparkles } from 'lucide-react';
import type { Track } from '../../types/music';
import { usePlayerStore } from '../../store/usePlayerStore';
import { providerAdapter } from '../../services/providerAdapters';

interface TrackCardProps {
  track: Track;
  showBpm?: boolean;
  className?: string;
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, showBpm = false, className }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, likedTrackIds, toggleLike } =
    usePlayerStore();

  const isCurrent = currentTrack?.id === track.id;
  const isCardPlaying = isCurrent && isPlaying;
  const isLiked = likedTrackIds.has(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(track);
  };

  return (
    <div
      onClick={() => (isCurrent ? togglePlay() : playTrack(track))}
      className={`group relative flex flex-col p-3.5 rounded-xl bg-[#181818] hover:bg-[#242424] transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl ${
        className ? className : 'w-[185px] sm:w-[195px] flex-shrink-0'
      }`}
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#282828] mb-3 shadow-md">
        <img
          src={track.image}
          alt={track.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Ambient Dark Gradient on bottom of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Floating Play Button */}
        <button
          onClick={handlePlayClick}
          aria-label={isCardPlaying ? 'Pause' : 'Play'}
          className={`absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-[#1DB954]/40 transform transition-all duration-300 ring-1 ring-white/20 ${
            isCardPlaying
              ? 'opacity-100 translate-y-0 scale-100 shadow-[0_0_20px_rgba(29,185,84,0.7)]'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95'
          }`}
        >
          {isCardPlaying ? (
            <Pause className="w-5 h-5 fill-black stroke-black" />
          ) : (
            <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
          )}
        </button>

        {/* Like Button on hover */}
        <button
          onClick={handleLikeClick}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-md transition-opacity duration-200 ${
            isLiked ? 'opacity-100 text-[#1DB954]' : 'opacity-0 group-hover:opacity-100 text-white/80 hover:text-white'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
        </button>

        {/* Active Equalizer animation badge */}
        {isCardPlaying ? (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md flex items-center gap-0.5">
            <span className="w-1 h-3 bg-[#1DB954] rounded-full equalizer-bar-1" />
            <span className="w-1 h-4 bg-[#1DB954] rounded-full equalizer-bar-2" />
            <span className="w-1 h-2 bg-[#1DB954] rounded-full equalizer-bar-3" />
          </div>
        ) : (
          <div className="absolute top-2 left-2">
            {providerAdapter.isFullLength(track) ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-black/60 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                Full
              </span>
            ) : (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-black/60 backdrop-blur-md text-amber-400 border border-amber-500/30"
                title="Apple Music 30-second preview"
              >
                Preview
              </span>
            )}
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex flex-col min-w-0">
        <h4
          className={`font-semibold text-sm truncate leading-tight ${
            isCurrent ? 'text-[#1DB954]' : 'text-white'
          }`}
          title={track.title}
        >
          {track.title}
        </h4>
        <p
          onClick={(e) => {
            e.stopPropagation();
            usePlayerStore.getState().navigateToArtist(track.artist_name);
          }}
          className="text-xs text-[#B3B3B3] truncate mt-1 hover:text-white hover:underline transition-colors"
          title={track.artist_name}
        >
          {track.artist_name}
        </p>

        {/* Optional Metadata / AI DJ Compatibility badge */}
        {showBpm && track.bpm && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#B3B3B3] mt-1.5">
            <Sparkles className="w-3 h-3 text-[#1DB954]" />
            <span>{track.bpm} BPM</span>
            <span>•</span>
            <span>{track.key || 'C Maj'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
