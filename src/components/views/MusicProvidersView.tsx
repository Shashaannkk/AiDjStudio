import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  Shuffle,
  Search,
  List,
  Grid,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { PROVIDER_MUSIC_CATALOG } from '../../fixtures/musicFixtures';
import { musicService } from '../../services/musicService';
import type { Track } from '../../types/music';

export const MusicProvidersView: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
    isShuffle,
    toggleShuffle,
    navigateToArtist,
  } = usePlayerStore();

  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'artist' | 'bpm' | 'duration' | 'year'>('default');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [liveAudiusTracks, setLiveAudiusTracks] = useState<Track[]>([]);
  const [isRefreshingAudius, setIsRefreshingAudius] = useState(false);

  const providerConfigs: Record<
    string,
    { label: string; color: string; bg: string; border: string; icon: string }
  > = {
    audius: {
      label: 'Audius (Top Pick)',
      color: '#CC0FE0',
      bg: 'rgba(204, 15, 224, 0.15)',
      border: 'rgba(204, 15, 224, 0.35)',
      icon: '🟣',
    },
    jamendo: {
      label: 'Jamendo (DJ Stems)',
      color: '#00B294',
      bg: 'rgba(0, 178, 148, 0.15)',
      border: 'rgba(0, 178, 148, 0.35)',
      icon: '🌐',
    },
    soundcloud: {
      label: 'SoundCloud',
      color: '#FF5500',
      bg: 'rgba(255, 85, 0, 0.15)',
      border: 'rgba(255, 85, 0, 0.35)',
      icon: '☁️',
    },
    archive: {
      label: 'Internet Archive',
      color: '#E5A93C',
      bg: 'rgba(229, 169, 60, 0.15)',
      border: 'rgba(229, 169, 60, 0.35)',
      icon: '🏛️',
    },
    spotify: {
      label: 'Spotify',
      color: '#1DB954',
      bg: 'rgba(29, 185, 84, 0.15)',
      border: 'rgba(29, 185, 84, 0.35)',
      icon: '🟢',
    },
    apple: {
      label: 'Apple Music',
      color: '#FC3C44',
      bg: 'rgba(252, 60, 68, 0.15)',
      border: 'rgba(252, 60, 68, 0.35)',
      icon: '🍎',
    },
    beatport: {
      label: 'Beatport',
      color: '#00FF9D',
      bg: 'rgba(0, 255, 157, 0.15)',
      border: 'rgba(0, 255, 157, 0.35)',
      icon: '⚡',
    },
  };

  const handleRefreshLiveAudius = async () => {
    setIsRefreshingAudius(true);
    try {
      const trending = await musicService.getAudiusTrending();
      if (trending.length > 0) {
        setLiveAudiusTracks(trending);
      }
    } catch (e) {
      console.warn('Failed to refresh live Audius tracks:', e);
    } finally {
      setIsRefreshingAudius(false);
    }
  };

  const allTracks = useMemo(() => {
    const map = new Map<string, Track>();
    for (const t of PROVIDER_MUSIC_CATALOG) map.set(t.id, t);
    for (const t of liveAudiusTracks) map.set(t.id, t);
    return Array.from(map.values());
  }, [liveAudiusTracks]);

  const genres = [
    { id: 'all', label: 'All Genres' },
    { id: 'pop', label: 'Pop & Billboard' },
    { id: 'hiphop', label: 'Hip-Hop & Trap' },
    { id: 'dance', label: 'EDM & Festival' },
    { id: 'house', label: 'Deep & Progressive House' },
    { id: 'techno', label: 'Techno & Tech House' },
    { id: 'rock', label: 'Rock & Indie' },
    { id: 'bollywood', label: 'Desi & Punjabi Fusion' },
    { id: 'lofi', label: 'Lo-Fi Chill' },
  ];

  // Filtering & Sorting
  const filteredTracks = useMemo(() => {
    let result = [...allTracks];

    if (selectedProvider !== 'all') {
      result = result.filter((t) => t.provider === selectedProvider);
    }

    if (selectedGenre !== 'all') {
      result = result.filter((t) => {
        const g = (t.genre || '').toLowerCase();
        if (selectedGenre === 'pop') return g.includes('pop') || g.includes('disco') || g.includes('synth');
        if (selectedGenre === 'hiphop') return g.includes('hip hop') || g.includes('rap') || g.includes('trap') || g.includes('rage');
        if (selectedGenre === 'dance') return g.includes('dance') || g.includes('edm') || g.includes('trance') || g.includes('festival');
        if (selectedGenre === 'house') return g.includes('house') || g.includes('garage');
        if (selectedGenre === 'techno') return g.includes('techno') || g.includes('minimal');
        if (selectedGenre === 'rock') return g.includes('rock') || g.includes('indie');
        if (selectedGenre === 'lofi') return g.includes('lo-fi') || g.includes('chill') || g.includes('ambient');
        if (selectedGenre === 'bollywood') return g.includes('bollywood') || g.includes('punjabi') || g.includes('desi') || g.includes('fusion');
        return true;
      });
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist_name.toLowerCase().includes(q) ||
          (t.album_name && t.album_name.toLowerCase().includes(q)) ||
          (t.genre && t.genre.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'artist') {
      result.sort((a, b) => a.artist_name.localeCompare(b.artist_name));
    } else if (sortBy === 'bpm') {
      result.sort((a, b) => (b.bpm || 0) - (a.bpm || 0));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => b.duration - a.duration);
    } else if (sortBy === 'year') {
      result.sort((a, b) => (b.releaseYear || '').localeCompare(a.releaseYear || ''));
    }

    return result;
  }, [allTracks, selectedProvider, selectedGenre, searchFilter, sortBy]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      playTrack(filteredTracks[0]);
    }
  };

  const handleTrackRowClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  return (
    <div className="space-y-6 pb-16 select-none animate-fadeIn">
      {/* 1. Spotify-Style Hero Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#123824] via-[#141d24] to-[#121212] border border-white/10 shadow-2xl overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-10 w-80 h-80 bg-[#1DB954]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-[#8C52FF]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#CC0FE0] text-white tracking-wider flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Audius Free API (500k/mo)
              </span>
              <span className="text-xs text-white/80 font-bold px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                7 Music Providers Integrated
              </span>
              <span className="text-xs text-[#1DB954] font-bold px-2.5 py-1 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/30">
                100% Full-Length Audio
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Music Providers Library
            </h1>

            <p className="text-sm text-[#B3B3B3] leading-relaxed">
              Browse, play, and mix high-resolution music from Audius, Jamendo, SoundCloud,
              Internet Archive, Spotify, Apple Music, and Beatport. Featuring authentic album posters, harmonic Camelot keys, and instant tempo sync.
            </p>

            <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-[#B3B3B3]">
              <span className="text-white font-bold">{filteredTracks.length} Songs in Library</span>
              <span>•</span>
              <span>Instant DJ Cue Ready</span>
              <span>•</span>
              <span className="text-[#1DB954]">Zero 30s clips</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <button
              onClick={handleRefreshLiveAudius}
              disabled={isRefreshingAudius}
              className="px-4 py-3.5 rounded-full bg-[#CC0FE0]/20 hover:bg-[#CC0FE0]/30 text-white font-bold text-xs flex items-center gap-2 border border-[#CC0FE0]/40 transition-all cursor-pointer shadow-lg shadow-[#CC0FE0]/20"
              title="Fetch fresh real-time trending tracks from Audius API"
            >
              <RefreshCw className={`w-4 h-4 text-[#CC0FE0] ${isRefreshingAudius ? 'animate-spin' : ''}`} />
              <span>{isRefreshingAudius ? 'Syncing Audius...' : 'Live Audius Sync'}</span>
            </button>

            <button
              onClick={handlePlayAll}
              className="px-6 py-3.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-sm flex items-center gap-2.5 shadow-xl shadow-[#1DB954]/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
              <span>Play All</span>
            </button>

            <button
              onClick={toggleShuffle}
              className={`p-3.5 rounded-full border border-white/10 transition-all ${
                isShuffle ? 'bg-[#1DB954]/20 text-[#1DB954] border-[#1DB954]/40' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Shuffle Library"
            >
              <Shuffle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Provider Pills Selection Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">
            Music Streaming Providers
          </span>
          <span className="text-xs text-[#B3B3B3]">Filter by origin</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {/* All Providers */}
          <button
            onClick={() => setSelectedProvider('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              selectedProvider === 'all'
                ? 'bg-white text-black shadow-lg'
                : 'bg-[#202020] text-[#B3B3B3] hover:text-white hover:bg-[#282828] border border-white/5'
            }`}
          >
            <span>All Providers</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-extrabold">
              {allTracks.length}
            </span>
          </button>

          {/* Individual Providers */}
          {Object.entries(providerConfigs).map(([key, cfg]) => {
            const count = allTracks.filter((t) => t.provider === key).length;
            const isSelected = selectedProvider === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedProvider(key)}
                style={{
                  backgroundColor: isSelected ? cfg.color : undefined,
                  color: isSelected ? '#000' : '#E5E7EB',
                  borderColor: isSelected ? cfg.color : undefined,
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border border-white/10 ${
                  !isSelected ? 'bg-[#202020] hover:bg-[#282828] hover:border-white/20' : 'shadow-lg font-black'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-[#B3B3B3]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search, Genre Pills, Sort & View Mode Toolbar */}
      <div className="p-4 rounded-2xl bg-[#181818] border border-white/5 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Real-time search filter */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter tracks by title, artist, album, key, or BPM..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#242424] text-white placeholder-[#71717A] text-xs sm:text-sm border border-transparent focus:border-[#1DB954] focus:outline-none focus:bg-[#282828] transition-all"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#B3B3B3] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Right Toolbar Controls: Sort & Layout */}
          <div className="flex items-center gap-2.5 justify-end">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#242424] px-3 py-1.5 rounded-xl border border-white/5 text-xs text-[#B3B3B3]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
              >
                <option value="default" className="bg-[#242424]">Default</option>
                <option value="title" className="bg-[#242424]">Title</option>
                <option value="artist" className="bg-[#242424]">Artist</option>
                <option value="bpm" className="bg-[#242424]">BPM (Tempo)</option>
                <option value="duration" className="bg-[#242424]">Duration</option>
                <option value="year" className="bg-[#242424]">Release Year</option>
              </select>
            </div>

            {/* View Mode Toggle (Spotify List vs Poster Grid) */}
            <div className="flex items-center bg-[#242424] p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#1DB954] text-black shadow-sm' : 'text-[#B3B3B3] hover:text-white'
                }`}
                title="Spotify List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#1DB954] text-black shadow-sm' : 'text-[#B3B3B3] hover:text-white'
                }`}
                title="Poster Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Genre Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {genres.map((g) => (
            
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGenre === g.id
                  ? 'bg-white/20 text-white border border-white/30 font-bold'
                  : 'bg-[#222222] text-[#B3B3B3] hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Content: SPOTIFY TABLE LIST VIEW */}
      {viewMode === 'list' ? (
        <div className="rounded-2xl bg-[#181818] border border-white/5 overflow-hidden shadow-2xl">
          {/* Table Header Row */}
          <div className="grid grid-cols-12 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#B3B3B3] border-b border-white/5 bg-[#141414]/90 sticky top-0 z-10 backdrop-blur-md">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5 sm:col-span-4">Title & Poster</div>
            <div className="col-span-3 hidden sm:block">Album / Artist</div>
            <div className="col-span-2 hidden md:block">Provider</div>
            <div className="col-span-1 hidden lg:block">BPM / Key</div>
            <div className="col-span-2 sm:col-span-2 lg:col-span-1 text-right flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Time</span>
            </div>
          </div>

          {/* Track Rows */}
          {filteredTracks.length === 0 ? (
            <div className="py-20 text-center space-y-2 text-[#B3B3B3]">
              <p className="text-base font-bold text-white">No tracks match your filter</p>
              <p className="text-xs">Try selecting 'All Providers' or clearing your search term.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isTrackPlaying = isCurrent && isPlaying;
                const isLiked = likedTrackIds.has(track.id);
                const providerInfo = providerConfigs[track.provider || 'jamendo'] || providerConfigs.spotify;

                return (
                  <div
                    key={track.id}
                    onClick={() => handleTrackRowClick(track)}
                    className={`group grid grid-cols-12 items-center px-5 py-3 text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#1DB954]/10 hover:bg-[#1DB954]/15 border-l-4 border-[#1DB954]'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* 1. Track Number or Play/Pause Button */}
                    <div className="col-span-1 flex items-center justify-center text-[#B3B3B3]">
                      {isTrackPlaying ? (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 h-3.5 bg-[#1DB954] rounded-full animate-pulse" />
                          <span className="w-1 h-4 bg-[#1DB954] rounded-full animate-pulse delay-75" />
                          <span className="w-1 h-2 bg-[#1DB954] rounded-full animate-pulse delay-150" />
                        </div>
                      ) : (
                        <>
                          <span className="group-hover:hidden font-medium text-xs text-[#B3B3B3]">
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            aria-label="Play track"
                            className="hidden group-hover:flex w-7 h-7 rounded-full bg-[#1DB954] text-black items-center justify-center shadow-md transform hover:scale-110 active:scale-95 transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-black stroke-black ml-0.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* 2. Track Title & Album Poster */}
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-3.5 min-w-0 pr-3">
                      {/* High-Resolution Album Artwork Poster */}
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#282828] shadow-md border border-white/10 group-hover:border-[#1DB954]/50 transition-colors">
                        <img
                          src={track.image}
                          alt={track.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`font-bold text-xs sm:text-sm truncate leading-tight ${
                            isCurrent ? 'text-[#1DB954]' : 'text-white group-hover:text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToArtist(track.artist_name);
                          }}
                          className="text-[11px] text-[#B3B3B3] hover:text-white hover:underline truncate mt-0.5"
                        >
                          {track.artist_name}
                        </p>
                      </div>
                    </div>

                    {/* 3. Album & Genre */}
                    <div className="col-span-3 hidden sm:flex flex-col min-w-0 pr-2">
                      <span className="text-white/90 truncate text-xs font-medium">
                        {track.album_name || 'Single'}
                      </span>
                      <span className="text-[10px] text-[#71717A] truncate">
                        {track.genre || 'Electronic'} • {track.releaseYear || '2024'}
                      </span>
                    </div>

                    {/* 4. Provider Badge */}
                    <div className="col-span-2 hidden md:flex items-center gap-1.5 min-w-0">
                      <span
                        style={{
                          backgroundColor: providerInfo.bg,
                          color: providerInfo.color,
                          borderColor: providerInfo.border,
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider"
                      >
                        <span>{providerInfo.icon}</span>
                        <span>{providerInfo.label}</span>
                      </span>
                    </div>

                    {/* 5. Harmonic Key & BPM */}
                    <div className="col-span-1 hidden lg:flex flex-col min-w-0">
                      <span className="text-white font-bold text-[11px]">
                        {track.bpm ? `${track.bpm} BPM` : '124 BPM'}
                      </span>
                      <span className="text-[10px] text-[#8C52FF] font-semibold">
                        {track.key || '8A'}
                      </span>
                    </div>

                    {/* 6. Duration & Actions */}
                    <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex items-center justify-end gap-3 text-right">
                      {/* Heart / Like button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track.id);
                        }}
                        aria-label="Like track"
                        className={`transition-colors p-1 rounded-full ${
                          isLiked
                            ? 'text-[#1DB954] hover:text-[#1ed760]'
                            : 'text-[#71717A] hover:text-white opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#1DB954]' : ''}`} />
                      </button>

                      <span className="text-[#B3B3B3] font-medium text-xs tabular-nums">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 5. POSTER CARD GRID VIEW (Spotify Album Artwork Showcase) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredTracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            const isTrackPlaying = isCurrent && isPlaying;
            const isLiked = likedTrackIds.has(track.id);
            const providerInfo = providerConfigs[track.provider || 'jamendo'] || providerConfigs.spotify;

            return (
              <div
                key={track.id}
                onClick={() => handleTrackRowClick(track)}
                className={`group relative p-3 rounded-2xl bg-[#181818] hover:bg-[#222222] border transition-all duration-300 cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 ${
                  isCurrent ? 'border-[#1DB954]' : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Large Square Poster Image */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#242424] mb-3 shadow-lg">
                  <img
                    src={track.image}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Provider Logo Floating Corner */}
                  <div className="absolute top-2 left-2">
                    <span
                      style={{
                        backgroundColor: providerInfo.bg,
                        color: providerInfo.color,
                        borderColor: providerInfo.border,
                      }}
                      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md border shadow"
                    >
                      {providerInfo.label}
                    </span>
                  </div>

                  {/* Floating Play Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackRowClick(track);
                    }}
                    aria-label={`Play ${track.title}`}
                    className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl transition-all transform hover:scale-110 active:scale-95 cursor-pointer ${
                      isTrackPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                    }`}
                  >
                    {isTrackPlaying ? (
                      <Pause className="w-5 h-5 fill-black stroke-black" />
                    ) : (
                      <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
                    )}
                  </button>

                  {/* Liked Heart Corner */}
                  {isLiked && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-black/60 backdrop-blur-md">
                      <Heart className="w-3.5 h-3.5 text-[#1DB954] fill-[#1DB954]" />
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <h4
                  className={`font-bold text-xs truncate ${
                    isCurrent ? 'text-[#1DB954]' : 'text-white group-hover:text-[#1DB954]'
                  }`}
                >
                  {track.title}
                </h4>

                <p className="text-[11px] text-[#B3B3B3] truncate mt-0.5">
                  {track.artist_name}
                </p>

                <div className="flex items-center justify-between text-[10px] text-[#71717A] mt-2 pt-2 border-t border-white/5">
                  <span>{track.bpm ? `${track.bpm} BPM` : '124 BPM'}</span>
                  <span className="font-semibold text-white/80">{formatDuration(track.duration)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
