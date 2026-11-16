import React, { useState, useEffect } from 'react';
import { PlusCircle, Radio, X, KeyRound, ArrowRight, Share2, Check, AlertCircle, Users, LogOut, PanelRight, Trophy, Swords } from 'lucide-react';
import { LiveRoomCard } from '../cards/LiveRoomCard';
import { usePlayerStore } from '../../store/usePlayerStore';
import { realtimeRoomService } from '../../services/realtimeRoomService';
import { soundclashService } from '../../services/soundclashService';

export const LiveRoomsView: React.FC = () => {
  const {
    liveRooms,
    createLiveRoom,
    joinRoomByCode,
    activeRoom,
    leaveRoom,
    roomRole,
    roomNotification,
    clearRoomNotification,
    toggleRightPanel,
    setRightPanelView,
  } = usePlayerStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomGenre, setNewRoomGenre] = useState('Chill / Lo-Fi');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundclashHistory, setSoundclashHistory] = useState<any[]>([]);

  useEffect(() => {
    soundclashService.getHistory().then((hist) => {
      if (Array.isArray(hist) && hist.length > 0) {
        setSoundclashHistory(hist.slice(0, 4));
      }
    }).catch(() => {});
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const created = await createLiveRoom(newRoomName.trim(), newRoomGenre);
    setCreatedRoomCode(created.code);
    setNewRoomName('');
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setJoinError(null);
    setIsJoining(true);
    const result = await joinRoomByCode(joinCodeInput.trim());
    setIsJoining(false);

    if (result.success) {
      setJoinCodeInput('');
    } else {
      setJoinError(result.error || 'Failed to join room. Please check the code.');
    }
  };

  const handleCopyInvite = (code: string) => {
    const link = realtimeRoomService.getInviteLink(code);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="space-y-8 pb-12 no-scrollbar select-none">
      {/* Room Notification Toast Banner */}
      {roomNotification && (
        <div className="p-4 rounded-xl bg-[#282828] border border-[#1DB954]/50 shadow-2xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#1DB954] shrink-0" />
            <p className="text-sm font-semibold text-white">{roomNotification}</p>
          </div>
          <button
            onClick={clearRoomNotification}
            className="p-1 rounded-full text-[#B3B3B3] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Room Connected Banner */}
      {activeRoom && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-[#1DB954]/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#282828] shrink-0 relative">
              <img
                src={activeRoom.cover}
                alt={activeRoom.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#1DB954] animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-[10px] font-extrabold uppercase tracking-wider">
                  Live Party
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px] font-bold">
                  Code: {activeRoom.code}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#8C52FF]/20 text-[#8C52FF] text-[10px] font-bold uppercase">
                  {roomRole === 'host' ? '👑 Host' : roomRole === 'co-dj' ? '🎛️ Co-DJ' : '🎧 Listener'}
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">{activeRoom.name}</h3>
              <p className="text-xs text-[#B3B3B3] flex items-center gap-2 mt-0.5">
                <span>Hosted by <strong className="text-white">{activeRoom.hostName}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#1DB954]">
                  <Users className="w-3.5 h-3.5" />
                  {activeRoom.listenerCount} connected
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              onClick={() => handleCopyInvite(activeRoom.code)}
              className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy shareable link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#1DB954]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied Link!' : 'Invite'}</span>
            </button>
            <button
              onClick={() => {
                setRightPanelView('chat');
                toggleRightPanel();
              }}
              className="px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span>Room Chat & Queue</span>
            </button>
            <button
              onClick={leaveRoom}
              className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-[#B3B3B3] hover:text-red-400 transition-colors cursor-pointer"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Banner Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-r from-[#169C46]/20 via-[#181818] to-[#121212] border border-[#1DB954]/20 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-xs font-bold mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Supabase Realtime Collaborative Rooms</span>
            </div>
            <h2 className="text-3xl font-black text-white">Live DJ Rooms</h2>
            <p className="text-sm text-[#B3B3B3] mt-1 max-w-xl">
              Host live listening parties, invite friends with unique room codes, collaborate on shared queues, and let host playback sync in real-time.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => {
                setCreatedRoomCode(null);
                setModalOpen(true);
              }}
              className="px-6 py-3 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm transition-all transform hover:scale-105 shadow-lg shadow-[#1DB954]/30 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 fill-black stroke-black" />
              <span>Host a Room</span>
            </button>
          </div>
        </div>

        {/* Join Room by Code Card */}
        <div className="p-6 rounded-2xl bg-[#181818] border border-white/5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
              <KeyRound className="w-4 h-4 text-[#1DB954]" />
              <span>Join with Room Code</span>
            </div>
            <p className="text-xs text-[#B3B3B3]">
              Have a 6-character room code or invite code from a friend? Enter it below to join the party.
            </p>
          </div>

          <form onSubmit={handleJoinByCode} className="space-y-2">
            {joinError && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. CHILL1"
                maxLength={8}
                className="flex-1 h-10 px-3 rounded-xl bg-[#242424] text-white uppercase font-mono tracking-wider text-xs font-bold border border-transparent focus:border-[#1DB954] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isJoining || !joinCodeInput.trim()}
                className="h-10 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <span>{isJoining ? 'Joining...' : 'Join'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Live Rooms Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Active Live Rooms</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#282828] text-[#1DB954] font-bold">
              {liveRooms.length} Online
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {liveRooms.map((room) => (
            <LiveRoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      {/* Soundclash Battles Section */}
      <section className="p-6 rounded-xl bg-[#181818] border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8C52FF]/20 flex items-center justify-center text-[#8C52FF]">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">Soundclash Battles</h4>
            <p className="text-xs text-[#B3B3B3]">
              Live DJ head-to-head battles with real-time crowd voting and tie-break resolution.
            </p>
          </div>
        </div>

        {soundclashHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {soundclashHistory.map((battle) => {
              const winnerName = battle.winner?.dj?.name || battle.dj1.name;
              const winnerTrack = battle.winner?.track?.title || battle.dj1.trackTitle || 'Anthem';
              return (
                <div key={battle.id} className="p-4 rounded-lg bg-[#242424] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white truncate">
                        {battle.title}
                      </p>
                      <p className="text-xs text-[#B3B3B3] truncate">
                        Winner: <span className="text-amber-400 font-bold">{winnerName}</span> with &quot;{winnerTrack}&quot;
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {battle.dj1.name} ({battle.dj1.votes} votes) vs {battle.dj2?.name || 'Contender'} ({battle.dj2?.votes || 0} votes)
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-xs font-bold shrink-0 ml-2">
                    {battle.totalVotes} Votes
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-[#242424] border border-white/5 text-center space-y-1">
            <p className="font-semibold text-sm text-white">No soundclash battles completed yet</p>
            <p className="text-xs text-[#B3B3B3]">
              Join any active party room and click &quot;DJ Clash&quot; in the room console to challenge the lead DJ!
            </p>
          </div>
        )}
      </section>

      {/* Create Room Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 no-scrollbar max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">
                {createdRoomCode ? 'Room Created Successfully!' : 'Host a Real-Time DJ Room'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-full text-[#B3B3B3] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdRoomCode ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-[#1DB954]/20 text-[#1DB954] mx-auto flex items-center justify-center">
                  <Radio className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs text-[#B3B3B3]">Share this room code with friends to join your party:</p>
                  <p className="text-3xl font-mono font-black text-white tracking-widest mt-2 px-4 py-2 rounded-xl bg-[#242424] border border-white/10 select-all">
                    {createdRoomCode}
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleCopyInvite(createdRoomCode)}
                    className="flex-1 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-[#1DB954]" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Invite Link'}</span>
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs transition-all cursor-pointer"
                  >
                    Enter Room
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    Room Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Midnight Cyber Lounge"
                    className="w-full px-3 py-2 rounded-lg bg-[#242424] text-white text-sm border border-transparent focus:border-[#1DB954] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    Music Genre / Vibe
                  </label>
                  <select
                    value={newRoomGenre}
                    onChange={(e) => setNewRoomGenre(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#242424] text-white text-sm border border-transparent focus:border-[#1DB954] focus:outline-none"
                  >
                    <option value="Chill / Lo-Fi">Chill / Lo-Fi</option>
                    <option value="EDM / Festival">EDM / Festival</option>
                    <option value="Bollywood / Desi">Bollywood / Desi</option>
                    <option value="Synthwave / Cyber">Synthwave / Cyber</option>
                    <option value="Deep House / Club">Deep House / Club</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-[#B3B3B3] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Create & Start Live Room
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
