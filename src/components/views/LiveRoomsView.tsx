import React, { useState } from 'react';
import { PlusCircle, Radio, Sparkles, X } from 'lucide-react';
import { LiveRoomCard } from '../cards/LiveRoomCard';
import { usePlayerStore } from '../../store/usePlayerStore';

export const LiveRoomsView: React.FC = () => {
  const { liveRooms, createLiveRoom } = usePlayerStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomGenre, setNewRoomGenre] = useState('Chill / Lo-Fi');

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    createLiveRoom(newRoomName.trim(), newRoomGenre);
    setModalOpen(false);
    setNewRoomName('');
  };

  return (
    <div className="space-y-8 pb-12 no-scrollbar">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#169C46]/20 via-[#181818] to-[#121212] border border-[#1DB954]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-xs font-bold mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Real-Time Collaborative DJ Rooms</span>
          </div>
          <h2 className="text-3xl font-black text-white">Live DJ Rooms</h2>
          <p className="text-sm text-[#B3B3B3] mt-1 max-w-xl">
            Host listening parties, vote on upcoming tracks, battle in Soundclash sessions, and let AI DJ blend transitions seamlessly.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-6 py-3 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm transition-all transform hover:scale-105 shadow-lg shadow-[#1DB954]/30 flex items-center gap-2 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4 fill-black stroke-black" />
          <span>Host a Room</span>
        </button>
      </div>

      {/* Live Rooms Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Active Rooms</span>
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
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">Soundclash Battles</h4>
            <p className="text-xs text-[#B3B3B3]">
              Vote on tracks in real-time. Highest voted track gets mixed by the AI DJ next.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-[#242424] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-[#1DB954]">#1</span>
              <div>
                <p className="font-semibold text-sm text-white">Neon Lights (Remix)</p>
                <p className="text-xs text-[#B3B3B3]">Zaro • 128 BPM</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-xs font-bold">
              64% Votes
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#242424] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-[#B3B3B3]">#2</span>
              <div>
                <p className="font-semibold text-sm text-white">Dholak Groove & Bass</p>
                <p className="text-xs text-[#B3B3B3]">Rohan Verma • 125 BPM</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/5 text-[#B3B3B3] text-xs font-bold">
              36% Votes
            </span>
          </div>
        </div>
      </section>

      {/* Create Room Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 no-scrollbar max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Create a DJ Room</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-full text-[#B3B3B3] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                  className="px-5 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-md transition-all"
                >
                  Start Live Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
