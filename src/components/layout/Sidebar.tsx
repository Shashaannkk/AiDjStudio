import React, { useState } from 'react';
import {
  Home,
  Search,
  Library,
  Users,
  Heart,
  Plus,
  ChevronDown,
  ChevronUp,
  Disc,
  ShieldAlert,
  Activity,
  X,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { usePlayerStore, type ViewType } from '../../store/usePlayerStore';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    setSelectedPlaylist,
    selectedPlaylist,
    likedTrackIds,
    userPlaylists,
    createPlaylist,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = usePlayerStore();
  const [showAllPlaylists, setShowAllPlaylists] = useState(false);

  const mainNavItems = [
    { id: 'home' as ViewType, label: 'Home', icon: Home },
    { id: 'search' as ViewType, label: 'Search', icon: Search },
    { id: 'mixer' as ViewType, label: 'DJ Decks', icon: Disc, badge: 'PRO' },
    { id: 'library' as ViewType, label: 'Your Library', icon: Library },
    { id: 'rooms' as ViewType, label: 'Live Rooms', icon: Users, badge: 'LIVE' },
    { id: 'profile' as ViewType, label: 'Analytics', icon: Activity },
  ];

  const handleNavClick = (viewId: ViewType) => {
    setSelectedPlaylist(null);
    setCurrentView(viewId);
    setMobileMenuOpen(false);
  };

  const handlePlaylistClick = (playlist: (typeof userPlaylists)[0]) => {
    if (playlist.id === 'pl_liked') {
      setCurrentView('liked');
      setSelectedPlaylist(playlist);
    } else {
      setSelectedPlaylist(playlist);
      setCurrentView('playlist');
    }
    setMobileMenuOpen(false);
  };

  const handleQuickCreate = () => {
    const pl = createPlaylist(`My Mix #${userPlaylists.length + 1}`);
    setSelectedPlaylist(pl);
    setCurrentView('playlist');
    setMobileMenuOpen(false);
  };

  const visiblePlaylists = showAllPlaylists
    ? userPlaylists
    : userPlaylists.slice(0, 7);

  const renderNavContent = () => (
    <>
      {/* Main Navigation */}
      <nav className="px-3 space-y-1">
        {mainNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id && !selectedPlaylist;

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

        {/* Admin Console Navigation Item */}
        <button
          onClick={() => handleNavClick('admin')}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-150 cursor-pointer ${
            currentView === 'admin'
              ? 'text-white bg-[#282828] font-bold shadow-sm'
              : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldAlert
            className={`w-5 h-5 transition-colors ${
              currentView === 'admin' ? 'text-red-400' : 'text-[#B3B3B3]'
            }`}
          />
          <span className={currentView === 'admin' ? 'text-red-400' : ''}>Admin Console</span>
          <span className="ml-auto text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
            STAFF
          </span>
        </button>
      </nav>

      {/* Playlist Library Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 mt-2 border-t border-[#181818] space-y-1">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">
            Playlists
          </span>
          <button
            onClick={handleQuickCreate}
            className="p-1 text-[#B3B3B3] hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Create Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Liked Songs Entry */}
        <button
          onClick={() =>
            handlePlaylistClick({
              id: 'pl_liked',
              name: 'Liked Songs',
              description: 'All your favorite tracks',
              image: '',
              trackCount: likedTrackIds.size,
              category: 'user',
            })
          }
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            currentView === 'liked' || selectedPlaylist?.id === 'pl_liked'
              ? 'bg-[#282828] text-white font-bold'
              : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-sm">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <div className="flex flex-col text-left truncate">
            <span className="font-semibold truncate">Liked Songs</span>
            <span className="text-xs text-[#B3B3B3] truncate">
              {likedTrackIds.size} songs
            </span>
          </div>
        </button>

        {/* Custom Playlists list */}
        {visiblePlaylists.map((playlist) => {
          const isSelected = selectedPlaylist?.id === playlist.id;
          const isMix = playlist.category === 'mix';

          return (
            <button
              key={playlist.id}
              onClick={() => handlePlaylistClick(playlist)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left group ${
                isSelected
                  ? 'bg-[#282828] text-white font-bold'
                  : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
              }`}
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center shrink-0 overflow-hidden ${
                  isMix ? 'bg-[#181818] border border-white/10' : 'bg-[#282828]'
                }`}
              >
                {playlist.image ? (
                  <img
                    src={playlist.image}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Disc className="w-4 h-4 text-[#B3B3B3]" />
                )}
              </div>
              <div className="flex flex-col truncate">
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

      {/* Clean Sidebar Footer */}
      <div className="p-3 mx-2 mb-1 flex items-center justify-between text-[11px] text-[#71717A] border-t border-white/5">
        <span className="font-medium">AI DJ Studio</span>
        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-bold text-[#1DB954]">v2.4 READY</span>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (Medium screens & above: hidden on mobile) */}
      <aside className="hidden md:flex w-60 lg:w-64 h-full bg-black flex-col flex-shrink-0 select-none border-r border-[#181818] z-20">
        {/* Brand Logo Header */}
        <div className="p-6 pb-5 flex items-center">
          <Logo size="md" />
        </div>
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Overlay (Active when mobileMenuOpen is true) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#121212] border-r border-white/10 flex flex-col z-50 shadow-2xl">
            {/* Header with Close Button */}
            <div className="p-4 pb-3 flex items-center justify-between border-b border-white/10">
              <Logo size="md" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
};
