import * as THREE from 'three';
import { ParticleConfig, ParticleTemplateType, ColorPaletteType } from '../types';
import { generateTemplate, createParticleTexture, getPaletteColor, PALETTES } from './shapeTemplates';

export class ParticleEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private starfield: THREE.Points;

  // Particle buffers
  private particleCount: number;
  private currentPositions: Float32Array;
  private targetPositions: Float32Array;
  private velocities: Float32Array;
  private originalColors: Float32Array;
  private targetColors: Float32Array;
  private renderColors: Float32Array;
  private extraData: Float32Array;

  // State
  private config: ParticleConfig;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isDestroyed: boolean = false;

  // Interaction & camera rotation
  public isDragging: boolean = false;
  private prevMouse = { x: 0, y: 0 };
  private rotationTarget = { x: 0.15, y: 0 };
  private rotationCurrent = { x: 0.15, y: 0 };
  private zoomDistance: number = 36;
  private zoomTarget: number = 36;
  public attractorPos: THREE.Vector3 | null = null;
  public handExpansion: number = 1.0;
  public handCharge: number = 0.0;
  public handRotationDelta = { x: 0, y: 0 };

  constructor(container: HTMLElement, initialConfig: ParticleConfig) {
    this.container = container;
    this.config = initialConfig;
    this.particleCount = initialConfig.count;
    this.clock = new THREE.Clock();

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#040714', 0.012);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, this.zoomDistance);

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor('#030712', 1);
    this.container.appendChild(this.renderer.domElement);

    // 2. Initialize starfield background
    this.starfield = this.createStarfield();
    this.scene.add(this.starfield);

    // 3. Initialize primary particle buffers
    this.currentPositions = new Float32Array(this.particleCount * 3);
    this.targetPositions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.originalColors = new Float32Array(this.particleCount * 3);
    this.targetColors = new Float32Array(this.particleCount * 3);
    this.renderColors = new Float32Array(this.particleCount * 3);
    this.extraData = new Float32Array(this.particleCount * 3);

    // Initial shape generation
    const initialData = generateTemplate(this.config.template, this.particleCount, this.config.palette);
    for (let i = 0; i < this.particleCount * 3; i++) {
      this.currentPositions[i] = initialData.positions[i];
      this.targetPositions[i] = initialData.positions[i];
      this.originalColors[i] = initialData.colors[i];
      this.targetColors[i] = initialData.colors[i];
      this.renderColors[i] = initialData.colors[i];
      if (initialData.extraData) {
        this.extraData[i] = initialData.extraData[i];
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.renderColors, 3));

    const particleTexture = createParticleTexture();
    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.92,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    // Bind event listeners
    this.bindEvents();

    // Start render loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createStarfield(): THREE.Points {
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 60 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.3 + Math.random() * 0.7;
      starCol[i * 3] = brightness * 0.7;
      starCol[i * 3 + 1] = brightness * 0.85;
      starCol[i * 3 + 2] = brightness * 1.0;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(starGeo, starMat);
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.prevMouse.x;
        const dy = e.clientY - this.prevMouse.y;
        this.rotationTarget.y += dx * 0.005;
        this.rotationTarget.x += dy * 0.005;
        this.prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomTarget = Math.max(12, Math.min(75, this.zoomTarget + e.deltaY * 0.03));
    }, { passive: false });
  }

  private onResize = () => {
    if (this.isDestroyed || !this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public switchTemplate(template: ParticleTemplateType) {
    if (this.config.template === template) return;
    this.config.template = template;

    const data = generateTemplate(template, this.particleCount, this.config.palette);
    for (let i = 0; i < this.particleCount * 3; i++) {
      this.targetPositions[i] = data.positions[i];
      this.targetColors[i] = data.colors[i];
      if (data.extraData) {
        this.extraData[i] = data.extraData[i];
      }
      // Give particles a slight burst velocity upon morphing
      this.velocities[i] += (Math.random() - 0.5) * 1.5;
    }
  }

  public switchPalette(palette: ColorPaletteType) {
    this.config.palette = palette;
    const data = generateTemplate(this.config.template, this.particleCount, palette);
    for (let i = 0; i < this.particleCount * 3; i++) {
      this.targetColors[i] = data.colors[i];
    }
  }

  public triggerBurst(strength: number = 8.0) {
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const x = this.currentPositions[idx];
      const y = this.currentPositions[idx + 1];
      const z = this.currentPositions[idx + 2];
      const len = Math.hypot(x, y, z) || 1;

      this.velocities[idx] += (x / len) * strength * (0.5 + Math.random());
      this.velocities[idx + 1] += (y / len) * strength * (0.5 + Math.random());
      this.velocities[idx + 2] += (z / len) * strength * (0.5 + Math.random());
    }
  }

  public updateConfig(newConfig: Partial<ParticleConfig>) {
    Object.assign(this.config, newConfig);
    if (newConfig.size !== undefined) {
      this.material.size = newConfig.size;
    }
    if (newConfig.palette !== undefined) {
      this.switchPalette(newConfig.palette);
    }
    if (newConfig.template !== undefined) {
      this.switchTemplate(newConfig.template);
    }
  }

  private animate() {
    if (this.isDestroyed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(0.1, this.clock.getDelta());
    const elapsedTime = this.clock.getElapsedTime();

    // Smooth camera damping & rotation
    this.rotationTarget.y += this.handRotationDelta.x * 0.008;
    this.rotationTarget.x += this.handRotationDelta.y * 0.008;

    // Idle gentle auto-orbit if not dragging
    if (!this.isDragging) {
      this.rotationTarget.y += 0.0018;
    }

    this.rotationCurrent.x += (this.rotationTarget.x - this.rotationCurrent.x) * 0.08;
    this.rotationCurrent.y += (this.rotationTarget.y - this.rotationCurrent.y) * 0.08;

    this.points.rotation.x = this.rotationCurrent.x;
    this.points.rotation.y = this.rotationCurrent.y;
    this.starfield.rotation.y = this.rotationCurrent.y * 0.2;

    // Smooth zoom lerp
    this.zoomDistance += (this.zoomTarget - this.zoomDistance) * 0.06;
    this.camera.position.z = this.zoomDistance;

    // Effective combined expansion & charge
    const effectiveExpansion = this.config.expansion * this.handExpansion;
    const effectiveCharge = Math.max(this.config.charge, this.handCharge);

    // Adjust particle size dynamically when charged
    this.material.size = this.config.size * (1.0 + effectiveCharge * 0.85);

    // Turbulence speed
    const turbSpeed = elapsedTime * (0.8 + this.config.turbulence * 1.5);

    const pos = this.currentPositions;
    const target = this.targetPositions;
    const vel = this.velocities;
    const origCol = this.originalColors;
    const targetCol = this.targetColors;
    const rendCol = this.renderColors;

    // Charge thermal white-hot flash colors
    const chargeHeat = Math.min(1.0, effectiveCharge);
    const vibrationAmp = effectiveCharge * 0.35;

    // Particle dynamics physics loop
    const morphSpeed = 3.2 * delta;
    const damping = 0.94;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      // 1. Color interpolation and thermal charge overdrive
      origCol[idx] += (targetCol[idx] - origCol[idx]) * 0.05;
      origCol[idx + 1] += (targetCol[idx + 1] - origCol[idx + 1]) * 0.05;
      origCol[idx + 2] += (targetCol[idx + 2] - origCol[idx + 2]) * 0.05;

      if (chargeHeat > 0.01) {
        // Shift toward incandescent thermal glow (yellow -> hot white)
        rendCol[idx] = THREE.MathUtils.lerp(origCol[idx], 1.0, chargeHeat * 0.9);
        rendCol[idx + 1] = THREE.MathUtils.lerp(origCol[idx + 1], 0.95, chargeHeat * 0.85);
        rendCol[idx + 2] = THREE.MathUtils.lerp(origCol[idx + 2], 1.0, chargeHeat * 0.6);
      } else {
        rendCol[idx] = origCol[idx];
        rendCol[idx + 1] = origCol[idx + 1];
        rendCol[idx + 2] = origCol[idx + 2];
      }

      // 2. Base target position modulated by expansion
      let tx = target[idx] * effectiveExpansion;
      let ty = target[idx + 1] * effectiveExpansion;
      let tz = target[idx + 2] * effectiveExpansion;

      // 3. Shape-specific kinetic behaviors
      if (this.config.template === 'saturn') {
        const isRing = this.extraData[idx] === 1;
        if (isRing) {
          // ring particles orbit
          const r = this.extraData[idx + 1];
          const baseAngle = this.extraData[idx + 2];
          const orbitSpeed = (1 / Math.sqrt(r)) * 1.5;
          const curAngle = baseAngle + elapsedTime * orbitSpeed;

          const rx = r * Math.cos(curAngle) * effectiveExpansion;
          const rz = r * Math.sin(curAngle) * effectiveExpansion;
          const cosTilt = Math.cos(0.45);
          const sinTilt = Math.sin(0.45);

          tx = rx;
          ty = -rz * sinTilt;
          tz = rz * cosTilt;
        }
      } else if (this.config.template === 'blackhole') {
        const isDisk = this.extraData[idx] === 1;
        if (isDisk) {
          const r = this.extraData[idx + 1];
          const baseAngle = this.extraData[idx + 2];
          const swirlSpeed = (1.5 / Math.sqrt(r)) * 2.8;
          const curAngle = baseAngle + elapsedTime * swirlSpeed;

          tx = r * Math.cos(curAngle) * effectiveExpansion;
          ty = Math.sin(curAngle * 2) * (r * 0.12 * effectiveExpansion);
          tz = r * Math.sin(curAngle) * effectiveExpansion;
        }
      } else if (this.config.template === 'galaxy') {
        // Slow rotation of spiral arms
        const dist = this.extraData[idx];
        const baseAngle = this.extraData[idx + 1];
        const rot = baseAngle + (elapsedTime * 0.25) / (1 + dist * 0.2);
        tx = dist * Math.cos(rot) * effectiveExpansion;
        tz = dist * Math.sin(rot) * effectiveExpansion;
      }

      // 4. Subtle turbulence noise wave
      const wave = Math.sin(turbSpeed + i * 0.05) * (0.15 + this.config.turbulence * 0.4);
      tx += wave;
      ty += Math.cos(turbSpeed * 1.2 + i * 0.03) * wave;

      // 5. Thermal charge vibration
      if (vibrationAmp > 0.001) {
        tx += (Math.random() - 0.5) * vibrationAmp;
        ty += (Math.random() - 0.5) * vibrationAmp;
        tz += (Math.random() - 0.5) * vibrationAmp;
      }

      // 6. Attractor interaction (Hand pointing or mouse)
      if (this.attractorPos) {
        const ax = this.attractorPos.x - pos[idx];
        const ay = this.attractorPos.y - pos[idx + 1];
        const az = this.attractorPos.z - pos[idx + 2];
        const distSq = ax * ax + ay * ay + az * az;
        if (distSq < 180 && distSq > 0.1) {
          const force = (12.0 / distSq) * delta;
          vel[idx] += ax * force;
          vel[idx + 1] += ay * force;
          vel[idx + 2] += az * force;
        }
      }

      // 7. Spring towards target position + velocity integration
      vel[idx] += (tx - pos[idx]) * morphSpeed;
      vel[idx + 1] += (ty - pos[idx + 1]) * morphSpeed;
      vel[idx + 2] += (tz - pos[idx + 2]) * morphSpeed;

      vel[idx] *= damping;
      vel[idx + 1] *= damping;
      vel[idx + 2] *= damping;

      pos[idx] += vel[idx] * delta * 12;
      pos[idx + 1] += vel[idx + 1] * delta * 12;
      pos[idx + 2] += vel[idx + 2] * delta * 12;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  public captureScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
