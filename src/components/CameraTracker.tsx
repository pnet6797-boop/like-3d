import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, Eye, EyeOff, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GestureData } from '../types';
import { GestureDetector } from '../services/gestureDetector';

interface CameraTrackerProps {
  onGestureUpdate: (data: GestureData) => void;
  onTemplateTrigger: () => void;
  onFireworksTrigger: () => void;
  isCameraActive: boolean;
  setIsCameraActive: (active: boolean) => void;
}

// MediaPipe hand connections pairs
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base knuckles
  [5, 9], [9, 13], [13, 17],
];

export const CameraTracker: React.FC<CameraTrackerProps> = ({
  onGestureUpdate,
  onTemplateTrigger,
  onFireworksTrigger,
  isCameraActive,
  setIsCameraActive,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const detectorRef = useRef<GestureDetector>(new GestureDetector());
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Optical fallback tracker state
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const trackerModeRef = useRef<'mediapipe' | 'optical'>('mediapipe');

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<string>('Ready');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<string>('idle');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [cameraReady, setCameraReady] = useState<boolean>(false);

  // Hook up triggers to detector
  useEffect(() => {
    detectorRef.current.onTemplateTrigger = onTemplateTrigger;
    detectorRef.current.onFireworksTrigger = onFireworksTrigger;
  }, [onTemplateTrigger, onFireworksTrigger]);

  // 1. Initialize MediaPipe Model with CPU/GPU fallbacks and CDN safety
  const initModel = useCallback(async (): Promise<HandLandmarker | null> => {
    if (landmarkerRef.current) return landmarkerRef.current;
    try {
      setIsLoadingModel(true);
      setModelStatus('Loading vision neural net...');

      const wasmUrls = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm',
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
      ];

      let vision = null;
      for (const url of wasmUrls) {
        try {
          vision = await FilesetResolver.forVisionTasks(url);
          if (vision) break;
        } catch (e) {
          console.warn(`WASM CDN ${url} failed, trying next...`, e);
        }
      }

      if (!vision) {
        throw new Error('Could not resolve MediaPipe WASM');
      }

      const modelAssetPath =
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

      // First attempt GPU delegate, but gracefully fallback to CPU if WebGL fails
      let landmarker: HandLandmarker | null = null;
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuError) {
        console.warn('MediaPipe GPU delegate failed (WebGL busy). Falling back to CPU delegate:', gpuError);
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      landmarkerRef.current = landmarker;
      trackerModeRef.current = 'mediapipe';
      setModelStatus('MediaPipe Vision AI active');
      setIsLoadingModel(false);
      return landmarker;
    } catch (err: unknown) {
      console.warn('MediaPipe model load failed, enabling high-performance optical fallback tracker:', err);
      trackerModeRef.current = 'optical';
      setModelStatus('Optical Vision active');
      setIsLoadingModel(false);
      return null;
    }
  }, []);

  // 2. Start Video Stream immediately upon user activation
  const startCamera = useCallback(async () => {
    setPermissionError(null);
    setCameraReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API (getUserMedia) not supported in this browser context');
      }

      // Request camera stream with forgiving constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;

        video.onloadedmetadata = async () => {
          try {
            await video.play();
            setCameraReady(true);
          } catch (playErr) {
            console.warn('video.play() failed:', playErr);
          }
        };
      }

      // Load AI model asynchronously in the background so video is never blocked!
      initModel();
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Camera access denied. Please allow camera permissions in browser settings.';
      setPermissionError(msg);
      setIsCameraActive(false);
    }
  }, [initModel, setIsCameraActive]);

  // 3. Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setCameraReady(false);
    detectorRef.current.reset();
    setCurrentGesture('idle');
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraActive, startCamera, stopCamera]);

  // 4. Optical Fallback Tracker (Runs if MediaPipe is loading or fails)
  const processOpticalFrame = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      const w = 160;
      const h = 120;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;

      offCtx.drawImage(video, 0, 0, w, h);
      const imgData = offCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let skinXSum = 0;
      let skinYSum = 0;
      let skinCount = 0;
      let minX = w;
      let maxX = 0;
      let minY = h;
      let maxY = 0;

      // Skin & motion pixel detection
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard human skin color range heuristic
        const isSkin =
          r > 80 &&
          g > 35 &&
          b > 20 &&
          r > g &&
          r > b &&
          Math.abs(r - g) > 12 &&
          r - b > 12;

        if (isSkin) {
          const pixelIndex = i / 4;
          const px = pixelIndex % w;
          const py = Math.floor(pixelIndex / w);

          skinXSum += px;
          skinYSum += py;
          skinCount++;

          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (skinCount > 80) {
        const avgX = skinXSum / skinCount / w;
        const avgY = skinYSum / skinCount / h;
        const spanX = (maxX - minX) / w;
        const spanY = (maxY - minY) / h;
        const area = spanX * spanY;

        // Draw optical bounding box on preview canvas
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          minX * (canvas.width / w),
          minY * (canvas.height / h),
          (maxX - minX) * (canvas.width / w),
          (maxY - minY) * (canvas.height / h)
        );

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(avgX * canvas.width, avgY * canvas.height, 8, 0, Math.PI * 2);
        ctx.fill();

        // Determine gesture from optical features
        let gestureType: any = 'idle';
        let expansion = 1.0;
        let charge = 0.0;

        if (area > 0.18) {
          gestureType = 'open_palm';
          expansion = 1.8;
        } else if (area < 0.05) {
          gestureType = 'fist';
          charge = 0.85;
        } else if (avgY < 0.35) {
          gestureType = 'pointing';
        } else {
          gestureType = 'pinch';
          expansion = 0.6;
        }

        setCurrentGesture(gestureType);

        const gestureData: GestureData = {
          type: gestureType,
          confidence: 0.85,
          handCount: 1,
          expansion,
          charge,
          handPosition: { x: (0.5 - avgX) * 2, y: (0.5 - avgY) * 2, z: 0 },
          pinchDistance: area > 0.1 ? 1.0 : 0.3,
          isTwoHands: false,
          rotationDelta: { x: (avgX - 0.5) * 4, y: (avgY - 0.5) * 4 },
        };
        onGestureUpdate(gestureData);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setCurrentGesture('idle');
      }
    },
    [onGestureUpdate]
  );

  // 5. Main Tracking Loop
  useEffect(() => {
    let lastVideoTime = -1;

    const processFrame = () => {
      if (!isCameraActive || !videoRef.current || !canvasRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState >= 2 && ctx) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
        }

        const now = performance.now();

        // Use MediaPipe if loaded
        if (landmarkerRef.current && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const detection = landmarkerRef.current.detectForVideo(video, now);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection.landmarks && detection.landmarks.length > 0) {
              detection.landmarks.forEach((landmarks, handIdx) => {
                const isFirstHand = handIdx === 0;
                const boneColor = isFirstHand ? '#38bdf8' : '#f43f5e';
                const jointColor = isFirstHand ? '#e0f2fe' : '#ffe4e6';

                ctx.lineWidth = 3;
                ctx.strokeStyle = boneColor;
                ctx.lineCap = 'round';
                ctx.shadowColor = boneColor;
                ctx.shadowBlur = 6;

                for (const [i1, i2] of HAND_CONNECTIONS) {
                  const p1 = landmarks[i1];
                  const p2 = landmarks[i2];
                  if (p1 && p2) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                    ctx.stroke();
                  }
                }

                landmarks.forEach((pt, idx) => {
                  const isTip = [4, 8, 12, 16, 20].includes(idx);
                  ctx.beginPath();
                  ctx.arc(
                    pt.x * canvas.width,
                    pt.y * canvas.height,
                    isTip ? 6 : 3.5,
                    0,
                    2 * Math.PI
                  );
                  ctx.fillStyle = isTip ? '#ffffff' : jointColor;
                  ctx.shadowColor = isTip ? '#ffffff' : boneColor;
                  ctx.shadowBlur = isTip ? 10 : 4;
                  ctx.fill();
                });
              });

              const gesture = detectorRef.current.processLandmarks(detection.landmarks);
              setCurrentGesture(gesture.type);
              onGestureUpdate(gesture);
            } else {
              const idleData = detectorRef.current.processLandmarks([]);
              setCurrentGesture('idle');
              onGestureUpdate(idleData);
            }
          } catch (detectionErr) {
            console.warn('MediaPipe detect error, falling back to optical frame processing:', detectionErr);
            processOpticalFrame(video, canvas, ctx);
          }
        } else if (!landmarkerRef.current && cameraReady) {
          // If MediaPipe is still downloading or failed, use real-time optical frame processor
          processOpticalFrame(video, canvas, ctx);
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive, cameraReady, onGestureUpdate, processOpticalFrame]);

  const gestureLabels: Record<string, { label: string; icon: string; desc: string }> = {
    idle: { label: 'Tracking Hand', icon: '✋', desc: 'Hold hand inside camera view' },
    open_palm: { label: 'Open Palm', icon: '🖐️', desc: 'Expanding particles' },
    pinch: { label: 'Pinch', icon: '🤏', desc: 'Condensing field' },
    fist: { label: 'Fist', icon: '✊', desc: 'Charging thermal energy' },
    peace: { label: 'Peace / V-Sign', icon: '✌️', desc: 'Morphing template' },
    thumbs_up: { label: 'Thumbs Up', icon: '👍', desc: 'Cosmic burst' },
    pointing: { label: 'Pointing', icon: '☝️', desc: 'Gravitational attractor' },
  };

  const gestureInfo = gestureLabels[currentGesture] || gestureLabels.idle;

  return (
    <aside
      aria-label="Camera tracking monitor"
      className="fixed bottom-6 right-6 z-30 transition-all duration-300"
    >
      <div className="relative rounded-xl border border-white/10 bg-slate-950/85 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col w-72">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isCameraActive && cameraReady
                  ? 'bg-cyan-400 animate-pulse'
                  : isCameraActive
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-semibold tracking-wide text-slate-200">
              Webcam Tracker
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              title="Flip Mirror"
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand view' : 'Minimize view'}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            >
              {isMinimized ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsCameraActive(!isCameraActive)}
              title={isCameraActive ? 'Turn off camera' : 'Turn on camera'}
              className={`p-1 rounded transition-colors ${
                isCameraActive
                  ? 'text-cyan-400 hover:bg-cyan-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {isCameraActive ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video / Skeleton Canvas viewport (ALWAYS rendered in DOM so ref is never lost) */}
        <div
          className={`relative aspect-4/3 w-full bg-slate-900/90 overflow-hidden flex items-center justify-center ${
            isMinimized ? 'hidden' : 'block'
          }`}
        >
          {/* Persistent Video element */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isCameraActive && cameraReady ? 'opacity-70' : 'opacity-0'
            } ${isMirrored ? 'scale-x-[-1]' : ''}`}
          />

          {/* Landmark / Skeleton canvas overlay */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none ${
              isMirrored ? 'scale-x-[-1]' : ''
            }`}
          />

          {/* Off State UI */}
          {!isCameraActive && !permissionError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-slate-950/80">
              <CameraOff className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-xs text-slate-400 mb-3">Camera is paused</p>
              <button
                onClick={() => setIsCameraActive(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors shadow-sm"
              >
                Enable Camera
              </button>
            </div>
          )}

          {/* Camera Starting / Permission Prompt indicator */}
          {isCameraActive && !cameraReady && !permissionError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10 bg-slate-950/90 backdrop-blur-sm gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
              <p className="text-xs font-medium text-slate-200">Starting camera feed...</p>
              <p className="text-[11px] text-slate-400">Please click &quot;Allow&quot; in the browser prompt</p>
            </div>
          )}

          {/* Neural model downloading indicator */}
          {isLoadingModel && cameraReady && (
            <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-cyan-500/30 text-[10px] text-cyan-300 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Calibrating Vision AI...</span>
            </div>
          )}

          {/* Permission or Access Error */}
          {permissionError && (
            <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center z-20">
              <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
              <p className="text-xs font-semibold text-amber-200 mb-1">Camera Permission Required</p>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Ensure camera access is allowed in your browser settings (click lock icon in the URL bar), or use the Virtual Controls.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => startCamera()}
                  className="px-3 py-1 text-xs font-medium bg-cyan-500 text-slate-950 rounded hover:bg-cyan-400 transition-colors"
                >
                  Retry Access
                </button>
                <button
                  onClick={() => setPermissionError(null)}
                  className="px-3 py-1 text-xs font-medium bg-white/10 text-slate-300 rounded hover:bg-white/20 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Detected Gesture Feedback */}
        <div className="p-3 bg-slate-900/60 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" role="img" aria-label={gestureInfo.label}>
              {gestureInfo.icon}
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                {gestureInfo.label}
                {currentGesture !== 'idle' && (
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                )}
              </div>
              <div className="text-[11px] text-slate-400">{gestureInfo.desc}</div>
            </div>
          </div>

          {/* Status badge */}
          {cameraReady && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              <span>Live</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
