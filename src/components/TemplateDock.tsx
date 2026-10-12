import React from 'react';
import { ParticleTemplateType, ColorPaletteType } from '../types';
import { Heart, Flower2, Orbit, Sparkles, Disc, Flame, Compass, Dna } from 'lucide-react';

interface TemplateDockProps {
  currentTemplate: ParticleTemplateType;
  onSelectTemplate: (template: ParticleTemplateType) => void;
  currentPalette: ColorPaletteType;
  onSelectPalette: (palette: ColorPaletteType) => void;
  expansion: number;
  charge: number;
  onTriggerBurst: () => void;
}

const TEMPLATES: Array<{
  id: ParticleTemplateType;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'heart', label: 'Heart', icon: <Heart className="w-3.5 h-3.5" /> },
  { id: 'flower', label: 'Flower', icon: <Flower2 className="w-3.5 h-3.5" /> },
  { id: 'saturn', label: 'Saturn', icon: <Orbit className="w-3.5 h-3.5" /> },
  { id: 'fireworks', label: 'Fireworks', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'galaxy', label: 'Galaxy', icon: <Disc className="w-3.5 h-3.5" /> },
  { id: 'blackhole', label: 'Black Hole', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'torus', label: 'Torus Knot', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'dna', label: 'DNA Helix', icon: <Dna className="w-3.5 h-3.5" /> },
];

const PALETTES: Array<{
  id: ColorPaletteType;
  label: string;
  preview: string[];
}> = [
  { id: 'hyperborea', label: 'Hyperborea', preview: ['#38bdf8', '#818cf8', '#f43f5e'] },
  { id: 'supernova', label: 'Supernova', preview: ['#ff2a6d', '#ff6b35', '#fffa65'] },
  { id: 'cyberpunk', label: 'Cyberpunk', preview: ['#05d9e8', '#ff2a6d', '#005670'] },
  { id: 'bioluminescence', label: 'Biolum', preview: ['#00f5d4', '#00bbf9', '#7b2cbf'] },
  { id: 'amethyst', label: 'Amethyst', preview: ['#d8b4fe', '#9333ea', '#ec4899'] },
  { id: 'celestial', label: 'Celestial', preview: ['#e0f2fe', '#38bdf8', '#fbbf24'] },
];

export const TemplateDock: React.FC<TemplateDockProps> = ({
  currentTemplate,
  onSelectTemplate,
  currentPalette,
  onSelectPalette,
  expansion,
  charge,
  onTriggerBurst,
}) => {
  return (
    <div className="fixed bottom-6 left-6 z-30 flex flex-col gap-2 max-w-xl">
      {/* Template selector pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-2xl">
        {TEMPLATES.map((tmpl) => {
          const isActive = currentTemplate === tmpl.id;
          return (
            <button
              key={tmpl.id}
              onClick={() => onSelectTemplate(tmpl.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span>{tmpl.icon}</span>
              <span>{tmpl.label}</span>
            </button>
          );
        })}
      </div>

      {/* Palette selector & Live Telemetry bar */}
      <div className="flex items-center justify-between gap-4 px-3.5 py-2 rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-2xl">
        {/* Color Palettes */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Palette</span>
          <div className="flex items-center gap-1">
            {PALETTES.map((pal) => {
              const isActive = currentPalette === pal.id;
              return (
                <button
                  key={pal.id}
                  onClick={() => onSelectPalette(pal.id)}
                  title={pal.label}
                  className={`flex items-center p-1 rounded-md transition-all ${
                    isActive
                      ? 'bg-white/15 ring-1 ring-cyan-400'
                      : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex w-4 h-4 rounded-full overflow-hidden border border-white/20">
                    {pal.preview.map((color, i) => (
                      <span key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Telemetry Metrics (Unboxed, tabular numerals) */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Expansion</span>
            <span className="font-mono tabular-nums text-cyan-300 font-semibold">
              {(expansion).toFixed(2)}x
            </span>
          </div>

          <span aria-hidden="true" className="text-white/20">·</span>

          <div className="flex items-center gap-1.5">
            <span>Charge</span>
            <span
              className={`font-mono tabular-nums font-semibold ${
                charge > 0.5 ? 'text-amber-300 animate-pulse' : 'text-slate-300'
              }`}
            >
              {(charge * 100).toFixed(0)}%
            </span>
          </div>

          <span aria-hidden="true" className="text-white/20">·</span>

          <button
            onClick={onTriggerBurst}
            className="px-2.5 py-0.5 text-[11px] font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/60 rounded transition-colors"
          >
            Burst Pulse
          </button>
        </div>
      </div>
    </div>
  );
};
