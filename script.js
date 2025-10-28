document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded and DOM fully parsed.");

    const gameBoardElement = document.getElementById('game-board');
    const scoreAreaElement = document.getElementById('score-area');
    const nextTetrominoAreaElement = document.getElementById('next-tetromino-area');

    // Game constants
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;
    const BLOCK_SIZE = 30; // Should match CSS for .block derived size

    // Initialize game board logical representation (0: empty, 1: filled by landed block, or color string)
    let gameBoard = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

    const TETROMINOS = {
        'I': { shape: [[1, 1, 1, 1]], color: 'block-i' },
        'O': { shape: [[1, 1], [1, 1]], color: 'block-o' },
        'T': { shape: [[0, 1, 0], [1, 1, 1]], color: 'block-t' },
        'S': { shape: [[0, 1, 1], [1, 1, 0]], color: 'block-s' },
        'Z': { shape: [[1, 1, 0], [0, 1, 1]], color: 'block-z' },
        'J': { shape: [[1, 0, 0], [1, 1, 1]], color: 'block-j' },
        'L': { shape: [[0, 0, 1], [1, 1, 1]], color: 'block-l' }
    };
    const TETROMINO_TYPES = Object.keys(TETROMINOS);

    let currentTetromino = null;
    let nextTetromino = null;
    let currentPosition = { x: 0, y: 0 };
    let score = 0;
    let gameLoopInterval = null; // For gravity

    // --- Game Board HTML & Drawing ---
    function initializeGameBoardHTML() {
        if (!gameBoardElement) {
            console.error("Game board element not found!");
            return;
        }
        gameBoardElement.style.width = `${BOARD_WIDTH * BLOCK_SIZE}px`;
        gameBoardElement.style.height = `${BOARD_HEIGHT * BLOCK_SIZE}px`;
        // gameBoardElement.innerHTML = ''; // Will be handled by drawGameBoard
        console.log(`Game board HTML initialized: ${BOARD_WIDTH * BLOCK_SIZE}px x ${BOARD_HEIGHT * BLOCK_SIZE}px`);
    }

    function drawGameBoard() {
        if (!gameBoardElement) return;
        gameBoardElement.innerHTML = ''; // Clear the entire board first

        // Draw landed blocks
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (gameBoard[y][x] !== 0) {
                    const block = document.createElement('div');
                    block.classList.add('block', gameBoard[y][x]); // gameBoard stores color class string
                    block.style.left = `${x * BLOCK_SIZE}px`;
                    block.style.top = `${y * BLOCK_SIZE}px`;
                    block.style.width = `${BLOCK_SIZE - 2}px`; // -2 for border
                    block.style.height = `${BLOCK_SIZE - 2}px`; // -2 for border
                    gameBoardElement.appendChild(block);
                }
            }
        }
        // Draw current falling tetromino
        drawTetromino();
    }

    function drawTetromino() {
        if (!currentTetromino || !gameBoardElement) return;
        const { shape, color } = currentTetromino;
        shape.forEach((row, yOffset) => {
            row.forEach((value, xOffset) => {
                if (value === 1) {
                    const block = document.createElement('div');
                    block.classList.add('block', color, 'falling'); // Add 'falling' class to distinguish
                    block.style.left = `${(currentPosition.x + xOffset) * BLOCK_SIZE}px`;
                    block.style.top = `${(currentPosition.y + yOffset) * BLOCK_SIZE}px`;
                    block.style.width = `${BLOCK_SIZE - 2}px`;
                    block.style.height = `${BLOCK_SIZE - 2}px`;
                    gameBoardElement.appendChild(block);
                }
            });
        });
    }

    function drawNextTetromino() {
        if (!nextTetrominoAreaElement) return;
        nextTetrominoAreaElement.innerHTML = ''; // Clear the area

        if (!nextTetromino) return; // If there's no next tetromino, do nothing further

        const { shape, color } = nextTetromino;

        // Calculate padding from CSS (assuming 5px as per previous subtask)
        const padding = 5; // px

        // Effective dimensions of the area for placing blocks
        const areaEffectiveWidth = nextTetrominoAreaElement.clientWidth - 2 * padding;
        const areaEffectiveHeight = nextTetrominoAreaElement.clientHeight - 2 * padding;

        const shapeWidthInPixels = shape[0].length * BLOCK_SIZE;
        const shapeHeightInPixels = shape.length * BLOCK_SIZE;

        // Calculate offsets to center the shape within the effective area
        const offsetX = (areaEffectiveWidth - shapeWidthInPixels) / 2 + padding;
        const offsetY = (areaEffectiveHeight - shapeHeightInPixels) / 2 + padding;

        shape.forEach((row, yOffset) => {
            row.forEach((value, xOffset) => {
                if (value === 1) {
                    const block = document.createElement('div');
                    block.classList.add('block', color); // No 'falling' class
                    block.style.left = `${xOffset * BLOCK_SIZE + offsetX}px`;
                    block.style.top = `${yOffset * BLOCK_SIZE + offsetY}px`;
                    block.style.width = `${BLOCK_SIZE - 2}px`; // Adjust for border
                    block.style.height = `${BLOCK_SIZE - 2}px`; // Adjust for border
                    nextTetrominoAreaElement.appendChild(block);
                }
            });
        });
    }

    // --- Tetromino Logic ---
    function getRandomTetromino() {
        const type = TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
        // Return a deep copy of shape to allow rotation without affecting original
        return { ...TETROMINOS[type], shape: TETROMINOS[type].shape.map(row => [...row]), type };
    }

    function spawnNewTetromino() {
        currentTetromino = nextTetromino;
        nextTetromino = getRandomTetromino();
        drawNextTetromino(); // Update the display for the new next tetromino

        currentPosition = {
            x: Math.floor(BOARD_WIDTH / 2) - Math.floor(currentTetromino.shape[0].length / 2),
            y: 0
        };
        if (!isValidPosition(currentTetromino.shape, currentPosition)) {
            gameOver();
            return;
        }
        console.log(`Spawning new tetromino: ${currentTetromino.type} at (${currentPosition.x}, ${currentPosition.y})`);
        drawGameBoard(); // Redraw board with new tetromino
    }

    function isValidPosition(shape, position) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] === 1) {
                    const boardX = position.x + x;
                    const boardY = position.y + y;

                    // Check boundaries
                    if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                        return false;
                    }
                    // Check collision with landed blocks (boardY must be non-negative)
                    if (boardY >= 0 && gameBoard[boardY][boardX] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function moveTetromino(dx, dy) {
        if (!currentTetromino) return;
        const newPosition = { x: currentPosition.x + dx, y: currentPosition.y + dy };
        if (isValidPosition(currentTetromino.shape, newPosition)) {
            currentPosition = newPosition;
            drawGameBoard();
        } else if (dy > 0) { // Trying to move down but failed
            lockTetromino();
        }
    }

    function rotateTetromino() {
        if (!currentTetromino) return;
        const shape = currentTetromino.shape;
        const N = shape.length; // Old rows
        const M = shape[0].length; // Old cols
        const newShape = Array.from({ length: M }, () => Array(N).fill(0)); // New shape: M rows, N cols

        for (let r = 0; r < N; r++) {
            for (let c = 0; c < M; c++) {
                newShape[c][N - 1 - r] = shape[r][c];
            }
        }

        // Basic wall kick: try to move left/right if rotation is blocked
        let testPosition = { ...currentPosition };
        if (!isValidPosition(newShape, testPosition)) {
            testPosition.x -=1; // Try moving left
            if (!isValidPosition(newShape, testPosition)) {
                testPosition.x +=2; // Try moving right
                if (!isValidPosition(newShape, testPosition)) {
                    return; // Rotation failed even with kicks
                }
            }
        }
        currentPosition = testPosition;
        currentTetromino.shape = newShape;
        drawGameBoard();
        console.log("Tetromino rotated");
    }

function hardDropTetromino() {
    if (!currentTetromino) return;
    while (isValidPosition(currentTetromino.shape, { x: currentPosition.x, y: currentPosition.y + 1 })) {
        currentPosition.y++;
    }
    drawGameBoard(); // Update visual to the bottom-most valid spot
    lockTetromino(); // Lock the piece in place
}

    function lockTetromino() {
        if (!currentTetromino) return;
        currentTetromino.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value === 1) {
                    const boardX = currentPosition.x + x;
                    const boardY = currentPosition.y + y;
                    if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >=0 && boardX < BOARD_WIDTH) {
                         gameBoard[boardY][boardX] = currentTetromino.color; // Store color class
                    }
                }
            });
        });
        console.log("Tetromino locked");
        clearLines();
        spawnNewTetromino();
    }

    function clearLines() {
        let linesCleared = 0;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (gameBoard[y].every(cell => cell !== 0)) {
                gameBoard.splice(y, 1); // Remove the full line
                gameBoard.unshift(Array(BOARD_WIDTH).fill(0)); // Add an empty line at the top
                linesCleared++;
                y++; // Re-check the current line index as lines shifted down
            }
        }
        if (linesCleared > 0) {
            // TODO: Update score based on linesCleared
            score += linesCleared * 100; // Simple scoring
            scoreAreaElement.textContent = `Score: ${score}`;
            console.log(`${linesCleared} line(s) cleared. Score: ${score}`);
        }
    }

    function gameTick() {
        moveTetromino(0, 1); // Move down by 1 unit
    }

    function gameOver() {
        console.log("Game Over");
        clearInterval(gameLoopInterval);
        alert(`Game Over! Your score: ${score}`);
        // Potentially show a restart button or similar
    }

    // --- Keyboard Input ---
    document.addEventListener('keydown', (event) => {
        if (!currentTetromino || gameLoopInterval === null) { // Game not running or no active piece
             if (event.key === 'Enter') { // Allow starting game with Enter if not started
                // This is a simplistic restart, a proper one would reset more state
                // startGame();
             }
            return;
        }

        switch (event.key) {
            case 'ArrowLeft':
                moveTetromino(-1, 0);
                break;
            case 'ArrowRight':
                moveTetromino(1, 0);
                break;
            case 'ArrowDown':
                moveTetromino(0, 1); // Soft drop
                break;
            case 'ArrowUp':
                rotateTetromino();
                break;
            case ' ': // Spacebar for hard drop
                hardDropTetromino();
                event.preventDefault(); // Prevent page scrolling
                break;
        }
    });

    // --- Game Start ---
    function startGame() {
        console.log("Starting game...");
        initializeGameBoardHTML();
        gameBoard = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0)); // Reset board
        score = 0;
        scoreAreaElement.textContent = `Score: ${score}`;

        nextTetromino = getRandomTetromino(); // Generate the very first "next" tetromino
        drawNextTetromino(); // Draw it for the first time
        spawnNewTetromino(); // Spawn the first piece

        if (gameLoopInterval) clearInterval(gameLoopInterval); // Clear existing loop if any
        gameLoopInterval = setInterval(gameTick, 1000); // Gravity: piece falls every 1 second

        console.log("Game started. Loop ID:", gameLoopInterval);
    }

    // Initialize and start
    startGame();
});

console.log("script.js fully loaded - waiting for DOMContentLoaded");
