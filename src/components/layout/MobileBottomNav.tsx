import React from 'react';
import { Home, Search, Disc, Users, Library } from 'lucide-react';
import { usePlayerStore, type ViewType } from '../../store/usePlayerStore';

export const MobileBottomNav: React.FC = () => {
  const { currentView, setCurrentView, setSelectedPlaylist, selectedPlaylist } = usePlayerStore();

  const navItems = [
    { id: 'home' as ViewType, label: 'Home', icon: Home },
    { id: 'search' as ViewType, label: 'Search', icon: Search },
    { id: 'mixer' as ViewType, label: 'DJ Decks', icon: Disc, isPro: true },
    { id: 'rooms' as ViewType, label: 'Live Rooms', icon: Users, isLive: true },
    { id: 'library' as ViewType, label: 'Library', icon: Library },
  ];

  const handleNav = (viewId: ViewType) => {
    setSelectedPlaylist(null);
    setCurrentView(viewId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-14 bg-black/95 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-around px-2 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id && !selectedPlaylist;

        return (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
              isActive ? 'text-[#1DB954]' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110' : ''
                } ${item.isPro && isActive ? 'text-[#1DB954]' : ''}`}
              />
              {item.isLive && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
              )}
            </div>
            <span
              className={`text-[10px] mt-0.5 tracking-tight font-medium ${
                isActive ? 'font-bold text-[#1DB954]' : 'text-[#B3B3B3]'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
