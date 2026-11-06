import React from 'react';
import { X, Sparkles, ListMusic, MessageSquare } from 'lucide-react';
import { MusicVideoPosterPanel } from '../panels/MusicVideoPosterPanel';
import { TrackQueue } from '../panels/TrackQueue';
import { RoomChat } from '../panels/RoomChat';
import { usePlayerStore } from '../../store/usePlayerStore';

export const RightPanel: React.FC = () => {
  const { rightPanelOpen, toggleRightPanel, rightPanelView, setRightPanelView } =
    usePlayerStore();

  if (!rightPanelOpen) {
    return null;
  }

  return (
    <aside className="w-80 sm:w-88 h-full bg-black border-l border-[#181818] flex flex-col flex-shrink-0 z-20 select-none overflow-y-auto p-4 transition-all duration-300 no-scrollbar">
      {/* Top Header & View Tabs */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
        <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setRightPanelView('canvas')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              rightPanelView === 'canvas'
                ? 'bg-[#282828] text-white shadow'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>Poster</span>
          </button>

          <button
            onClick={() => setRightPanelView('queue')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              rightPanelView === 'queue'
                ? 'bg-[#282828] text-white shadow'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>Queue</span>
          </button>

          <button
            onClick={() => setRightPanelView('chat')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              rightPanelView === 'chat'
                ? 'bg-[#282828] text-white shadow'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>Chat</span>
          </button>
        </div>

        <button
          onClick={toggleRightPanel}
          aria-label="Close right panel"
          className="p-1.5 rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Render Active View */}
      {rightPanelView === 'canvas' && <MusicVideoPosterPanel />}
      {rightPanelView === 'queue' && <TrackQueue />}
      {rightPanelView === 'chat' && <RoomChat />}
    </aside>
  );
};
