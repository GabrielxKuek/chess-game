import { useState, useEffect } from 'react';
import './CustomCursor.css';

interface CustomCursorProps {
  normalCursor: string;
  hoverCursor: string;
  grabbingCursor: string;
  armColor?: string; // Optional arm color, defaults to skin tone
  rotationOrigin?: string; // Custom rotation point - YOU CONFIGURE THIS
  angleOffset?: number; // Angle adjustment - YOU CONFIGURE THIS
}

export default function CustomCursor({ 
  normalCursor, 
  hoverCursor, 
  grabbingCursor, 
  armColor = '#FFD1A3',
  rotationOrigin = 'center center', // Default rotation point
  angleOffset = 90 // Default angle offset
}: CustomCursorProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      // Check if hovering over clickable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.classList.contains('card') ||
        target.classList.contains('chess-piece') ||
        target.closest('.card') ||
        target.closest('.chess-piece')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Use passive listeners to not interfere with game events
    window.addEventListener('mousemove', updatePosition, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Determine which cursor image to show
  const currentCursor = isClicking ? grabbingCursor : isHovering ? hoverCursor : normalCursor;

  // Calculate arm start position FIRST
  const armStartX = window.innerWidth / 2; // Center bottom of screen
  const armStartY = window.innerHeight; // Bottom of screen

  // Calculate offset to position arm at base of hand
  // Adjust these values based on where your hand's wrist is in the image
  const handOffsetDistance = 32; // Distance from center to wrist (ADJUST THIS)
  const handOffsetX = Math.cos(Math.atan2(position.y - armStartY, position.x - armStartX)) * handOffsetDistance;
  const handOffsetY = Math.sin(Math.atan2(position.y - armStartY, position.x - armStartX)) * handOffsetDistance;
  
  // Arm endpoint adjusted to wrist position
  const armEndX = position.x - handOffsetX;
  const armEndY = position.y - handOffsetY;

  // Calculate arm angle and length to the wrist
  const angle = Math.atan2(armEndY - armStartY, armEndX - armStartX) * (180 / Math.PI);

  return (
    <>
      {/* The Hand/Cursor - Now rotates with the arm! */}
      <img
        src={currentCursor}
        className="custom-cursor"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `translate(-50%, -50%) rotate(${angle + angleOffset}deg)`,
          transformOrigin: rotationOrigin,
        }}
        alt=""
        draggable={false}
      />
    </>
  );
}