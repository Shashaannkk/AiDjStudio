import React, { useState, useEffect } from 'react';
import { Play, X, Music, ChevronUp, ChevronDown, Plus, Radio, Lock, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { PROVIDER_MUSIC_CATALOG, FIXTURE_TRACKS } from '../../fixtures/musicFixtures';
import type { Track } from '../../types/music';

export const TrackQueue: React.FC = () => {
  const {
    queue,
    roomQueue,
    activeRoom,
    roomRole,
    user,
    queueVotes,
    voteRoomTrack,
    fetchQueueVotes,
    playTrack,
    removeFromQueue,
    addTrackToRoomQueue,
    removeTrackFromRoomQueue,
    reorderRoomQueue,
    activeRecommendation,
    acceptRecommendation,
    rejectRecommendation,
  } = usePlayerStore();

  const [addTrackModalOpen, setAddTrackModalOpen] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');

  const isRoomActive = Boolean(activeRoom);
  const canControl = roomRole === 'host' || roomRole === 'co-dj';
  const displayQueue = isRoomActive ? roomQueue : queue;

  useEffect(() => {
    if (isRoomActive) {
      fetchQueueVotes();
    }
  }, [isRoomActive, fetchQueueVotes]);

  const handleTrackClick = (track: Track, index: number) => {
    if (isRoomActive) {
      if (!canControl) return;
      removeTrackFromRoomQueue(track.id);
      playTrack(track);
    } else {
      removeFromQueue(index);
      playTrack(track);
    }
  };

  const allAvailableTracks = [...PROVIDER_MUSIC_CATALOG, ...FIXTURE_TRACKS];
  const filteredTracks = trackSearch.trim()
    ? allAvailableTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(trackSearch.toLowerCase()) ||
          t.artist_name.toLowerCase().includes(trackSearch.toLowerCase())
      )
    : allAvailableTracks.slice(0, 8);

  return (
    <div className="p-4 rounded-xl bg-[#181818] border border-white/5 mb-4 shadow-md select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {isRoomActive && <Radio className="w-3.5 h-3.5 text-[#1DB954] animate-pulse" />}
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            {isRoomActive ? 'Shared Party Queue' : 'Up Next'}
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-[#1DB954] font-bold">
            {displayQueue.length}
          </span>
        </div>

        {isRoomActive && canControl && (
          <button
            onClick={() => setAddTrackModalOpen(true)}
            className="px-2.5 py-1 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Track</span>
          </button>
        )}
      </div>

      {/* Permission & Sync Badge for Collaborative Room */}
      {isRoomActive && (
        <div className="p-2 mb-3 rounded-lg bg-[#202020] border border-white/5 text-[10px] flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            {canControl ? (
              <span className="text-[#1DB954] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>DJ Controls: Add & Reorder (▲ / ▼)</span>
              </span>
            ) : (
              <span className="text-[#B3B3B3] flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#B3B3B3]" />
                <span>Listening Mode: Synced to DJ Room Queue</span>
              </span>
            )}
          </div>
          <span className="text-[#B3B3B3] uppercase text-[9px] font-bold">
            {roomRole === 'host' ? '👑 Host' : roomRole === 'co-dj' ? '🎛️ Co-DJ' : '🎧 Listener'}
          </span>
        </div>
      )}

      {/* Queue Items */}
      {displayQueue.length === 0 ? (
        <div className="py-8 text-center text-[#B3B3B3] text-xs flex flex-col items-center gap-2">
          <Music className="w-6 h-6 opacity-30" />
          <span>Queue is empty. Add songs to play next.</span>
          {isRoomActive && canControl && (
            <button
              onClick={() => setAddTrackModalOpen(true)}
              className="mt-2 px-3 py-1 rounded-full bg-[#1DB954] text-black font-bold text-xs"
            >
              Add First Track
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {displayQueue.map((track, idx) => (
            <div
              key={`${track.id}-${idx}`}
              className="group flex items-center justify-between p-1.5 rounded-lg bg-[#202020]/60 hover:bg-[#242424] transition-colors"
            >
              <div
                onClick={() => handleTrackClick(track, idx)}
                className="flex items-center gap-2.5 min-w-0 pr-2 flex-1 cursor-pointer"
              >
                {/* Index / Play indicator */}
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
                  className="w-9 h-9 rounded object-cover shrink-0"
                />

                {/* Title & Artist */}
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-semibold text-white truncate group-hover:text-[#1DB954] transition-colors">
                    {track.title}
                  </h5>
                  <p className="text-[11px] text-[#B3B3B3] truncate">{track.artist_name}</p>
                </div>
              </div>

              {/* Collaborative Upvote / Downvote Controls */}
              {isRoomActive && (() => {
                const trackVoteInfo = queueVotes[track.id];
                const netScore = trackVoteInfo?.score || 0;
                const currentUserId = user?.id || 'guest';
                const userVote = trackVoteInfo?.userVotes?.[currentUserId] || 0;

                return (
                  <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-lg border border-white/5 mr-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        voteRoomTrack(track.id, userVote === 1 ? 0 : 1);
                      }}
                      className={`p-1 rounded transition-colors ${
                        userVote === 1
                          ? 'text-emerald-400 bg-emerald-500/20'
                          : 'text-zinc-400 hover:text-emerald-400 hover:bg-white/5'
                      }`}
                      title={userVote === 1 ? 'Withdraw Upvote' : 'Upvote Track (+1)'}
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>

                    <span
                      className={`text-[10px] font-mono font-bold min-w-[14px] text-center ${
                        netScore > 0 ? 'text-emerald-400' : netScore < 0 ? 'text-rose-400' : 'text-zinc-500'
                      }`}
                    >
                      {netScore > 0 ? `+${netScore}` : netScore}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        voteRoomTrack(track.id, userVote === -1 ? 0 : -1);
                      }}
                      className={`p-1 rounded transition-colors ${
                        userVote === -1
                          ? 'text-rose-400 bg-rose-500/20'
                          : 'text-zinc-400 hover:text-rose-400 hover:bg-white/5'
                      }`}
                      title={userVote === -1 ? 'Withdraw Downvote' : 'Downvote Track (-1)'}
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                );
              })()}

              {/* Actions / Reorder Buttons */}
              <div className="flex items-center gap-0.5">
                {isRoomActive && canControl && (
                  <>
                    <button
                      onClick={() => {
                        if (idx > 0) reorderRoomQueue(idx, idx - 1);
                      }}
                      disabled={idx === 0}
                      className="p-1 rounded text-[#B3B3B3] hover:text-white disabled:opacity-20 hover:bg-white/10"
                      title="Move Up in Party Queue"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (idx < displayQueue.length - 1) reorderRoomQueue(idx, idx + 1);
                      }}
                      disabled={idx === displayQueue.length - 1}
                      className="p-1 rounded text-[#B3B3B3] hover:text-white disabled:opacity-20 hover:bg-white/10"
                      title="Move Down in Party Queue"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {/* Remove button */}
                {(!isRoomActive || canControl) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRoomActive) {
                        removeTrackFromRoomQueue(track.id);
                      } else {
                        removeFromQueue(idx);
                      }
                    }}
                    aria-label="Remove from queue"
                    className="p-1 rounded text-[#B3B3B3] hover:text-red-400 hover:bg-white/10"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI DJ Next Pick Recommendation Widget */}
      {activeRecommendation && (
        <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-[#202020] to-[#161616] border border-[#1DB954]/30 shadow-md">
          <div className="flex items-center justify-between mb-1.5 text-[10px]">
            <span className="flex items-center gap-1 font-bold text-[#1DB954] uppercase tracking-wider">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>AI DJ Next Pick ({activeRecommendation.score.overall}% Match)</span>
            </span>
            <span className="text-[9px] text-zinc-400 font-mono">
              {activeRecommendation.track.bpm} BPM • {activeRecommendation.track.key}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src={activeRecommendation.track.image}
                alt={activeRecommendation.track.title}
                className="w-8 h-8 rounded object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {activeRecommendation.track.title}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {activeRecommendation.track.artist_name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => acceptRecommendation(activeRecommendation)}
                disabled={isRoomActive && !canControl}
                title="Accept & Add to Queue"
                className="px-2 py-1 rounded-md bg-[#1DB954] hover:bg-[#1ed760] text-black text-[10px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Queue</span>
              </button>
              <button
                onClick={() => rejectRecommendation(activeRecommendation.track.id)}
                title="Dismiss & Get Alternative"
                className="p-1 rounded-md bg-[#282828] hover:text-rose-400 text-zinc-400 text-[10px] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[9px] text-zinc-400 italic pt-1 truncate">
            💡 {activeRecommendation.explanation.bpmAnalysis}
          </p>
        </div>
      )}

      {/* Add Track to Party Queue Modal */}
      {addTrackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#1DB954]" />
                <span>Add Track to Party Queue</span>
              </h4>
              <button
                onClick={() => setAddTrackModalOpen(false)}
                className="p-1 rounded-full text-[#B3B3B3] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={trackSearch}
              onChange={(e) => setTrackSearch(e.target.value)}
              placeholder="Search by title or artist..."
              className="w-full h-9 px-3 text-xs rounded-xl bg-[#242424] text-white border border-transparent focus:border-[#1DB954] focus:outline-none"
            />

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {filteredTracks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#202020] hover:bg-[#282828] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <img src={t.image} alt={t.title} className="w-8 h-8 rounded object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-[#B3B3B3] truncate">{t.artist_name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      addTrackToRoomQueue(t);
                      setAddTrackModalOpen(false);
                    }}
                    className="px-3 py-1 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
