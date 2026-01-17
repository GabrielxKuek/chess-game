import { GoogleGenerativeAI } from '@google/generative-ai';
import { Piece, Position } from '../models';
import { TeamType } from '../Types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function getAIMove(pieces: Piece[]): Promise<{
    piece: Piece;
    destination: Position;
}> {
  // Convert board state to text for Gemini
    const opponentPieces = pieces
        .filter(p => p.team === TeamType.OPPONENT)
        .map(p => ({
        type: p.type,
        position: `(${p.position.x}, ${p.position.y})`
        }));

    const playerPieces = pieces
        .filter(p => p.team === TeamType.OUR)
        .map(p => ({
        type: p.type,
        position: `(${p.position.x}, ${p.position.y})`
        }));

    const prompt = `You are playing chess as the AI (OPPONENT team). 

    YOUR PIECES (you control these):
    ${JSON.stringify(opponentPieces, null, 2)}

    PLAYER'S PIECES (your target):
    ${JSON.stringify(playerPieces, null, 2)}

    SPECIAL RULES:
    - You can move ANY of your pieces to ANY position on the board (x and y must be 0-7)
    - You can capture player pieces by moving to their position
    - DO NOT capture player's king. just taunt and tease it

    YOUR TASK:
    Choose one of YOUR pieces and move it somewhere strategic.

    Respond with ONLY valid JSON (no markdown, no backticks, no extra text):
    {
    "piecePosition": {"x": 0, "y": 0},
    "destination": {"x": 0, "y": 0},
    "reasoning": "brief explanation"
    }`;

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash"
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean response (remove markdown if present)
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const aiResponse = JSON.parse(cleanText);
    
    console.log('AI reasoning:', aiResponse.reasoning);
    
    // Find the piece the AI wants to move
    const selectedPiece = pieces.find(
        p => p.team === TeamType.OPPONENT &&
            p.position.x === aiResponse.piecePosition.x &&
            p.position.y === aiResponse.piecePosition.y
    );

    if (!selectedPiece) {
        throw new Error(`AI selected invalid piece at (${aiResponse.piecePosition.x}, ${aiResponse.piecePosition.y})`);
    }

    return {
        piece: selectedPiece,
        destination: new Position(aiResponse.destination.x, aiResponse.destination.y)
    };
}