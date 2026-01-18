import { useEffect, useRef, useState } from 'react';
import './VisualNovelModal.css';

export interface DialogueLine {
  character?: string;
  text: string;
  image?: string;
  imageOpen?: string; // For mouth animation
}

interface VisualNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: DialogueLine[];
  currentIndex?: number;
  onNext?: () => void;
  onPrevious?: () => void;
  autoClose?: boolean;
  className?: string;
}

export default function VisualNovelModal({ 
  isOpen, 
  onClose, 
  dialogue,
  currentIndex = 0,
  onNext,
  onPrevious,
  autoClose = true,
  className = ''
}: VisualNovelModalProps) {
  const [index, setIndex] = useState(currentIndex);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (!isOpen) {
      setIndex(0);
      setDisplayedText('');
    }
  }, [isOpen]);

  // Typewriter effect
  useEffect(() => {
    if (!isOpen || !dialogue.length) return;

    const currentLine = dialogue[index];
    setDisplayedText('');
    setIsTyping(true);
    
    let charIndex = 0;
    const typeSpeed = 50; // milliseconds per character
    const mouthFlipSpeed = 150; // how often to toggle mouth

    // Start mouth animation if character has imageOpen
    let mouthInterval: NodeJS.Timeout | undefined;
    if (currentLine.imageOpen) {
      mouthInterval = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, mouthFlipSpeed);
    }

    const typeNextChar = () => {
      if (charIndex < currentLine.text.length) {
        setDisplayedText(currentLine.text.slice(0, charIndex + 1));
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeNextChar, typeSpeed);
      } else {
        setIsTyping(false);
        setMouthOpen(false);
        if (mouthInterval) clearInterval(mouthInterval);
      }
    };

    typeNextChar();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (mouthInterval) {
        clearInterval(mouthInterval);
      }
      setMouthOpen(false);
    };
  }, [isOpen, index, dialogue]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (isTyping) {
          // Skip to end of current text
          skipTyping();
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, index, dialogue.length, isTyping]);

  const skipTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    const currentLine = dialogue[index];
    setDisplayedText(currentLine.text);
    setIsTyping(false);
    setMouthOpen(false);
  };

  const handleNext = () => {
    if (index < dialogue.length - 1) {
      const newIndex = index + 1;
      setIndex(newIndex);
      onNext?.();
    } else if (autoClose) {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (index > 0) {
      const newIndex = index - 1;
      setIndex(newIndex);
      onPrevious?.();
    }
  };

  if (!isOpen || !dialogue.length) return null;

  const currentLine = dialogue[index];
  const isFirst = index === 0;
  const isLast = index === dialogue.length - 1;
  
  // Use open mouth image while typing, otherwise use closed mouth
  const currentImage = (isTyping && mouthOpen && currentLine.imageOpen) 
    ? currentLine.imageOpen 
    : currentLine.image;

  return (
    <div 
      ref={modalRef}
      className={`vn-modal ${className}`}
    >
      <div className="vn-content">
        <button className="vn-close-button" onClick={onClose}>
          ✕
        </button>

        <div className="vn-dialogue-container">
          {currentImage && (
            <div className="vn-character">
              <img 
                src={currentImage} 
                alt={currentLine.character || 'Character'} 
                className={isTyping ? 'vn-character-talking' : ''}
              />
            </div>
          )}
          
          <div className="vn-text-container">
            {currentLine.character && (
              <div className="vn-character-name">
                {currentLine.character}
              </div>
            )}
            <div className="vn-text">
              {displayedText}
              {isTyping && <span className="vn-cursor">▌</span>}
            </div>
            
            <div className="vn-controls">
              <button 
                className="vn-nav-button"
                onClick={handlePrevious}
                disabled={isFirst}
              >
                ← Previous
              </button>
              
              <span className="vn-progress">
                {index + 1} / {dialogue.length}
              </span>
              
              <button 
                className="vn-nav-button"
                onClick={isTyping ? skipTyping : handleNext}
              >
                {isTyping ? 'Skip' : (isLast ? (autoClose ? 'Close' : 'Finish') : 'Next →')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}