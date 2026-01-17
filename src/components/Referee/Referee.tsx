import { useRef, useState } from "react";
import { initialBoard } from "../../Constants";
import { Piece, Position } from "../../models";
import { Board } from "../../models/Board";
import { Pawn } from "../../models/Pawn";
import {
  bishopMove,
  kingMove,
  knightMove,
  pawnMove,
  queenMove,
  rookMove,
} from "../../referee/rules";
import { PieceType, TeamType } from "../../Types";
import Chessboard from "../Chessboard/Chessboard";
import CardGameBoard from "../CardGame/CardGameBoard";
import { Howl } from "howler";
import "./Referee.css";

interface CardData {
  id: string;
  image?: string;
  position: { x: number; y: number };
}

const moveSound = new Howl({
  src: ["/sounds/move-self.mp3"],
});

const captureSound = new Howl({
  src: ["/sounds/capture.mp3"],
});

const checkmateSound = new Howl({
  src: ["/sounds/move-check.mp3"],
});

export default function Referee() {
  const [board, setBoard] = useState<Board>(initialBoard.clone());
  const [promotionPawn, setPromotionPawn] = useState<Piece>();
  const modalRef = useRef<HTMLDivElement>(null);
  const checkmateModalRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<CardData[]>([
    { 
      id: "card-1", 
      image: "./cards/ace.png", 
      position: { x: 100, y: 200 } 
    },
    { 
      id: "card-2", 
      image: "./cards/blueeyes.jpg", 
      position: { x: 200, y: 200 } 
    },
    { 
      id: "card-3", 
      image: "./cards/pawn.jpg", 
      position: { x: 300, y: 200 } 
    },
    { 
      id: "card-4", 
      image: "./cards/pawn.jpg", 
      position: { x: 400, y: 200 } 
    },
    { 
      id: "card-5", 
      image: "./cards/diamond.png", 
      position: { x: 500, y: 200 } 
    },
    { 
      id: "card-6", 
      image: "./cards/pawn.jpg", 
      position: { x: 150, y: 350 } 
    },
    { 
      id: "card-7", 
      image: "./cards/pawn.jpg", 
      position: { x: 250, y: 350 } 
    },
    { 
      id: "card-8", 
      image: "./cards/pawn.jpg", 
      position: { x: 350, y: 350 } 
    },
  ]);

  function playCard(card: CardData, position: { x: number; y: number }): boolean {
    console.log(`Playing card ${card.id} at position:`, position);
    
    const isValidMove = true;
    
    if (isValidMove) {
      setCards(prevCards =>
        prevCards.map(c =>
          c.id === card.id
            ? { ...c, position: position }
            : c
        )
      );
      return true;
    }
    
    return false;
  }

  function playMove(playedPiece: Piece, destination: Position): boolean {      
    if (playedPiece.possibleMoves === undefined) return false;

    if (playedPiece.team === TeamType.OUR && board.totalTurns % 2 !== 1)
      return false;
    if (playedPiece.team === TeamType.OPPONENT && board.totalTurns % 2 !== 0)
      return false;

    let playedMoveIsValid = false;

    const validMove = playedPiece.possibleMoves?.some((m) =>
      m.samePosition(destination)
    );

    if (!validMove) return false;

    const enPassantMove = isEnPassantMove(
      playedPiece.position,
      destination,
      playedPiece.type,
      playedPiece.team
    );

    setBoard(() => {
      const clonedBoard = board.clone();
      clonedBoard.totalTurns += 1;
      playedMoveIsValid = clonedBoard.playMove(
        enPassantMove,
        validMove,
        playedPiece,
        destination
      );

      if (playedMoveIsValid) {
        moveSound.play();
      }

      if (clonedBoard.winningTeam !== undefined) {
        checkmateModalRef.current?.classList.remove("hidden");
        checkmateSound.play();
      }

      return clonedBoard;
    });

    let promotionRow = playedPiece.team === TeamType.OUR ? 7 : 0;

    if (destination.y === promotionRow && playedPiece.isPawn) {
      modalRef.current?.classList.remove("hidden");
      setPromotionPawn((previousPromotionPawn) => {
        const clonedPlayedPiece = playedPiece.clone();
        clonedPlayedPiece.position = destination.clone();
        return clonedPlayedPiece;
      });
    }

    return playedMoveIsValid;
  }

  function isEnPassantMove(
    initialPosition: Position,
    desiredPosition: Position,
    type: PieceType,
    team: TeamType
  ) {
    const pawnDirection = team === TeamType.OUR ? 1 : -1;

    if (type === PieceType.PAWN) {
      if (
        (desiredPosition.x - initialPosition.x === -1 ||
          desiredPosition.x - initialPosition.x === 1) &&
        desiredPosition.y - initialPosition.y === pawnDirection
      ) {
        const piece = board.pieces.find(
          (p) =>
            p.position.x === desiredPosition.x &&
            p.position.y === desiredPosition.y - pawnDirection &&
            p.isPawn &&
            (p as Pawn).enPassant
        );
        if (piece) {
          return true;
        }
      }
    }

    return false;
  }

  function isValidMove(
    initialPosition: Position,
    desiredPosition: Position,
    type: PieceType,
    team: TeamType
  ) {
    let validMove = false;
    switch (type) {
      case PieceType.PAWN:
        validMove = pawnMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.KNIGHT:
        validMove = knightMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.BISHOP:
        validMove = bishopMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.ROOK:
        validMove = rookMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.QUEEN:
        validMove = queenMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.KING:
        validMove = kingMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
    }

    return validMove;
  }

  function promotePawn(pieceType: PieceType) {
    if (promotionPawn === undefined) {
      return;
    }

    setBoard((previousBoard) => {
      const clonedBoard = board.clone();
      clonedBoard.pieces = clonedBoard.pieces.reduce((results, piece) => {
        if (piece.samePiecePosition(promotionPawn)) {
          results.push(
            new Piece(piece.position.clone(), pieceType, piece.team, true)
          );
        } else {
          results.push(piece);
        }
        return results;
      }, [] as Piece[]);

      clonedBoard.calculateAllMoves();

      return clonedBoard;
    });

    modalRef.current?.classList.add("hidden");
  }

  function promotionTeamType() {
    return promotionPawn?.team === TeamType.OUR ? "w" : "b";
  }

  function restartGame() {
    checkmateModalRef.current?.classList.add("hidden");
    setBoard(initialBoard.clone());
  }

  return (
    <div className="referee-container">
      <p style={{ color: "white", fontSize: "24px", textAlign: "center" }}>
        Total turns: {board.totalTurns}
      </p>
      
      <div className="modal hidden" ref={modalRef}>
        <div className="modal-body">
          <img
            onClick={() => promotePawn(PieceType.ROOK)}
            src={`/assets/images/rook_${promotionTeamType()}.png`}
          />
          <img
            onClick={() => promotePawn(PieceType.BISHOP)}
            src={`/assets/images/bishop_${promotionTeamType()}.png`}
          />
          <img
            onClick={() => promotePawn(PieceType.KNIGHT)}
            src={`/assets/images/knight_${promotionTeamType()}.png`}
          />
          <img
            onClick={() => promotePawn(PieceType.QUEEN)}
            src={`/assets/images/queen_${promotionTeamType()}.png`}
          />
        </div>
      </div>
      
      <div className="modal hidden" ref={checkmateModalRef}>
        <div className="modal-body">
          <div className="checkmate-body">
            <span>
              The winning team is{" "}
              {board.winningTeam === TeamType.OUR ? "white" : "black"}!
            </span>
            <button onClick={restartGame}>Play again</button>
          </div>
        </div>
      </div>
      
      <div className="game-boards">
        <Chessboard playMove={playMove} pieces={board.pieces} />
        <CardGameBoard cards={cards} playCard={playCard} />
      </div>
    </div>
  );
}