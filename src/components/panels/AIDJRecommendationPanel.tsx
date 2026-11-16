import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Check,
  X,
  Play,
  Activity,
  Info,
  Radio,
  Music2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Volume2,
  Bot,
  Layers,
  ArrowRight,
  ListMusic,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { MOOD_PROFILES, recommendationEngine } from '../../services/recommendationEngine';
import type { MoodId, RecommendationCandidate } from '../../types/recommendation';
import { Visualizer } from '../common/Visualizer';

export const AIDJRecommendationPanel: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    aiDjEnabled,
    toggleAiDj,
    activeRecommendation,
    selectedMood,
    setSelectedMood,
    acceptRecommendation,
    rejectRecommendation,
    autoQueueAiTracks,
    toggleAutoQueueAiTracks,
    activeRoom,
    roomRole,
    addToQueue,
    addTrackToRoomQueue,
    playTrack,
    queue,
    roomQueue,
    history,
    likedTrackIds,
    skippedTrackIds,
    rejectedTrackIds,
    setRightPanelView,
  } = usePlayerStore();

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showSegueChain, setShowSegueChain] = useState(false);

  // Compute 3 runner-up alternative recommendations
  const activeQueue = activeRoom ? roomQueue : queue;
  const alternatives: RecommendationCandidate[] = React.useMemo(() => {
    if (!currentTrack) return [];
    const all = recommendationEngine.recommend({
      currentTrack,
      queue: activeQueue,
      history,
      likedTrackIds,
      skippedTrackIds,
      rejectedTrackIds,
      mood: selectedMood,
      limit: 4,
    });
    // Skip the primary recommendation
    return all.slice(1, 4);
  }, [currentTrack, activeQueue, history, likedTrackIds, skippedTrackIds, rejectedTrackIds, selectedMood]);

  // Generate Multi-Track Harmonic Segue Chain
  const segueChain = React.useMemo(() => {
    if (!currentTrack) return null;
    return recommendationEngine.generateSegueChain(currentTrack, 3, {
      mood: selectedMood,
      excludedIds: new Set(activeQueue.map((t) => t.id)),
    });
  }, [currentTrack, selectedMood, activeQueue]);

  const handleQueueEntireChain = () => {
    if (!segueChain) return;
    const newTracks = segueChain.chain.slice(1);
    for (const t of newTracks) {
      if (isRoomActive) {
        addTrackToRoomQueue(t);
      } else {
        addToQueue(t);
      }
    }
  };

  const candidate = activeRecommendation;
  const isRoomActive = Boolean(activeRoom);
  const canControlRoom = !isRoomActive || roomRole === 'host' || roomRole === 'co-dj';

  const formatDuration = (sec?: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#1DB954] border-[#1DB954]/40 bg-[#1DB954]/10';
    if (score >= 80) return 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10';
    if (score >= 70) return 'text-amber-400 border-amber-400/40 bg-amber-400/10';
    return 'text-rose-400 border-rose-400/40 bg-rose-400/10';
  };

  const getBarColor = (score: number) => {
    if (score >= 90) return 'bg-[#1DB954]';
    if (score >= 80) return 'bg-cyan-400';
    if (score >= 70) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="flex flex-col gap-4 text-white select-none pb-6">
      {/* AI Assistant Quick Nav Banner */}
      <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-cyan-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-[11px] text-zinc-200 truncate font-medium">Want tailored mixes, BPM match, or playlists?</span>
        </div>
        <button
          type="button"
          onClick={() => setRightPanelView('assistant')}
          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#1DB954] to-cyan-400 text-black text-[10px] font-black shrink-0 hover:scale-105 transition-all cursor-pointer shadow"
        >
          Ask Assistant
        </button>
      </div>

      {/* 1. Header & AI Master Controls */}
      <div className="p-3.5 rounded-xl bg-[#181818] border border-white/5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">AI DJ Engine</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-[#1DB954] text-black">
                  v3.0
                </span>
              </div>
              <p className="text-[10px] text-[#B3B3B3]">Real-time metadata & harmonic matching</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Visualizer
              isPlaying={isPlaying && aiDjEnabled}
              barCount={5}
              height={14}
              color="#1DB954"
            />
            {/* Main AI DJ toggle */}
            <button
              onClick={toggleAiDj}
              role="switch"
              aria-checked={aiDjEnabled}
              aria-label="Toggle AI DJ"
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                aiDjEnabled ? 'bg-[#1DB954]' : 'bg-[#333333]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  aiDjEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Auto-Drop Resident DJ toggle */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs">
          <span className="text-[#B3B3B3] flex items-center gap-1.5 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>Auto-Queue Next Recommendation:</span>
          </span>
          <button
            onClick={toggleAutoQueueAiTracks}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
              autoQueueAiTracks ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40' : 'bg-[#282828] text-[#888888]'
            }`}
          >
            {autoQueueAiTracks ? 'ON (Continuous Flow)' : 'OFF (Manual Pick)'}
          </button>
        </div>
      </div>

      {/* 2. Currently Playing Anchor Context */}
      {currentTrack && (
        <div className="p-3 rounded-xl bg-[#141414] border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-[#B3B3B3]">
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#1DB954]">
              <Volume2 className="w-3 h-3" />
              <span>Mixing From</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {currentTrack.genre || 'Electronic / Pop'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <img
              src={currentTrack.image}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-md object-cover flex-shrink-0 shadow"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
              <p className="text-[11px] text-[#B3B3B3] truncate">{currentTrack.artist_name}</p>
            </div>
          </div>

          {/* Current track DJ telemetry badges */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
            <div className="px-2 py-1 rounded bg-[#1C1C1C] text-center border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase">Tempo</span>
              <strong className="text-white font-mono">{currentTrack.bpm || 124} BPM</strong>
            </div>
            <div className="px-2 py-1 rounded bg-[#1C1C1C] text-center border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase">Harmonic Key</span>
              <strong className="text-[#1DB954] font-mono">{currentTrack.key || '8A / A Min'}</strong>
            </div>
            <div className="px-2 py-1 rounded bg-[#1C1C1C] text-center border border-white/5">
              <span className="text-zinc-500 block text-[9px] uppercase">Energy</span>
              <strong className="text-white font-mono">{currentTrack.energy || 80}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. Mood / Vibe Selector Carousel */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1">
            <Sliders className="w-3 h-3 text-[#1DB954]" />
            <span>Target Mood & Vibe</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">
            {MOOD_PROFILES[selectedMood]?.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {(Object.keys(MOOD_PROFILES) as MoodId[]).map((moodKey) => {
            const profile = MOOD_PROFILES[moodKey];
            const isSelected = selectedMood === moodKey;
            return (
              <button
                key={moodKey}
                onClick={() => setSelectedMood(moodKey)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1DB954] text-black shadow-md font-bold'
                    : 'bg-[#1F1F1F] text-[#B3B3B3] hover:text-white hover:bg-[#282828] border border-white/5'
                }`}
              >
                <span>{profile.emoji}</span>
                <span>{profile.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Top Recommendation Card */}
      {candidate ? (
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#202020] to-[#161616] border border-white/10 shadow-lg flex flex-col gap-3">
          {/* Top Banner: Score & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                Best Compatible Match
              </span>
            </div>

            <div
              className={`px-2 py-0.5 rounded-full border text-xs font-extrabold flex items-center gap-1 ${getScoreColor(
                candidate.score.overall
              )}`}
            >
              <span>{candidate.score.overall}% Match</span>
            </div>
          </div>

          {/* Candidate Track Info */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-black/40 border border-white/5">
            <img
              src={candidate.track.image}
              alt={candidate.track.title}
              className="w-14 h-14 rounded-lg object-cover shadow flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-white/10 text-zinc-300">
                  {candidate.track.provider || 'Jamendo'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {formatDuration(candidate.track.duration)}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white truncate leading-tight">
                {candidate.track.title}
              </h3>
              <p className="text-xs text-[#B3B3B3] truncate">{candidate.track.artist_name}</p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-mono">
                <span>{candidate.track.bpm || 120} BPM</span>
                <span>•</span>
                <span className="text-[#1DB954] font-semibold">{candidate.track.key || '8A'}</span>
                <span>•</span>
                <span>{candidate.track.energy || 75}% Energy</span>
              </div>
            </div>
          </div>

          {/* Deterministic Score Breakdown Progress Bars */}
          <div className="space-y-1.5 pt-1 text-[11px]">
            {/* Harmonic */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-[#B3B3B3] flex items-center gap-1">
                  <span>🎵 Harmonic Alignment (30%)</span>
                </span>
                <span className="font-mono text-white font-bold">{candidate.score.harmonic}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getBarColor(candidate.score.harmonic)}`}
                  style={{ width: `${candidate.score.harmonic}%` }}
                />
              </div>
            </div>

            {/* BPM */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-[#B3B3B3] flex items-center gap-1">
                  <span>⏱️ BPM Tempo Sync (25%)</span>
                </span>
                <span className="font-mono text-white font-bold">{candidate.score.bpm}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getBarColor(candidate.score.bpm)}`}
                  style={{ width: `${candidate.score.bpm}%` }}
                />
              </div>
            </div>

            {/* Energy */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-[#B3B3B3] flex items-center gap-1">
                  <span>⚡ Energy Trajectory (20%)</span>
                </span>
                <span className="font-mono text-white font-bold">{candidate.score.energy}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getBarColor(candidate.score.energy)}`}
                  style={{ width: `${candidate.score.energy}%` }}
                />
              </div>
            </div>

            {/* Genre */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-[#B3B3B3] flex items-center gap-1">
                  <span>🎷 Genre Affinity (15%)</span>
                </span>
                <span className="font-mono text-white font-bold">{candidate.score.genre}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getBarColor(candidate.score.genre)}`}
                  style={{ width: `${candidate.score.genre}%` }}
                />
              </div>
            </div>
          </div>

          {/* DJ Reasoning & Transition Technique */}
          <div className="p-2.5 rounded-lg bg-[#141414] border border-white/5 space-y-1.5 text-[11px]">
            <div className="text-[10px] font-bold text-[#1DB954] flex items-center gap-1 uppercase">
              <Activity className="w-3 h-3" />
              <span>Recommended Transition Technique:</span>
            </div>
            <p className="text-white font-medium text-xs leading-snug">
              {candidate.explanation.suggestedMixTechnique}
            </p>

            <div className="text-[10px] text-zinc-300 bg-black/40 p-2 rounded leading-relaxed space-y-1">
              <div>💡 <strong>Harmonics:</strong> {candidate.explanation.harmonicAnalysis}</div>
              <div>⚡ <strong>Tempo:</strong> {candidate.explanation.bpmAnalysis}</div>
              {candidate.explanation.userContext && (
                <div className="text-[#1DB954] font-semibold pt-0.5">
                  ✓ {candidate.explanation.userContext}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Accept / Reject / Instant Play */}
          <div className="flex items-center gap-2 pt-1">
            {/* Accept / Queue */}
            <button
              onClick={() => acceptRecommendation(candidate)}
              disabled={isRoomActive && !canControlRoom}
              className="flex-1 py-2 px-3 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isRoomActive ? 'Accept to Party Queue' : 'Queue Next'}</span>
            </button>

            {/* Play Immediately */}
            <button
              onClick={() => playTrack(candidate.track)}
              disabled={isRoomActive && !canControlRoom}
              aria-label="Play Recommended Track Now"
              title="Play Now"
              className="p-2 rounded-xl bg-[#282828] hover:bg-[#333333] text-white transition-colors border border-white/5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
            </button>

            {/* Reject / Try Another */}
            <button
              onClick={() => rejectRecommendation(candidate.track.id)}
              aria-label="Reject recommendation"
              title="Pass & show next recommendation"
              className="py-2 px-3 rounded-xl bg-[#282828] hover:bg-rose-950/40 hover:text-rose-400 text-zinc-400 font-bold text-xs flex items-center justify-center gap-1 transition-colors border border-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Pass</span>
            </button>
          </div>

          {/* Room permission notice if listener */}
          {isRoomActive && !canControlRoom && (
            <div className="text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1 italic">
              <Radio className="w-3 h-3 text-zinc-500" />
              <span>Listening mode in party room. Host or Co-DJ controls queuing.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl bg-[#181818] border border-white/5 text-zinc-400 text-xs flex flex-col items-center gap-2">
          <Music2 className="w-8 h-8 opacity-30 text-[#1DB954]" />
          <span>No recommendations found for this mood filter.</span>
          <button
            onClick={() => setSelectedMood('all')}
            className="mt-2 px-3 py-1 rounded-full bg-[#1DB954] text-black font-bold text-xs cursor-pointer"
          >
            Reset to All Vibes
          </button>
        </div>
      )}

      {/* 5. Runner-Up Alternative Tracks Accordion */}
      {alternatives.length > 0 && (
        <div className="rounded-xl bg-[#141414] border border-white/5 overflow-hidden">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[#1DB954] font-mono">+{alternatives.length}</span>
              <span>Alternative High-Compatibility Tracks</span>
            </div>
            {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAlternatives && (
            <div className="p-2 pt-0 space-y-1.5 border-t border-white/5">
              {alternatives.map((alt) => (
                <div
                  key={alt.track.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#1C1C1C] hover:bg-[#222222] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={alt.track.image}
                      alt={alt.track.title}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{alt.track.title}</div>
                      <div className="text-[10px] text-[#B3B3B3] truncate flex items-center gap-1">
                        <span>{alt.track.artist_name}</span>
                        <span>•</span>
                        <span className="text-[#1DB954] font-mono">{alt.track.bpm} BPM</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#1DB954] font-mono">
                      {alt.score.overall}%
                    </span>
                    <button
                      onClick={() => acceptRecommendation(alt)}
                      aria-label={`Queue ${alt.track.title}`}
                      className="p-1 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954] hover:text-black text-[#1DB954] transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Harmonic Segue Chain (3-Track DJ Flow) */}
      {segueChain && segueChain.steps.length > 0 && (
        <div className="rounded-xl bg-[#141414] border border-emerald-500/30 overflow-hidden shadow-lg">
          <button
            onClick={() => setShowSegueChain(!showSegueChain)}
            className="w-full flex items-center justify-between p-3 font-bold text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer bg-[#181818]"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Harmonic Segue Flow ({segueChain.chain.length}-Track Chain)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                {segueChain.averageScore}% Avg
              </span>
            </div>
            {showSegueChain ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSegueChain && (
            <div className="p-3 space-y-3 border-t border-white/5">
              <p className="text-[10px] text-zinc-400">
                Automated multi-track pathfinding using Camelot wheel modulations and strict &plusmn;8% BPM tempo alignment.
              </p>

              <div className="space-y-2">
                {segueChain.chain.map((tr, idx) => (
                  <div key={tr.id} className="space-y-1">
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900 border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={tr.image}
                        alt={tr.title}
                        className="w-8 h-8 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{tr.title}</div>
                        <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5">
                          <span>{tr.artist_name}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono">{tr.bpm} BPM</span>
                          <span>•</span>
                          <span className="text-cyan-400 font-mono">Key {tr.key || '8A'}</span>
                        </div>
                      </div>
                    </div>

                    {idx < segueChain.steps.length && (
                      <div className="flex items-center gap-2 pl-6 py-0.5 text-[9px] text-zinc-500 font-mono">
                        <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-bold">{segueChain.steps[idx].harmonicRelationship}</span>
                        <span>•</span>
                        <span>&Delta;{segueChain.steps[idx].bpmDelta} BPM</span>
                        <span>•</span>
                        <span className="text-zinc-400">{segueChain.steps[idx].suggestedMixTechnique}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleQueueEntireChain}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg"
              >
                <ListMusic className="w-4 h-4" />
                <span>Queue Entire Chain (+{segueChain.chain.length - 1} Tracks)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 7. Scoring System Transparency Card */}
      <div className="rounded-xl bg-[#121212] border border-white/5 p-3 text-[11px] text-[#B3B3B3]">
        <button
          onClick={() => setShowScoreModal(!showScoreModal)}
          className="w-full flex items-center justify-between font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>How Compatibility Score is Calculated</span>
          </span>
          {showScoreModal ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showScoreModal && (
          <div className="mt-2.5 pt-2 border-t border-white/5 space-y-2 text-[10px] text-zinc-400 leading-relaxed font-mono">
            <p>
              The AI DJ engine uses the PRD deterministic formula weighing 3 core dimensions:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-white">Harmonic Compatibility (50%):</strong> Camelot Wheel mathematical matching (Exact Key: 100%, Relative Maj/Min: 96%, +1 Energy Boost: 93%, -1 Mellow: 90%).</li>
              <li><strong className="text-white">Energy Fit (30%):</strong> Assesses dancefloor trajectory, build/mellow transitions, and active Mood profiles.</li>
              <li><strong className="text-white">Recency & Affinity (20%):</strong> Prioritizes session flow, freshness, Liked Songs (+10%), and penalizes repeat plays and skips.</li>
            </ul>
            <div className="p-1.5 rounded bg-black/40 text-[#1DB954] border border-[#1DB954]/20">
              Strict Gate: &plusmn;8% BPM Eligibility Filter (with half-time and double-time compatibility) hard-disqualifies non-compliant tempos before scoring.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

