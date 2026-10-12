import { GestureData, GestureType } from '../types';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

function dist2D(p1: Landmark, p2: Landmark): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function dist3D(p1: Landmark, p2: Landmark): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
}

export class GestureDetector {
  private smoothedExpansion: number = 1.0;
  private smoothedCharge: number = 0.0;
  private prevWristPos: { x: number; y: number } | null = null;
  private rotationVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private lastTemplateSwitchTime: number = 0;
  public onTemplateTrigger?: () => void;
  public onFireworksTrigger?: () => void;

  public processLandmarks(
    landmarksArray: Landmark[][],
    handednesses?: Array<{ categoryName: string; score: number }[]>
  ): GestureData {
    if (!landmarksArray || landmarksArray.length === 0) {
      // Return smooth decay to idle
      this.smoothedExpansion += (1.0 - this.smoothedExpansion) * 0.05;
      this.smoothedCharge += (0.0 - this.smoothedCharge) * 0.08;
      this.rotationVelocity.x *= 0.92;
      this.rotationVelocity.y *= 0.92;

      return {
        type: 'idle',
        confidence: 0,
        handCount: 0,
        expansion: this.smoothedExpansion,
        charge: this.smoothedCharge,
        handPosition: { x: 0, y: 0, z: 0 },
        pinchDistance: 1.0,
        isTwoHands: false,
        rotationDelta: { ...this.rotationVelocity },
      };
    }

    const hand1 = landmarksArray[0];
    const isTwoHands = landmarksArray.length >= 2;
    const hand2 = isTwoHands ? landmarksArray[1] : null;

    // Wrist and Key joints for primary hand
    const wrist = hand1[0];
    const thumbTip = hand1[4];
    const indexTip = hand1[8];
    const middleTip = hand1[12];
    const ringTip = hand1[16];
    const pinkyTip = hand1[20];

    const indexPip = hand1[6];
    const middlePip = hand1[10];
    const ringPip = hand1[14];
    const pinkyPip = hand1[20 - 2]; // 18

    // Reference hand scale: wrist to middle MCP (9)
    const middleMcp = hand1[9];
    const handScale = Math.max(0.05, dist2D(wrist, middleMcp));

    // Calculate extension for each finger
    const isIndexExtended = dist2D(indexTip, wrist) > dist2D(indexPip, wrist) * 1.15;
    const isMiddleExtended = dist2D(middleTip, wrist) > dist2D(middlePip, wrist) * 1.15;
    const isRingExtended = dist2D(ringTip, wrist) > dist2D(ringPip, wrist) * 1.15;
    const isPinkyExtended = dist2D(pinkyTip, wrist) > dist2D(pinkyPip, wrist) * 1.15;
    const isThumbExtended = dist2D(thumbTip, middleMcp) > handScale * 0.9;

    const extendedCount =
      (isIndexExtended ? 1 : 0) +
      (isMiddleExtended ? 1 : 0) +
      (isRingExtended ? 1 : 0) +
      (isPinkyExtended ? 1 : 0) +
      (isThumbExtended ? 1 : 0);

    // Pinch calculation
    const pinchDist = dist3D(thumbTip, indexTip) / handScale;
    const isPinching = pinchDist < 0.42;

    // Hand movement delta for 3D rotation
    if (this.prevWristPos) {
      const dx = (wrist.x - this.prevWristPos.x) * 14;
      const dy = (wrist.y - this.prevWristPos.y) * 14;
      this.rotationVelocity.x = this.rotationVelocity.x * 0.7 + dx * 0.3;
      this.rotationVelocity.y = this.rotationVelocity.y * 0.7 + dy * 0.3;
    }
    this.prevWristPos = { x: wrist.x, y: wrist.y };

    let detectedGesture: GestureType = 'idle';
    let targetExpansion = 1.0;
    let targetCharge = 0.0;
    let confidence = 0.85;

    const now = performance.now();

    // Check Thumbs Up (Thumb points up, all other fingers curled)
    const isThumbUp =
      isThumbExtended &&
      thumbTip.y < indexPip.y &&
      !isIndexExtended &&
      !isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended;

    // Check Peace / V-Sign (Index & Middle extended, Ring & Pinky curled)
    const isPeace =
      isIndexExtended &&
      isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended &&
      pinchDist > 0.6;

    // Check Pointing (Only Index extended)
    const isPointing =
      isIndexExtended &&
      !isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended;

    // Check Fist (All 4 non-thumb curled, or all curled)
    const isFist =
      !isIndexExtended &&
      !isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended;

    // Check Open Palm (All 5 extended and spread)
    const isOpenPalm =
      extendedCount >= 4 &&
      pinchDist > 0.7;

    // Two-hand distance
    let twoHandDistRatio = 1.0;
    if (isTwoHands && hand2) {
      const wrist2 = hand2[0];
      const distBetweenHands = dist2D(wrist, wrist2);
      twoHandDistRatio = Math.min(2.8, Math.max(0.4, distBetweenHands / 0.35));
    }

    if (isPinching) {
      detectedGesture = 'pinch';
      // Pinch condenses particles (shrink expansion to 0.35)
      targetExpansion = Math.max(0.2, pinchDist * 1.5);
      confidence = Math.max(0.7, 1 - pinchDist);
    } else if (isFist) {
      detectedGesture = 'fist';
      // Fist charges energy up to 1.0 rapidly
      targetCharge = 1.0;
      targetExpansion = 0.8;
      confidence = 0.95;
    } else if (isPeace) {
      detectedGesture = 'peace';
      targetExpansion = 1.1;
      confidence = 0.9;
      // Trigger template morphing with debounce
      if (now - this.lastTemplateSwitchTime > 1400) {
        this.lastTemplateSwitchTime = now;
        if (this.onTemplateTrigger) {
          this.onTemplateTrigger();
        }
      }
    } else if (isThumbUp) {
      detectedGesture = 'thumbs_up';
      targetExpansion = 2.2;
      targetCharge = 0.85;
      confidence = 0.9;
      if (now - this.lastTemplateSwitchTime > 1600) {
        this.lastTemplateSwitchTime = now;
        if (this.onFireworksTrigger) {
          this.onFireworksTrigger();
        }
      }
    } else if (isOpenPalm) {
      detectedGesture = 'open_palm';
      // Open palm blooms outward
      targetExpansion = isTwoHands ? 1.8 * twoHandDistRatio : 1.7;
      targetCharge = 0.2;
      confidence = 0.92;
    } else if (isPointing) {
      detectedGesture = 'pointing';
      targetExpansion = 1.0;
      confidence = 0.88;
    } else {
      detectedGesture = 'idle';
      targetExpansion = 1.0;
      targetCharge = 0.0;
      confidence = 0.6;
    }

    // Apply smooth filtering (EMA)
    const expansionLerpSpeed = isFist ? 0.08 : 0.12;
    const chargeLerpSpeed = isFist ? 0.15 : 0.08;
    this.smoothedExpansion += (targetExpansion - this.smoothedExpansion) * expansionLerpSpeed;
    this.smoothedCharge += (targetCharge - this.smoothedCharge) * chargeLerpSpeed;

    // Convert hand coordinates to normalized 3D viewport coordinates [-1, 1]
    // WebCam is mirrored horizontally
    const handX = (0.5 - indexTip.x) * 2;
    const handY = (0.5 - indexTip.y) * 2;
    const handZ = (indexTip.z || 0) * 4;

    return {
      type: detectedGesture,
      confidence,
      handCount: landmarksArray.length,
      expansion: this.smoothedExpansion,
      charge: this.smoothedCharge,
      handPosition: { x: handX, y: handY, z: handZ },
      pinchDistance: pinchDist,
      isTwoHands,
      twoHandDistance: twoHandDistRatio,
      rotationDelta: { ...this.rotationVelocity },
    };
  }

  public reset() {
    this.smoothedExpansion = 1.0;
    this.smoothedCharge = 0.0;
    this.prevWristPos = null;
    this.rotationVelocity = { x: 0, y: 0 };
  }
}
