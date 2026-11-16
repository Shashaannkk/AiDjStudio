import React from 'react';
import { PlusCircle, Compass, Radio } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Visualizer } from './Visualizer';

export const HeroBanner: React.FC = () => {
  const { setCurrentView, isPlaying, activeRoom } = usePlayerStore();

  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-[#0d2818] via-[#121212] to-[#0a1f14] border border-[#1DB954]/20 shadow-2xl">
      {/* Background Concert Crowd & Ambient Lighting Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1600&auto=format&fit=crop"
          alt="Concert Crowd"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity filter blur-[1px]"
        />
        {/* Dynamic Green Glow Radial Gradient */}
        <div className="absolute inset-0 bg-radial-gradient from-[#1DB954]/20 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 p-5 sm:p-8 md:p-10 flex flex-col justify-between max-w-2xl">
        {/* Active room live pill if active */}
        {activeRoom && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-xs font-bold w-fit mb-3">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Connected to room: {activeRoom.name}</span>
          </div>
        )}

        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none flex items-center gap-2">
            <span>AI</span>
            <span className="text-[#1DB954] drop-shadow-[0_0_20px_rgba(29,185,84,0.5)]">DJ</span>
            <span>Studio</span>
          </h1>

          <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white tracking-normal">
            Listen Together. Mix Smarter.
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#B3B3B3] leading-relaxed max-w-xl">
            Create or join live DJ rooms, let AI mix seamless transitions, and enjoy music with friends in real time.
          </p>
        </div>

        {/* Buttons & Live Visualizer */}
        <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            onClick={() => setCurrentView('rooms')}
            className="px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs sm:text-sm transition-all duration-200 transform hover:scale-105 shadow-lg shadow-[#1DB954]/30 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 fill-black stroke-black" />
            <span>Create a Room</span>
          </button>

          <button
            onClick={() => setCurrentView('rooms')}
            className="px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-black/40 hover:bg-black/60 text-white font-semibold text-xs sm:text-sm border border-white/20 hover:border-white/40 backdrop-blur-md transition-all duration-200 flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Rooms</span>
          </button>

          {/* Real-time ambient visualizer indicator */}
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-white/10">
            <Visualizer isPlaying={isPlaying} barCount={10} height={20} color="#1DB954" />
            <span className="text-xs text-[#B3B3B3] font-medium">Live Mix Audio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
