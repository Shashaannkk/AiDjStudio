import React, { useState } from 'react';
import {
  Home,
  Search,
  Library,
  Music2,
  Users,
  Heart,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { usePlayerStore, type ViewType } from '../../store/usePlayerStore';
import { FIXTURE_PLAYLISTS } from '../../fixtures/musicFixtures';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    setSelectedPlaylist,
    selectedPlaylist,
    likedTrackIds,
    userPlaylists,
    createPlaylist,
  } = usePlayerStore();
  const [showAllPlaylists, setShowAllPlaylists] = useState(false);

  const mainNavItems = [
    { id: 'home' as ViewType, label: 'Home', icon: Home },
    { id: 'search' as ViewType, label: 'Search', icon: Search },
    { id: 'providers' as ViewType, label: 'Music Providers', icon: Music2, badge: 'SPOTIFY' },
    { id: 'library' as ViewType, label: 'Your Library', icon: Library },
    { id: 'rooms' as ViewType, label: 'Live Rooms', icon: Users, badge: 'LIVE' },
  ];

  const handleNavClick = (viewId: ViewType) => {
    setSelectedPlaylist(null);
    setCurrentView(viewId);
  };

  const handlePlaylistClick = (playlist: (typeof userPlaylists)[0]) => {
    if (playlist.id === 'pl_liked') {
      setCurrentView('liked');
      setSelectedPlaylist(playlist);
    } else {
      setSelectedPlaylist(playlist);
      setCurrentView('playlist');
    }
  };

  const handleQuickCreate = () => {
    const pl = createPlaylist(`My Mix #${userPlaylists.length + 1}`);
    setSelectedPlaylist(pl);
    setCurrentView('playlist');
  };

  const visiblePlaylists = showAllPlaylists
    ? userPlaylists
    : userPlaylists.slice(0, 7);

  return (
    <aside className="w-64 h-full bg-black flex flex-col flex-shrink-0 select-none border-r border-[#181818] z-20">
      {/* Brand Logo Header */}
      <div className="p-6 pb-5 flex items-center">
        <Logo size="md" />
      </div>

      {/* Main Navigation */}
      <nav className="px-3 space-y-1">
        {mainNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.id && !selectedPlaylist && index < 3;

          return (
            <button
              key={`${item.id}-${index}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'text-white bg-[#282828] font-bold shadow-sm'
                  : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-[#1DB954]' : 'text-[#B3B3B3] group-hover:text-white'
                }`}
              />
              <span className={isActive ? 'text-[#1DB954]' : ''}>{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-4 border-t border-[#282828]" />

      {/* Playlists Header */}
      <div className="px-5 pb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">
          Playlists
        </span>
        <button
          onClick={handleQuickCreate}
          aria-label="Create playlist"
          className="text-[#B3B3B3] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Create Playlist"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Playlist List - Sized Bigger */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 py-1">
        {/* Liked Songs Special Item with Bigger Thumbnail */}
        <button
          onClick={() => handlePlaylistClick(FIXTURE_PLAYLISTS[0])}
          className={`w-full flex items-center gap-3.5 p-2 rounded-lg transition-all ${
            selectedPlaylist?.id === 'pl_liked' || currentView === 'liked'
              ? 'bg-[#282828] text-white shadow-sm'
              : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#8C52FF] to-[#3B82F6] flex items-center justify-center flex-shrink-0 shadow-md">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <span className="text-sm font-semibold truncate text-white">Liked Songs</span>
            <span className="text-xs text-[#B3B3B3] truncate">
              Playlist • {likedTrackIds.size} songs
            </span>
          </div>
        </button>

        {/* User and Curated Playlists - Sized Bigger with 44px Thumbnails and Subtitle */}
        {visiblePlaylists.slice(1).map((playlist) => {
          const isSelected = selectedPlaylist?.id === playlist.id;
          return (
            <button
              key={playlist.id}
              onClick={() => handlePlaylistClick(playlist)}
              className={`w-full flex items-center gap-3.5 p-2 rounded-lg transition-all text-left ${
                isSelected
                  ? 'bg-[#282828] text-white shadow-sm'
                  : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
              }`}
            >
              {playlist.image ? (
                <img
                  src={playlist.image}
                  alt={playlist.name}
                  className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-[#282828] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {playlist.name[0]}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-semibold truncate ${isSelected ? 'text-[#1DB954]' : 'text-white'}`}>
                  {playlist.name}
                </span>
                <span className="text-xs text-[#B3B3B3] truncate">
                  {playlist.category === 'mix' ? 'Mix' : 'Playlist'} • {playlist.trackCount} songs
                </span>
              </div>
            </button>
          );
        })}

        {/* Show More toggle */}
        <button
          onClick={() => setShowAllPlaylists(!showAllPlaylists)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#B3B3B3] hover:text-white transition-colors"
        >
          {showAllPlaylists ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Show More</span>
            </>
          )}
        </button>
      </div>

      {/* Clean Spotify-Style Sidebar Footer */}
      <div className="p-3 mx-2 mb-1 flex items-center justify-between text-[11px] text-[#71717A] border-t border-white/5">
        <span className="font-medium">AI DJ Studio</span>
        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-bold text-[#1DB954]">v2.4 READY</span>
      </div>
    </aside>
  );
};
