import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, MessageSquare, Radio, Users, Flame } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const RoomChat: React.FC = () => {
  const { roomMessages, sendChatMessage, activeRoom, user } = usePlayerStore();
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(inputText);
    setInputText('');
  };

  const handleQuickReaction = (emoji: string) => {
    sendChatMessage(emoji);
  };

  const quickEmojis = ['🔥', '❤️', '🎵', '🚀', '👏', '🎧'];

  return (
    <div className="p-4 rounded-xl bg-[#181818] border border-white/5 flex flex-col shadow-xl max-h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#1DB954]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Live Room Chat
          </h3>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-[9px] font-extrabold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-ping" />
            REAL-TIME
          </span>
        </div>

        {activeRoom ? (
          <span className="text-[11px] text-[#1DB954] flex items-center gap-1 font-semibold truncate max-w-[140px]">
            <Radio className="w-3 h-3 animate-pulse flex-shrink-0" />
            <span className="truncate">{activeRoom.name}</span>
          </span>
        ) : (
          <span className="text-[10px] text-[#B3B3B3]">Global Studio</span>
        )}
      </div>

      {/* Room Participants Status Bar */}
      {activeRoom && (
        <div className="flex items-center justify-between px-2.5 py-1.5 mb-2 rounded-lg bg-[#242424]/60 text-[11px] text-[#B3B3B3]">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>{activeRoom.listenerCount} listeners in party</span>
          </div>
          <span className="text-[#1DB954] font-semibold text-[10px]">
            Host: {activeRoom.hostName}
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 min-h-[160px] max-h-[220px]">
        {roomMessages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2.5">
            <img
              src={msg.userAvatar}
              alt={msg.userName}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
              }}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5 ring-1 ring-white/10"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-white leading-tight">
                  {msg.userName}
                </span>
                {msg.userEmail && !msg.isAi && (
                  <span className="text-[10px] text-[#1DB954] font-medium truncate max-w-[140px]" title={msg.userEmail}>
                    ({msg.userEmail.split('@')[0]})
                  </span>
                )}
                {msg.isAi && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#8C52FF]/20 text-[#8C52FF] border border-[#8C52FF]/30">
                    AI DJ
                  </span>
                )}
                <span className="text-[10px] text-[#B3B3B3] ml-auto">{msg.timestamp}</span>
              </div>
              <p className="text-xs text-[#E5E7EB] mt-0.5 leading-snug break-words">
                {msg.message}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Active Account Identity Pill for Multi-Account Testing */}
      <div className="flex items-center justify-between px-2 py-1 my-1 rounded-md bg-[#202020] text-[10px] text-[#B3B3B3] border border-white/5">
        <div className="flex items-center gap-1.5 truncate min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse flex-shrink-0" />
          <span className="truncate">
            Sending as: <span className="text-white font-semibold">{user ? user.name : 'Guest DJ'}</span>{' '}
            {user && <span className="text-[#1DB954]">({user.email})</span>}
          </span>
        </div>
        <button
          type="button"
          onClick={() => usePlayerStore.getState().openAuthModal('login')}
          className="text-[#1DB954] hover:text-white font-bold ml-2 flex-shrink-0 cursor-pointer text-[10px]"
          title="Switch to another email account to test multi-user chat"
        >
          Switch Account
        </button>
      </div>

      {/* Quick Emoji Reaction Bar */}
      <div className="flex items-center justify-between gap-1 pt-1.5 pb-1 border-t border-white/5">
        <span className="text-[10px] text-[#B3B3B3] font-medium flex items-center gap-1">
          <Flame className="w-3 h-3 text-[#1DB954]" />
          <span>React:</span>
        </span>
        <div className="flex items-center gap-1">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickReaction(emoji)}
              className="p-1 rounded-md text-xs hover:bg-[#282828] hover:scale-125 transition-transform"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="mt-1 relative flex items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={user ? `Chat as ${user.name.split(' ')[0]} (${user.email.split('@')[0]})...` : 'Send a real-time message...'}
          className="w-full h-9 pl-3 pr-16 text-xs rounded-full bg-[#242424] text-white placeholder-[#B3B3B3] border border-transparent focus:border-[#1DB954]/50 focus:outline-none focus:bg-[#282828] transition-all"
        />

        <div className="absolute right-2 flex items-center gap-1">
          <button
            type="button"
            aria-label="Add emoji"
            onClick={() => setInputText((prev) => prev + ' 🔥')}
            className="p-1 rounded-full text-[#B3B3B3] hover:text-white"
            title="Add fire emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Send message"
            className="p-1.5 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] disabled:opacity-40 disabled:hover:bg-[#1DB954] transition-all cursor-pointer"
          >
            <Send className="w-3 h-3 fill-black" />
          </button>
        </div>
      </form>
    </div>
  );
};
