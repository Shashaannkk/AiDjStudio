import React, { useState, useEffect } from 'react';
import { Heart, Disc, Sparkles, Play, Plus, X } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { PlaylistCard } from '../cards/PlaylistCard';
import { TrackCard } from '../cards/TrackCard';
import { PROVIDER_MUSIC_CATALOG } from '../../fixtures/musicFixtures';
import { analyticsService, type UserAnalyticsData } from '../../services/analyticsService';

export const LibraryView: React.FC = () => {
  const {
    likedTrackIds,
    likedTracks,
    userPlaylists,
    createPlaylist,
    setSelectedPlaylist,
    setCurrentView,
    playTrack,
    currentTrack,
    togglePlay,
    user,
  } = usePlayerStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [analytics, setAnalytics] = useState<UserAnalyticsData | null>(null);

  const likedCount = likedTrackIds.size;

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      const targetUserId = user?.id || 'usr_default';
      const data = await analyticsService.getUserAnalytics(targetUserId);
      if (isMounted && data) {
        setAnalytics(data);
      }
    };
    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleOpenLiked = () => {
    const likedPl = userPlaylists.find((p) => p.id === 'pl_liked') || {
      id: 'pl_liked',
      name: 'Liked Songs',
      description: 'All your favorite tracks in one place',
      image: '',
      trackCount: likedCount,
      category: 'user',
    };
    setSelectedPlaylist(likedPl);
    setCurrentView('liked');
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;
    const pl = createPlaylist(newPlaylistTitle.trim(), newPlaylistDesc.trim());
    setCreateModalOpen(false);
    setNewPlaylistTitle('');
    setNewPlaylistDesc('');
    setSelectedPlaylist(pl);
    setCurrentView('playlist');
  };

  return (
    <div className="space-y-8 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Your Library</h2>
          <p className="text-sm text-[#B3B3B3] mt-1">
            {user ? `${user.name}'s saved collection • ` : ''}Playlists, liked tracks, custom mixes, and AI session history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/10 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>

          <button
            onClick={() => {
              const customMix = userPlaylists[1] || userPlaylists[0];
              setSelectedPlaylist(customMix);
              setCurrentView('playlist');
            }}
            className="px-5 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#1DB954]/20 transition-all transform hover:scale-105 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-black stroke-black" />
            <span>Generate AI Mix</span>
          </button>
        </div>
      </div>

      {/* Featured Liked Songs & Quick Picks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured Liked Songs Big Card */}
        <div
          onClick={handleOpenLiked}
          className="group relative p-6 rounded-2xl bg-gradient-to-br from-[#8C52FF] via-[#6366F1] to-[#3B82F6] cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between min-h-[200px]"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <h3 className="text-2xl font-black text-white mt-4">Liked Songs</h3>
            <p className="text-xs text-white/80 font-medium">
              {likedCount} favorite tracks saved
            </p>
          </div>

          <div className="text-xs font-semibold text-white/90 flex items-center justify-between pt-4 border-t border-white/20">
            <span>AI DJ Ready</span>
            <span className="group-hover:translate-x-1 transition-transform">View Full List →</span>
          </div>
        </div>

        {/* Recently Liked Tracks Preview */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#181818] border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#1DB954] fill-[#1DB954]" />
              <span>Recently Saved Tracks</span>
            </h4>
            <button
              onClick={handleOpenLiked}
              className="text-xs text-[#1DB954] font-semibold hover:underline cursor-pointer"
            >
              See All ({likedTracks.length})
            </button>
          </div>

          <div className="space-y-2">
            {likedTracks.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#B3B3B3]">
                No liked tracks yet. Tap the heart on any track to save it here.
              </div>
            ) : (
              likedTracks.slice(0, 3).map((track) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => (isCurrent ? togglePlay() : playTrack(track))}
                    className="group flex items-center justify-between p-2 rounded-lg bg-[#242424]/60 hover:bg-[#282828] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-10 h-10 rounded-md object-cover flex-shrink-0"
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

                    <button
                      aria-label="Play track"
                      className="w-8 h-8 rounded-full bg-[#1DB954] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                    >
                      <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* All Playlists Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-[#1DB954]" />
            <span>Playlists & Mixes</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#242424] text-[#1DB954] font-bold">
              {userPlaylists.length}
            </span>
          </h3>
        </div>

        {userPlaylists.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#B3B3B3] rounded-xl bg-[#181818] border border-white/5">
            No playlists created yet. Click "New Playlist" above to create your first collection.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {userPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Master Catalog Showcase Section */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-[#161616] via-[#1a1a1a] to-[#161616] border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
              <h3 className="text-xl font-bold text-white tracking-tight">Featured Library Hits</h3>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30">
                Verified Tracks
              </span>
            </div>
            <p className="text-xs text-[#B3B3B3]">
              High-fidelity audio catalog ready for instant listening, playlist building, and AI DJ transitions.
            </p>
          </div>

          <button
            onClick={() => setCurrentView('search')}
            className="px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#1DB954]/20 transition-all transform hover:scale-105 cursor-pointer w-fit"
          >
            <span>Explore All Music</span>
            <span>→</span>
          </button>
        </div>

        <div className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {PROVIDER_MUSIC_CATALOG.slice(0, 8).map((track) => (
            <TrackCard key={track.id} track={track} showBpm />
          ))}
        </div>
      </section>

      {/* Listening Stats & AI Insights */}
      <section className="p-6 rounded-2xl bg-[#181818] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-white">Your Listening & AI DJ Profile</h4>
          <button
            onClick={() => setCurrentView('profile')}
            className="text-xs text-[#1DB954] hover:underline font-semibold"
          >
            View Full Analytics →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#242424] border border-white/5">
            <span className="text-xs text-[#B3B3B3]">Preferred BPM</span>
            <p className="text-2xl font-black text-[#1DB954] mt-1">
              {analytics?.preferredBpm ? `${analytics.preferredBpm} BPM` : '124 BPM'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#242424] border border-white/5">
            <span className="text-xs text-[#B3B3B3]">Top Key Compatibility</span>
            <p className="text-2xl font-black text-[#8C52FF] mt-1">
              {analytics?.topKey ? `Camelot ${analytics.topKey}` : 'Camelot 8A'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#242424] border border-white/5">
            <span className="text-xs text-[#B3B3B3]">Tracks Liked</span>
            <p className="text-2xl font-black text-white mt-1">{likedCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#242424] border border-white/5">
            <span className="text-xs text-[#B3B3B3]">Listening Time</span>
            <p className="text-2xl font-black text-[#1DB954] mt-1">
              {analytics ? `${Math.round(analytics.totalListeningMinutes)} min` : '0 min'}
            </p>
          </div>
        </div>
      </section>

      {/* Create Playlist Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">Create New Playlist</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-full text-[#B3B3B3] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  Playlist Title
                </label>
                <input
                  type="text"
                  required
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  placeholder="e.g. Late Night Vibes"
                  className="w-full px-3 py-2 rounded-lg bg-[#242424] text-white text-sm border border-transparent focus:border-[#1DB954] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="My favorite tracks for coding and driving"
                  className="w-full px-3 py-2 rounded-lg bg-[#242424] text-white text-sm border border-transparent focus:border-[#1DB954] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#B3B3B3] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
