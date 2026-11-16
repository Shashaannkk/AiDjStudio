import React, { useState, useEffect } from 'react';
import {
  Flame,
  Check,
  Clock,
  Trophy,
  StopCircle,
  Swords,
  UserPlus,
  Disc,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import type { SoundclashSession } from '../../types/roomIntelligence';
import type { HumanSoundclashBattle } from '../../services/soundclashService';

interface SoundclashCardProps {
  session?: SoundclashSession | null;
  humanBattle?: HumanSoundclashBattle | null;
}

export const SoundclashCard: React.FC<SoundclashCardProps> = ({ session: propSession, humanBattle: propBattle }) => {
  const {
    user,
    currentTrack,
    voteInSoundclash,
    endSoundclash,
    roomRole,
    activeSoundclash,
    activeHumanBattle,
    joinHumanSoundclash,
    submitHumanSoundclashTrack,
    voteHumanSoundclash,
  } = usePlayerStore();

  const session = propSession !== undefined ? propSession : activeSoundclash;
  const battle = propBattle !== undefined ? propBattle : activeHumanBattle;

  // Handle countdown for Human Battle
  const battleEndsAt = battle?.endsAt || 0;
  const [battleSecondsRemaining, setBattleSecondsRemaining] = useState<number>(() =>
    battle ? Math.max(0, Math.round((battleEndsAt - Date.now()) / 1000)) : 0
  );

  useEffect(() => {
    if (!battle || battle.status !== 'active') return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((battleEndsAt - Date.now()) / 1000));
      setBattleSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [battle, battleEndsAt]);

  // Handle countdown for AI Track Battle
  const [aiSecondsRemaining, setAiSecondsRemaining] = useState<number>(() =>
    session ? Math.max(0, Math.round((session.endsAt - Date.now()) / 1000)) : 0
  );

  const canControl = roomRole === 'host' || roomRole === 'co-dj';
  const currentUserId = user?.id || 'guest';

  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((session.endsAt - Date.now()) / 1000));
      setAiSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (canControl && session.status === 'active') {
          endSoundclash();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session, canControl, endSoundclash]);

  // ---------------------------------------------------------------------------
  // 1. RENDER HUMAN DJ SOUNDCLASH (SND-01)
  // ---------------------------------------------------------------------------
  if (battle) {
    const isDj1 = battle.dj1.user.id === currentUserId;
    const isDj2 = battle.dj2?.user.id === currentUserId;
    const userVote = battle.votes[currentUserId];
    const totalVotes = battle.totalVotes || 0;
    const dj1Percentage = totalVotes > 0 ? Math.round((battle.dj1.votes / totalVotes) * 100) : 50;
    const dj2Percentage = totalVotes > 0 ? 100 - dj1Percentage : 50;

    return (
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#24120A] via-[#1A1412] to-[#0E1520] border border-amber-500/40 shadow-2xl text-white select-none my-2 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Swords className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                <span>{battle.title}</span>
              </h4>
              <span className="text-[10px] text-zinc-400">
                {totalVotes} {totalVotes === 1 ? 'crowd vote' : 'crowd votes'} cast
              </span>
            </div>
          </div>

          {battle.status === 'active' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{battleSecondsRemaining}s left</span>
            </div>
          ) : battle.status === 'waiting_for_challenger' ? (
            <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[11px] animate-pulse">
              Awaiting Challenger
            </span>
          ) : battle.status === 'pending_submission' ? (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px]">
              Choosing Tracks
            </span>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Battle Concluded</span>
            </div>
          )}
        </div>

        {/* Contenders Arena (DJ 1 vs DJ 2) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* DJ 1 */}
          <div className={`p-3 rounded-xl border relative overflow-hidden ${
            battle.winner?.choice === 'dj1'
              ? 'bg-amber-950/40 border-amber-400 shadow-lg'
              : userVote === 'dj1'
              ? 'bg-zinc-800/90 border-[#1DB954]/60'
              : 'bg-zinc-900/70 border-white/10'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <img
                src={battle.dj1.user.avatar}
                alt={battle.dj1.user.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-500/50"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase text-amber-400 block">Lead DJ</span>
                <span className="text-xs font-bold text-white truncate block">{battle.dj1.user.name}</span>
              </div>
            </div>

            {/* Chosen Track Weapon */}
            {battle.dj1.track ? (
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Disc className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-white truncate">{battle.dj1.track.title}</span>
                </div>
                <div className="text-[9px] text-zinc-400 truncate">{battle.dj1.track.artist_name}</div>
                <div className="text-[9px] text-zinc-500 font-mono">{battle.dj1.track.bpm} BPM • {battle.dj1.track.key}</div>
              </div>
            ) : isDj1 ? (
              <button
                onClick={() => currentTrack && submitHumanSoundclashTrack(currentTrack)}
                className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase transition-all"
              >
                Equip Current Track
              </button>
            ) : (
              <span className="text-[10px] text-zinc-500 italic block py-2 text-center">Selecting track weapon...</span>
            )}

            {/* Voting Action */}
            {battle.status === 'active' && (
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono font-bold">{battle.dj1.votes} votes ({dj1Percentage}%)</span>
                <button
                  onClick={() => voteHumanSoundclash('dj1')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    userVote === 'dj1'
                      ? 'bg-[#1DB954] text-black shadow'
                      : 'bg-zinc-800 hover:bg-[#1DB954] hover:text-black text-white'
                  }`}
                >
                  {userVote === 'dj1' ? 'Voted' : 'Vote'}
                </button>
              </div>
            )}
          </div>

          {/* DJ 2 */}
          <div className={`p-3 rounded-xl border relative overflow-hidden ${
            battle.winner?.choice === 'dj2'
              ? 'bg-amber-950/40 border-amber-400 shadow-lg'
              : userVote === 'dj2'
              ? 'bg-zinc-800/90 border-[#1DB954]/60'
              : 'bg-zinc-900/70 border-white/10'
          }`}>
            {battle.dj2 ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={battle.dj2.user.avatar}
                    alt={battle.dj2.user.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-500/50"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase text-orange-400 block">Challenger</span>
                    <span className="text-xs font-bold text-white truncate block">{battle.dj2.user.name}</span>
                  </div>
                </div>

                {battle.dj2.track ? (
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Disc className="w-3 h-3 text-orange-400 shrink-0" />
                      <span className="text-[11px] font-bold text-white truncate">{battle.dj2.track.title}</span>
                    </div>
                    <div className="text-[9px] text-zinc-400 truncate">{battle.dj2.track.artist_name}</div>
                    <div className="text-[9px] text-zinc-500 font-mono">{battle.dj2.track.bpm} BPM • {battle.dj2.track.key}</div>
                  </div>
                ) : isDj2 ? (
                  <button
                    onClick={() => currentTrack && submitHumanSoundclashTrack(currentTrack)}
                    className="w-full py-1.5 px-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-black text-[10px] uppercase transition-all"
                  >
                    Equip Current Track
                  </button>
                ) : (
                  <span className="text-[10px] text-zinc-500 italic block py-2 text-center">Selecting track weapon...</span>
                )}

                {battle.status === 'active' && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold">{battle.dj2.votes} votes ({dj2Percentage}%)</span>
                    <button
                      onClick={() => voteHumanSoundclash('dj2')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        userVote === 'dj2'
                          ? 'bg-[#1DB954] text-black shadow'
                          : 'bg-zinc-800 hover:bg-[#1DB954] hover:text-black text-white'
                      }`}
                    >
                      {userVote === 'dj2' ? 'Voted' : 'Vote'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                <UserPlus className="w-6 h-6 text-orange-400 mb-1" />
                <span className="text-xs font-bold text-white mb-2">Challenger Slot Open</span>
                {!isDj1 && (
                  <button
                    onClick={() => joinHumanSoundclash()}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-black font-black text-xs uppercase shadow transition-all"
                  >
                    Step Up & Challenge
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Winner Banner */}
        {battle.status === 'ended' && battle.winner && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-300 font-bold flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>
              🏆 CHAMPION: {battle.winner.dj.name} won with &quot;{battle.winner.track?.title}&quot; ({battle.winner.votes} votes)!
            </span>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. RENDER AI CROWD CHOICE TRACK BATTLE (Standard Session)
  // ---------------------------------------------------------------------------
  if (!session) return null;
  const totalVotes = session.totalVotes || 0;
  const userVotedTrackId = session.votes[currentUserId];

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1E120A] via-[#161616] to-[#0E1A14] border border-amber-500/30 shadow-2xl text-white select-none my-2 space-y-3">
      {/* Header & Live Countdown */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1.5">
              <span>{session.title}</span>
            </h4>
            <span className="text-[10px] text-zinc-400">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} cast
            </span>
          </div>
        </div>

        {/* Status / Timer */}
        {session.status === 'active' ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{aiSecondsRemaining}s left</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Soundclash Ended</span>
          </div>
        )}
      </div>

      {/* Candidates List with Live Votes */}
      <div className="space-y-2">
        {session.candidates.map((candidate) => {
          const voteCount = candidate.votes || 0;
          const votePercentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isUserVote = userVotedTrackId === candidate.track.id;
          const isWinner = session.status === 'ended' && session.winnerTrackId === candidate.track.id;

          return (
            <div
              key={candidate.track.id}
              className={`p-2.5 rounded-xl transition-all relative overflow-hidden border ${
                isWinner
                  ? 'bg-amber-950/30 border-amber-400 shadow-lg'
                  : isUserVote
                  ? 'bg-zinc-800/90 border-[#1DB954]/50'
                  : 'bg-zinc-900/60 border-white/5 hover:bg-zinc-800/60'
              }`}
            >
              {session.status === 'active' && (
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/10 to-[#1DB954]/10 transition-all duration-300 pointer-events-none"
                  style={{ width: `${votePercentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src={candidate.track.image}
                    alt={candidate.track.title}
                    className="w-10 h-10 rounded-lg object-cover shadow flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h5 className="text-xs font-bold text-white truncate">{candidate.track.title}</h5>
                      {isWinner && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-400 text-black flex items-center gap-0.5">
                          <Trophy className="w-2.5 h-2.5" />
                          Winner
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">{candidate.track.artist_name}</p>
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono">
                      <span>{candidate.track.bpm} BPM</span>
                      <span>•</span>
                      <span className="text-[#1DB954]">{candidate.track.key}</span>
                      <span>•</span>
                      <span className="text-zinc-400 font-bold">{candidate.compatibilityScore}% Match</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-white font-mono block">
                      {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{votePercentage}%</span>
                  </div>

                  {session.status === 'active' && (
                    <button
                      onClick={() => voteInSoundclash(candidate.track.id)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 transition-all cursor-pointer ${
                        isUserVote
                          ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20'
                          : 'bg-zinc-800 hover:bg-[#1DB954] hover:text-black text-white'
                      }`}
                    >
                      {isUserVote ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                      <span>{isUserVote ? 'Voted' : 'Vote'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {session.status === 'ended' && session.winnerTrack ? (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-300 font-bold flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>
            Winner: &quot;{session.winnerTrack.title}&quot; added to the Party Queue!
          </span>
        </div>
      ) : (
        canControl && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => endSoundclash()}
              className="text-[10px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <StopCircle className="w-3 h-3" />
              <span>End Voting Early</span>
            </button>
          </div>
        )
      )}
    </div>
  );
};
