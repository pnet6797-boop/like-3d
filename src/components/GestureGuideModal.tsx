import React from 'react';
import { X, Hand, Sparkles } from 'lucide-react';

interface GestureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GestureGuideModal: React.FC<GestureGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const gestures = [
    {
      emoji: '🖐️',
      name: 'Open Palm',
      action: 'Particle Expansion',
      description: 'Spread your fingers wide to push particles outward in an expansive cosmic bloom.',
    },
    {
      emoji: '🤏',
      name: 'Pinch Fingers',
      action: 'Singularity Condensation',
      description: 'Bring thumb and index finger together to collapse particles into a dense core.',
    },
    {
      emoji: '✊',
      name: 'Closed Fist',
      action: 'Thermal Color Charge',
      description: 'Hold a tight fist to accumulate energy. Particles heat into incandescent plasma white glow.',
    },
    {
      emoji: '✌️',
      name: 'Peace / V-Sign',
      action: 'Morph Template',
      description: 'Raise index and middle fingers to trigger seamless morphing into the next 3D template.',
    },
    {
      emoji: '👍',
      name: 'Thumbs Up',
      action: 'Cosmic Nova Burst',
      description: 'Point your thumb upward to detonate a hyper-velocity fireworks shockwave.',
    },
    {
      emoji: '☝️',
      name: 'Pointing Index',
      action: '3D Attractor Field',
      description: 'Extend only index finger. The particle system will be gravitationally pulled towards your fingertip.',
    },
    {
      emoji: '🫱🫲',
      name: 'Two Hands',
      action: 'Spatial Dual Vortex',
      description: 'Bring both hands into view to stretch the entire 3D matrix and zoom the camera.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden text-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Hand Gesture Command Reference</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
          {gestures.map((g, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="text-3xl shrink-0 w-10 text-center">{g.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-white">{g.name}</h3>
                  <span className="text-xs text-cyan-400 font-medium">{g.action}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{g.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/50 flex justify-between items-center text-xs text-slate-400">
          <span>Camera works locally in your browser with zero data uploaded.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
