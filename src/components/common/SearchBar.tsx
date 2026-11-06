import React from 'react';
import { Search, X } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery, setCurrentView } = usePlayerStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value) {
      setCurrentView('search');
    }
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="relative flex items-center w-full max-w-md">
      <Search className="absolute left-3 w-4 h-4 text-[#B3B3B3] pointer-events-none" />
      <input
        type="text"
        value={searchQuery}
        onChange={handleChange}
        onFocus={() => {
          setCurrentView('search');
        }}
        placeholder="Search songs, artists, playlists, or rooms..."
        className="w-full h-10 pl-9 pr-9 text-xs rounded-full bg-[#242424] text-white placeholder-[#B3B3B3] border border-transparent focus:border-white/30 focus:outline-none focus:bg-[#282828] transition-all"
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 p-1 rounded-full text-[#B3B3B3] hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
