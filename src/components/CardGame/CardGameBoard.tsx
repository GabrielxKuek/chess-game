import { useRef, useState } from "react";
import "./CardGameBoard.css";
import Card from "./Card";

// You'll need to define these based on your game logic
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
  const [activeCard, setActiveCard] = useState<HTMLElement | null>(null);
  const [grabPosition, setGrabPosition] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const boardRef = useRef<HTMLDivElement>(null);

  function grabCard(e: React.MouseEvent) {
    const element = e.target as HTMLElement;
    const board = boardRef.current;
    
    if (element.classList.contains("card") && board) {
      setGrabPosition({
        x: e.clientX - board.offsetLeft,
        y: e.clientY - board.offsetTop
      });

      const x = e.clientX - 50;
      const y = e.clientY - 70;
      element.style.position = "absolute";
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.zIndex = "1000";

      setActiveCard(element);
    }
  }

  function moveCard(e: React.MouseEvent) {
    const board = boardRef.current;
    if (activeCard && board) {
      const minX = board.offsetLeft - 25;
      const minY = board.offsetTop - 25;
      const maxX = board.offsetLeft + board.clientWidth - 75;
      const maxY = board.offsetTop + board.clientHeight - 115;
      const x = e.clientX - 50;
      const y = e.clientY - 70;
      
      activeCard.style.position = "absolute";

      if (x < minX) {
        activeCard.style.left = `${minX}px`;
      } else if (x > maxX) {
        activeCard.style.left = `${maxX}px`;
      } else {
        activeCard.style.left = `${x}px`;
      }

      if (y < minY) {
        activeCard.style.top = `${minY}px`;
      } else if (y > maxY) {
        activeCard.style.top = `${maxY}px`;
      } else {
        activeCard.style.top = `${y}px`;
      }
    }
  }

  function dropCard(e: React.MouseEvent) {
    const board = boardRef.current;
    if (activeCard && board) {
      const x = e.clientX - board.offsetLeft;
      const y = e.clientY - board.offsetTop;

      const currentCard = cards.find((c) =>
        c.position.x === grabPosition.x && c.position.y === grabPosition.y
      );

      if (currentCard) {
        const success = playCard(currentCard, { x, y });

        if (!success) {
          // Reset the card position
          activeCard.style.position = "relative";
          activeCard.style.removeProperty("top");
          activeCard.style.removeProperty("left");
          activeCard.style.removeProperty("z-index");
        }
      }
      setActiveCard(null);
    }
  }

  return (
    <div
      onMouseMove={(e) => moveCard(e)}
      onMouseDown={(e) => grabCard(e)}
      onMouseUp={(e) => dropCard(e)}
      id="card-game-board"
      ref={boardRef}
    >
      <div className="card-container modal hidden">
        {cards.map((card) => (
          <Card
            key={card.id}
            image={card.image}
          />
        ))}
      </div>

      <img id="cardback" src="./cards/cardback.webp" className=""/>
    </div>
  );
}