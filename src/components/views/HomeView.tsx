import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Heart,
  Clock,
  Sparkles,
  Zap,
  Coffee,
  Moon,
  Flame,
  Radio,
  Disc,
} from 'lucide-react';
import { HeroBanner } from '../common/HeroBanner';
import { PlaylistCard } from '../cards/PlaylistCard';
import { LiveRoomCard } from '../cards/LiveRoomCard';
import { TrackCard } from '../cards/TrackCard';
import {
  FIXTURE_POPULAR_MIXES,
  FIXTURE_LIVE_ROOMS,
  FIXTURE_TRACKS,
  FIXTURE_ARTISTS,
  TRENDING_INDIA_TRACKS,
} from '../../fixtures/musicFixtures';
import { usePlayerStore } from '../../store/usePlayerStore';
import { musicService } from '../../services/musicService';
import { recommendationEngine } from '../../services/recommendationEngine';
import type { Track } from '../../types/music';

export const HomeView: React.FC = () => {
  const {
    playTrack,
    currentTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
    setCurrentView,
    history,
    liveRooms,
    user,
    openAuthModal,
  } = usePlayerStore();

  const deterministicRecommendations = React.useMemo(() => {
    const candidates = recommendationEngine.recommend({
      currentTrack,
      history,
      likedTrackIds,
      limit: 12,
    });
    return candidates.map((c) => c.track);
  }, [currentTrack, history, likedTrackIds]);

  const [externalRecommendedTracks, setExternalRecommendedTracks] = useState<Track[]>([]);
  const [selectedAiCategory, setSelectedAiCategory] = useState<string>('all');
  const [aiCategorizedTracks, setAiCategorizedTracks] = useState<Track[]>([]);

  const recommendedTracks = deterministicRecommendations.length > 0
    ? deterministicRecommendations
    : externalRecommendedTracks.length > 0
    ? externalRecommendedTracks
    : FIXTURE_TRACKS;

  const trendingIndiaRef = useRef<HTMLDivElement>(null);
  const popularMixesRef = useRef<HTMLDivElement>(null);
  const liveRoomsRef = useRef<HTMLDivElement>(null);
  const artistsRef = useRef<HTMLDivElement>(null);
  const recommendedRef = useRef<HTMLDivElement>(null);
  const aiCategoryRef = useRef<HTMLDivElement>(null);

  // Fetch optional fallback external recommended tracks
  useEffect(() => {
    let active = true;
    musicService.getRecommendedTracks().then((tracks) => {
      if (active && tracks && tracks.length > 0) {
        setExternalRecommendedTracks(tracks);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Update AI Categorized tracks when category changes
  useEffect(() => {
    let active = true;
    if (selectedAiCategory === 'all') {
      return;
    }
    const genreMap: Record<string, string> = {
      energy: 'EDM Festival Dance',
      lofi: 'Lo-Fi Study Chillhop',
      latenight: 'Deep House Melodic Night',
      bollywood: 'Bollywood Dance Hits',
      synthwave: 'Synthwave Neon 80s',
    };
    const genre = genreMap[selectedAiCategory];
    if (genre) {
      musicService.getTracksForGenre(genre).then((res) => {
        if (active && res.length > 0) {
          setAiCategorizedTracks(res);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [selectedAiCategory]);

  const displayedAiTracks = selectedAiCategory === 'all' ? recommendedTracks : aiCategorizedTracks;

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const recentlyPlayedTracks = history.length > 0 ? history.slice(0, 6) : FIXTURE_TRACKS.slice(0, 5);

  const aiCategories = [
    { id: 'all', label: 'All Curations', icon: Sparkles },
    { id: 'energy', label: 'Peak Energy (128+ BPM)', icon: Zap },
    { id: 'lofi', label: 'Deep Focus & Study', icon: Coffee },
    { id: 'latenight', label: 'Late Night Melodic', icon: Moon },
    { id: 'bollywood', label: 'Desi & Bollywood', icon: Flame },
    { id: 'synthwave', label: 'Synthwave & 80s Neon', icon: Radio },
  ];

  return (
    <div className="space-y-8 pb-12 select-none">
      {/* Section 1: Hero Banner */}
      <HeroBanner />

      {/* Guest Sign In & Sign Up Prominent Banner with Spinning Vinyl Accent */}
      {!user && (
        <div className="relative p-5 rounded-2xl bg-gradient-to-r from-[#181818] via-[#1a1424] to-[#0d2218] border border-[#1DB954]/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-full bg-black border-2 border-[#1DB954] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Disc className="w-6 h-6 text-[#1DB954] animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Join AI DJ Studio Community</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#1DB954] text-black">Free</span>
              </h4>
              <p className="text-xs text-[#B3B3B3] mt-0.5">
                Sign up with Google or Email to save your liked songs, create mixes, and chat in live rooms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => openAuthModal('signup')}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Sign Up
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="px-5 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-md shadow-[#1DB954]/30 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* Section: Trending in India — Real-Time Chart Toppers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Trending in India</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9933] animate-pulse" />
                🇮🇳 Real-Time Top Hits
              </span>
            </div>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              Viral chart-toppers, Punjabi anthems, and Bollywood club bangers trending across India right now.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              onClick={() => setCurrentView('search')}
              className="text-xs font-bold text-[#B3B3B3] hover:text-white cursor-pointer mr-2 hover:underline"
            >
              See All
            </span>
            <button
              onClick={() => scroll(trendingIndiaRef, 'left')}
              aria-label="Scroll trending India songs left"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(trendingIndiaRef, 'right')}
              aria-label="Scroll trending India songs right"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Row */}
        <div
          ref={trendingIndiaRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {TRENDING_INDIA_TRACKS.map((track) => (
            <TrackCard key={track.id} track={track} showBpm />
          ))}
        </div>
      </section>

      {/* Section 2: Popular Mixes — Recommended by Listeners */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Popular Mixes</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30">
                Recommended by Listeners
              </span>
            </div>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              Top curated sessions trending across live community rooms today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              onClick={() => setCurrentView('library')}
              className="text-xs font-bold text-[#B3B3B3] hover:text-white cursor-pointer mr-2 hover:underline"
            >
              See All
            </span>
            <button
              onClick={() => scroll(popularMixesRef, 'left')}
              aria-label="Scroll mixes left"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(popularMixesRef, 'right')}
              aria-label="Scroll mixes right"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Row */}
        <div
          ref={popularMixesRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {FIXTURE_POPULAR_MIXES.map((mix) => (
            <PlaylistCard key={mix.id} playlist={mix} />
          ))}
        </div>
      </section>

      {/* Section 3: Categories by AI — Redesigned, Clean, Proper Alignment */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-[#0d2218]/90 via-[#161616] to-[#1c1228]/90 border border-[#1DB954]/30 shadow-2xl space-y-4">
        {/* Header with Title and Scroll Controls */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1DB954]" />
              <h3 className="text-xl font-bold text-white tracking-tight">Categories by AI</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#1DB954] text-black">
                Harmonic Flow
              </span>
            </div>
            <p className="text-xs text-[#B3B3B3]">
              Harmonic key matching, tempo consistency, and acoustic energy transitions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll(aiCategoryRef, 'left')}
              aria-label="Scroll categories left"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(aiCategoryRef, 'right')}
              aria-label="Scroll categories right"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Selector Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {aiCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedAiCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedAiCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1DB954] text-black font-bold shadow-md shadow-[#1DB954]/30'
                    : 'bg-[#242424] text-[#B3B3B3] hover:text-white hover:bg-[#2c2c2c]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Horizontal Scrollable Row for AI Categorized Tracks */}
        <div
          ref={aiCategoryRef}
          className="flex items-stretch gap-4 overflow-x-auto pt-1 pb-2 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {displayedAiTracks.map((track) => (
            <TrackCard key={track.id} track={track} showBpm />
          ))}
        </div>
      </section>

      {/* Section 4: Popular Artists — SINGLE SCROLLABLE LINE WITH LEFT/RIGHT BUTTONS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Popular Artists</h3>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              Explore verified artists, discographies, and top streams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              onClick={() => usePlayerStore.getState().navigateToArtist(FIXTURE_ARTISTS[0])}
              className="text-xs font-bold text-[#B3B3B3] hover:text-[#1DB954] cursor-pointer mr-2 hover:underline"
            >
              See All
            </span>
            <button
              onClick={() => scroll(artistsRef, 'left')}
              aria-label="Scroll artists left"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(artistsRef, 'right')}
              aria-label="Scroll artists right"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ONE SINGLE HORIZONTAL LINE FOR ARTISTS */}
        <div
          ref={artistsRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-3 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {FIXTURE_ARTISTS.map((art) => (
            <div
              key={art.id}
              onClick={() => usePlayerStore.getState().navigateToArtist(art)}
              className="group w-36 sm:w-40 flex-shrink-0 p-3.5 rounded-2xl bg-[#181818] hover:bg-[#242424] border border-white/5 transition-all duration-300 cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 text-center"
            >
              {/* Circular Artist Avatar with fallback protection */}
              <div className="relative aspect-square w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden bg-[#242424] mb-3 shadow-lg border-2 border-white/10 group-hover:border-[#1DB954] transition-colors">
                <img
                  src={art.avatar}
                  alt={art.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Floating Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (art.popularTracks.length > 0) {
                      usePlayerStore.getState().playTrack(art.popularTracks[0]);
                    }
                  }}
                  aria-label={`Play ${art.name}`}
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
                </button>
              </div>

              <h4 className="font-bold text-sm text-white truncate group-hover:text-[#1DB954] transition-colors">
                {art.name}
              </h4>
              <p className="text-[11px] text-[#B3B3B3] mt-0.5 truncate">
                {art.monthlyListeners}
              </p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-semibold text-[#1DB954]">
                Artist
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Live Rooms */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#1DB954]" />
            <h3 className="text-xl font-bold text-white tracking-tight">Live Rooms</h3>
            <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
          </div>
          <div className="flex items-center gap-2">
            <span
              onClick={() => setCurrentView('rooms')}
              className="text-xs font-bold text-[#B3B3B3] hover:text-white cursor-pointer mr-2 hover:underline"
            >
              See All
            </span>
            <button
              onClick={() => scroll(liveRoomsRef, 'left')}
              aria-label="Scroll rooms left"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(liveRoomsRef, 'right')}
              aria-label="Scroll rooms right"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Row of Room Cards */}
        <div
          ref={liveRoomsRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {(liveRooms && liveRooms.length > 0 ? liveRooms : FIXTURE_LIVE_ROOMS).map((room) => (
            <LiveRoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      {/* Section 6: Recommended for You — Full Length Catalog */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Recommended for You</h3>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              Full-length streaming tracks playing seamlessly from second 0:00.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll(recommendedRef, 'left')}
              aria-label="Scroll recommended left"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(recommendedRef, 'right')}
              aria-label="Scroll recommended right"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={recommendedRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {recommendedTracks.map((track) => (
            <TrackCard key={track.id} track={track} showBpm />
          ))}
        </div>
      </section>

      {/* Section 7: Recently Played */}
      {recentlyPlayedTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1DB954]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Recently Played</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {recentlyPlayedTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => (isCurrent ? togglePlay() : playTrack(track))}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-[#181818] hover:bg-[#242424] border border-white/5 transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <img
                      src={track.image}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop';
                      }}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCurrent ? 'text-[#1DB954]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-[11px] text-[#B3B3B3] truncate">{track.artist_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track);
                      }}
                      aria-label={isLiked ? 'Unlike track' : 'Like track'}
                      className="p-1 rounded-full text-[#B3B3B3] hover:text-white"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLiked ? 'text-[#1DB954] fill-[#1DB954]' : ''
                        }`}
                      />
                    </button>
                    <span className="text-[11px] text-[#B3B3B3]">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
