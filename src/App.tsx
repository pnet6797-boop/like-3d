/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ParticleConfig, ParticleTemplateType, ColorPaletteType, GestureData, GestureType } from './types';
import { ParticleEngine } from './three/particleEngine';
import { CameraTracker } from './components/CameraTracker';
import { TopBar } from './components/TopBar';
import { TemplateDock } from './components/TemplateDock';
import { VirtualSimulator } from './components/VirtualSimulator';
import { GestureGuideModal } from './components/GestureGuideModal';
import { soundFX } from './audio/soundFX';

const TEMPLATE_ORDER: ParticleTemplateType[] = [
  'heart',
  'flower',
  'saturn',
  'fireworks',
  'galaxy',
  'blackhole',
  'torus',
  'dna',
];

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);

  // App & Particle Config State
  const [config, setConfig] = useState<ParticleConfig>({
    count: 24000,
    size: 1.15,
    speed: 1.0,
    turbulence: 0.45,
    expansion: 1.0,
    charge: 0.0,
    template: 'saturn',
    palette: 'hyperborea',
    bloomIntensity: 1.2,
    soundEnabled: true,
    trailEnabled: true,
  });

  // Camera & Tracking State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [activeGesture, setActiveGesture] = useState<GestureData>({
    type: 'idle',
    confidence: 0,
    handCount: 0,
    expansion: 1.0,
    charge: 0.0,
    handPosition: { x: 0, y: 0, z: 0 },
    pinchDistance: 1.0,
    isTwoHands: false,
    rotationDelta: { x: 0, y: 0 },
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'scene' | 'simulator'>('scene');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [hintVisible, setHintVisible] = useState<boolean>(true);

  // Initialize Three.js particle engine
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const engine = new ParticleEngine(canvasContainerRef.current, config);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Cycle to next template
  const handleNextTemplate = useCallback(() => {
    setConfig((prev) => {
      const curIndex = TEMPLATE_ORDER.indexOf(prev.template);
      const nextIndex = (curIndex + 1) % TEMPLATE_ORDER.length;
      const nextTemplate = TEMPLATE_ORDER[nextIndex];
      if (engineRef.current) {
        engineRef.current.switchTemplate(nextTemplate);
      }
      soundFX.playTemplateSwitch();
      return { ...prev, template: nextTemplate };
    });
  }, []);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: ParticleTemplateType) => {
    setConfig((prev) => {
      if (engineRef.current) {
        engineRef.current.switchTemplate(template);
      }
      soundFX.playTemplateSwitch();
      return { ...prev, template };
    });
  }, []);

  // Handle palette selection
  const handleSelectPalette = useCallback((palette: ColorPaletteType) => {
    setConfig((prev) => {
      if (engineRef.current) {
        engineRef.current.switchPalette(palette);
      }
      return { ...prev, palette };
    });
  }, []);

  // Trigger cosmic burst
  const handleTriggerBurst = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerBurst(10.0);
    }
    soundFX.playExplosion();
  }, []);

  // Update dynamic config from sliders
  const handleUpdateConfig = useCallback((newConfig: Partial<ParticleConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      if (engineRef.current) {
        engineRef.current.updateConfig(updated);
      }
      return updated;
    });
  }, []);

  // Simulate gestures programmatically (for users without camera)
  const handleSimulateGesture = useCallback((type: GestureType) => {
    if (!engineRef.current) return;

    switch (type) {
      case 'open_palm':
        handleUpdateConfig({ expansion: 1.85, charge: 0.1 });
        soundFX.playWhoosh();
        break;
      case 'fist':
        handleUpdateConfig({ charge: 1.0, expansion: 0.8 });
        soundFX.updateChargeHum(1.0);
        setTimeout(() => soundFX.updateChargeHum(0.0), 1200);
        break;
      case 'pinch':
        handleUpdateConfig({ expansion: 0.35, charge: 0.0 });
        break;
      case 'peace':
        handleNextTemplate();
        break;
      case 'thumbs_up':
        handleTriggerBurst();
        break;
      case 'pointing':
        if (engineRef.current) {
          engineRef.current.attractorPos = new THREE.Vector3(0, 0, 0);
          setTimeout(() => {
            if (engineRef.current) engineRef.current.attractorPos = null;
          }, 1500);
        }
        break;
      default:
        break;
    }
  }, [handleNextTemplate, handleTriggerBurst, handleUpdateConfig]);

  // Reset parameters to defaults
  const handleResetParameters = useCallback(() => {
    handleUpdateConfig({
      expansion: 1.0,
      charge: 0.0,
      turbulence: 0.45,
      size: 1.15,
    });
    if (engineRef.current) {
      engineRef.current.handExpansion = 1.0;
      engineRef.current.handCharge = 0.0;
      engineRef.current.attractorPos = null;
    }
    soundFX.updateChargeHum(0.0);
  }, [handleUpdateConfig]);

  // Handle incoming camera hand gestures
  const handleGestureUpdate = useCallback((data: GestureData) => {
    setActiveGesture(data);

    if (engineRef.current) {
      engineRef.current.handExpansion = data.expansion;
      engineRef.current.handCharge = data.charge;
      engineRef.current.handRotationDelta = data.rotationDelta;

      // Pointing gesture sets attractor
      if (data.type === 'pointing') {
        engineRef.current.attractorPos = new THREE.Vector3(
          data.handPosition.x * 24,
          data.handPosition.y * 24,
          data.handPosition.z * 10
        );
      } else {
        engineRef.current.attractorPos = null;
      }
    }

    // Update charging sound hum
    if (config.soundEnabled) {
      soundFX.updateChargeHum(data.charge);
    }
  }, [config.soundEnabled]);

  // Take screenshot and trigger download
  const handleTakeScreenshot = useCallback(() => {
    if (!engineRef.current) return;
    const dataUrl = engineRef.current.captureScreenshot();
    const link = document.createElement('a');
    link.download = `aetherpulse-${config.template}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [config.template]);

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    setConfig((prev) => {
      const nextState = !prev.soundEnabled;
      soundFX.enabled = nextState;
      if (!nextState) {
        soundFX.updateChargeHum(0);
      }
      return { ...prev, soundEnabled: nextState };
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Layer */}
      <div ref={canvasContainerRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* Semantic DOM Top Bar Contract */}
      <TopBar
        isCameraActive={isCameraActive}
        onToggleCamera={() => setIsCameraActive((prev) => !prev)}
        soundEnabled={config.soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenGuide={() => setIsGuideOpen(true)}
        onTakeScreenshot={handleTakeScreenshot}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Bottom Template & Palette Dock */}
      <TemplateDock
        currentTemplate={config.template}
        onSelectTemplate={handleSelectTemplate}
        currentPalette={config.palette}
        onSelectPalette={handleSelectPalette}
        expansion={config.expansion * activeGesture.expansion}
        charge={Math.max(config.charge, activeGesture.charge)}
        onTriggerBurst={handleTriggerBurst}
      />

      {/* Camera Hand Tracker PIP HUD */}
      <CameraTracker
        isCameraActive={isCameraActive}
        setIsCameraActive={setIsCameraActive}
        onGestureUpdate={handleGestureUpdate}
        onTemplateTrigger={handleNextTemplate}
        onFireworksTrigger={handleTriggerBurst}
      />

      {/* Virtual Controls Sidebar (when simulator tab is active) */}
      {activeTab === 'simulator' && (
        <VirtualSimulator
          config={config}
          onUpdateConfig={handleUpdateConfig}
          onSimulateGesture={handleSimulateGesture}
          onReset={handleResetParameters}
        />
      )}

      {/* Initial Guidance Card (dismissable) */}
      {hintVisible && (
        <aside
          aria-label="Gesture instructions"
          className="fixed top-20 left-6 z-30 max-w-sm rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-2xl p-4 transition-all duration-300"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Interactive Gestures
            </h3>
            <button
              onClick={() => setHintVisible(false)}
              className="text-slate-400 hover:text-white text-xs font-mono"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Click <strong>Track Hands</strong> to enable camera gesture tracking, or drag the canvas to rotate.
          </p>
          <div className="text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <span>🖐️ Open Palm</span>
              <span className="text-slate-500">·</span>
              <span>Expands particle cloud</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✊ Closed Fist</span>
              <span className="text-slate-500">·</span>
              <span>Charges thermal glow</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✌️ V-Sign</span>
              <span className="text-slate-500">·</span>
              <span>Morphs to next template</span>
            </div>
          </div>
        </aside>
      )}

      {/* Gesture Guide Reference Modal */}
      <GestureGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
