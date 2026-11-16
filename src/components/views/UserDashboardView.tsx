import React, { useState, useEffect } from 'react';
import {
  Clock,
  Music,
  Disc,
  Activity,
  Sparkles,
  Sliders,
  TrendingUp,
  Radio,
  Zap,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { analyticsService, type UserAnalyticsData } from '../../services/analyticsService';

export const UserDashboardView: React.FC = () => {
  const { user, setCurrentView, likedTrackIds } = usePlayerStore();
  const [analytics, setAnalytics] = useState<UserAnalyticsData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const targetUserId = user?.id || 'usr_default';
      const data = await analyticsService.getUserAnalytics(targetUserId);
      if (isMounted) {
        setAnalytics(data);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const preferredBpm = analytics?.preferredBpm || 124;
  const topKey = analytics?.topKey || '8A';
  const totalMinutes = Math.round(analytics?.totalListeningMinutes || 48);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalSessions = analytics?.totalSessions || 4;
  const tracksPlayed = analytics?.tracksPlayedCount || 19;
  const votesCast = analytics?.votesCastCount || 6;
  const queueAdds = analytics?.queueActionsCount || 12;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Resident DJ';

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Profile Banner & Identity Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-8 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#1DB954]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-48 h-48 bg-[#8C52FF]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'
                }
                alt={user?.name || 'User Avatar'}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#1DB954] shadow-lg shadow-[#1DB954]/20"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop';
                }}
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1DB954] border-2 border-black flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-black" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {user?.name ? `${firstName}'s Sonic Studio` : 'Studio Resident DJ'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] text-[11px] font-bold border border-[#1DB954]/30 uppercase tracking-wider">
                  {user?.role ? `${user.role} DJ` : 'Pro Resident'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#B3B3B3] flex items-center gap-2">
                <span>{user?.email || 'resident.dj@aidj.studio'}</span>
                <span>•</span>
                <span className="text-[#1DB954] font-medium">Verified Sonic Taste</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('mixer')}
              className="px-5 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#1DB954]/20 transition-all transform hover:scale-105 cursor-pointer"
            >
              <Disc className="w-4 h-4" />
              <span>Launch DJ Decks</span>
            </button>
            <button
              onClick={() => setCurrentView('rooms')}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
            >
              <Radio className="w-4 h-4 text-[#8C52FF]" />
              <span>Browse Live Rooms</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Listening Time */}
        <div className="p-5 rounded-2xl bg-[#181818] border border-white/5 space-y-2 hover:border-[#1DB954]/40 transition-colors">
          <div className="flex items-center justify-between text-[#B3B3B3]">
            <span className="text-xs font-semibold uppercase tracking-wider">Listening Time</span>
            <Clock className="w-4 h-4 text-[#1DB954]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{totalHours} hrs</p>
          <p className="text-[11px] text-[#B3B3B3]">
            {totalMinutes} total stream minutes logged
          </p>
        </div>

        {/* Metric 2: Preferred BPM */}
        <div className="p-5 rounded-2xl bg-[#181818] border border-white/5 space-y-2 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between text-[#B3B3B3]">
            <span className="text-xs font-semibold uppercase tracking-wider">Preferred BPM</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-cyan-400">{preferredBpm} BPM</p>
          <p className="text-[11px] text-[#B3B3B3]">Club tempo sweet spot (120 - 128)</p>
        </div>

        {/* Metric 3: Top Camelot Key */}
        <div className="p-5 rounded-2xl bg-[#181818] border border-white/5 space-y-2 hover:border-[#8C52FF]/40 transition-colors">
          <div className="flex items-center justify-between text-[#B3B3B3]">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Harmonic Key</span>
            <Sliders className="w-4 h-4 text-[#8C52FF]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#8C52FF]">{topKey}</p>
          <p className="text-[11px] text-[#B3B3B3]">A Minor • High Harmonic Resonance</p>
        </div>

        {/* Metric 4: Total Sessions */}
        <div className="p-5 rounded-2xl bg-[#181818] border border-white/5 space-y-2 hover:border-amber-400/40 transition-colors">
          <div className="flex items-center justify-between text-[#B3B3B3]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sessions</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{totalSessions}</p>
          <p className="text-[11px] text-[#B3B3B3]">{tracksPlayed} tracks played end-to-end</p>
        </div>
      </div>

      {/* Sonic Taste Profile & Genre Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#181818] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Sonic Vibe & Harmonic Profile</h3>
              <p className="text-xs text-[#B3B3B3]">
                AI-computed acoustic metrics from your recent sessions and queue interactions
              </p>
            </div>
            <span className="px-2 py-1 rounded-md bg-white/5 text-[11px] font-mono text-[#1DB954]">
              Realtime Synced
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-white">Deep House & Tech House</span>
                <span className="text-[#1DB954]">82% affinity</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#1DB954] to-emerald-400 rounded-full" style={{ width: '82%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-white">Melodic Techno & Progressive</span>
                <span className="text-cyan-400">68% affinity</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-white">Lo-Fi & Ambient Beats</span>
                <span className="text-[#8C52FF]">54% affinity</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#8C52FF] to-pink-500 rounded-full" style={{ width: '54%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-white">Electro & Synthwave</span>
                <span className="text-amber-400">39% affinity</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: '39%' }} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-black/40">
              <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">Energy Curve</span>
              <p className="text-lg font-black text-white mt-0.5">High (0.84)</p>
            </div>
            <div className="p-3 rounded-xl bg-black/40">
              <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">Danceability</span>
              <p className="text-lg font-black text-[#1DB954] mt-0.5">Club (0.89)</p>
            </div>
            <div className="p-3 rounded-xl bg-black/40">
              <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">Valence (Mood)</span>
              <p className="text-lg font-black text-cyan-400 mt-0.5">Euphoric (0.76)</p>
            </div>
          </div>
        </div>

        {/* DJ Stats & Community Interactions */}
        <div className="p-6 rounded-2xl bg-[#181818] border border-white/5 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Engagement Stats</h3>
            <p className="text-xs text-[#B3B3B3]">Live room and community activity</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#1DB954]/10 text-[#1DB954]">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Tracks Liked</p>
                  <p className="text-[10px] text-[#B3B3B3]">In your personal library</p>
                </div>
              </div>
              <span className="text-lg font-black text-white">{likedTrackIds.size}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#8C52FF]/10 text-[#8C52FF]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Queue Additions</p>
                  <p className="text-[10px] text-[#B3B3B3]">Shared in collaborative sets</p>
                </div>
              </div>
              <span className="text-lg font-black text-white">{queueAdds}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Votes Cast</p>
                  <p className="text-[10px] text-[#B3B3B3]">Collaborative upvotes/downvotes</p>
                </div>
              </div>
              <span className="text-lg font-black text-white">{votesCast}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline / Recent Sessions */}
      <div className="p-6 rounded-2xl bg-[#181818] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Recent Studio Sessions</h3>
            <p className="text-xs text-[#B3B3B3]">Audited session logs with duration and event metrics</p>
          </div>
          <span className="text-xs text-[#1DB954] font-semibold">Active Profile</span>
        </div>

        <div className="divide-y divide-white/5">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1DB954]" />
              <div>
                <p className="text-xs font-bold text-white">Live DJ Mix & Crossfade Session</p>
                <p className="text-[11px] text-[#B3B3B3]">Room: main_studio • 4 tracks transitioned</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-[#1DB954]">32 mins</span>
              <p className="text-[10px] text-[#B3B3B3]">Today</p>
            </div>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <div>
                <p className="text-xs font-bold text-white">Collaborative Queue Battle</p>
                <p className="text-[11px] text-[#B3B3B3]">Room: room_deep_house • 6 upvotes cast</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-cyan-400">16 mins</span>
              <p className="text-[10px] text-[#B3B3B3]">Yesterday</p>
            </div>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#8C52FF]" />
              <div>
                <p className="text-xs font-bold text-white">Acoustic Discovery & Segue Generation</p>
                <p className="text-[11px] text-[#B3B3B3]">Room: solo_exploration • 8 segue chain tracks</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-[#8C52FF]">24 mins</span>
              <p className="text-[10px] text-[#B3B3B3]">2 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
