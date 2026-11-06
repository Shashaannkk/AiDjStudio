import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { MainContent } from './components/layout/MainContent';
import { RightPanel } from './components/layout/RightPanel';
import { PlaybackBar } from './components/layout/PlaybackBar';
import { LyricsModal } from './components/common/LyricsModal';
import { FullscreenVisualizer } from './components/common/FullscreenVisualizer';
import { AuthModal } from './components/auth/AuthModal';
import { usePlayerStore } from './store/usePlayerStore';

export const App: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { togglePlay, seekTo, currentTime, duration, setVolume, volume, toggleMute, currentTrack, toggleLike } =
    usePlayerStore();

  // Desktop keyboard shortcuts (Space for Play/Pause, Arrow keys for seek & volume)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'l' || e.key === 'L') {
        if (currentTrack) {
          e.preventDefault();
          toggleLike(currentTrack.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekTo, currentTime, duration, setVolume, volume, toggleMute, currentTrack, toggleLike]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white font-sans">
      {/* Upper Area: Sidebar + Main Content Feed + Right Panel */}
      <div className="flex flex-1 overflow-hidden pb-20">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center Content Column (TopNav + MainContent) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121212]">
          <TopNav />
          <MainContent />
        </div>

        {/* Right-Side Panel (AI DJ + Now Playing + Queue + Chat) */}
        <RightPanel />
      </div>

      {/* Persistent Bottom Playback Bar */}
      <PlaybackBar
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        isFullscreen={isFullscreen}
      />

      {/* Lyrics Drawer / Modal */}
      <LyricsModal />

      {/* Fullscreen Visualizer Overlay */}
      <FullscreenVisualizer
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
      />

      {/* 2-Sided Music-Inspired Auth Modal (Login / Create Account) */}
      <AuthModal />
    </div>
  );
};

export default App;
