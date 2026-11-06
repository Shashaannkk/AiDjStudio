import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { HomeView } from '../views/HomeView';
import { SearchView } from '../views/SearchView';
import { LibraryView } from '../views/LibraryView';
import { LiveRoomsView } from '../views/LiveRoomsView';
import { PlaylistDetailView } from '../views/PlaylistDetailView';
import { ArtistDetailView } from '../views/ArtistDetailView';
import { MusicProvidersView } from '../views/MusicProvidersView';

export const MainContent: React.FC = () => {
  const { currentView } = usePlayerStore();

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'search':
        return <SearchView />;
      case 'providers':
        return <MusicProvidersView />;
      case 'library':
        return <LibraryView />;
      case 'rooms':
        return <LiveRoomsView />;
      case 'playlist':
      case 'liked':
        return <PlaylistDetailView />;
      case 'artist':
        return <ArtistDetailView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <main
      className={`flex-1 h-full overflow-y-auto px-6 py-6 bg-[#121212] select-none ${
        currentView === 'rooms' ? 'no-scrollbar' : ''
      }`}
    >
      <div className="max-w-[1600px] mx-auto">
        {renderView()}
      </div>
    </main>
  );
};
