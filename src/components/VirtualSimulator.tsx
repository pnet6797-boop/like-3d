import React from 'react';
import { ParticleConfig, GestureType } from '../types';
import { Sliders, Sparkles, Zap, Minimize2, Maximize2, RotateCcw } from 'lucide-react';

interface VirtualSimulatorProps {
  config: ParticleConfig;
  onUpdateConfig: (config: Partial<ParticleConfig>) => void;
  onSimulateGesture: (type: GestureType) => void;
  onReset: () => void;
}

export const VirtualSimulator: React.FC<VirtualSimulatorProps> = ({
  config,
  onUpdateConfig,
  onSimulateGesture,
  onReset,
}) => {
  return (
    <aside
      aria-label="Virtual gesture simulator and particle controls"
      className="fixed top-20 right-6 z-30 w-80 rounded-xl border border-white/10 bg-slate-950/85 backdrop-blur-md shadow-2xl p-4 flex flex-col gap-4 text-slate-200"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
            Dynamics & Simulator
          </h2>
        </div>
        <button
          onClick={onReset}
          title="Reset Parameters"
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* One-click gesture simulation trigger buttons */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-slate-400">Simulate Hand Gestures</span>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            onClick={() => onSimulateGesture('open_palm')}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-center gap-2 transition-colors"
          >
            <span>🖐️</span>
            <span>Open Palm</span>
          </button>
          <button
            onClick={() => onSimulateGesture('fist')}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-left flex items-center gap-2 transition-colors"
          >
            <span>✊</span>
            <span>Fist Charge</span>
          </button>
          <button
            onClick={() => onSimulateGesture('pinch')}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-center gap-2 transition-colors"
          >
            <span>🤏</span>
            <span>Pinch In</span>
          </button>
          <button
            onClick={() => onSimulateGesture('peace')}
            className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 text-left flex items-center gap-2 transition-colors"
          >
            <span>✌️</span>
            <span>Peace Morph</span>
          </button>
          <button
            onClick={() => onSimulateGesture('thumbs_up')}
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-200 text-left flex items-center gap-2 transition-colors"
          >
            <span>👍</span>
            <span>Cosmic Nova</span>
          </button>
          <button
            onClick={() => onSimulateGesture('pointing')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-left flex items-center gap-2 transition-colors"
          >
            <span>☝️</span>
            <span>Attractor</span>
          </button>
        </div>
      </div>

      {/* Real-time Fine-tuning Sliders */}
      <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
        {/* Expansion */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Expansion Factor</span>
            <span className="font-mono tabular-nums text-cyan-400">
              {config.expansion.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="3.0"
            step="0.05"
            value={config.expansion}
            onChange={(e) => onUpdateConfig({ expansion: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Color Charge */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Thermal Color Charge</span>
            <span className="font-mono tabular-nums text-amber-400">
              {(config.charge * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={config.charge}
            onChange={(e) => onUpdateConfig({ charge: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Turbulence */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Fluid Turbulence</span>
            <span className="font-mono tabular-nums text-slate-300">
              {config.turbulence.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.05"
            value={config.turbulence}
            onChange={(e) => onUpdateConfig({ turbulence: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>

        {/* Particle Point Size */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Particle Size</span>
            <span className="font-mono tabular-nums text-slate-300">
              {config.size.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.4"
            max="2.5"
            step="0.05"
            value={config.size}
            onChange={(e) => onUpdateConfig({ size: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>
      </div>
    </aside>
  );
};
