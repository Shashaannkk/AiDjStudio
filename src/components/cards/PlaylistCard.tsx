import React from 'react';
import { Play } from 'lucide-react';
import type { Playlist } from '../../types/music';
import { usePlayerStore } from '../../store/usePlayerStore';
import { FIXTURE_TRACKS } from '../../fixtures/musicFixtures';

interface PlaylistCardProps {
  playlist: Playlist;
  className?: string;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, className }) => {
  const { setSelectedPlaylist, playTrack } = usePlayerStore();

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Start playing the first track of this specific playlist mix
    if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0]);
    } else if (FIXTURE_TRACKS.length > 0) {
      playTrack(FIXTURE_TRACKS[0]);
    }
  };

  return (
    <div
      onClick={() => setSelectedPlaylist(playlist)}
      className={`group relative flex flex-col p-3.5 rounded-xl bg-[#181818] hover:bg-[#242424] transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl ${
        className ? className : 'w-[185px] sm:w-[195px] flex-shrink-0'
      }`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#282828] mb-3 shadow-md">
        <img
          src={playlist.image}
          alt={playlist.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop';
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Ambient Overlay */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

        {/* Floating Play Button */}
        <button
          onClick={handlePlayClick}
          aria-label={`Play ${playlist.name}`}
          className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl shadow-[#1DB954]/45 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95 transition-all duration-300 ring-1 ring-white/20"
        >
          <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0">
        <h4 className="font-bold text-sm text-white truncate leading-tight group-hover:text-white" title={playlist.name}>
          {playlist.name}
        </h4>
        <p className="text-xs text-[#B3B3B3] line-clamp-2 mt-1 leading-normal" title={playlist.description}>
          {playlist.description}
        </p>
      </div>
    </div>
  );
};
