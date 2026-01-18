import { useEffect, useRef } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

interface HandGestureDetectorProps {
  onPrayingDetected: () => void;
  isActive?: boolean;
  showVideo?: boolean;
}

export default function HandGestureDetector({
  onPrayingDetected,
  isActive = true,
  showVideo = false,
}: HandGestureDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const lastTriggerTime = useRef(0);
  const TRIGGER_COOLDOWN = 3000; // 3 seconds

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (handsRef.current && videoRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    camera.start();
    cameraRef.current = camera;

    return () => {
      cameraRef.current?.stop();
      handsRef.current?.close();
      cameraRef.current = null;
      handsRef.current = null;
    };
  }, [isActive]);

  const calculateDistance = (p1: any, p2: any) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const isPrayingGesture = (hands: any[]) => {
    if (hands.length !== 2) return false;

    const [left, right] = hands;

    const leftPalm = left[9];
    const rightPalm = right[9];

    const palmsClose = calculateDistance(leftPalm, rightPalm) < 0.50;

    const fingerTips = [4, 8, 12, 16, 20];

    const leftUp = fingerTips.every(i => left[i].y < left[0].y);
    const rightUp = fingerTips.every(i => right[i].y < right[0].y);

    const aligned = Math.abs(leftPalm.y - rightPalm.y) < 0.1;

    let touching = 0;
    for (let i of fingerTips) {
      if (calculateDistance(left[i], right[i]) < 0.08) {
        touching++;
      }
    }

    return palmsClose && leftUp && rightUp && aligned && touching >= 3;
  };

  const onResults = (results: Results) => {
    if (!canvasRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw the video frame
    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // Draw hand landmarks
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Draw connections (lines between joints)
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2
        });
        
        // Draw landmarks (dots on joints)
        drawLandmarks(canvasCtx, landmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 3
        });
      }

      // Check for praying gesture
      const praying = isPrayingGesture(results.multiHandLandmarks);

      if (praying) {
        const now = Date.now();
        if (now - lastTriggerTime.current > TRIGGER_COOLDOWN) {
          lastTriggerTime.current = now;
          onPrayingDetected();
        }
      }
    }

    canvasCtx.restore();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      zIndex: 10001,
      display: showVideo ? 'block' : 'none',
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          visibility: 'hidden',
          width: '320px',
          height: '240px',
        }}
      />
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        style={{
          border: '2px solid red',
          width: '320px',
          height: '240px',
        }}
      />
    </div>
  );
}