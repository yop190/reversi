"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialBoard = createInitialBoard;
exports.createInitialGameState = createInitialGameState;
exports.colorToCellState = colorToCellState;
exports.cellStateToColor = cellStateToColor;
exports.getOpponentColor = getOpponentColor;
exports.isValidPosition = isValidPosition;
exports.getFlippedPieces = getFlippedPieces;
exports.isValidMove = isValidMove;
exports.getValidMoves = getValidMoves;
exports.applyMove = applyMove;
exports.calculateScores = calculateScores;
exports.isGameOver = isGameOver;
exports.determineWinner = determineWinner;
exports.processMove = processMove;
exports.processPass = processPass;
exports.getHint = getHint;
exports.cloneGameState = cloneGameState;
const game_types_1 = require("./game.types");
const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
];
function createInitialBoard() {
    const board = [];
    for (let i = 0; i < game_types_1.BOARD_SIZE; i++) {
        board[i] = new Array(game_types_1.BOARD_SIZE).fill(game_types_1.CellState.Empty);
    }
    const mid = game_types_1.BOARD_SIZE / 2;
    board[mid - 1][mid - 1] = game_types_1.CellState.White;
    board[mid - 1][mid] = game_types_1.CellState.Black;
    board[mid][mid - 1] = game_types_1.CellState.Black;
    board[mid][mid] = game_types_1.CellState.White;
    return board;
}
function createInitialGameState() {
    const board = createInitialBoard();
    const validMoves = getValidMoves(board, game_types_1.PlayerColor.Black);
    return {
        board,
        currentTurn: game_types_1.PlayerColor.Black,
        blackScore: 2,
        whiteScore: 2,
        gameOver: false,
        winner: null,
        lastMove: null,
        validMoves
    };
}
function colorToCellState(color) {
    return color === game_types_1.PlayerColor.Black ? game_types_1.CellState.Black : game_types_1.CellState.White;
}
function cellStateToColor(state) {
    if (state === game_types_1.CellState.Black)
        return game_types_1.PlayerColor.Black;
    if (state === game_types_1.CellState.White)
        return game_types_1.PlayerColor.White;
    return null;
}
function getOpponentColor(color) {
    return color === game_types_1.PlayerColor.Black ? game_types_1.PlayerColor.White : game_types_1.PlayerColor.Black;
}
function isValidPosition(row, col) {
    return row >= 0 && row < game_types_1.BOARD_SIZE && col >= 0 && col < game_types_1.BOARD_SIZE;
}
function getFlippedPieces(board, row, col, playerColor) {
    const playerState = colorToCellState(playerColor);
    const opponentState = colorToCellState(getOpponentColor(playerColor));
    const flipped = [];
    if (board[row][col] !== game_types_1.CellState.Empty) {
        return flipped;
    }
    for (const [dr, dc] of DIRECTIONS) {
        const directionFlipped = [];
        let r = row + dr;
        let c = col + dc;
        while (isValidPosition(r, c) && board[r][c] === opponentState) {
            directionFlipped.push({ row: r, col: c });
            r += dr;
            c += dc;
        }
        if (directionFlipped.length > 0 && isValidPosition(r, c) && board[r][c] === playerState) {
            flipped.push(...directionFlipped);
        }
    }
    return flipped;
}
function isValidMove(board, row, col, playerColor) {
    if (!isValidPosition(row, col))
        return false;
    if (board[row][col] !== game_types_1.CellState.Empty)
        return false;
    return getFlippedPieces(board, row, col, playerColor).length > 0;
}
function getValidMoves(board, playerColor) {
    const moves = [];
    for (let row = 0; row < game_types_1.BOARD_SIZE; row++) {
        for (let col = 0; col < game_types_1.BOARD_SIZE; col++) {
            if (isValidMove(board, row, col, playerColor)) {
                moves.push({ row, col });
            }
        }
    }
    return moves;
}
function applyMove(board, row, col, playerColor) {
    const flipped = getFlippedPieces(board, row, col, playerColor);
    const playerState = colorToCellState(playerColor);
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = playerState;
    for (const pos of flipped) {
        newBoard[pos.row][pos.col] = playerState;
    }
    return { newBoard, flipped };
}
function calculateScores(board) {
    let blackScore = 0;
    let whiteScore = 0;
    for (let row = 0; row < game_types_1.BOARD_SIZE; row++) {
        for (let col = 0; col < game_types_1.BOARD_SIZE; col++) {
            if (board[row][col] === game_types_1.CellState.Black)
                blackScore++;
            else if (board[row][col] === game_types_1.CellState.White)
                whiteScore++;
        }
    }
    return { blackScore, whiteScore };
}
function isGameOver(board) {
    const blackMoves = getValidMoves(board, game_types_1.PlayerColor.Black);
    const whiteMoves = getValidMoves(board, game_types_1.PlayerColor.White);
    return blackMoves.length === 0 && whiteMoves.length === 0;
}
function determineWinner(board) {
    if (!isGameOver(board))
        return null;
    const { blackScore, whiteScore } = calculateScores(board);
    if (blackScore > whiteScore)
        return game_types_1.PlayerColor.Black;
    if (whiteScore > blackScore)
        return game_types_1.PlayerColor.White;
    return 'draw';
}
function processMove(gameState, row, col, playerColor) {
    if (gameState.currentTurn !== playerColor) {
        return { success: false, newState: gameState, error: 'Not your turn' };
    }
    if (gameState.gameOver) {
        return { success: false, newState: gameState, error: 'Game is over' };
    }
    if (!isValidMove(gameState.board, row, col, playerColor)) {
        return { success: false, newState: gameState, error: 'Invalid move' };
    }
    const { newBoard } = applyMove(gameState.board, row, col, playerColor);
    const scores = calculateScores(newBoard);
    const nextPlayer = getOpponentColor(playerColor);
    const nextValidMoves = getValidMoves(newBoard, nextPlayer);
    let actualNextTurn = nextPlayer;
    let actualValidMoves = nextValidMoves;
    if (nextValidMoves.length === 0) {
        const currentPlayerMoves = getValidMoves(newBoard, playerColor);
        if (currentPlayerMoves.length > 0) {
            actualNextTurn = playerColor;
            actualValidMoves = currentPlayerMoves;
        }
    }
    const gameOver = isGameOver(newBoard);
    const winner = gameOver ? determineWinner(newBoard) : null;
    const newState = {
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
function processPass(gameState, playerColor) {
    if (gameState.currentTurn !== playerColor) {
        return { success: false, newState: gameState, error: 'Not your turn' };
    }
    const validMoves = getValidMoves(gameState.board, playerColor);
    if (validMoves.length > 0) {
        return { success: false, newState: gameState, error: 'You have valid moves available' };
    }
    const nextPlayer = getOpponentColor(playerColor);
    const nextValidMoves = getValidMoves(gameState.board, nextPlayer);
    const gameOver = nextValidMoves.length === 0;
    const winner = gameOver ? determineWinner(gameState.board) : null;
    const newState = {
        ...gameState,
        currentTurn: nextPlayer,
        gameOver,
        winner,
        validMoves: nextValidMoves
    };
    return { success: true, newState };
}
function getHint(gameState, playerColor) {
    if (gameState.currentTurn !== playerColor)
        return null;
    const validMoves = getValidMoves(gameState.board, playerColor);
    if (validMoves.length === 0)
        return null;
    const corners = [
        { row: 0, col: 0 },
        { row: 0, col: game_types_1.BOARD_SIZE - 1 },
        { row: game_types_1.BOARD_SIZE - 1, col: 0 },
        { row: game_types_1.BOARD_SIZE - 1, col: game_types_1.BOARD_SIZE - 1 }
    ];
    for (const corner of corners) {
        if (validMoves.some(m => m.row === corner.row && m.col === corner.col)) {
            return corner;
        }
    }
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
function cloneGameState(state) {
    return {
        ...state,
        board: state.board.map(row => [...row]),
        validMoves: [...state.validMoves],
        lastMove: state.lastMove ? { ...state.lastMove } : null
    };
}
//# sourceMappingURL=game-engine.js.map