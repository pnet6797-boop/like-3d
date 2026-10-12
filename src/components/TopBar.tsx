import React from 'react';
import { Camera, CameraOff, Volume2, VolumeX, Camera as ScreenshotIcon, Sparkles } from 'lucide-react';
import { soundFX } from '../audio/soundFX';

interface TopBarProps {
  isCameraActive: boolean;
  onToggleCamera: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenGuide: () => void;
  onTakeScreenshot: () => void;
  activeTab: 'scene' | 'simulator';
  setActiveTab: (tab: 'scene' | 'simulator') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isCameraActive,
  onToggleCamera,
  soundEnabled,
  onToggleSound,
  onOpenGuide,
  onTakeScreenshot,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-8 px-6 py-3.5 border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2">
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span>AetherPulse 3D</span>
        </a>
      </div>

      {/* Zone 2: Concise single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={() => setActiveTab('scene')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'scene' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Interactive Canvas
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'simulator' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Virtual Controls
        </button>
        <button
          onClick={onOpenGuide}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5"
        >
          Gesture Manual
        </button>
        <button
          onClick={onToggleSound}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 pb-0.5"
          title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Audio On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-slate-500" />
              <span>Muted</span>
            </>
          )}
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onTakeScreenshot}
          title="Take 3D Snapshot"
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <ScreenshotIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleCamera}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            isCameraActive
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
              : 'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
          }`}
        >
          {isCameraActive ? (
            <>
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-slate-950" />
              <span>Track Hands</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
