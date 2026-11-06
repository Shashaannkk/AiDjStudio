import React from 'react';
import { Play, MoreHorizontal, X, Music } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import type { Track } from '../../types/music';

export const TrackQueue: React.FC = () => {
  const { queue, playTrack, removeFromQueue } = usePlayerStore();

  const handleTrackClick = (track: Track, index: number) => {
    removeFromQueue(index);
    playTrack(track);
  };

  return (
    <div className="p-4 rounded-xl bg-[#181818] border border-white/5 mb-4 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">
          Up Next
        </h3>
        <span className="text-xs text-[#1DB954] font-semibold hover:underline cursor-pointer">
          See All ({queue.length})
        </span>
      </div>

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div className="py-6 text-center text-[#B3B3B3] text-xs flex flex-col items-center gap-2">
          <Music className="w-5 h-5 opacity-40" />
          <span>Queue is empty. Add songs to mix.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.slice(0, 4).map((track, idx) => (
            <div
              key={`${track.id}-${idx}`}
              onClick={() => handleTrackClick(track, idx)}
              className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-[#242424] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {/* Index / Play icon on hover */}
                <div className="w-4 text-center text-xs font-semibold text-[#B3B3B3] group-hover:hidden">
                  {idx + 1}
                </div>
                <div className="w-4 hidden group-hover:flex items-center justify-center text-white">
                  <Play className="w-3.5 h-3.5 fill-white" />
                </div>

                {/* Small Thumbnail */}
                <img
                  src={track.image}
                  alt={track.title}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />

                {/* Title & Artist */}
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold text-white truncate group-hover:text-[#1DB954] transition-colors">
                    {track.title}
                  </h5>
                  <p className="text-[11px] text-[#B3B3B3] truncate">{track.artist_name}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(idx);
                  }}
                  aria-label="Remove from queue"
                  className="p-1 rounded text-[#B3B3B3] hover:text-white hover:bg-white/10"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  aria-label="Track options"
                  className="p-1 rounded text-[#B3B3B3] hover:text-white hover:bg-white/10"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
