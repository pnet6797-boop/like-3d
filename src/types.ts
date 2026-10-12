export type ParticleTemplateType =
  | 'heart'
  | 'flower'
  | 'saturn'
  | 'fireworks'
  | 'galaxy'
  | 'blackhole'
  | 'torus'
  | 'dna';

export type ColorPaletteType =
  | 'hyperborea'
  | 'supernova'
  | 'cyberpunk'
  | 'bioluminescence'
  | 'amethyst'
  | 'celestial';

export type GestureType =
  | 'idle'
  | 'open_palm'
  | 'pinch'
  | 'fist'
  | 'peace'
  | 'thumbs_up'
  | 'pointing';

export interface GestureData {
  type: GestureType;
  confidence: number;
  handCount: number;
  expansion: number; // 0.2 to 3.5
  charge: number; // 0.0 to 1.0
  handPosition: { x: number; y: number; z: number }; // normalized [-1, 1]
  pinchDistance: number;
  isTwoHands: boolean;
  twoHandDistance?: number;
  rotationDelta: { x: number; y: number };
}

export interface ParticleConfig {
  count: number;
  size: number;
  speed: number;
  turbulence: number;
  expansion: number;
  charge: number;
  template: ParticleTemplateType;
  palette: ColorPaletteType;
  bloomIntensity: number;
  soundEnabled: boolean;
  trailEnabled: boolean;
}
