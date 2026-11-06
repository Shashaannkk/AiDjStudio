import React from 'react';
import { Sparkles, Activity, Zap, RefreshCw } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Visualizer } from '../common/Visualizer';

export const AIDJPanel: React.FC = () => {
  const {
    aiDjEnabled,
    toggleAiDj,
    aiDjStatus,
    transitionInsight,
    triggerAiTransition,
    isPlaying,
  } = usePlayerStore();

  return (
    <div className="p-4 rounded-xl bg-[#181818] border border-white/5 mb-4 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-white">AI DJ</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#1DB954] text-black">
            Beta
          </span>
        </div>

        {/* Compact Visualizer */}
        <div className="flex items-center gap-2">
          <Visualizer
            isPlaying={isPlaying && aiDjEnabled}
            barCount={6}
            height={16}
            color="#1DB954"
          />

          {/* Toggle Switch */}
          <button
            onClick={toggleAiDj}
            role="switch"
            aria-checked={aiDjEnabled}
            aria-label="Toggle AI DJ"
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
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

      {/* AI DJ Status & Insights */}
      {aiDjEnabled ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#B3B3B3] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#1DB954]" />
              Smart Auto-Mix:
            </span>
            <span className="text-white font-medium capitalize flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-ping" />
              {aiDjStatus}
            </span>
          </div>

          {transitionInsight && (
            <div className="p-2.5 rounded-lg bg-[#242424] border border-white/5 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#B3B3B3]">Compatibility</span>
                <span className="text-[#1DB954] font-bold">
                  {transitionInsight.compatibilityScore}% Match
                </span>
              </div>
              <div className="text-[#B3B3B3] truncate leading-tight">
                Next: <strong className="text-white">{transitionInsight.toTrackTitle}</strong>
              </div>
              <div className="text-[10px] text-white/70 italic bg-black/30 p-1.5 rounded">
                💡 {transitionInsight.suggestedAction}
              </div>
            </div>
          )}

          {/* Trigger Transition Button */}
          <button
            onClick={triggerAiTransition}
            disabled={aiDjStatus === 'mixing'}
            className="w-full py-1.5 px-3 rounded-md bg-[#282828] hover:bg-[#333333] text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/5 transition-colors disabled:opacity-50"
          >
            {aiDjStatus === 'mixing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1DB954]" />
                <span>Mixing Transition...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>Trigger Smooth Crossfade</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#B3B3B3] leading-relaxed">
          Enable AI DJ for automated beat-matching, intelligent key transitions, and mood-adaptive flow.
        </p>
      )}
    </div>
  );
};
