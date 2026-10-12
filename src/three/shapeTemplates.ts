import * as THREE from 'three';
import { ParticleTemplateType } from '../types';

export interface TemplateResult {
  positions: Float32Array;
  colors: Float32Array;
  extraData?: Float32Array; // e.g. velocity, rotation speed, phase
}

// Generate circular particle glow texture via canvas
export function createParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.15, 'rgba(230, 245, 255, 0.95)');
  gradient.addColorStop(0.4, 'rgba(140, 190, 255, 0.45)');
  gradient.addColorStop(0.8, 'rgba(60, 100, 240, 0.08)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Palette color definition presets
export const PALETTES = {
  hyperborea: [
    new THREE.Color('#38bdf8'), // Sky Cyan
    new THREE.Color('#818cf8'), // Indigo
    new THREE.Color('#c084fc'), // Purple
    new THREE.Color('#f43f5e'), // Neon Rose
  ],
  supernova: [
    new THREE.Color('#ff2a6d'), // Hot Pink
    new THREE.Color('#ff6b35'), // Sunset Orange
    new THREE.Color('#f7c59f'), // Peach
    new THREE.Color('#fffa65'), // Solar Yellow
  ],
  cyberpunk: [
    new THREE.Color('#05d9e8'), // Cyber Cyan
    new THREE.Color('#ff2a6d'), // Neon Magenta
    new THREE.Color('#005670'), // Deep Teal
    new THREE.Color('#01012b'), // Void Indigo
  ],
  bioluminescence: [
    new THREE.Color('#00f5d4'), // Bright Mint
    new THREE.Color('#00bbf9'), // Electric Blue
    new THREE.Color('#7b2cbf'), // Deep Violet
    new THREE.Color('#52b788'), // Biolum Green
  ],
  amethyst: [
    new THREE.Color('#d8b4fe'), // Soft Lilac
    new THREE.Color('#9333ea'), // Royal Purple
    new THREE.Color('#4c1d95'), // Deep Plum
    new THREE.Color('#ec4899'), // Magenta Pink
  ],
  celestial: [
    new THREE.Color('#e0f2fe'), // Starlight White
    new THREE.Color('#38bdf8'), // Ice Blue
    new THREE.Color('#6366f1'), // Deep Space Blue
    new THREE.Color('#fbbf24'), // Starlight Gold
  ],
};

export function getPaletteColor(paletteName: keyof typeof PALETTES, ratio: number): THREE.Color {
  const colors = PALETTES[paletteName] || PALETTES.hyperborea;
  const clamped = Math.max(0, Math.min(1, ratio));
  const scaled = clamped * (colors.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(colors.length - 1, index + 1);
  const t = scaled - index;

  return colors[index].clone().lerp(colors[nextIndex], t);
}

// Generators for each 3D shape
export function generateTemplate(
  type: ParticleTemplateType,
  count: number,
  paletteName: keyof typeof PALETTES
): TemplateResult {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const extraData = new Float32Array(count * 3); // custom physics data (velocity/phase/radius)

  switch (type) {
    case 'heart': {
      // 3D Parametric Heart with interior volume
      for (let i = 0; i < count; i++) {
        const t = Math.PI * 2 * Math.random();
        // distribute inside volume using random scaling factor with cubic root
        const r = Math.cbrt(Math.random());
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        // Thickness tapering toward edges
        const maxZ = Math.sqrt(Math.max(0, 1 - (x * x) / 256)) * 8;
        const z = (Math.random() * 2 - 1) * maxZ;

        const scale = 0.55 * r;
        positions[i * 3] = x * scale;
        positions[i * 3 + 1] = y * scale;
        positions[i * 3 + 2] = z * scale;

        // Color based on radial distance from center
        const dist = Math.sqrt(x * x + y * y) / 16;
        const c = getPaletteColor(paletteName, dist * 0.8 + 0.2 * Math.random());
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        // Extra: pulse phase
        extraData[i * 3] = t;
        extraData[i * 3 + 1] = dist;
        extraData[i * 3 + 2] = Math.random();
      }
      break;
    }

    case 'flower': {
      // 3D Blooming Lotus / Rose with Fibonacci phyllotaxis
      const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 deg
      for (let i = 0; i < count; i++) {
        const n = i / count;
        const radius = Math.sqrt(n) * 12;
        const theta = i * goldenAngle;

        // Petal undulations
        const petals = 6;
        const petalHeight = Math.sin(theta * petals) * (radius * 0.25);
        // Cup shape curve: outer petals curl up, then fall
        const cupShape = Math.pow(n, 0.7) * 4 - Math.pow(n, 2.5) * 3;
        const z = cupShape + petalHeight + (Math.random() - 0.5) * 0.5;

        positions[i * 3] = radius * Math.cos(theta);
        positions[i * 3 + 1] = z;
        positions[i * 3 + 2] = radius * Math.sin(theta);

        // Core to petal tip gradient
        const c = getPaletteColor(paletteName, n);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = theta;
        extraData[i * 3 + 1] = radius;
        extraData[i * 3 + 2] = petals;
      }
      break;
    }

    case 'saturn': {
      // Planet core + Inclined Ring system
      const planetParticleCount = Math.floor(count * 0.35);
      const ringParticleCount = count - planetParticleCount;

      // 1. Planet sphere
      for (let i = 0; i < planetParticleCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 5.0 * Math.cbrt(Math.random()); // planet radius 5

        // Oblate spheroid flattening
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta) * 0.88;
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Banding colors by latitude
        const lat = Math.abs(z / 5.0);
        const c = getPaletteColor(paletteName, lat * 0.6);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = 0; // mark as planet
        extraData[i * 3 + 1] = r;
        extraData[i * 3 + 2] = 0;
      }

      // 2. Rings (with Cassini division gap)
      const ringTilt = 0.45; // ~26 degrees
      const cosTilt = Math.cos(ringTilt);
      const sinTilt = Math.sin(ringTilt);

      for (let i = planetParticleCount; i < count; i++) {
        const ringIdx = i - planetParticleCount;
        const ringRatio = ringIdx / ringParticleCount;

        // Ring inner 7.5 to outer 18, with gap around 12 to 13
        let r = 7.5 + ringRatio * 11.5;
        if (r > 12.0 && r < 13.0) {
          // shift away from Cassini gap
          r = Math.random() > 0.5 ? 12.0 - Math.random() * 0.2 : 13.0 + Math.random() * 0.2;
        }

        const angle = Math.random() * Math.PI * 2;
        const rx = r * Math.cos(angle);
        const rz = r * Math.sin(angle);
        const ry = (Math.random() - 0.5) * 0.25; // thin disk

        // Rotate around X-axis for tilt
        const x = rx;
        const y = ry * cosTilt - rz * sinTilt;
        const z = ry * sinTilt + rz * cosTilt;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const c = getPaletteColor(paletteName, 0.4 + 0.6 * ((r - 7.5) / 11.5));
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = 1; // mark as ring
        extraData[i * 3 + 1] = r;
        extraData[i * 3 + 2] = angle;
      }
      break;
    }

    case 'fireworks': {
      // Cosmic Nova / Spherical explosion with cascading filament branches
      const clusterCount = 8;
      for (let i = 0; i < count; i++) {
        const cluster = i % clusterCount;
        const clusterAngle = (cluster / clusterCount) * Math.PI * 2;
        const clusterPitch = ((cluster % 3) - 1) * 0.6;

        // Base radial vector
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);

        // Mix uniform sphere with cluster burst filaments
        const speed = 2 + Math.pow(Math.random(), 0.5) * 14;
        let dirX = Math.sin(phi) * Math.cos(theta);
        let dirY = Math.sin(phi) * Math.sin(theta);
        let dirZ = Math.cos(phi);

        if (i % 2 === 0) {
          // bias toward cluster arms
          dirX = THREE.MathUtils.lerp(dirX, Math.cos(clusterAngle), 0.65);
          dirY = THREE.MathUtils.lerp(dirY, Math.sin(clusterPitch), 0.65);
          dirZ = THREE.MathUtils.lerp(dirZ, Math.sin(clusterAngle), 0.65);
          const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1;
          dirX /= len;
          dirY /= len;
          dirZ /= len;
        }

        positions[i * 3] = dirX * speed;
        positions[i * 3 + 1] = dirY * speed;
        positions[i * 3 + 2] = dirZ * speed;

        const c = getPaletteColor(paletteName, Math.min(1, speed / 14));
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        // Store initial velocity vector
        extraData[i * 3] = dirX * (speed * 0.2);
        extraData[i * 3 + 1] = dirY * (speed * 0.2);
        extraData[i * 3 + 2] = dirZ * (speed * 0.2);
      }
      break;
    }

    case 'galaxy': {
      // Logarithmic Spiral Galaxy (Milky Way arms + central nucleus)
      const arms = 2;
      const coreParticles = Math.floor(count * 0.25);

      // Core
      for (let i = 0; i < coreParticles; i++) {
        const r = Math.pow(Math.random(), 2.0) * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;

        positions[i * 3] = r * Math.cos(theta) * Math.cos(phi);
        positions[i * 3 + 1] = r * Math.sin(phi) * 0.6;
        positions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);

        const c = getPaletteColor(paletteName, 0.9 + 0.1 * Math.random());
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = r;
        extraData[i * 3 + 1] = theta;
        extraData[i * 3 + 2] = 0;
      }

      // Spiral arms
      for (let i = coreParticles; i < count; i++) {
        const armIndex = i % arms;
        const distRatio = Math.random();
        const dist = 3.5 + distRatio * 15;
        // logarithmic spiral angle
        const spiralAngle = dist * 0.5 + (armIndex * (2 * Math.PI)) / arms;
        // scatter around arm
        const scatter = (Math.random() - 0.5) * (1.2 + dist * 0.18);
        const angle = spiralAngle + scatter / dist;

        const x = dist * Math.cos(angle);
        const z = dist * Math.sin(angle);
        // Vertical thickness tapers outward
        const y = (Math.random() - 0.5) * Math.max(0.2, 2.5 * (1 - dist / 20));

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const c = getPaletteColor(paletteName, Math.min(1, distRatio * 0.9));
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = dist;
        extraData[i * 3 + 1] = angle;
        extraData[i * 3 + 2] = armIndex;
      }
      break;
    }

    case 'blackhole': {
      // Event Horizon + Relativistic Swirling Accretion Disk
      const horizonCount = Math.floor(count * 0.2);

      // Event horizon outer boundary
      for (let i = 0; i < horizonCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 2.8 + Math.random() * 0.6;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Near-black with deep purple edge
        const c = new THREE.Color('#1e1b4b').lerp(new THREE.Color('#f43f5e'), Math.random() * 0.3);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = 0;
        extraData[i * 3 + 1] = r;
        extraData[i * 3 + 2] = 0;
      }

      // Swirling Accretion Disk with high orbital speed
      for (let i = horizonCount; i < count; i++) {
        const ratio = (i - horizonCount) / (count - horizonCount);
        const r = 3.6 + Math.pow(ratio, 1.3) * 16;
        const theta = Math.random() * Math.PI * 2;
        // slight warp from gravitational lensing
        const warpZ = Math.sin(theta * 2) * (r * 0.12) + (Math.random() - 0.5) * 0.4;

        positions[i * 3] = r * Math.cos(theta);
        positions[i * 3 + 1] = warpZ;
        positions[i * 3 + 2] = r * Math.sin(theta);

        // Extreme temperature gradient from innermost radius (white-hot) to outer (deep red/blue)
        const heat = 1 - (r - 3.6) / 16;
        const c = getPaletteColor(paletteName, heat);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = 1;
        extraData[i * 3 + 1] = r;
        extraData[i * 3 + 2] = theta;
      }
      break;
    }

    case 'torus': {
      // (p=2, q=3) Trefoil Torus Knot
      const p = 2;
      const q = 3;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2 * q + Math.random() * 0.05;
        const r = 0.5 * (2 + Math.cos(q * t));
        const cx = r * Math.cos(p * t) * 6;
        const cy = r * Math.sin(p * t) * 6;
        const cz = -Math.sin(q * t) * 4.5;

        // Cross-section tube scattering
        const tubeAngle = Math.random() * Math.PI * 2;
        const tubeRadius = Math.random() * 1.6;
        const nx = Math.cos(tubeAngle) * tubeRadius;
        const ny = Math.sin(tubeAngle) * tubeRadius;

        positions[i * 3] = cx + nx;
        positions[i * 3 + 1] = cy + ny;
        positions[i * 3 + 2] = cz + (Math.random() - 0.5) * 0.6;

        const c = getPaletteColor(paletteName, (t % (Math.PI * 2)) / (Math.PI * 2));
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = t;
        extraData[i * 3 + 1] = tubeRadius;
        extraData[i * 3 + 2] = 0;
      }
      break;
    }

    case 'dna': {
      // Double Helix with horizontal connecting rungs
      const helixCount = Math.floor(count * 0.7);
      const rungCount = count - helixCount;
      const height = 24;
      const radius = 5;
      const turns = 3.5;

      // 1. Two Strand Helices
      for (let i = 0; i < helixCount; i++) {
        const strand = i % 2; // 0 or 1
        const t = (i / helixCount) * turns * Math.PI * 2;
        const phase = strand === 0 ? 0 : Math.PI;
        const y = ((i / helixCount) - 0.5) * height;

        const jitter = (Math.random() - 0.5) * 0.5;
        const r = radius + jitter;
        const x = r * Math.cos(t + phase);
        const z = r * Math.sin(t + phase);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const c = getPaletteColor(paletteName, strand === 0 ? 0.2 : 0.85);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = y;
        extraData[i * 3 + 1] = t;
        extraData[i * 3 + 2] = strand;
      }

      // 2. Base Pair Rungs
      const rungs = 32;
      for (let i = helixCount; i < count; i++) {
        const rungIdx = Math.floor(Math.random() * rungs);
        const t = (rungIdx / rungs) * turns * Math.PI * 2;
        const y = (rungIdx / rungs - 0.5) * height;
        const lerpPos = Math.random() * 2 - 1; // from -1 to 1 across rung

        const x = radius * Math.cos(t) * lerpPos;
        const z = radius * Math.sin(t) * lerpPos;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 2] = z;

        const c = getPaletteColor(paletteName, 0.5 + 0.3 * Math.random());
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        extraData[i * 3] = y;
        extraData[i * 3 + 1] = t;
        extraData[i * 3 + 2] = 2;
      }
      break;
    }
  }

  return { positions, colors, extraData };
}
