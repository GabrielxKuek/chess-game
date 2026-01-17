import { useEffect, useRef } from 'react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameScriptPath: string;
  canvasId?: string;
  title?: string;
  className?: string;
}

export default function Modal({ 
  isOpen, 
  onClose, 
  gameScriptPath,
  canvasId = 'kaboom-canvas',
  title,
  className = ''
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameInitialized = useRef(false);
    const scriptId = useRef(`kaboom-game-${Date.now()}`);

    useEffect(() => {
        if (!isOpen) return;

        const initGame = () => {
            if (gameInitialized.current) return;
            
            // Check if Kaboom library is already loaded
            const kaboomExists = document.getElementById("kaboom-lib");
            
            if (!kaboomExists) {
                const kaboomScript = document.createElement("script");
                kaboomScript.id = "kaboom-lib";
                kaboomScript.src = "https://unpkg.com/kaboom@3000.0.0-beta.2/dist/kaboom.js";
                
                kaboomScript.onload = () => {
                    loadGameScript();
                };
                
                document.body.appendChild(kaboomScript);
            } else {
                loadGameScript();
            }
        };

        const loadGameScript = () => {
            // Remove old game script if exists
            const oldGameScript = document.getElementById(scriptId.current);
            if (oldGameScript) {
                oldGameScript.remove();
            }

            const gameScript = document.createElement("script");
            gameScript.id = scriptId.current;
            gameScript.src = gameScriptPath;
            gameScript.setAttribute('data-canvas-id', canvasId);
            
            document.body.appendChild(gameScript);
            gameInitialized.current = true;
        };

        setTimeout(initGame, 100);

        // Cleanup when modal closes
        return () => {
            const gameScript = document.getElementById(scriptId.current);
            if (gameScript) {
                gameScript.remove();
            }
            
            // Remove any dynamically created canvas
            const dynamicCanvas = document.querySelector('canvas:not(#' + canvasId + ')');
            if (dynamicCanvas && dynamicCanvas.parentElement === document.body) {
                dynamicCanvas.remove();
            }
            
            gameInitialized.current = false;
        };
    }, [isOpen, gameScriptPath, canvasId]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Close when clicking backdrop
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === modalRef.current) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            ref={modalRef}
            className={`modal-backdrop ${className}`}
            onClick={handleBackdropClick}
        >
            <div className="modal-content">
                <button className="close-button" onClick={onClose}>
                    ✕
                </button>
                
                {title && (
                    <div className="modal-header">
                        <h2>{title}</h2>
                    </div>
                )}
                
                <div className="game-container">
                    <canvas ref={canvasRef} id={canvasId}></canvas>
                </div>
            </div>
        </div>
    );
}