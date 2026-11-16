import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Smile,
  MessageSquare,
  Radio,
  Users,
  Flame,
  Crown,
  Shield,
  Headphones,
  UserX,
  Share2,
  Check,
  Power,
  Zap,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { realtimeRoomService } from '../../services/realtimeRoomService';
import { ROOM_MOOD_CONFIG } from '../../services/moodDetectionEngine';
import type { RoomMood } from '../../types/roomIntelligence';
import { SoundclashCard } from './SoundclashCard';

export const RoomChat: React.FC = () => {
  const {
    roomMessages,
    sendChatMessage,
    activeRoom,
    user,
    roomRole,
    updateParticipantRole,
    kickParticipant,
    transferRoomOwnership,
    closeRoom,
    roomMood,
    activeSoundclash,
    activeHumanBattle,
    setRoomMood,
    evaluateRoomMood,
    startSoundclash,
    createHumanSoundclash,
  } = usePlayerStore();

  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'settings'>('chat');
  const [copiedLink, setCopiedLink] = useState(false);
  const [moodDropdownOpen, setMoodDropdownOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomMessages, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(inputText);
    setInputText('');
  };

  const handleQuickReaction = (emoji: string) => {
    sendChatMessage(emoji);
  };

  const handleCopyInvite = () => {
    if (!activeRoom) return;
    const link = realtimeRoomService.getInviteLink(activeRoom.code || activeRoom.id);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const quickEmojis = ['🔥', '❤️', '🎵', '🚀', '👏', '🎧'];
  const isHost = roomRole === 'host';
  const canStartSoundclash = isHost || roomRole === 'co-dj';
  const participants = activeRoom?.participants || [];
  const currentMoodConfig = ROOM_MOOD_CONFIG[roomMood.mood] || ROOM_MOOD_CONFIG.party;

  const moodOptions: { id: RoomMood | 'auto'; label: string; emoji: string }[] = [
    { id: 'auto', label: 'Auto-Detect (Crowd NLP)', emoji: '🤖' },
    { id: 'energetic', label: 'Energetic & Hyped', emoji: '⚡' },
    { id: 'relaxed', label: 'Relaxed & Serene', emoji: '🌊' },
    { id: 'happy', label: 'Happy & Euphoric', emoji: '❤️' },
    { id: 'melancholic', label: 'Melancholic & Deep', emoji: '🌙' },
    { id: 'focused', label: 'Deep Focus & Flow', emoji: '🎧' },
    { id: 'party', label: 'Party & Club', emoji: '🎉' },
  ];

  const handleSelectMood = (moodId: RoomMood | 'auto') => {
    if (moodId === 'auto') {
      evaluateRoomMood();
    } else {
      setRoomMood(moodId, true);
    }
    setMoodDropdownOpen(false);
  };

  return (
    <div className="p-4 rounded-xl bg-[#181818] border border-white/5 flex flex-col shadow-xl select-none min-h-[460px]">
      {/* Header */}
      <div className="pb-3 mb-2 border-b border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              DJ Room Console
            </h3>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-[9px] font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-ping" />
              REALTIME
            </span>
          </div>

          {activeRoom && (
            <button
              onClick={handleCopyInvite}
              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Copy Room Invitation Link"
            >
              {copiedLink ? <Check className="w-3 h-3 text-[#1DB954]" /> : <Share2 className="w-3 h-3" />}
              <span>{copiedLink ? 'Copied' : `#${activeRoom.code}`}</span>
            </button>
          )}
        </div>

        {/* Room Playback Authority Status Pill */}
        {activeRoom && (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#202020] border border-white/5 text-[11px]">
            <div className="flex items-center gap-1.5 truncate min-w-0">
              <Radio className="w-3.5 h-3.5 text-[#1DB954] animate-pulse shrink-0" />
              <span className="text-white font-bold truncate">{activeRoom.name}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                isHost
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : roomRole === 'co-dj'
                  ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30'
                  : 'bg-white/10 text-[#B3B3B3]'
              }`}
            >
              {isHost ? '👑 Host Authority' : roomRole === 'co-dj' ? '🎛️ Co-DJ' : `🟢 Synced to ${activeRoom.hostName.split(' ')[0]}`}
            </span>
          </div>
        )}

        {/* Room Mood Intelligence & Soundclash Controls */}
        {activeRoom && (
          <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-[#141414] border border-white/5 text-[11px] relative">
            {/* Mood Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoodDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-colors text-[11px]"
                title="Change or inspect room mood"
              >
                <span className="text-sm">{currentMoodConfig.emoji}</span>
                <span className="font-bold truncate max-w-[90px]">{currentMoodConfig.label.split('&')[0].trim()}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-[#1DB954] font-semibold">
                  {roomMood.confidence}% {roomMood.isManualOverride ? 'Man' : 'Auto'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#B3B3B3]" />
              </button>

              {/* Dropdown Menu */}
              {moodDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-[#202020] border border-white/10 shadow-2xl p-1 z-30 space-y-0.5">
                  <div className="px-2 py-1 text-[9px] uppercase font-bold text-[#B3B3B3] flex items-center justify-between border-b border-white/5">
                    <span>Room Crowd Vibe</span>
                    <Sparkles className="w-3 h-3 text-[#1DB954]" />
                  </div>
                  {moodOptions.map((opt) => {
                    const isSelected =
                      opt.id === 'auto'
                        ? !roomMood.isManualOverride
                        : roomMood.isManualOverride && roomMood.mood === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectMood(opt.id)}
                        className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#1DB954]/20 text-[#1DB954] font-bold'
                            : 'text-[#E5E7EB] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-[#1DB954]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Soundclash Launch Buttons (Human & AI) */}
            {!activeSoundclash && !activeHumanBattle ? (
              canStartSoundclash ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => createHumanSoundclash()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/40 hover:to-amber-600/40 text-amber-200 border border-amber-500/40 text-[10px] font-black cursor-pointer transition-all uppercase tracking-wide hover:scale-105"
                    title="Initiate Human DJ vs DJ Soundclash Battle"
                  >
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>DJ Clash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startSoundclash(30, 3)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-bold cursor-pointer transition-all uppercase"
                    title="Launch AI Crowd Choice track vote"
                  >
                    <span>AI Choice</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <span>Vibe: {currentMoodConfig.emoji}</span>
                </div>
              )
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40 animate-pulse uppercase">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Battle Live</span>
              </span>
            )}
          </div>
        )}

        {/* Console View Switcher Tabs */}
        {activeRoom && (
          <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-lg border border-white/5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chat' ? 'bg-[#282828] text-white shadow' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat ({roomMessages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'participants' ? 'bg-[#282828] text-white shadow' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Party ({participants.length})</span>
            </button>

            {isHost && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'settings' ? 'bg-[#282828] text-amber-400 shadow' : 'text-[#B3B3B3] hover:text-white'
                }`}
                title="Host Room Settings"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Host</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 1. CHAT TAB CONTENT */}
      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Active Soundclash Battle Widget (Human DJ or AI Track Battle) */}
          {(activeHumanBattle || activeSoundclash) && (
            <div className="mb-2">
              <SoundclashCard session={activeSoundclash} humanBattle={activeHumanBattle} />
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className={`flex-1 overflow-y-auto space-y-2.5 pr-1 py-1 ${activeSoundclash || activeHumanBattle ? 'max-h-[140px]' : 'max-h-[220px]'}`}>
            {roomMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5">
                <img
                  src={msg.userAvatar}
                  alt={msg.userName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
                  }}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-white/10"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white leading-tight">
                      {msg.userName}
                    </span>
                    {msg.isSystem && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-white/10 text-white/80">
                        Notice
                      </span>
                    )}
                    {msg.isAi && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#8C52FF]/20 text-[#8C52FF] border border-[#8C52FF]/30">
                        AI DJ
                      </span>
                    )}
                    <span className="text-[10px] text-[#B3B3B3] ml-auto">{msg.timestamp}</span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 leading-snug break-words ${
                      msg.isSystem ? 'text-[#1DB954] font-medium' : 'text-[#E5E7EB]'
                    }`}
                  >
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Emoji Reaction Bar */}
          <div className="flex items-center justify-between gap-1 pt-2 pb-1 border-t border-white/5">
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
                  className="p-1 rounded-md text-xs hover:bg-[#282828] hover:scale-125 transition-transform cursor-pointer"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSend} className="mt-1 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={user ? `Chat as ${user.name.split(' ')[0]}...` : 'Send a real-time message...'}
              className="w-full h-9 pl-3 pr-16 text-xs rounded-full bg-[#242424] text-white placeholder-[#B3B3B3] border border-transparent focus:border-[#1DB954]/50 focus:outline-none focus:bg-[#282828] transition-all"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setInputText((prev) => prev + ' 🔥')}
                className="p-1 rounded-full text-[#B3B3B3] hover:text-white"
                title="Add fire emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-1.5 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] disabled:opacity-40 transition-all cursor-pointer"
              >
                <Send className="w-3 h-3 fill-black" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. PARTICIPANTS TAB CONTENT */}
      {activeTab === 'participants' && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[260px]">
          <p className="text-[11px] text-[#B3B3B3] px-1 pb-1">
            Connected listeners and DJs in this room session:
          </p>

          {participants.map((p) => {
            const isSelf = p.id === (user?.id || 'guest');
            return (
              <div
                key={p.id}
                className="p-2 rounded-xl bg-[#202020] border border-white/5 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
                      }}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#1DB954] ring-1 ring-black" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[110px]">{p.name}</span>
                      {isSelf && <span className="text-[9px] text-[#1DB954] font-semibold">(You)</span>}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase ${
                        p.role === 'host'
                          ? 'text-amber-400'
                          : p.role === 'co-dj'
                          ? 'text-[#1DB954]'
                          : 'text-[#B3B3B3]'
                      }`}
                    >
                      {p.role === 'host' ? (
                        <>
                          <Crown className="w-3 h-3" />
                          <span>Host</span>
                        </>
                      ) : p.role === 'co-dj' ? (
                        <>
                          <Shield className="w-3 h-3" />
                          <span>Co-DJ</span>
                        </>
                      ) : (
                        <>
                          <Headphones className="w-3 h-3" />
                          <span>Listener</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Host Control Actions for this Participant */}
                {isHost && !isSelf && (
                  <div className="flex items-center gap-1">
                    {p.role === 'listener' ? (
                      <button
                        onClick={() => updateParticipantRole(p.id, 'co-dj')}
                        className="px-2 py-1 rounded-md bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] text-[10px] font-bold cursor-pointer transition-colors"
                        title="Promote to Co-DJ"
                      >
                        Make Co-DJ
                      </button>
                    ) : (
                      <button
                        onClick={() => updateParticipantRole(p.id, 'listener')}
                        className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[#B3B3B3] text-[10px] font-bold cursor-pointer transition-colors"
                        title="Demote to Listener"
                      >
                        Demote
                      </button>
                    )}

                    <button
                      onClick={() => kickParticipant(p.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-[#B3B3B3] hover:text-red-400 cursor-pointer transition-colors"
                      title="Remove participant"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. HOST SETTINGS TAB CONTENT */}
      {activeTab === 'settings' && isHost && activeRoom && (
        <div className="flex-1 space-y-4 pr-1 max-h-[260px] overflow-y-auto text-xs">
          <div className="p-3 rounded-xl bg-[#202020] border border-white/5 space-y-2">
            <span className="text-[#B3B3B3] font-semibold text-[11px]">Room Code & Link</span>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/60 font-mono font-bold text-white text-sm">
              <span>{activeRoom.code}</span>
              <button
                onClick={handleCopyInvite}
                className="text-xs text-[#1DB954] hover:underline flex items-center gap-1 cursor-pointer font-sans"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Transfer Ownership */}
          <div className="p-3 rounded-xl bg-[#202020] border border-white/5 space-y-2">
            <span className="text-[#B3B3B3] font-semibold text-[11px]">Transfer Host Ownership</span>
            <div className="space-y-1.5">
              {participants
                .filter((p) => p.id !== (user?.id || 'guest'))
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-1.5 rounded-lg bg-black/40">
                    <span className="font-semibold text-white">{p.name}</span>
                    <button
                      onClick={() => transferRoomOwnership(p.id)}
                      className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 font-bold text-[10px] cursor-pointer"
                    >
                      Make Host
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Close Room Button */}
          <div className="pt-2">
            <button
              onClick={closeRoom}
              className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Power className="w-4 h-4" />
              <span>Close & End Party Room</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
