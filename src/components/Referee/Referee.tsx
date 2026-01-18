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
import FightingGameModal from "../FightingGame/FightingGame";
import GandhiDialogue from "../GandhiDialogue/GandhiDialogue";
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

interface RefereeProps {
  onFightingGameStateChange: (isOpen: boolean) => void;
}

export default function Referee({ onFightingGameStateChange }: RefereeProps) {
  const [board, setBoard] = useState<Board>(initialBoard.clone());
  const [promotionPawn, setPromotionPawn] = useState<Piece>();
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [kingCaptured, setKingCaptured] = useState(false);
  const [isFightingGameOpen, setIsFightingGameOpen] = useState(false);
  const [showPrayingEffect, setShowPrayingEffect] = useState(false);
  const [isGandhiDialogueOpen, setIsGandhiDialogueOpen] = useState(false);
  const [pawnCardPlayed, setPawnCardPlayed] = useState(false);
  const [spawningPawns, setSpawningPawns] = useState<Position[]>([]);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const checkmateModalRef = useRef<HTMLDivElement>(null);
  const chessboardRef = useRef<HTMLDivElement>(null);
  
  const [cards, setCards] = useState<CardData[]>([
    { id: "card-1", image: "./cards/ace.png", position: { x: 100, y: 200 } },
    { id: "card-2", image: "./cards/blueeyes.jpeg", position: { x: 200, y: 200 } },
    { id: "card-3", image: "./cards/pawn.jpg", position: { x: 300, y: 200 } },
    { id: "card-5", image: "./cards/diamond.png", position: { x: 500, y: 200 } },
  ]);

  useEffect(() => {
    if (kingCaptured) {
      setTimeout(() => {
        setKingCaptured(false);
        setIsFightingGameOpen(true);
      }, 4000)
    }
  }, [kingCaptured])

  useEffect(() => {
    if (pawnCardPlayed) {
      setTimeout(() => {
        setPawnCardPlayed(false);
        spawnPawns();
      }, 4000)
    }
  }, [pawnCardPlayed])

  // Trigger AI move when it's opponent's turn
  useEffect(() => {
    if (board.currentTeam === TeamType.OPPONENT && !isAIThinking && !board.winningTeam) {
      makeAIMove();
    }
  }, [board.totalTurns]);

  useEffect(() => {
    const handlePrayingEvent = () => {
      setShowPrayingEffect(true);
      
      setTimeout(() => {
        setShowPrayingEffect(false);
        setIsGandhiDialogueOpen(true);
      }, 3000);
    };

    window.addEventListener('prayingDetected', handlePrayingEvent);
    return () => window.removeEventListener('prayingDetected', handlePrayingEvent);
  }, []);

  function spawnPawns() {
    const newPawnPositions: Position[] = [];
    
    // Collect all empty positions
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const position = new Position(x, y);
        const isOccupied = board.pieces.some(p => p.samePosition(position));
        
        if (!isOccupied) {
          newPawnPositions.push(position);
        }
      }
    }
    
    // Spawn pawns one by one with animation
    newPawnPositions.forEach((position, index) => {
      setTimeout(() => {
        setSpawningPawns(prev => [...prev, position]);
        
        setTimeout(() => {
          setBoard((prevBoard) => {
            const clonedBoard = prevBoard.clone();
            const newPawn = new Pawn(position, TeamType.OUR, false, false, []);
            clonedBoard.pieces = [...clonedBoard.pieces, newPawn];
            clonedBoard.calculateAllMoves();
            return clonedBoard;
          });
          
          // Remove from spawning animation
          setSpawningPawns(prev => prev.filter(p => !p.samePosition(position)));
        }, 800);
        
      }, index * 50);
    });
  }

  function checkKingCapture(capturedPiece: Piece | undefined) {
    if (capturedPiece?.isKing) {
      console.log(`${capturedPiece.team === TeamType.OUR ? 'Player' : 'AI'} king was captured!`);
      setKingCaptured(true);
    }
  }

  // Notify parent when fighting game opens/closes
  useEffect(() => {
    onFightingGameStateChange(isFightingGameOpen);
  }, [isFightingGameOpen, onFightingGameStateChange]);

  const handleGandhiSuccess = () => {
    console.log('Gandhi dialogue completed successfully!');
    // You can add rewards or special effects here
    setIsGandhiDialogueOpen(false);
  };

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
    if (card.image?.includes('pawn')) {
      console.log('Pawn card played! Playing clone video...');
      setPawnCardPlayed(true);
      
      // Remove the card from hand after using it
      setCards(prevCards => prevCards.filter(c => c.id !== card.id));
      
      return true;
    }
    
    // For other cards, just update position
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
      return false;
    }
    
    // Player can only move on odd turns
    if (board.totalTurns % 2 !== 1) {
      return false;
    }
    
    // Check if piece has possible moves
    if (playedPiece.possibleMoves === undefined) {
      return false;
    }

    // Validate move is in possibleMoves array
    const validMove = playedPiece.possibleMoves?.some((m) =>
      m.samePosition(destination)
    );

    if (!validMove) {
      return false;
    }
    

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
      {showPrayingEffect && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(255,215,0,0) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          pointerEvents: 'none',
          animation: 'prayerGlow 3s ease-out'
        }}>
          <div style={{ fontSize: '150px', animation: 'prayerPulse 1.5s ease-in-out infinite' }}>
            🙏
          </div>
        </div>
      )}

      {pawnCardPlayed && (
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
          zIndex: 3000
        }}>
          <video 
            autoPlay 
            muted 
            style={{
              maxWidth: '80%',
              maxHeight: '80%',
              borderRadius: '20px',
              boxShadow: '0 0 50px rgba(0, 255, 0, 0.5)'
            }}
          >
            <source src="/clone.mp4" type="video/mp4" />
          </video>
        </div>
      )}

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
          <video 
            autoPlay 
            muted 
            style={{
              maxWidth: '80%',
              maxHeight: '80%',
              borderRadius: '20px',
              boxShadow: '0 0 50px rgba(255, 0, 0, 0.5)'
            }}
          >
            <source src="/sharingan.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      {/* Pawn spawn animations - SEPARATE LAYER */}
      {spawningPawns.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1500
        }}>
          {spawningPawns.map((position) => {
            // Calculate screen position based on chessboard location
            const chessboardRect = chessboardRef.current?.getBoundingClientRect();
            if (!chessboardRect) return null;
            
            const tileSize = chessboardRect.width / 8;
            const left = chessboardRect.left + (position.x * tileSize);
            const top = chessboardRect.top + ((7 - position.y) * tileSize);
            
            return (
              <div
                key={`spawn-${position.x}-${position.y}`}
                style={{
                  position: 'absolute',
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${tileSize}px`,
                  height: `${tileSize}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <div className="smoke-effect">💨</div>
                <div className="pawn-spawning">♟️</div>
              </div>
            );
          })}
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
      
      {/* Game boards - NO wrapping div interfering with clicks */}
      <div className="game-boards">
        <div ref={chessboardRef}>
          <Chessboard playMove={playMove} pieces={board.pieces} />
        </div>
        <CardGameBoard cards={cards} playCard={playCard} />
      </div>

      <FightingGameModal 
        isOpen={isFightingGameOpen} 
        onClose={() => setIsFightingGameOpen(false)} 
      />

      <GandhiDialogue
        isOpen={isGandhiDialogueOpen}
        onClose={() => setIsGandhiDialogueOpen(false)}
        onSuccess={handleGandhiSuccess}
      />
    </div>
  );
}