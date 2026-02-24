const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('message-box');
const startButton = document.getElementById('startButton');
const scoreBottomEl = document.getElementById('scoreBottom');
const scoreTopEl = document.getElementById('scoreTop');
const settingsButton = document.getElementById('settingsButton');
const settingsBox = document.getElementById('settings-box');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const winningScoreInput = document.getElementById('winningScoreInput');
const winningScoreValue = document.getElementById('winningScoreValue');
const aiDifficultyInput = document.getElementById('aiDifficultyInput');
const aiDifficultyValue = document.getElementById('aiDifficultyValue');
const ballSpeedInput = document.getElementById('ballSpeedInput');
const ballSpeedValue = document.getElementById('ballSpeedValue');
const gameDescription = document.getElementById('gameDescription');
const homepageContainer = document.getElementById('homepage-container');
const gameWrapper = document.getElementById('game-wrapper');
const vsAiButton = document.getElementById('vsAiButton');
const vsPlayerButton = document.getElementById('vsPlayerButton');
const homeButton = document.getElementById('homeButton');
const aiSettingsRow = document.getElementById('ai-settings-row');

let gameMode = 'ai';
let animationFrameId;
let isGameOver = false; 
let isPaused = false; 

let isCountdownActive = false;
let countdownValue = 3;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
let winningScore = 10;

const gameStars = [];
const NUM_GAME_STARS = 150;

const POWER_UP_CHANCE = 0.15;
const powerUps = [];
const POWER_UP_TYPES = {
    EXPAND_SELF: {
        id: 'EXPAND_SELF',
        color: '#2ecc71',
        duration: 10000 
    },
    SHRINK_OPPONENT: {
        id: 'SHRINK_OPPONENT',
        color: '#e74c3c',
        duration: 5000 
    },
    SPEED_BOOST: {
        id: 'SPEED_BOOST',
        color: '#f1c40f',
        duration: 10000 
    }
};

const synth = new Tone.Synth().toDestination();

const ball = { x: 0, y: 0, radius: 12, speed: 4.0, dx: 0, dy: 0, baseSpeed: 4.0, maxSpeed: 8.0, activeSpeedBoost: null, speedBoostTimeoutId: null };

const player1 = { name: "Player 1", x: 0, y: GAME_HEIGHT - 30, width: 150, originalWidth: 150, height: 20, color: '#00ffff', score: 0, layer1_segments: [], layer2_segments: [], hitTimer: 0, activeEffect: null, effectTimeoutId: null };
const player2 = { name: "Player 2", x: 0, y: 10, width: 150, originalWidth: 150, height: 20, color: '#ff4757', score: 0, layer1_segments: [], layer2_segments: [], hitTimer: 0, activeEffect: null, effectTimeoutId: null };
const ai = { x: 0, y: 10, width: 150, originalWidth: 150, height: 20, color: '#ff4757', score: 0, layer1_segments: [], layer2_segments: [], error: 0.35, initialError: 0.35, minError: 0.02, hitTimer: 0, activeEffect: null, effectTimeoutId: null };

const controls = { p1Right: false, p1Left: false, p2Right: false, p2Left: false };

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    if (key === 'p') {
        togglePause();
        return;
    }

    if (gameMode === 'multiplayer') {
        if (key === 'right' || key === 'arrowright') controls.p1Right = true;
        else if (key === 'left' || key === 'arrowleft') controls.p1Left = true;
        if (key === 'd') controls.p2Right = true;
        else if (key === 'a') controls.p2Left = true;
    } else {
        if (key === 'right' || key === 'arrowright' || key === 'd') controls.p1Right = true;
        else if (key === 'left' || key === 'arrowleft' || key === 'a') controls.p1Left = true;
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (gameMode === 'multiplayer') {
        if (key === 'right' || key === 'arrowright') controls.p1Right = false;
        else if (key === 'left' || key === 'arrowleft') controls.p1Left = false;
        if (key === 'd') controls.p2Right = false;
        else if (key === 'a') controls.p2Left = false;
    } else {
        if (key === 'right' || key === 'arrowright' || key === 'd') controls.p1Right = false;
        else if (key === 'left' || key === 'arrowleft' || key === 'a') controls.p1Left = false;
    }
});

function togglePause() {
    if (isGameOver || isCountdownActive || messageBox.style.display === 'block') return;
    isPaused = !isPaused;
    if (!isPaused) {

    } else {
        drawPaused();
    }
}

let lastPauseButtonState = false;

function checkGamepadInputs() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    if (gamepads[0]) {
        const gp = gamepads[0];
        const deadzone = 0.2;
        
        const moveRight = gp.axes[0] > deadzone || (gp.buttons[15] && gp.buttons[15].pressed);
        const moveLeft = gp.axes[0] < -deadzone || (gp.buttons[14] && gp.buttons[14].pressed);
        
        controls.p1Right = controls.p1Right || moveRight;
        controls.p1Left = controls.p1Left || moveLeft;

        const pausePressed = (gp.buttons[9] && gp.buttons[9].pressed);
        if (pausePressed && !lastPauseButtonState) {
            togglePause();
        }
        lastPauseButtonState = pausePressed;
    }

    if (gameMode === 'multiplayer' && gamepads[1]) {
            const gp = gamepads[1];
            const deadzone = 0.2;
            const moveRight = gp.axes[0] > deadzone || (gp.buttons[15] && gp.buttons[15].pressed);
            const moveLeft = gp.axes[0] < -deadzone || (gp.buttons[14] && gp.buttons[14].pressed);
            
            controls.p2Right = controls.p2Right || moveRight;
            controls.p2Left = controls.p2Left || moveLeft;
    }
}

function handleTouchMove(e) {
    if (isPaused) return; 
    e.preventDefault(); 
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;

    for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = touch.clientY;

        if (touchY > window.innerHeight / 2) {
            player1.x = touchX - player1.width / 2;
            if (player1.x < 0) player1.x = 0;
            if (player1.x > GAME_WIDTH - player1.width) player1.x = GAME_WIDTH - player1.width;
        }
        else if (gameMode === 'multiplayer' && touchY < window.innerHeight / 2) {
            player2.x = touchX - player2.width / 2;
            if (player2.x < 0) player2.x = 0;
            if (player2.x > GAME_WIDTH - player2.width) player2.x = GAME_WIDTH - player2.width;
        }
    }
}
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchstart', handleTouchMove, { passive: false });

function resizeCanvas() {
    const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
    let newWidth = window.innerWidth;
    let newHeight = window.innerHeight;
    
    const padding = 20;
    newWidth -= padding;
    newHeight -= padding;

    if (newHeight * aspectRatio > newWidth) {
        newHeight = newWidth / aspectRatio;
    } else {
        newWidth = newHeight * aspectRatio;
    }
    
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    if (isPaused) drawPaused(); else draw();
}

function launchBall() {
    let angle = Math.random() * Math.PI / 2 - Math.PI / 4;
    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = ball.speed * (Math.random() > 0.5 ? 1 : -1) * Math.cos(angle);
}

function resetBall() {
    ball.speed = ball.baseSpeed;
    ball.x = GAME_WIDTH / 2;
    ball.y = GAME_HEIGHT / 2;
    ball.dx = 0; ball.dy = 0;
}

function startInitialCountdown() {
    isCountdownActive = true;
    countdownValue = 3;
    resetBall();
    const countdownInterval = setInterval(() => {
        if (!isPaused) {
            synth.triggerAttackRelease("G4", "16n");
            countdownValue--;
            if (countdownValue <= 0) {
                clearInterval(countdownInterval);
                isCountdownActive = false;
                synth.triggerAttackRelease("C5", "8n");
                launchBall();
            }
        }
    }, 1000);
}

function resetPaddleSegments(paddle) {
    paddle.layer1_segments = [{ x_offset: 0, width: paddle.width }];
    paddle.layer2_segments = [{ x_offset: 0, width: paddle.width }];
}

function resetPaddles() {
    powerUps.length = 0; 
    [player1, player2, ai].forEach(p => {
        clearActiveEffect(p); 
        p.width = p.originalWidth;
        p.x = (GAME_WIDTH - p.width) / 2;
        p.score = 0;
        resetPaddleSegments(p); 
    });
    ai.error = ai.initialError;
}

function createGameStars() {
    gameStars.length = 0; 
    for (let i = 0; i < NUM_GAME_STARS; i++) {
        gameStars.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.25
        });
    }
}

function init() {
    isGameOver = false; 
    isPaused = false;
    if (ball.speedBoostTimeoutId) clearTimeout(ball.speedBoostTimeoutId);
    ball.activeSpeedBoost = null;
    ball.speedBoostTimeoutId = null;
    createGameStars(); 
    resetPaddles();
    updateScores();
    messageBox.style.display = 'none';
    startInitialCountdown();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

function updateScores(scorer) {
    scoreBottomEl.textContent = player1.score;
    scoreTopEl.textContent = (gameMode === 'ai') ? ai.score : player2.score;

    const el = (scorer === player1) ? scoreBottomEl : scoreTopEl;
    if (el) {
        el.classList.add('score-pop');
        setTimeout(() => el.classList.remove('score-pop'), 400);
    }
}

function movePaddles() {
    checkGamepadInputs();

    const paddleSpeed = 7;
    if (controls.p1Right && player1.x < GAME_WIDTH - player1.width) player1.x += paddleSpeed;
    if (controls.p1Left && player1.x > 0) player1.x -= paddleSpeed;
    
    if (gameMode === 'multiplayer') {
        if (controls.p2Right && player2.x < GAME_WIDTH - player2.width) player2.x += paddleSpeed;
        if (controls.p2Left && player2.x > 0) player2.x -= paddleSpeed;
    } else {
        const paddleCenter = ai.x + ai.width / 2;
        const aiSpeed = ball.speed * 0.8;
        if (paddleCenter < ball.x - 10) ai.x += aiSpeed;
        else if (paddleCenter > ball.x + 10) ai.x -= aiSpeed;
        ai.x += (Math.random() - 0.5) * ball.speed * ai.error;
        if (ai.x < 0) ai.x = 0;
        if (ai.x > GAME_WIDTH - ai.width) ai.x = GAME_WIDTH - ai.width;
    }
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x + ball.radius > GAME_WIDTH || ball.x - ball.radius < 0) {
        ball.dx *= -1;
        synth.triggerAttackRelease("G3", "8n");
    }

    let pointScored = false;
    if (ball.y > GAME_HEIGHT) {
        if (!isGameOver) { 
            if (gameMode === 'ai') ai.score++; else player2.score++;
            updateScores((gameMode === 'ai') ? ai : player2);
        }
        pointScored = true;
    } else if (ball.y < 0) {
        if (!isGameOver) { 
            player1.score++;
            updateScores(player1);
            if (gameMode === 'ai') {
                ai.error = Math.max(ai.minError, ai.initialError - (player1.score / winningScore) * (ai.initialError - ai.minError));
            }
        }
        pointScored = true;
    }
    
    if (pointScored) {
        const winner = checkWinner();
        if (winner) {
            endGame(`${winner.name} Wins!`);
        } else {
            resetPaddleSegments(player1);
            const topPaddle = (gameMode === 'ai') ? ai : player2;
            resetPaddleSegments(topPaddle);
            resetBall();
            launchBall();
        }
        return;
    }

    const topPaddle = (gameMode === 'ai') ? ai : player2;
    if (ball.dy > 0 && ball.y + ball.radius >= player1.y && ball.y + ball.radius <= player1.y + player1.height) {
        handlePaddleCollision(player1);
    }
    if (ball.dy < 0 && ball.y - ball.radius <= topPaddle.y + topPaddle.height && ball.y - ball.radius >= topPaddle.y) {
        handlePaddleCollision(topPaddle);
    }
}

function handlePaddleCollision(paddle) {
    for (let i = 0; i < paddle.layer1_segments.length; i++) {
        const seg = paddle.layer1_segments[i];
        if (ball.x > paddle.x + seg.x_offset && ball.x < paddle.x + seg.x_offset + seg.width) {
            splitSegment(paddle, paddle.layer1_segments, i);
            return;
        }
    }
    for (let i = 0; i < paddle.layer2_segments.length; i++) {
        const seg = paddle.layer2_segments[i];
        if (ball.x > paddle.x + seg.x_offset && ball.x < paddle.x + seg.x_offset + seg.width) {
            splitSegment(paddle, paddle.layer2_segments, i);
            return;
        }
    }
}

function splitSegment(paddle, layer, segmentIndex) {
    synth.triggerAttackRelease("C4", "8n");
    paddle.hitTimer = 10;

    const hitSegment = layer[segmentIndex];
    
    const splitPoint = ball.x - paddle.x;
    const gapWidth = ball.radius * 2;
    const newLeftWidth = splitPoint - (gapWidth / 2) - hitSegment.x_offset;
    const newRightXOffset = splitPoint + (gapWidth / 2);
    const newRightWidth = (hitSegment.x_offset + hitSegment.width) - newRightXOffset;

    layer.splice(segmentIndex, 1);
    
    if (newLeftWidth > ball.radius) {
        layer.push({ x_offset: hitSegment.x_offset, width: newLeftWidth });
    }
    if (newRightWidth > ball.radius) {
        layer.push({ x_offset: newRightXOffset, width: newRightWidth });
    }
    
    let collidePoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    let angleRad = collidePoint * (Math.PI / 4);
    let direction = (paddle === player1) ? -1 : 1;
    ball.dx = ball.speed * Math.sin(angleRad);
    ball.dy = direction * ball.speed * Math.cos(angleRad);
    
    if (ball.activeSpeedBoost) {
        const topPaddle = (gameMode === 'ai') ? ai : player2;
        const isHeadingToOpponent = 
            (ball.activeSpeedBoost === player1 && ball.dy < 0) ||
            (ball.activeSpeedBoost === topPaddle && ball.dy > 0);
        
        if (isHeadingToOpponent) {
            ball.dx *= 1.5;
            ball.dy *= 1.5;
        }
    }
    
    if (Math.random() < POWER_UP_CHANCE) {
        spawnPowerUp(paddle);
    }
}

function spawnPowerUp(spawningPaddle) {
    const typeKeys = Object.keys(POWER_UP_TYPES);
    const randomTypeKey = typeKeys[Math.floor(Math.random() * typeKeys.length)];
    const type = POWER_UP_TYPES[randomTypeKey];

    const powerUp = {
        x: ball.x,
        y: ball.y,
        size: 18,
        type: type,
        dy: (spawningPaddle === player1) ? -2 : 2,
    };
    powerUps.push(powerUp);
}

function moveAndCheckPowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        p.y += p.dy;

        const topPaddle = (gameMode === 'ai') ? ai : player2;
        let collectingPaddle = null;

        if (p.dy < 0 && p.y - p.size < topPaddle.y + topPaddle.height && p.y + p.size > topPaddle.y) {
            if (p.x > topPaddle.x && p.x < topPaddle.x + topPaddle.width) {
                collectingPaddle = topPaddle;
            }
        }
        else if (p.dy > 0 && p.y + p.size > player1.y && p.y - p.size < player1.y + player1.height) {
            if (p.x > player1.x && p.x < player1.x + player1.width) {
                collectingPaddle = player1;
            }
        }

        if (collectingPaddle) {
            applyPowerUp(collectingPaddle, p);
            powerUps.splice(i, 1);
            synth.triggerAttackRelease("E5", "8n");
        }

        else if (p.y < -p.size || p.y > GAME_HEIGHT + p.size) {
            powerUps.splice(i, 1);
        }
    }
}

function applyPowerUp(paddle, powerUp) {
    const topPaddle = (gameMode === 'ai') ? ai : player2;
    const opponent = (paddle === player1) ? topPaddle : player1;
    
    clearActiveEffect(paddle);
    if (powerUp.type.id === 'SHRINK_OPPONENT') {
        clearActiveEffect(opponent);
    }

    switch (powerUp.type.id) {
        case 'EXPAND_SELF':
            paddle.width = GAME_WIDTH;
            paddle.x = 0;
            resetPaddleSegments(paddle);
            paddle.activeEffect = powerUp.type;
            paddle.effectTimeoutId = setTimeout(() => {
                clearActiveEffect(paddle);
            }, powerUp.type.duration);
            break;

        case 'SHRINK_OPPONENT':
            opponent.width = opponent.originalWidth * 0.5;
            if (opponent.x + opponent.width > GAME_WIDTH) {
                opponent.x = GAME_WIDTH - opponent.width;
            }
            resetPaddleSegments(opponent);
            opponent.activeEffect = powerUp.type;
            opponent.effectTimeoutId = setTimeout(() => {
                clearActiveEffect(opponent);
            }, powerUp.type.duration);
            break;

        case 'SPEED_BOOST':
            if (ball.speedBoostTimeoutId) clearTimeout(ball.speedBoostTimeoutId);
            ball.activeSpeedBoost = paddle;
            ball.speedBoostTimeoutId = setTimeout(() => {
                ball.activeSpeedBoost = null;
            }, powerUp.type.duration);
            break;
    }
}

function clearActiveEffect(paddle) {
    if (paddle.effectTimeoutId) {
        clearTimeout(paddle.effectTimeoutId);
    }
    paddle.width = paddle.originalWidth;
    paddle.activeEffect = null;
    paddle.effectTimeoutId = null;
    resetPaddleSegments(paddle);
}

function checkWinner() {
    if (player1.score >= winningScore) return player1;
    const topScore = (gameMode === 'ai') ? ai.score : player2.score;
    if (topScore >= winningScore) return (gameMode === 'ai') ? { name: "AI" } : player2;
    return null;
}

function endGame(message) {
    isGameOver = true; 
    cancelAnimationFrame(animationFrameId);
    messageBox.style.display = 'block';
    messageBox.querySelector('h2').innerText = message;
    let finalScore = `Final Score -> P1: ${player1.score} | ${gameMode === 'ai' ? 'AI' : 'P2'}: ${gameMode === 'ai' ? ai.score : player2.score}`;
    messageBox.querySelector('p').innerText = finalScore;
    startButton.innerText = 'Play Again';
    settingsButton.style.display = 'inline-block';
    homeButton.style.display = 'inline-block';
}

function moveAndDrawGameStars() {
    ctx.fillStyle = '#1a2a3a'; 
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (const star of gameStars) {
        if (!isPaused) {
            star.y += star.speed;
            if (star.y > GAME_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * GAME_WIDTH;
            }
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function draw() {
    moveAndDrawGameStars(); 
    const squareSize = 10;
    const gapSize = 15;
    const totalBlockSize = squareSize + gapSize;
    const numSquares = GAME_WIDTH / totalBlockSize;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < numSquares; i++) {
        const x = i * totalBlockSize + (gapSize / 2);
        const y = GAME_HEIGHT / 2 - squareSize / 2;
        ctx.fillRect(x, y, squareSize, squareSize);
    }
    
    drawBall();
    drawPaddle(player1);
    drawPaddle((gameMode === 'ai') ? ai : player2);
    drawPowerUps(); 
    if (isCountdownActive) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '100px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countdownValue, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
}

function drawPaused() {
    draw(); 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("PAUSED", GAME_WIDTH / 2, GAME_HEIGHT / 2);
    
    ctx.font = '15px "Press Start 2P"';
    ctx.fillText("Press P or Start to Resume", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

    if (ball.activeSpeedBoost) {
        ctx.shadowColor = POWER_UP_TYPES.SPEED_BOOST.color;
        ctx.shadowBlur = 20;
    }
    
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

function drawPaddle(paddle) {
    const LAYER_OFFSET = 4; 
    const isBottomPaddle = paddle.y > GAME_HEIGHT / 2;
    
    const mainLayerColor = paddle.hitTimer > 0 ? '#ffffff' : paddle.color;
    const secondLayerColor = paddle.color === '#00ffff' ? '#008b8b' : '#b22222';
    const yOffset = isBottomPaddle ? -LAYER_OFFSET : LAYER_OFFSET;

    ctx.fillStyle = secondLayerColor;
    for (const seg of paddle.layer2_segments) {
        ctx.fillRect(paddle.x + seg.x_offset, paddle.y + yOffset, seg.width, paddle.height);
    }
    
    ctx.fillStyle = mainLayerColor;
    for (const seg of paddle.layer1_segments) {
        ctx.fillRect(paddle.x + seg.x_offset, paddle.y, seg.width, paddle.height);
    }
}

function drawPowerUps() {
    powerUps.forEach(p => {
        ctx.fillStyle = p.type.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let icon = '?';
        if (p.type.id === 'EXPAND_SELF') icon = 'E';
        if (p.type.id === 'SHRINK_OPPONENT') icon = 'S';
        if (p.type.id === 'SPEED_BOOST') icon = 'F';
        ctx.fillText(icon, p.x, p.y + 1);
    });
}

function gameLoop() {
    animationFrameId = requestAnimationFrame(gameLoop);

    checkGamepadInputs(); 
    
    if (isPaused) {
        return;
    }

    if (isCountdownActive) {
        draw();
        return;
    }
    if (player1.hitTimer > 0) player1.hitTimer--;
    const topPaddle = (gameMode === 'ai') ? ai : player2;
    if (topPaddle.hitTimer > 0) topPaddle.hitTimer--;
    
    if (ball.speed < ball.maxSpeed) {
        ball.speed += 0.0005; 
    }

    movePaddles();
    moveBall();
    moveAndCheckPowerUps();
    draw();
}

function transitionToGame() {
    Tone.start();
    document.body.style.overflow = 'hidden';
    homepageContainer.style.opacity = '0';
    setTimeout(() => {
        homepageContainer.style.display = 'none';
        gameWrapper.style.display = 'flex';
        resizeCanvas();
        setTimeout(() => gameWrapper.style.opacity = '1', 50);
    }, 300);
}

vsAiButton.addEventListener('click', () => {
    gameMode = 'ai';
    settingsButton.style.display = 'inline-block';
    gameDescription.innerText = `First to ${winningScore} wins! AI gets tougher as you score!`;
    transitionToGame();
});

vsPlayerButton.addEventListener('click', () => {
    gameMode = 'multiplayer';
    settingsButton.style.display = 'inline-block';
    gameDescription.innerText = `First to ${winningScore} wins! Player vs Player!`;
    transitionToGame();
});

homeButton.addEventListener('click', () => {
    gameWrapper.style.opacity = '0';
    document.body.style.overflow = '';
    cancelAnimationFrame(animationFrameId);
    resetPaddles();
    updateScores();
    startButton.innerText = 'Start Game';
    messageBox.querySelector('h2').innerText = 'Sacrificial Ping Pong';
    setTimeout(() => {
        gameWrapper.style.display = 'none';
        homepageContainer.style.display = 'flex';
        setTimeout(() => homepageContainer.style.opacity = '1', 50);
    }, 300);
});

startButton.addEventListener('click', () => {
    homeButton.style.display = 'none';
    init();
});

function updateSettingsVisibility() {
    if (gameMode === 'ai') {
        aiSettingsRow.style.display = 'grid';
    } else {
        aiSettingsRow.style.display = 'none';
    }
}

settingsButton.addEventListener('click', () => {
    messageBox.style.display = 'none';
    settingsBox.style.display = 'block';
    updateSettingsVisibility();
});

saveSettingsButton.addEventListener('click', () => {
    winningScore = parseInt(winningScoreInput.value);
    const difficultyValue = parseInt(aiDifficultyInput.value);
    ai.initialError = 0.55 - (difficultyValue * 0.05);

    const speedValue = parseInt(ballSpeedInput.value);
    ball.baseSpeed = 2.5 + (speedValue - 1) * 0.5; 
    resetBall();

    gameDescription.innerText = `First to ${winningScore} wins! Both paddles split on hit. AI gets tougher as you score!`;
    settingsBox.style.display = 'none';
    messageBox.style.display = 'block';
});

winningScoreInput.addEventListener('input', (e) => winningScoreValue.textContent = e.target.value);
aiDifficultyInput.addEventListener('input', (e) => aiDifficultyValue.textContent = e.target.value);
ballSpeedInput.addEventListener('input', (e) => ballSpeedValue.textContent = e.target.value);

window.addEventListener('resize', () => {
    if (gameWrapper.style.display === 'flex') resizeCanvas();
});

resetPaddles();

function createStars() {
    const container = document.getElementById('stars-background');
    if (!container) return;
    const starCount = 250; 
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        const size = Math.random() * 2 + 1; 
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;

        const duration = Math.random() * 4 + 2; 
        const delay = Math.random() * 6;      

        star.style.animationDuration = `${duration}s`;
        star.style.animationDelay = `${delay}s`;

        container.appendChild(star);
    }
}

createStars();
