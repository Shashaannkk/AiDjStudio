import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Disc,
  Radio,
  Clock,
  X,
  Play,
  Pause,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Globe,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { musicService } from '../../services/musicService';
import {
  FIXTURE_ARTISTS,
  JAMENDO_CATALOG_TRACKS,
  FIXTURE_POPULAR_MIXES,
  FIXTURE_LIVE_ROOMS,
  FIXTURE_TRACKS,
  PROVIDER_MUSIC_CATALOG,
} from '../../fixtures/musicFixtures';
import type { Track, Playlist, LiveRoom, Artist } from '../../types/music';
import { TrackCard } from '../cards/TrackCard';
import { PlaylistCard } from '../cards/PlaylistCard';
import { LiveRoomCard } from '../cards/LiveRoomCard';

export const SearchView: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    navigateToArtist,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
  } = usePlayerStore();

  const initialAllTracks: Track[] = [
    ...PROVIDER_MUSIC_CATALOG,
    ...FIXTURE_ARTISTS.flatMap((a) => a.popularTracks),
    ...JAMENDO_CATALOG_TRACKS,
    ...FIXTURE_TRACKS,
  ];

  const [results, setResults] = useState<{
    artist?: Artist;
    tracks: Track[];
    jamendoTracks: Track[];
    playlists: Playlist[];
    rooms: LiveRoom[];
  }>({
    artist: FIXTURE_ARTISTS[0],
    tracks: initialAllTracks,
    jamendoTracks: JAMENDO_CATALOG_TRACKS,
    playlists: FIXTURE_POPULAR_MIXES,
    rooms: FIXTURE_LIVE_ROOMS,
  });

  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'audius' | 'jamendo' | 'songs' | 'artists' | 'playlists' | 'rooms'
  >('all');
  const [selectedJamendoGenre, setSelectedJamendoGenre] = useState<string>('all');
  const [jamendoGenreLoading, setJamendoGenreLoading] = useState(false);
  const [displayJamendoTracks, setDisplayJamendoTracks] = useState<Track[]>(JAMENDO_CATALOG_TRACKS);

  const artistsScrollRef = useRef<HTMLDivElement>(null);
  const jamendoScrollRef = useRef<HTMLDivElement>(null);

  // Search execution
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      setLoading(true);
      const res = await musicService.search(searchQuery);
      if (active) {
        setResults(res);
        setDisplayJamendoTracks(res.jamendoTracks && res.jamendoTracks.length > 0 ? res.jamendoTracks : JAMENDO_CATALOG_TRACKS);
        setLoading(false);
      }
    };
    fetchResults();

    if (searchQuery.trim().length >= 2) {
      addRecentSearch(searchQuery.trim());
    }

    return () => {
      active = false;
    };
  }, [searchQuery, addRecentSearch]);

  // Handle Jamendo genre filter switch
  const handleJamendoGenreChange = async (genreKey: string) => {
    setSelectedJamendoGenre(genreKey);
    if (genreKey === 'all') {
      setDisplayJamendoTracks(results.jamendoTracks.length > 0 ? results.jamendoTracks : JAMENDO_CATALOG_TRACKS);
      return;
    }

    setJamendoGenreLoading(true);
    try {
      const fetched = await musicService.getTracksForGenre(genreKey);
      if (fetched && fetched.length > 0) {
        setDisplayJamendoTracks(fetched);
      }
    } catch (e) {
      console.warn('Error fetching Jamendo genre:', e);
    } finally {
      setJamendoGenreLoading(false);
    }
  };

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const offset = direction === 'left' ? -350 : 350;
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleChipClick = (query: string) => {
    setSearchQuery(query);
    addRecentSearch(query);
  };

  const handlePlayArtist = (e: React.MouseEvent, artist: Artist) => {
    e.stopPropagation();
    if (artist.popularTracks && artist.popularTracks.length > 0) {
      const topSong = artist.popularTracks[0];
      if (currentTrack?.id === topSong.id) {
        togglePlay();
      } else {
        playTrack(topSong);
      }
    }
  };

  const jamendoGenres = [
    { id: 'all', label: 'All Catalog' },
    { id: 'electronic', label: 'Electronic & Synth' },
    { id: 'chillout', label: 'Chillout & Ambient' },
    { id: 'lofi', label: 'Lo-Fi Study' },
    { id: 'dance', label: 'EDM & Dance' },
    { id: 'deephouse', label: 'Deep House' },
    { id: 'bollywood', label: 'Desi Fusion' },
  ];

  const filterTabs = [
    { id: 'all', label: 'All Results' },
    { id: 'audius', label: 'Audius Live' },
    { id: 'jamendo', label: 'Jamendo' },
    { id: 'songs', label: 'Songs' },
    { id: 'artists', label: 'Artists' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'rooms', label: 'Live Rooms' },
  ];

  return (
    <div className="space-y-8 pb-16 animate-fadeIn select-none">
      {/* 1. Recent Searches Bar */}
      {recentSearches.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-[#B3B3B3] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1DB954]" />
              Recent Searches
            </span>
            <button
              onClick={clearRecentSearches}
              className="text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
            {recentSearches.map((item) => (
              <div
                key={item}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#242424] hover:bg-[#2e2e2e] border border-white/5 transition-all text-xs font-semibold text-white cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <span onClick={() => handleChipClick(item)}>{item}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentSearch(item);
                  }}
                  aria-label={`Remove ${item}`}
                  className="p-0.5 rounded-full text-[#B3B3B3] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Header & Main Filter Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Explore Music & Jamendo Library'}
              </h2>
              {loading && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/40 text-xs font-bold text-[#1DB954] animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing Live Catalog...</span>
                </div>
              )}
            </div>
            <p className="text-sm text-[#B3B3B3] mt-1">
              Access Jamendo global full-length music library, verified artist hubs, and community rooms.
            </p>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/30'
                  : 'bg-[#242424] text-[#B3B3B3] hover:text-white hover:bg-[#2c2c2c]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <>
          {/* 3. Top Artist Match Banner (if query matches an artist) */}
          {(activeFilter === 'all' || activeFilter === 'artists') && results.artist && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#1DB954]" />
                  Top Artist Match
                </span>
              </div>

              <div
                onClick={() => navigateToArtist(results.artist!)}
                className="group relative rounded-2xl bg-gradient-to-r from-[#2a1214] via-[#1a0f0f] to-[#181818] border border-white/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 cursor-pointer hover:border-[#1DB954]/50 transition-all shadow-xl hover:-translate-y-0.5"
              >
                {/* Left: Avatar + Details with Guaranteed Fallback */}
                <div className="flex items-center gap-5 w-full sm:w-auto">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-xl flex-shrink-0 group-hover:border-[#1DB954] transition-colors bg-[#242424]">
                    <img
                      src={results.artist.avatar}
                      alt={results.artist.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Artist</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#1DB954] transition-colors truncate">
                      {results.artist.name}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#B3B3B3]">
                      {results.artist.monthlyListeners}
                    </p>

                    <p className="text-xs text-[#B3B3B3] line-clamp-1 max-w-md hidden sm:block">
                      {results.artist.bio || 'Verified artist on AI DJ Studio with full-length streaming tracks.'}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <button
                    onClick={(e) => handlePlayArtist(e, results.artist!)}
                    aria-label={`Play ${results.artist.name}`}
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-[#1DB954]/40 transform hover:scale-108 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                  >
                    {isPlaying && currentTrack?.artist_name === results.artist.name ? (
                      <Pause className="w-6 h-6 fill-black stroke-black" />
                    ) : (
                      <Play className="w-6 h-6 fill-black stroke-black ml-0.5" />
                    )}
                  </button>

                  <div className="hidden md:flex items-center gap-1 text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                    <span>View Artist Page</span>
                    <ArrowRight className="w-4 h-4 text-[#1DB954]" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 4. Verified Artists Carousel — SINGLE HORIZONTAL LINE WITH SCROLL BUTTONS (Never full block) */}
          {(activeFilter === 'all' || activeFilter === 'artists') && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Artists</span>
                    <span className="text-xs text-[#B3B3B3] font-normal">({FIXTURE_ARTISTS.length})</span>
                  </h3>
                  <p className="text-xs text-[#B3B3B3] mt-0.5">
                    Browse verified artists discographies in a clean horizontal flow.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollContainer(artistsScrollRef, 'left')}
                    aria-label="Scroll artists left"
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollContainer(artistsScrollRef, 'right')}
                    aria-label="Scroll artists right"
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SINGLE HORIZONTAL ROW FOR ARTISTS — No Multi-Column Grid */}
              <div
                ref={artistsScrollRef}
                className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none"
                style={{ scrollbarWidth: 'none' }}
              >
                {FIXTURE_ARTISTS.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => navigateToArtist(artist)}
                    className="group w-36 sm:w-40 flex-shrink-0 p-3.5 rounded-2xl bg-[#181818] hover:bg-[#242424] border border-white/5 transition-all duration-300 cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 text-center"
                  >
                    <div className="relative aspect-square w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden bg-[#242424] mb-3 shadow-lg border-2 border-white/10 group-hover:border-[#1DB954] transition-colors">
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (artist.popularTracks.length > 0) {
                            playTrack(artist.popularTracks[0]);
                          }
                        }}
                        aria-label={`Play ${artist.name}`}
                        className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-white truncate group-hover:text-[#1DB954] transition-colors">
                      {artist.name}
                    </h4>
                    <p className="text-[11px] text-[#B3B3B3] mt-0.5 truncate">
                      {artist.monthlyListeners}
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-semibold text-[#1DB954]">
                      Artist
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 5. DEDICATED JAMENDO GLOBAL MUSIC LIBRARY SECTION */}
          {(activeFilter === 'all' || activeFilter === 'jamendo') && (
            <section className="p-6 rounded-2xl bg-gradient-to-r from-[#0d2218]/90 via-[#161616] to-[#1e1329]/90 border border-[#1DB954]/30 shadow-2xl space-y-5">
              {/* Jamendo Header with Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#1DB954]" />
                    <h3 className="text-xl font-black text-white tracking-tight">Jamendo Music Library</h3>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#1DB954] text-black">
                      Full Audio 0:00
                    </span>
                  </div>
                  <p className="text-xs text-[#B3B3B3]">
                    Search and stream thousands of independent, royalty-free full-length songs with no 30-second clips.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollContainer(jamendoScrollRef, 'left')}
                    aria-label="Scroll Jamendo left"
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollContainer(jamendoScrollRef, 'right')}
                    aria-label="Scroll Jamendo right"
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Genre Filter Pills inside Jamendo Library */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                {jamendoGenres.map((g) => {
                  const isSelected = selectedJamendoGenre === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleJamendoGenreChange(g.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1DB954] text-black font-bold shadow-md shadow-[#1DB954]/25'
                          : 'bg-[#222222] text-[#B3B3B3] hover:text-white hover:bg-[#2c2c2c]'
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}

                {jamendoGenreLoading && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 text-xs text-[#1DB954]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>

              {/* Scrollable Track Row */}
              <div
                ref={jamendoScrollRef}
                className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none"
                style={{ scrollbarWidth: 'none' }}
              >
                {displayJamendoTracks.map((track) => (
                  <TrackCard key={track.id} track={track} showBpm />
                ))}
              </div>
            </section>
          )}

          {/* 6. Standard Full Songs Section */}
          {(activeFilter === 'all' || activeFilter === 'songs' || activeFilter === 'audius') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#1DB954]" />
                  <h3 className="text-lg font-bold text-white">
                    {activeFilter === 'audius' ? 'Audius Live Discovery' : 'Songs'} (
                    {
                      (activeFilter === 'audius'
                        ? results.tracks.filter((t) => t.provider === 'audius')
                        : results.tracks
                      ).length
                    }
                    )
                  </h3>
                </div>
                <span className="text-xs text-[#B3B3B3]">
                  {activeFilter === 'audius'
                    ? 'Free real-time streaming with native BPM & harmonic keys'
                    : 'Complete full-length audio tracks from multi-provider engine'}
                </span>
              </div>

              {results.tracks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {(activeFilter === 'audius'
                    ? results.tracks.filter((t) => t.provider === 'audius')
                    : results.tracks
                  ).map((track) => (
                    <TrackCard key={track.id} track={track} showBpm className="w-full min-w-0" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {initialAllTracks.map((track) => (
                    <TrackCard key={track.id} track={track} showBpm className="w-full min-w-0" />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 7. Live Rooms Section */}
          {(activeFilter === 'all' || activeFilter === 'rooms') && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#1DB954]" />
                <h3 className="text-lg font-bold text-white">Live Rooms ({results.rooms.length})</h3>
              </div>
              {results.rooms.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {results.rooms.map((room) => (
                    <LiveRoomCard key={room.id} room={room} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#B3B3B3]">No active rooms found.</p>
              )}
            </section>
          )}

          {/* 8. Playlists & Mixes Section */}
          {(activeFilter === 'all' || activeFilter === 'playlists') && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Disc className="w-5 h-5 text-[#1DB954]" />
                <h3 className="text-lg font-bold text-white">
                  Mixes & Playlists ({results.playlists.length})
                </h3>
              </div>
              {results.playlists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {results.playlists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} className="w-full min-w-0" />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#B3B3B3]">No playlists found.</p>
              )}
            </section>
          )}
        </>
      </div>
  );
};
