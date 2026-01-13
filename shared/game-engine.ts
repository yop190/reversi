/**
 * Pure Game Engine - Shared between Frontend and Backend
 * Contains all Reversi game logic with no side effects
 */

import { BOARD_SIZE, CellState, PlayerColor, Position, GameState } from './game.types';

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1],  [1, 0], [1, 1]
];

/**
 * Create a new empty board with initial piece placement
 */
export function createInitialBoard(): CellState[][] {
  const board: CellState[][] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    board[i] = new Array(BOARD_SIZE).fill(CellState.Empty);
  }
  
  // Initial four pieces in center
  const mid = BOARD_SIZE / 2;
  board[mid - 1][mid - 1] = CellState.White;
  board[mid - 1][mid] = CellState.Black;
  board[mid][mid - 1] = CellState.Black;
  board[mid][mid] = CellState.White;
  
  return board;
}

/**
 * Create initial game state
 */
export function createInitialGameState(): GameState {
  const board = createInitialBoard();
  const validMoves = getValidMoves(board, PlayerColor.Black);
  
  return {
    board,
    currentTurn: PlayerColor.Black,
    blackScore: 2,
    whiteScore: 2,
    gameOver: false,
    winner: null,
    lastMove: null,
    validMoves
  };
}

/**
 * Convert PlayerColor to CellState
 */
export function colorToCellState(color: PlayerColor): CellState {
  return color === PlayerColor.Black ? CellState.Black : CellState.White;
}

/**
 * Convert CellState to PlayerColor
 */
export function cellStateToColor(state: CellState): PlayerColor | null {
  if (state === CellState.Black) return PlayerColor.Black;
  if (state === CellState.White) return PlayerColor.White;
  return null;
}

/**
 * Get the opponent color
 */
export function getOpponentColor(color: PlayerColor): PlayerColor {
  return color === PlayerColor.Black ? PlayerColor.White : PlayerColor.Black;
}

/**
 * Check if a position is within the board bounds
 */
export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Get pieces that would be flipped by a move
 */
export function getFlippedPieces(
  board: CellState[][],
  row: number,
  col: number,
  playerColor: PlayerColor
): Position[] {
  const playerState = colorToCellState(playerColor);
  const opponentState = colorToCellState(getOpponentColor(playerColor));
  const flipped: Position[] = [];
  
  if (board[row][col] !== CellState.Empty) {
    return flipped;
  }
  
  for (const [dr, dc] of DIRECTIONS) {
    const directionFlipped: Position[] = [];
    let r = row + dr;
    let c = col + dc;
    
    // Move in this direction while we see opponent pieces
    while (isValidPosition(r, c) && board[r][c] === opponentState) {
      directionFlipped.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    
    // If we end on our own piece and flipped at least one, it's valid
    if (directionFlipped.length > 0 && isValidPosition(r, c) && board[r][c] === playerState) {
      flipped.push(...directionFlipped);
    }
  }
  
  return flipped;
}

/**
 * Check if a move is valid
 */
export function isValidMove(
  board: CellState[][],
  row: number,
  col: number,
  playerColor: PlayerColor
): boolean {
  if (!isValidPosition(row, col)) return false;
  if (board[row][col] !== CellState.Empty) return false;
  return getFlippedPieces(board, row, col, playerColor).length > 0;
}

/**
 * Get all valid moves for a player
 */
export function getValidMoves(board: CellState[][], playerColor: PlayerColor): Position[] {
  const moves: Position[] = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isValidMove(board, row, col, playerColor)) {
        moves.push({ row, col });
      }
    }
  }
  
  return moves;
}

/**
 * Apply a move to the board and return the new board state
 */
export function applyMove(
  board: CellState[][],
  row: number,
  col: number,
  playerColor: PlayerColor
): { newBoard: CellState[][]; flipped: Position[] } {
  const flipped = getFlippedPieces(board, row, col, playerColor);
  const playerState = colorToCellState(playerColor);
  
  // Clone the board
  const newBoard = board.map(r => [...r]);
  
  // Place the new piece
  newBoard[row][col] = playerState;
  
  // Flip captured pieces
  for (const pos of flipped) {
    newBoard[pos.row][pos.col] = playerState;
  }
  
  return { newBoard, flipped };
}

/**
 * Calculate scores
 */
export function calculateScores(board: CellState[][]): { blackScore: number; whiteScore: number } {
  let blackScore = 0;
  let whiteScore = 0;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === CellState.Black) blackScore++;
      else if (board[row][col] === CellState.White) whiteScore++;
    }
  }
  
  return { blackScore, whiteScore };
}

/**
 * Check if the game is over
 */
export function isGameOver(board: CellState[][]): boolean {
  const blackMoves = getValidMoves(board, PlayerColor.Black);
  const whiteMoves = getValidMoves(board, PlayerColor.White);
  return blackMoves.length === 0 && whiteMoves.length === 0;
}

/**
 * Determine the winner
 */
export function determineWinner(board: CellState[][]): PlayerColor | 'draw' | null {
  if (!isGameOver(board)) return null;
  
  const { blackScore, whiteScore } = calculateScores(board);
  
  if (blackScore > whiteScore) return PlayerColor.Black;
  if (whiteScore > blackScore) return PlayerColor.White;
  return 'draw';
}

/**
 * Process a move and return the updated game state
 */
export function processMove(
  gameState: GameState,
  row: number,
  col: number,
  playerColor: PlayerColor
): { success: boolean; newState: GameState; error?: string } {
  // Validate it's the player's turn
  if (gameState.currentTurn !== playerColor) {
    return { success: false, newState: gameState, error: 'Not your turn' };
  }
  
  // Validate game is not over
  if (gameState.gameOver) {
    return { success: false, newState: gameState, error: 'Game is over' };
  }
  
  // Validate the move
  if (!isValidMove(gameState.board, row, col, playerColor)) {
    return { success: false, newState: gameState, error: 'Invalid move' };
  }
  
  // Apply the move
  const { newBoard } = applyMove(gameState.board, row, col, playerColor);
  const scores = calculateScores(newBoard);
  const nextPlayer = getOpponentColor(playerColor);
  const nextValidMoves = getValidMoves(newBoard, nextPlayer);
  
  // Check if next player can move, if not check if current player can
  let actualNextTurn = nextPlayer;
  let actualValidMoves = nextValidMoves;
  
  if (nextValidMoves.length === 0) {
    const currentPlayerMoves = getValidMoves(newBoard, playerColor);
    if (currentPlayerMoves.length > 0) {
      // Next player must pass, current player goes again
      actualNextTurn = playerColor;
      actualValidMoves = currentPlayerMoves;
    }
  }
  
  const gameOver = isGameOver(newBoard);
  const winner = gameOver ? determineWinner(newBoard) : null;
  
  const newState: GameState = {
    board: newBoard,
    currentTurn: actualNextTurn,
    blackScore: scores.blackScore,
    whiteScore: scores.whiteScore,
    gameOver,
    winner,
    lastMove: { row, col },
    validMoves: actualValidMoves
  };
  
  return { success: true, newState };
}

/**
 * Process a pass (when player has no valid moves)
 */
export function processPass(
  gameState: GameState,
  playerColor: PlayerColor
): { success: boolean; newState: GameState; error?: string } {
  // Validate it's the player's turn
  if (gameState.currentTurn !== playerColor) {
    return { success: false, newState: gameState, error: 'Not your turn' };
  }
  
  // Validate player has no valid moves
  const validMoves = getValidMoves(gameState.board, playerColor);
  if (validMoves.length > 0) {
    return { success: false, newState: gameState, error: 'You have valid moves available' };
  }
  
  const nextPlayer = getOpponentColor(playerColor);
  const nextValidMoves = getValidMoves(gameState.board, nextPlayer);
  const gameOver = nextValidMoves.length === 0;
  const winner = gameOver ? determineWinner(gameState.board) : null;
  
  const newState: GameState = {
    ...gameState,
    currentTurn: nextPlayer,
    gameOver,
    winner,
    validMoves: nextValidMoves
  };
  
  return { success: true, newState };
}

/**
 * Get a hint (best move) using simple heuristics
 */
export function getHint(gameState: GameState, playerColor: PlayerColor): Position | null {
  if (gameState.currentTurn !== playerColor) return null;
  
  const validMoves = getValidMoves(gameState.board, playerColor);
  if (validMoves.length === 0) return null;
  
  // Corner positions are most valuable
  const corners = [
    { row: 0, col: 0 },
    { row: 0, col: BOARD_SIZE - 1 },
    { row: BOARD_SIZE - 1, col: 0 },
    { row: BOARD_SIZE - 1, col: BOARD_SIZE - 1 }
  ];
  
  // Check for corner moves first
  for (const corner of corners) {
    if (validMoves.some(m => m.row === corner.row && m.col === corner.col)) {
      return corner;
    }
  }
  
  // Otherwise, return the move that flips the most pieces
  let bestMove = validMoves[0];
  let bestFlips = 0;
  
  for (const move of validMoves) {
    const flips = getFlippedPieces(gameState.board, move.row, move.col, playerColor).length;
    if (flips > bestFlips) {
      bestFlips = flips;
      bestMove = move;
    }
  }
  
  return bestMove;
}

/**
 * Deep clone game state
 */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: state.board.map(row => [...row]),
    validMoves: [...state.validMoves],
    lastMove: state.lastMove ? { ...state.lastMove } : null
  };
}
