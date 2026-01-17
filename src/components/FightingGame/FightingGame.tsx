import Modal from '../Modal/Modal';
import './FightingGame.css';

interface FightingGameProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FightingGame({ isOpen, onClose }: FightingGameProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      gameScriptPath="/main.js"
      canvasId="kaboom-canvas"
      title="Fighting Game"
      className="fighting-game-modal"
    />
  );
}