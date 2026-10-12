import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, Eye, EyeOff, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
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
  [5, 9], [9, 13], [13, 17]
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

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<string>('idle');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  // Hook up triggers to detector
  useEffect(() => {
    detectorRef.current.onTemplateTrigger = onTemplateTrigger;
    detectorRef.current.onFireworksTrigger = onFireworksTrigger;
  }, [onTemplateTrigger, onFireworksTrigger]);

  // 1. Initialize MediaPipe Model
  const initModel = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    try {
      setIsLoadingModel(true);
      setModelError(null);
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      landmarkerRef.current = landmarker;
      setIsLoadingModel(false);
      return landmarker;
    } catch (err: unknown) {
      console.error('Failed to load MediaPipe hand model:', err);
      setIsLoadingModel(false);
      setModelError('Hand tracking engine initialized in fallback mode');
      return null;
    }
  }, []);

  // 2. Start Video Stream
  const startCamera = useCallback(async () => {
    setPermissionError(null);
    try {
      await initModel();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or unavailable:', err);
      setPermissionError('Camera access not granted. Use mouse or Virtual Gesture controls.');
      setIsCameraActive(false);
    }
  }, [initModel, setIsCameraActive]);

  // 3. Stop Camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    detectorRef.current.reset();
    setIsCameraActive(false);
    setCurrentGesture('idle');
  }, [setIsCameraActive]);

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

  // 4. Tracking and Render Loop
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

      if (video.readyState >= 2 && ctx && landmarkerRef.current) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
        }

        const now = performance.now();
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const detection = landmarkerRef.current.detectForVideo(video, now);

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw skeleton overlay
          if (detection.landmarks && detection.landmarks.length > 0) {
            detection.landmarks.forEach((landmarks, handIdx) => {
              const isFirstHand = handIdx === 0;
              const boneColor = isFirstHand ? '#38bdf8' : '#f43f5e';
              const jointColor = isFirstHand ? '#e0f2fe' : '#ffe4e6';

              // Draw connections
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

              // Draw joint nodes
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

            // Process with detector
            const gesture = detectorRef.current.processLandmarks(detection.landmarks);
            setCurrentGesture(gesture.type);
            onGestureUpdate(gesture);
          } else {
            // Hand not in view
            const idleData = detectorRef.current.processLandmarks([]);
            setCurrentGesture('idle');
            onGestureUpdate(idleData);
          }
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
  }, [isCameraActive, onGestureUpdate]);

  const gestureLabels: Record<string, { label: string; icon: string; desc: string }> = {
    idle: { label: 'Tracking Hand', icon: '✋', desc: 'Move hand in camera view' },
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
      <div className="relative rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col w-72">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isCameraActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'
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

        {/* Video / Skeleton Canvas viewport */}
        {!isMinimized && (
          <div className="relative aspect-4/3 w-full bg-slate-900/90 overflow-hidden flex items-center justify-center">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover opacity-60 ${
                    isMirrored ? 'scale-x-[-1]' : ''
                  }`}
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full pointer-events-none ${
                    isMirrored ? 'scale-x-[-1]' : ''
                  }`}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <CameraOff className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-xs text-slate-400 mb-3">Camera is disabled</p>
                <button
                  onClick={() => setIsCameraActive(true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
                >
                  Enable Camera
                </button>
              </div>
            )}

            {isLoadingModel && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs text-slate-300 font-medium">Loading Vision AI...</span>
              </div>
            )}

            {permissionError && (
              <div className="absolute inset-0 bg-slate-950/90 p-3 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-5 h-5 text-amber-400 mb-1" />
                <p className="text-xs text-amber-200/90 leading-relaxed mb-2">{permissionError}</p>
                <button
                  onClick={() => startCamera()}
                  className="text-xs text-cyan-400 underline hover:text-cyan-300"
                >
                  Retry Access
                </button>
              </div>
            )}
          </div>
        )}

        {/* Live Detected Gesture Feedback */}
        <div className="p-3 bg-slate-900/40 border-t border-white/5 flex items-center justify-between">
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
        </div>
      </div>
    </aside>
  );
};
