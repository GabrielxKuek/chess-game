import { useRef, useState, useEffect } from "react";
import { initialBoard } from "../../Constants";
import { Piece, Position } from "../../models";
import { Board } from "../../models/Board";
import { Pawn } from "../../models/Pawn";
import { PieceType, TeamType } from "../../Types";
import Chessboard from "../Chessboard/Chessboard";
import CardGameBoard from "../CardGame/CardGameBoard";
import { Howl } from "howler";
import { getAIMove } from "../../services/ChessAI";
import "./Referee.css";
import {
  bishopMove,
  kingMove,
  knightMove,
  pawnMove,
  queenMove,
  rookMove,
} from "../../referee/rules";

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
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [kingCaptured, setKingCaptured] = useState(false); 
  
  const modalRef = useRef<HTMLDivElement>(null);
  const checkmateModalRef = useRef<HTMLDivElement>(null);
  
  const [cards, setCards] = useState<CardData[]>([
    { id: "card-1", image: "./cards/ace.png", position: { x: 100, y: 200 } },
    { id: "card-2", image: "./cards/blueeyes.jpg", position: { x: 200, y: 200 } },
    { id: "card-3", image: "./cards/pawn.jpg", position: { x: 300, y: 200 } },
    { id: "card-4", image: "./cards/pawn.jpg", position: { x: 400, y: 200 } },
    { id: "card-5", image: "./cards/diamond.png", position: { x: 500, y: 200 } },
    { id: "card-6", image: "./cards/pawn.jpg", position: { x: 150, y: 350 } },
    { id: "card-7", image: "./cards/pawn.jpg", position: { x: 250, y: 350 } },
    { id: "card-8", image: "./cards/pawn.jpg", position: { x: 350, y: 350 } },
  ]);

  useEffect(() => {
    if (kingCaptured) {
      setTimeout(() => {
        setKingCaptured(false);
      }, 4000)
    }
  }, [kingCaptured])

  // Trigger AI move when it's opponent's turn
  useEffect(() => {
    if (board.currentTeam === TeamType.OPPONENT && !isAIThinking && !board.winningTeam) {
      makeAIMove();
    }
  }, [board.totalTurns]);

  function checkKingCapture(capturedPiece: Piece | undefined) {
    if (capturedPiece?.isKing) {
      console.log(`${capturedPiece.team === TeamType.OUR ? 'Player' : 'AI'} king was captured!`);
      setKingCaptured(true);
    }
  }

  async function makeAIMove() {
    setIsAIThinking(true);
    
    try {
      const { piece, destination } = await getAIMove(board.pieces);
      
      console.log(`AI moving ${piece.type} from (${piece.position.x},${piece.position.y}) to (${destination.x},${destination.y})`);
      
      // CHECK IF AI IS CAPTURING A PIECE
      const capturedPiece = board.pieces.find(p => 
        p.samePosition(destination) && p.team === TeamType.OUR
      );
      
      // Execute AI move
      setBoard((prevBoard) => {
        const clonedBoard = prevBoard.clone();
        clonedBoard.totalTurns += 1;
        clonedBoard.playAIMove(piece, destination);
        
        if (capturedPiece) {
          captureSound.play();
          checkKingCapture(capturedPiece);
        } else {
          moveSound.play();
        }
        
        if (clonedBoard.winningTeam !== undefined) {
          checkmateModalRef.current?.classList.remove("hidden");
          checkmateSound.play();
        }
        
        return clonedBoard;
      });
      
    } catch (error) {
      console.error('AI move failed, making random move:', error);
      
      // Fallback: Make a random move
      const opponentPieces = board.pieces.filter(p => p.team === TeamType.OPPONENT);
      
      if (opponentPieces.length > 0) {
        const randomPiece = opponentPieces[Math.floor(Math.random() * opponentPieces.length)];
        const randomX = Math.floor(Math.random() * 8);
        const randomY = Math.floor(Math.random() * 8);
        const randomDestination = new Position(randomX, randomY);
        
        // CHECK IF RANDOM MOVE CAPTURES A PIECE
        const capturedPiece = board.pieces.find(p => 
          p.samePosition(randomDestination) && p.team === TeamType.OUR
        );
        
        console.log(`Random fallback: Moving ${randomPiece.type} from (${randomPiece.position.x},${randomPiece.position.y}) to (${randomX},${randomY})`);
        
        // Execute random AI move
        setBoard((prevBoard) => {
          const clonedBoard = prevBoard.clone();
          clonedBoard.totalTurns += 1;
          clonedBoard.playAIMove(randomPiece, randomDestination);
          
          if (capturedPiece) {
            captureSound.play();
            checkKingCapture(capturedPiece);
          } else {
            moveSound.play();
          }
          
          if (clonedBoard.winningTeam !== undefined) {
            checkmateModalRef.current?.classList.remove("hidden");
            checkmateSound.play();
          }
          
          return clonedBoard;
        });
      }
    } finally {
      setIsAIThinking(false);
    }
  }

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
    console.log('Attempting move:', {
      piece: playedPiece.type,
      team: playedPiece.team,
      from: `(${playedPiece.position.x}, ${playedPiece.position.y})`,
      to: `(${destination.x}, ${destination.y})`,
      possibleMoves: playedPiece.possibleMoves,
      currentTurn: board.totalTurns,
      currentTeam: board.currentTeam
    });

    // Player can only move OUR team pieces
    if (playedPiece.team !== TeamType.OUR) {
      console.log('❌ Wrong team!');
      return false;
    }
    
    // Player can only move on odd turns
    if (board.totalTurns % 2 !== 1) {
      console.log('❌ Wrong turn!');
      return false;
    }
    
    // Check if piece has possible moves
    if (playedPiece.possibleMoves === undefined) {
      console.log('❌ No possible moves!');
      return false;
    }

    // Validate move is in possibleMoves array
    const validMove = playedPiece.possibleMoves?.some((m) =>
      m.samePosition(destination)
    );

    if (!validMove) {
      console.log('❌ Invalid move! Possible moves:', playedPiece.possibleMoves);
      return false;
    }
    
    console.log('✅ Valid move!');

    let playedMoveIsValid = false;

    const enPassantMove = isEnPassantMove(
      playedPiece.position,
      destination,
      playedPiece.type,
      playedPiece.team
    );

    // CHECK IF THERE'S A PIECE AT THE DESTINATION (CAPTURE!)
    const capturedPiece = board.pieces.find(p => 
      p.samePosition(destination) && p.team === TeamType.OPPONENT
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
        if (capturedPiece) {
          captureSound.play();
          checkKingCapture(capturedPiece);
        } else {
          moveSound.play();
        }
      }

      if (clonedBoard.winningTeam !== undefined) {
        checkmateModalRef.current?.classList.remove("hidden");
        checkmateSound.play();
      }

      return clonedBoard;
    });

    let promotionRow = 7;

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
    setKingCaptured(false);
    setBoard(initialBoard.clone());
  }

  return (
    <div className="referee-container">
      {kingCaptured && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #8B0000, #FF0000)',
            color: 'white',
            padding: '60px 80px',
            fontSize: '48px',
            fontWeight: 'bold',
            borderRadius: '20px',
            boxShadow: '0 0 50px rgba(255, 0, 0, 0.5)',
            textAlign: 'center',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            👑 KING CAPTURED! 👑
          </div>
        </div>
      )}
      
      {isAIThinking && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#FFD700',
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          zIndex: 1000
        }}>
          🤖 AI is thinking...
        </div>
      )}
      
      <p style={{ color: "white", fontSize: "24px", textAlign: "center" }}>
        Total turns: {board.totalTurns} | {board.currentTeam === TeamType.OUR ? "Your Turn" : "AI's Turn"}
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
              {board.winningTeam === TeamType.OUR ? "YOU (white)" : "AI (black)"}!
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