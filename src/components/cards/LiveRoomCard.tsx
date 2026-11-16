import React, { useState } from 'react';
import { Users, MoreHorizontal, Radio, Share2, Check } from 'lucide-react';
import type { LiveRoom } from '../../types/music';
import { usePlayerStore } from '../../store/usePlayerStore';
import { realtimeRoomService } from '../../services/realtimeRoomService';

interface LiveRoomCardProps {
  room: LiveRoom;
}

export const LiveRoomCard: React.FC<LiveRoomCardProps> = ({ room }) => {
  const { joinRoom, activeRoom } = usePlayerStore();
  const [copied, setCopied] = useState(false);
  const isJoined = activeRoom?.id === room.id;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = realtimeRoomService.getInviteLink(room.code || room.id);
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group relative flex flex-col rounded-xl bg-[#181818] hover:bg-[#222222] transition-all duration-200 border border-white/5 overflow-hidden w-[260px] flex-shrink-0 shadow-lg hover:shadow-2xl hover:border-white/10">
      {/* Room Cover & Live Tag */}
      <div className="relative h-32 w-full overflow-hidden bg-[#282828]">
        <img
          src={room.cover}
          alt={room.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop';
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/20 to-black/40" />

        {/* Live Pill Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#1DB954]/40">
          <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          <span className="text-[11px] font-bold text-[#1DB954] tracking-wide uppercase">
            Live
          </span>
        </div>

        {/* Genre Pill Tag & Room Code */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white">
            {room.genre}
          </span>
          {room.code && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40">
              #{room.code}
            </span>
          )}
        </div>
      </div>

      {/* Room Details */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-white truncate max-w-[170px]" title={room.name}>
              {room.name}
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyLink}
                aria-label="Copy invitation link"
                title={copied ? 'Link Copied!' : 'Copy Invitation Link'}
                className="text-[#B3B3B3] hover:text-[#1DB954] p-1 rounded hover:bg-white/10 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#1DB954]" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
              <button
                aria-label="More room options"
                className="text-[#B3B3B3] hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Host & Listener count */}
          <div className="flex items-center gap-2 mt-2">
            {/* Participant Avatars Stack */}
            <div className="flex -space-x-1.5 overflow-hidden">
              {room.participants.slice(0, 3).map((p, idx) => (
                <img
                  key={idx}
                  src={p.avatar}
                  alt={p.name}
                  className="inline-block h-5 w-5 rounded-full ring-2 ring-[#181818] object-cover"
                />
              ))}
            </div>

            <span className="text-xs text-[#B3B3B3] flex items-center gap-1">
              <Users className="w-3 h-3 text-[#B3B3B3]" />
              {room.listenerCount} listeners
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-[#B3B3B3] truncate max-w-[110px]">
            Host: <strong className="text-white font-medium">{room.hostName}</strong>
          </span>

          <button
            onClick={() => joinRoom(room)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              isJoined
                ? 'bg-[#282828] text-[#1DB954] border border-[#1DB954]/50 hover:bg-[#333333]'
                : 'bg-[#1DB954] text-black hover:bg-[#1ed760] hover:scale-105 shadow-md shadow-[#1DB954]/20'
            }`}
          >
            {isJoined ? (
              <>
                <Radio className="w-3 h-3 animate-pulse" />
                Joined
              </>
            ) : (
              'Join Party'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
