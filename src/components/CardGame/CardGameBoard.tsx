import { useRef, useState } from "react";
import "./CardGameBoard.css";
import Card from "./Card";

interface CardData {
  id: string;
  image?: string;
  position: { x: number; y: number };
}

interface Props {
  playCard: (card: CardData, position: { x: number; y: number }) => boolean;
  cards: CardData[];
}

export default function CardGameBoard({ playCard, cards }: Props) {
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [showHand, setShowHand] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  function handleCardClick(card: CardData, e: React.MouseEvent) {
    e.stopPropagation();
    console.log('Card clicked:', card);
    
    // Play the card immediately
    playCard(card, { x: 0, y: 0 });
  }

  function toggleHand() {
    setShowHand(!showHand);
  }

  return (
    <div
      id="card-game-board"
      ref={boardRef}
    >
      <div className={`card-hand ${showHand ? 'visible' : 'hidden'}`}>
        {cards.map((card, index) => (
          <div 
            key={card.id}
            className="card-in-hand"
            onClick={(e) => handleCardClick(card, e)}
            style={{
              left: `${index * 60}px`,
              zIndex: index
            }}
          >
            <Card image={card.image} />
          </div>
        ))}
      </div>

      <img 
        id="cardback" 
        src="./cards/cardback.webp" 
        onClick={toggleHand}
        style={{ cursor: 'pointer' }}
        alt="Card Deck"
      />
    </div>
  );
}