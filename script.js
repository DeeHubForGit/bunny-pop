// Game state
let score = 0;
let timeLeft = 40;
let gameActive = false;
let timerInterval = null;
let spawnTimeout = null;
let currentBunny = null;
let spawnCount = 0;
let goldenSpawns = [];

// Constants
const BUNNY_SIZE = 120;
const GAME_DURATION = 40;

// DOM elements
const startBtn = document.getElementById('start-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const gameContainer = document.getElementById('game-container');
const gameOver = document.getElementById('game-over');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const finalScoreDisplay = document.getElementById('final-score');
const messageDisplay = document.getElementById('message');

// Pop texts for fun
const popTexts = ['Boing!', 'Poof!', 'Bunished!', 'Pop!', 'Yay!'];

// Start game
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);

function startGame() {
    // Clear any existing intervals and timeouts
    if (timerInterval) clearInterval(timerInterval);
    if (spawnTimeout) clearTimeout(spawnTimeout);
    
    // Remove any existing bunny
    if (currentBunny) {
        currentBunny.remove();
        currentBunny = null;
    }
    
    // Clear any leftover transient effects
    const popTextElements = gameContainer.querySelectorAll('.pop-text');
    popTextElements.forEach(el => el.remove());
    
    const scorePops = document.querySelectorAll('.score-pop');
    scorePops.forEach(el => el.remove());
    
    // Reset game state
    score = 0;
    timeLeft = GAME_DURATION;
    gameActive = true;
    spawnCount = 0;
    
    // Plan guaranteed golden bunnies for this round
    // Estimate ~13 spawns in 40 seconds, guarantee at least 2 golden
    const goldenSpawn1 = 2 + Math.floor(Math.random() * 4); // spawn 2-5
    const goldenSpawn2 = 7 + Math.floor(Math.random() * 4); // spawn 7-10
    goldenSpawns = [goldenSpawn1, goldenSpawn2];
    
    // Update displays
    scoreDisplay.textContent = score;
    timerDisplay.textContent = timeLeft;
    
    // Hide/show elements
    startBtn.classList.add('hidden');
    gameOver.classList.add('hidden');
    
    // Start timer
    timerInterval = setInterval(updateTimer, 1000);
    
    // Spawn first bunny
    spawnBunny();
}

function updateTimer() {
    timeLeft = Math.max(0, timeLeft - 1);
    timerDisplay.textContent = timeLeft;
    
    if (timeLeft <= 0) {
        endGame();
    }
}

function scheduleNextBunny() {
    if (!gameActive) return;
    
    // Clear any existing timeout to prevent overlaps
    if (spawnTimeout) {
        clearTimeout(spawnTimeout);
        spawnTimeout = null;
    }
    
    const spawnDelay = 1000 + Math.random() * 500;
    spawnTimeout = setTimeout(() => {
        spawnTimeout = null;
        spawnBunny();
    }, spawnDelay);
}

function spawnBunny() {
    if (!gameActive) return;
    
    // Remove old bunny if exists
    if (currentBunny) {
        currentBunny.remove();
        currentBunny = null;
    }
    
    // Increment spawn counter
    spawnCount++;
    
    // Determine if golden bunny (guaranteed at planned spawns)
    const isGolden = goldenSpawns.includes(spawnCount);
    
    // Create bunny
    const bunny = document.createElement('div');
    bunny.className = 'bunny';
    bunny.textContent = isGolden ? '✨🐰' : '🐰';
    if (isGolden) bunny.classList.add('golden');
    
    // Random position (ensure bunny stays inside container)
    const containerWidth = gameContainer.offsetWidth;
    const containerHeight = gameContainer.offsetHeight;
    
    const maxX = containerWidth - BUNNY_SIZE;
    const maxY = containerHeight - BUNNY_SIZE;
    
    const randomX = Math.random() * maxX;
    const randomY = Math.random() * maxY;
    
    bunny.style.left = randomX + 'px';
    bunny.style.top = randomY + 'px';
    
    // Add click handler
    bunny.addEventListener('click', () => handleBunnyClick(bunny, isGolden));
    
    // Add to container
    gameContainer.appendChild(bunny);
    currentBunny = bunny;
    
    // Schedule next spawn (slower pace for tablet play)
    scheduleNextBunny();
}

function handleBunnyClick(bunny, isGolden) {
    if (!gameActive) return;
    
    // Prevent double-clicking during animation
    if (bunny.dataset.popping === 'true') return;
    bunny.dataset.popping = 'true';
    
    // Clear pending spawn timeout immediately
    if (spawnTimeout) {
        clearTimeout(spawnTimeout);
        spawnTimeout = null;
    }
    
    // Update score
    const points = isGolden ? 5 : 1;
    score += points;
    scoreDisplay.textContent = score;
    
    // Show pop animation and text
    showPopEffect(bunny, points);
    
    // Remove bunny with animation
    bunny.style.animation = 'pop 0.3s ease-out';
    setTimeout(() => {
        bunny.remove();
        if (currentBunny === bunny) {
            currentBunny = null;
        }
        // Schedule next bunny with slow delay
        if (gameActive) {
            scheduleNextBunny();
        }
    }, 300);
}

function showPopEffect(bunny, points) {
    // Random pop text
    const text = popTexts[Math.floor(Math.random() * popTexts.length)];
    const popText = document.createElement('div');
    popText.className = 'pop-text';
    popText.textContent = text;
    popText.style.left = bunny.style.left;
    popText.style.top = bunny.style.top;
    gameContainer.appendChild(popText);
    
    setTimeout(() => popText.remove(), 1000);
    
    // Score animation on score display
    if (points > 1) {
        const scorePop = document.createElement('div');
        scorePop.className = 'score-pop';
        scorePop.textContent = '+' + points;
        scoreDisplay.parentElement.style.position = 'relative';
        scoreDisplay.parentElement.appendChild(scorePop);
        setTimeout(() => scorePop.remove(), 800);
    }
}

function endGame() {
    gameActive = false;
    
    // Clear intervals and timeouts
    if (timerInterval) clearInterval(timerInterval);
    if (spawnTimeout) clearTimeout(spawnTimeout);
    
    // Remove current bunny
    if (currentBunny) {
        currentBunny.remove();
        currentBunny = null;
    }
    
    // Show game over screen
    finalScoreDisplay.textContent = score;
    
    // Determine message based on score
    let message;
    if (score <= 5) {
        message = '🐰 The bunnies escaped! 🐰';
    } else if (score <= 15) {
        message = '🌟 Nice bunny popping! 🌟';
    } else {
        message = '🏆 Bunny Pop Champion! 🏆';
    }
    messageDisplay.textContent = message;
    
    gameOver.classList.remove('hidden');
}
