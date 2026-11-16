import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  Play,
  Plus,
  Disc,
  ListPlus,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Sliders,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const AIAssistantPanel: React.FC = () => {
  const {
    assistantMessages,
    assistantTyping,
    sendAssistantMessage,
    executeAssistantAction,
    confirmAssistantAction,
    cancelAssistantAction,
    clearAssistantMessages,
  } = usePlayerStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, assistantTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || assistantTyping) return;
    const text = input.trim();
    setInput('');
    sendAssistantMessage(text);
  };

  const handleQuickPrompt = (prompt: string) => {
    if (assistantTyping) return;
    sendAssistantMessage(prompt);
  };

  const quickPrompts = [
    { label: '⚡ Play energetic', query: 'Play something energetic' },
    { label: '🔍 Similar to current', query: 'Find songs similar to the current track' },
    { label: '💿 30-min chill playlist', query: 'Create a 30-minute chill playlist' },
    { label: '🎛️ Compatible BPM', query: 'Recommend a track with compatible BPM' },
    { label: '💡 Why next song fits', query: 'Explain why the next song fits' },
    { label: '✨ Better transition', query: 'Suggest a better transition' },
    { label: '⚠️ Clear queue', query: 'Clear my upcoming queue' },
  ];

  return (
    <div className="flex flex-col h-full text-white select-none">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1DB954] to-cyan-400 flex items-center justify-center text-black font-black shadow-lg shadow-[#1DB954]/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>AI DJ Assistant</span>
            </h3>
            <span className="flex items-center gap-1 text-[10px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
              <span>Grounded in Real Catalogue</span>
            </span>
          </div>
        </div>

        <button
          onClick={clearAssistantMessages}
          className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors text-xs"
          title="Reset conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickPrompt(qp.query)}
            disabled={assistantTyping}
            className="px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 hover:border-[#1DB954]/50 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* 3. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[380px] sm:max-h-[460px]">
        {assistantMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div
                className={`p-3 rounded-2xl max-w-[94%] text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#1DB954] text-black font-semibold rounded-br-none shadow-md'
                    : 'bg-[#1C1C1C] text-zinc-100 border border-white/5 rounded-bl-none shadow-lg'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Transition Tip Breakdown */}
                {msg.transitionTip && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-black/50 border border-cyan-500/30 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-white/5 pb-1">
                      <span className="flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>DJ Transition Blueprint</span>
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                        {msg.transitionTip.compatibilityScore}% Harmonic Lock
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Harmonics: </span>
                      <span className="text-white font-medium">{msg.transitionTip.keyRelationship}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Tempo: </span>
                      <span className="text-white font-medium">{msg.transitionTip.bpmComparison}</span>
                    </div>
                    <div className="pt-1 text-[10px] text-zinc-300 italic bg-white/5 p-1.5 rounded">
                      🎛️ {msg.transitionTip.technique}
                    </div>
                  </div>
                )}

                {/* Destructive Action Confirmation Card */}
                {msg.confirmationPrompt && (
                  <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-500/40 space-y-2">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{msg.confirmationPrompt.title}</span>
                    </div>
                    <p className="text-[11px] text-red-200/90 leading-tight">
                      {msg.confirmationPrompt.warning}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => confirmAssistantAction(msg.id)}
                        className="flex-1 py-1 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow"
                      >
                        <Check className="w-3 h-3" />
                        <span>{msg.confirmationPrompt.confirmLabel}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelAssistantAction(msg.id)}
                        className="py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3 h-3" />
                        <span>{msg.confirmationPrompt.cancelLabel}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Playlist Action Proposal */}
                {msg.actionProposal && msg.actionProposal.type === 'CREATE_PLAYLIST' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <ListPlus className="w-3.5 h-3.5" />
                        <span>{msg.actionProposal.playlistName}</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {msg.actionProposal.tracks?.length} tracks
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => executeAssistantAction(msg.actionProposal!)}
                      className="w-full py-1.5 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Create Playlist in Library</span>
                    </button>
                  </div>
                )}

                {/* Suggested Real Catalogue Tracks */}
                {msg.suggestedTracks && msg.suggestedTracks.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {msg.suggestedTracks.map((track) => (
                      <div
                        key={track.id}
                        className="p-2 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-2"
                      >
                        {/* Cover + Info */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <img
                            src={track.image}
                            alt={track.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300';
                            }}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-white text-xs truncate block">
                              {track.title}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate">
                              <span className="truncate">{track.artist_name}</span>
                              <span>•</span>
                              <span className="font-mono text-[#1DB954]">{track.bpm} BPM</span>
                              <span>•</span>
                              <span className="font-mono text-cyan-400">{track.key}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => executeAssistantAction({ id: `p-${track.id}`, type: 'PLAY_TRACK', label: 'Play', track })}
                            className="p-1.5 rounded-lg bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] transition-colors cursor-pointer"
                            title="Play Now"
                          >
                            <Play className="w-3.5 h-3.5 fill-[#1DB954]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => executeAssistantAction({ id: `q-${track.id}`, type: 'ADD_TO_QUEUE', label: 'Queue', track })}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Add to Queue"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => executeAssistantAction({ id: `d-${track.id}`, type: 'LOAD_DECK', deckId: 'B', label: 'Deck B', track })}
                            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
                            title="Load to DJ Deck B"
                          >
                            <Disc className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[9px] text-zinc-500 px-1 font-mono">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {assistantTyping && (
          <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-[#1C1C1C] border border-white/5 max-w-[120px] rounded-bl-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-[10px] text-zinc-400 ml-1">Analyzing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Input Form */}
      <form onSubmit={handleSend} className="pt-2 mt-auto border-t border-white/5">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={assistantTyping}
            placeholder="Ask AI DJ: e.g. 'Play something energetic'..."
            className="w-full h-10 pl-3.5 pr-12 rounded-full bg-[#242424] text-xs text-white placeholder-zinc-500 border border-transparent focus:border-[#1DB954]/50 focus:outline-none focus:bg-[#282828] transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || assistantTyping}
            className="absolute right-1.5 p-2 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] disabled:opacity-40 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 fill-black" />
          </button>
        </div>
      </form>
    </div>
  );
};
