import React from 'react';
import { X, Sparkles, ListMusic, MessageSquare, Zap, Bot } from 'lucide-react';
import { MusicVideoPosterPanel } from '../panels/MusicVideoPosterPanel';
import { TrackQueue } from '../panels/TrackQueue';
import { RoomChat } from '../panels/RoomChat';
import { AIDJRecommendationPanel } from '../panels/AIDJRecommendationPanel';
import { AIAssistantPanel } from '../panels/AIAssistantPanel';
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
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5 gap-2 min-w-0">
        <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar flex-1 min-w-0">
          <button
            onClick={() => setRightPanelView('canvas')}
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
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
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
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
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              rightPanelView === 'chat'
                ? 'bg-[#282828] text-white shadow'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setRightPanelView('aidj')}
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              rightPanelView === 'aidj'
                ? 'bg-[#1DB954] text-black shadow font-extrabold'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${rightPanelView === 'aidj' ? 'text-black fill-black' : 'text-[#1DB954]'}`} />
            <span>AI DJ</span>
          </button>

          <button
            onClick={() => setRightPanelView('assistant')}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              rightPanelView === 'assistant'
                ? 'bg-gradient-to-r from-[#1DB954] to-cyan-400 text-black shadow font-black'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
            title="Chat with AI DJ Assistant"
          >
            <Bot className={`w-3.5 h-3.5 ${rightPanelView === 'assistant' ? 'text-black' : 'text-cyan-400'}`} />
            <span>Assistant</span>
          </button>
        </div>

        <button
          onClick={toggleRightPanel}
          aria-label="Close right panel"
          className="shrink-0 p-1.5 rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Render Active View */}
      {rightPanelView === 'canvas' && <MusicVideoPosterPanel />}
      {rightPanelView === 'queue' && <TrackQueue />}
      {rightPanelView === 'chat' && <RoomChat />}
      {rightPanelView === 'aidj' && <AIDJRecommendationPanel />}
      {rightPanelView === 'assistant' && <AIAssistantPanel />}
    </aside>
  );
};
