import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Bell, Users, ChevronDown, PanelRight, LogOut, UserCheck, Sparkles } from 'lucide-react';
import { SearchBar } from '../common/SearchBar';
import { usePlayerStore } from '../../store/usePlayerStore';

export const TopNav: React.FC = () => {
  const {
    setCurrentView,
    toggleRightPanel,
    rightPanelOpen,
    user,
    openAuthModal,
    logout,
  } = usePlayerStore();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Extract first name only (as requested: "if logged in the show the users name and profile first nam is enough")
  const firstName = user ? user.name.split(' ')[0] : '';

  return (
    <header className="h-16 px-6 bg-[#121212]/90 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/5 select-none">
      {/* Left: History navigation & Search bar */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('home')}
            aria-label="Go back"
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Go forward"
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-[#B3B3B3] hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Wide Search Bar */}
        <SearchBar />
      </div>

      {/* Right: Notifications, Community, User Profile / Login & Panel Toggle */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1DB954]" />
        </button>

        {/* Community / Friends */}
        <button
          onClick={() => setCurrentView('rooms')}
          aria-label="Community"
          className="relative p-2 rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-colors"
          title="Live Rooms & Community"
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 px-1 rounded-full bg-[#1DB954] text-black text-[9px] font-black">
            4
          </span>
        </button>

        {/* Toggle Right Panel button */}
        <button
          onClick={toggleRightPanel}
          aria-label="Toggle right panel"
          className={`p-2 rounded-full transition-colors ${
            rightPanelOpen
              ? 'text-[#1DB954] bg-[#1DB954]/10'
              : 'text-[#B3B3B3] hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Now Playing & Queue Panel"
        >
          <PanelRight className="w-5 h-5" />
        </button>

        {/* User Auth Section: Login / Sign Up buttons vs Profile with First Name */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-black/60 hover:bg-[#282828] border border-white/10 cursor-pointer transition-colors"
            >
              <img
                src={user.avatar}
                alt={firstName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
                }}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-[#1DB954]"
              />
              <span className="text-xs font-bold text-white max-w-[100px] truncate">
                {firstName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#B3B3B3]" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#282828] border border-white/10 shadow-2xl py-2 z-50 animate-fadeIn">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-[#B3B3B3] truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/20 px-2 py-0.5 rounded-full uppercase">
                    Studio DJ Account
                  </span>
                </div>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setCurrentView('library');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-[#E5E7EB] hover:bg-white/10 flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4 text-[#1DB954]" />
                  <span>Profile & Library</span>
                </button>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    openAuthModal('login');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-[#E5E7EB] hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#1DB954]" />
                  <span>Switch Account / Sign In</span>
                </button>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuthModal('signup')}
              className="text-xs font-bold text-[#B3B3B3] hover:text-white transition-colors cursor-pointer px-2 py-1"
            >
              Sign Up
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="px-5 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 cursor-pointer"
            >
              Log In
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
