import React, { useState } from 'react';
import {
  Play,
  Pause,
  Heart,
  Mic2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { FIXTURE_ARTISTS } from '../../fixtures/musicFixtures';

export const MusicVideoPosterPanel: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    likedTrackIds,
    toggleLike,
    toggleLyrics,
    navigateToArtist,
    queue,
    playTrack,
    setRightPanelView,
  } = usePlayerStore();

  const [following, setFollowing] = useState(true);

  if (!currentTrack) {
    return (
      <div className="p-6 rounded-2xl bg-[#181818] text-center text-[#B3B3B3] text-xs">
        No track playing. Choose a song to view its video canvas.
      </div>
    );
  }

  const isLiked = likedTrackIds.has(currentTrack.id);
  const nextTrack = queue[0];
  const posterImage = currentTrack.videoPoster || currentTrack.image;
  const artistAvatar =
    FIXTURE_ARTISTS.find(
      (a) => a.name.toLowerCase() === currentTrack.artist_name.toLowerCase()
    )?.avatar || currentTrack.image;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Spotify-Style Vertical Video Canvas Poster */}
      <div className="relative group">
        {/* Ambient Blurred Backlight Glow behind Canvas */}
        <div
          className="absolute -inset-2 rounded-3xl opacity-35 filter blur-xl transition-all duration-700 pointer-events-none group-hover:opacity-55"
          style={{
            backgroundImage: `url(${posterImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Main Canvas Vertical Card */}
        <div className="relative aspect-[9/13] w-full rounded-2xl overflow-hidden bg-[#181818] border border-white/10 shadow-2xl">
          <img
            src={posterImage}
            alt={currentTrack.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isPlaying ? 'scale-105' : 'scale-100'
            }`}
          />

          {/* Dark Gradients for Content Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

          {/* Top Canvas Tag with Equalizer */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold tracking-wider uppercase border border-white/10 shadow">
              <Sparkles className="w-3 h-3 text-[#1DB954]" />
              Canvas Poster
            </span>

            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <span className="w-0.5 bg-[#1DB954] equalizer-bar-1" />
                <span className="w-0.5 bg-[#1DB954] equalizer-bar-2" />
                <span className="w-0.5 bg-[#1DB954] equalizer-bar-3" />
              </div>
            )}
          </div>

          {/* Centered Play / Pause overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause track' : 'Play track'}
              className="w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-2xl shadow-[#1DB954]/50 transform hover:scale-110 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-black stroke-black" />
              ) : (
                <Play className="w-6 h-6 fill-black stroke-black ml-0.5" />
              )}
            </button>
          </div>

          {/* Bottom Card Track Metadata */}
          <div className="absolute bottom-3 left-3 right-3 z-10 space-y-1">
            <h3
              className="text-lg font-bold text-white drop-shadow truncate"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </h3>

            <p
              onClick={() => navigateToArtist(currentTrack.artist_name)}
              className="text-xs font-medium text-[#B3B3B3] hover:text-white cursor-pointer hover:underline truncate"
              title={currentTrack.artist_name}
            >
              {currentTrack.artist_name}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Track Title, Artist Link & Quick Actions */}
      <div className="flex items-center justify-between px-1">
        <div className="min-w-0 pr-2">
          <h4 className="font-bold text-base text-white truncate" title={currentTrack.title}>
            {currentTrack.title}
          </h4>
          <button
            onClick={() => navigateToArtist(currentTrack.artist_name)}
            className="text-xs text-[#B3B3B3] hover:text-[#1DB954] transition-colors truncate block text-left"
          >
            {currentTrack.artist_name}
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Lyrics Button */}
          <button
            onClick={toggleLyrics}
            aria-label="Open lyrics"
            className="p-2 rounded-full text-[#B3B3B3] hover:text-[#1DB954] hover:bg-white/5 transition-colors"
            title="Lyrics view"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Like Heart */}
          <button
            onClick={() => toggleLike(currentTrack)}
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
            className={`p-2 rounded-full transition-transform active:scale-90 hover:bg-white/5 ${
              isLiked ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. "About the Artist" Visual Card */}
      <div className="relative rounded-2xl overflow-hidden bg-[#181818] border border-white/5 p-4 shadow-lg group">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-xs group-hover:opacity-30 transition-opacity"
          style={{ backgroundImage: `url(${currentTrack.image})` }}
        />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B3B3B3]">
              About the artist
            </span>
            <button
              onClick={() => navigateToArtist(currentTrack.artist_name)}
              className="text-xs text-[#1DB954] hover:underline flex items-center gap-1"
            >
              <span>View Profile</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shadow flex-shrink-0 bg-[#242424]">
              <img
                src={artistAvatar}
                alt={currentTrack.artist_name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = currentTrack.image;
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h5 className="font-bold text-sm text-white truncate">
                  {currentTrack.artist_name}
                </h5>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954] flex-shrink-0" />
              </div>
              <p className="text-[11px] text-[#B3B3B3]">
                {currentTrack.streamCount ? `${currentTrack.streamCount} streams` : 'Verified Artist'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setFollowing(!following)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                following
                  ? 'border border-white/30 text-white hover:border-white'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>

            <button
              onClick={() => navigateToArtist(currentTrack.artist_name)}
              className="text-xs text-[#B3B3B3] hover:text-white"
            >
              Explore discography
            </button>
          </div>
        </div>
      </div>

      {/* 4. Next In Queue Glance */}
      {nextTrack && (
        <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-[#B3B3B3] flex items-center gap-1.5">
              <ListMusic className="w-3.5 h-3.5 text-[#1DB954]" />
              Next in queue
            </span>
            <button
              onClick={() => setRightPanelView('queue')}
              className="text-[#1DB954] hover:underline"
            >
              Open queue
            </button>
          </div>

          <div
            onClick={() => playTrack(nextTrack)}
            className="flex items-center gap-3 p-2 rounded-lg bg-[#242424]/60 hover:bg-[#242424] cursor-pointer transition-colors group"
          >
            <img
              src={nextTrack.image}
              alt={nextTrack.title}
              className="w-10 h-10 rounded object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate group-hover:text-[#1DB954]">
                {nextTrack.title}
              </p>
              <p className="text-[11px] text-[#B3B3B3] truncate">
                {nextTrack.artist_name}
              </p>
            </div>
            <Play className="w-4 h-4 fill-white text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      )}

      {/* 5. Song Credits Card */}
      <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 text-xs space-y-2">
        <span className="font-bold uppercase tracking-wider text-[#B3B3B3] block">
          Credits
        </span>
        <div className="space-y-1 text-[11px] text-[#B3B3B3]">
          <div className="flex justify-between">
            <span>Performed by</span>
            <span className="text-white font-medium">{currentTrack.artist_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Genre</span>
            <span className="text-white font-medium">{currentTrack.genre || 'Electronic'}</span>
          </div>
          <div className="flex justify-between">
            <span>Audio Stream</span>
            <span className="text-[#1DB954] font-semibold">Full-Length Master (100%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
