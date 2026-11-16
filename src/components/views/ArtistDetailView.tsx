import React, { useState } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { FIXTURE_ARTISTS, PROVIDER_MUSIC_CATALOG } from '../../fixtures/musicFixtures';
import type { Track } from '../../types/music';

export const ArtistDetailView: React.FC = () => {
  const {
    selectedArtist,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
    isShuffle,
    toggleShuffle,
    setCurrentView,
  } = usePlayerStore();

  const [isFollowing, setIsFollowing] = useState(true);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);

  // Default to Doja Cat fixture if no artist selected
  const artist = selectedArtist || FIXTURE_ARTISTS[0];

  // Dynamically resolve artist tracks from global catalogue if popularTracks is missing or sparse
  const artistTracks = React.useMemo(() => {
    if (artist.popularTracks && artist.popularTracks.length > 0) {
      return artist.popularTracks;
    }
    const cleanName = (artist.name || '').toLowerCase();
    const catalogMatches = PROVIDER_MUSIC_CATALOG.filter(
      (t) => t.artist_name.toLowerCase().includes(cleanName) || cleanName.includes(t.artist_name.toLowerCase())
    );
    return catalogMatches.length > 0 ? catalogMatches : FIXTURE_ARTISTS[0].popularTracks;
  }, [artist]);

  const visibleTracks = showAllTracks ? artistTracks : artistTracks.slice(0, 8);

  const handlePlayArtist = () => {
    if (!artistTracks || artistTracks.length === 0) return;
    const first = artistTracks[0];
    if (currentTrack?.id === first.id) {
      togglePlay();
    } else {
      playTrack(first);
    }
  };

  const handleTrackRowClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareToast(true);
    navigator.clipboard?.writeText?.(window.location.href);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  return (
    <div className="pb-16 -mx-6 -mt-6 animate-fadeIn">
      {/* 1. Massive Hero Portrait Banner matching User's Reference Screenshot */}
      <div className="relative w-full h-80 sm:h-96 md:h-[420px] bg-[#1a0f0f] overflow-hidden select-none">
        {/* Artist Backdrop Photo */}
        <img
          src={artist.bannerImage || artist.avatar}
          alt={artist.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = artist.avatar;
          }}
          className="w-full h-full object-cover object-top filter brightness-95"
        />

        {/* Ambient Gradient Overlays for High Contrast & Smooth Flow into Dark Background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

        {/* Top Floating Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <button
            onClick={() => setCurrentView('search')}
            aria-label="Back to search"
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Artist Verified & Typography Overlay (matching screenshot) */}
        <div className="absolute bottom-8 left-8 right-8 z-10 space-y-2">
          {/* Verified Badge */}
          <div className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#1DB954] fill-[#1DB954]/20" />
            <span className="text-xs sm:text-sm font-semibold text-white tracking-wide">
              Verified by AI DJ Studio
            </span>
          </div>

          {/* Massive Artist Name */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tight drop-shadow-lg">
            {artist.name}
          </h1>

          {/* Monthly Listeners */}
          <p className="text-sm sm:text-base font-medium text-white/90 drop-shadow">
            {artist.monthlyListeners}
          </p>
        </div>
      </div>

      {/* 2. Action Controls Bar (matching screenshot with Green Play, Avatar, Shuffle, Following, Menu) */}
      <div className="px-8 py-6 bg-gradient-to-b from-[#2a1214] via-[#1a0d0e] to-[#121212] flex items-center gap-5 border-b border-white/5 flex-wrap">
        {/* Large Spotify Vibrant Green Circular Play Button */}
        <button
          onClick={handlePlayArtist}
          aria-label={isPlaying && currentTrack?.artist_name === artist.name ? 'Pause artist' : 'Play artist'}
          className="w-14 h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-[#1DB954]/40 transform hover:scale-108 active:scale-95 transition-all duration-200 ring-1 ring-white/20"
        >
          {isPlaying && currentTrack?.artist_name === artist.name ? (
            <Pause className="w-6 h-6 fill-black stroke-black" />
          ) : (
            <Play className="w-6 h-6 fill-black stroke-black ml-0.5" />
          )}
        </button>

        {/* Mini Square Artist Avatar Badge (from user screenshot) */}
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/30 shadow-md">
          <img
            src={artist.avatar}
            alt={artist.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = artist.avatar;
            }}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Shuffle Button */}
        <button
          onClick={toggleShuffle}
          aria-label="Toggle shuffle"
          className={`p-2.5 rounded-full transition-colors ${
            isShuffle ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
          }`}
          title="Shuffle tracks"
        >
          <Shuffle className="w-5 h-5" />
        </button>

        {/* "Following" Pill Button */}
        <button
          onClick={() => setIsFollowing(!isFollowing)}
          aria-label={isFollowing ? 'Unfollow artist' : 'Follow artist'}
          className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 ${
            isFollowing
              ? 'border border-white/30 text-white hover:border-white bg-transparent'
              : 'bg-white text-black hover:bg-white/90 shadow-md'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>

        {/* More Options / Share Button */}
        <div className="relative">
          <button
            onClick={handleShare}
            aria-label="More artist options"
            className="p-2.5 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
            title="Share artist"
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>

          {showShareToast && (
            <div className="absolute left-0 bottom-full mb-2 px-3 py-1.5 rounded-md bg-[#282828] text-white text-xs font-semibold shadow-xl border border-white/10 whitespace-nowrap z-30 animate-fadeIn">
              Artist link copied!
            </div>
          )}
        </div>
      </div>

      {/* 3. Popular Tracks Section (Table layout matching Spotify desktop) */}
      <div className="px-8 mt-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Popular</h2>

          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-2 border-b border-white/10 text-xs font-semibold text-[#B3B3B3] uppercase tracking-wider">
            <span className="w-6 text-center">#</span>
            <span>Title</span>
            <span className="hidden sm:inline text-right">Plays</span>
            <span className="text-right flex items-center justify-end gap-1">
              <Clock className="w-4 h-4" />
            </span>
            <span className="w-8"></span>
          </div>

          {/* Track Rows */}
          <div className="divide-y divide-white/[0.03]">
            {visibleTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => handleTrackRowClick(track)}
                  className={`group grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-[#282828]/80 text-[#1DB954]'
                      : 'hover:bg-[#282828]/50 text-white'
                  }`}
                >
                  {/* Rank Index or Play Indicator */}
                  <div className="w-6 text-center flex items-center justify-center text-sm font-semibold">
                    {isCurrent && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-3.5">
                        <span className="w-0.5 bg-[#1DB954] equalizer-bar-1" />
                        <span className="w-0.5 bg-[#1DB954] equalizer-bar-2" />
                        <span className="w-0.5 bg-[#1DB954] equalizer-bar-3" />
                      </div>
                    ) : (
                      <>
                        <span className="group-hover:hidden text-[#B3B3B3]">{idx + 1}</span>
                        <Play className="w-4 h-4 fill-white text-white hidden group-hover:block" />
                      </>
                    )}
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.image}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';
                      }}
                      className="w-11 h-11 rounded object-cover flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isCurrent ? 'text-[#1DB954]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {track.explicit && (
                          <span className="px-1 py-0.2 rounded bg-white/20 text-[10px] font-bold text-white/90">
                            E
                          </span>
                        )}
                        <span className="text-xs text-[#B3B3B3] truncate">
                          {track.album_name || artist.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stream Count */}
                  <div className="hidden sm:block text-right text-xs text-[#B3B3B3] font-medium">
                    {track.streamCount || '1,842,109,332'}
                  </div>

                  {/* Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(track);
                    }}
                    aria-label={isLiked ? 'Unlike track' : 'Like track'}
                    className={`p-1.5 rounded-full transition-colors ${
                      isLiked
                        ? 'text-[#1DB954]'
                        : 'text-[#B3B3B3] opacity-0 group-hover:opacity-100 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
                  </button>

                  {/* Duration */}
                  <div className="text-right text-xs text-[#B3B3B3] font-medium pr-2">
                    {Math.floor(track.duration / 60)}:
                    {track.duration % 60 < 10 ? '0' : ''}
                    {track.duration % 60}
                  </div>
                </div>
              );
            })}
          </div>

          {artistTracks.length > 8 && (
            <button
              onClick={() => setShowAllTracks(!showAllTracks)}
              className="mt-4 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#B3B3B3] hover:text-white transition-colors hover:underline"
            >
              {showAllTracks ? 'Show fewer tracks' : `See more (${artistTracks.length} tracks)`}
            </button>
          )}
        </div>

        {/* 4. About the Artist Card */}
        {artist.bio && (
          <div className="pt-6">
            <h3 className="text-xl font-bold text-white mb-4">About</h3>
            <div className="relative rounded-2xl overflow-hidden bg-[#181818] border border-white/5 p-8 max-w-3xl shadow-xl group">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-sm group-hover:opacity-25 transition-opacity duration-500"
                style={{ backgroundImage: `url(${artist.avatar})` }}
              />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shadow">
                    <img
                      src={artist.avatar}
                      alt={artist.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{artist.name}</h4>
                    <p className="text-xs text-[#1DB954] font-semibold">{artist.monthlyListeners}</p>
                  </div>
                </div>

                <p className="text-sm text-[#B3B3B3] leading-relaxed">
                  {artist.bio}
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-white">
                    #18 in the world
                  </span>
                  {artist.genres?.map((g) => (
                    <span
                      key={g}
                      className="px-3 py-1 rounded-full bg-white/5 text-xs text-[#B3B3B3]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Discography / Albums (if available) */}
        {artist.albums && artist.albums.length > 0 && (
          <div className="pt-6">
            <h3 className="text-xl font-bold text-white mb-4">Discography</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {artist.albums.map((album) => (
                <div
                  key={album.title}
                  className="p-3.5 rounded-xl bg-[#181818] hover:bg-[#242424] border border-white/5 transition-all group cursor-pointer hover:-translate-y-1"
                >
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#282828] mb-3 shadow-md">
                    <img
                      src={album.image}
                      alt={album.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="font-bold text-sm text-white truncate">{album.title}</h4>
                  <p className="text-xs text-[#B3B3B3] mt-0.5">{album.year} • Album</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
