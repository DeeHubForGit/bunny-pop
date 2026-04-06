// Game state
let score = 0;
let timeLeft = 40;
let gameActive = false;
let timerInterval = null;
let spawnTimeout = null;
let currentBunny = null;
let spawnCount = 0;
let goldenSpawns = [];
let bunnySpawnTime = 0;

// Constants
const BUNNY_SIZE = 120;
const GAME_DURATION = 40;
const BUNNY_PADDING = 12;
const MISSED_BUNNY_DELAY = 220;
const popSound = new Audio('pop.mp3');

// DOM elements
const startBtn = document.getElementById('start-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const gameContainer = document.getElementById('game-container');
const gameOver = document.getElementById('game-over');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const finalScoreDisplay = document.getElementById('final-score');
const messageDisplay = document.getElementById('message');
const speedSlider = document.getElementById('speed-slider');
const speedText = document.getElementById('speed-text');

// Pop texts for fun
const popTexts = ['Boing!', 'Poof!', 'Bunished!', 'Pop!', 'Yay!'];

// Speed configuration
const speedConfig = {
    1: { min: 1800, max: 2300, name: 'Level 1: Turtle Slow' },
    2: { min: 1400, max: 1900, name: 'Level 2: Slow' },
    3: { min: 1100, max: 1600, name: 'Level 3: Just Right' },
    4: { min: 900, max: 1300, name: 'Level 4: Fast' },
    5: { min: 700, max: 1000, name: 'Level 5: Super Speedy' }
};

// Initialize speed setting
loadSavedSpeed();

// Event listeners
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
speedSlider.addEventListener('input', handleSpeedChange);

// Speed control functions
function loadSavedSpeed() {
    const savedSpeed = localStorage.getItem('bunnyPopSpeed');
    const speed = savedSpeed ? parseInt(savedSpeed) : 3;
    speedSlider.value = speed;
    updateSpeedDisplay(speed);
}

function handleSpeedChange() {
    if (gameActive) return;
    
    const speed = parseInt(speedSlider.value);
    updateSpeedDisplay(speed);
    saveSpeedSetting(speed);
}

function updateSpeedDisplay(speed) {
    speedText.textContent = speedConfig[speed].name;
}

function saveSpeedSetting(speed) {
    localStorage.setItem('bunnyPopSpeed', speed);
}

function getSpawnDelayRange() {
    const speed = parseInt(speedSlider.value);
    return speedConfig[speed];
}

function startGame() {
    // Clear any existing intervals and timeouts
    if (timerInterval) clearInterval(timerInterval);
    if (spawnTimeout) {
        clearTimeout(spawnTimeout);
        spawnTimeout = null;
    }
    
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
    
    // Disable speed slider during gameplay
    speedSlider.disabled = true;
    
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

    // Prevent multiple spawn timers from stacking
    if (spawnTimeout !== null) return;

    const delayRange = getSpawnDelayRange();

    // Use a proper random value between min and max
    const spawnDelay = delayRange.min + Math.random() * (delayRange.max - delayRange.min);

    spawnTimeout = setTimeout(() => {
        spawnTimeout = null;
        spawnBunny();
    }, spawnDelay);
}

function spawnBunny() {
    if (!gameActive) return;
    
    // Ensure bunny stays visible for at least 400ms before replacement
    if (currentBunny && Date.now() - bunnySpawnTime < 400) {
        scheduleNextBunny();
        return;
    }
    
    // If previous bunny was missed, leave it visible briefly before replacing it
    if (currentBunny) {
        const missedBunny = currentBunny;

        spawnTimeout = setTimeout(() => {
            spawnTimeout = null;

            if (missedBunny === currentBunny) {
                missedBunny.remove();
                currentBunny = null;
            }

            if (gameActive) {
                spawnBunny();
            }
        }, MISSED_BUNNY_DELAY);

        return;
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
    
    const bunnyWidth = BUNNY_SIZE;
    const bunnyHeight = BUNNY_SIZE;
    
    const minX = BUNNY_PADDING;
    const minY = BUNNY_PADDING;
    const maxX = containerWidth - bunnyWidth - BUNNY_PADDING;
    const maxY = containerHeight - bunnyHeight - BUNNY_PADDING;
    
    const randomX = minX + Math.random() * Math.max(0, maxX - minX);
    const randomY = minY + Math.random() * Math.max(0, maxY - minY);
    
    bunny.style.left = randomX + 'px';
    bunny.style.top = randomY + 'px';
    
    // Add touch-friendly input handler
    bunny.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        handleBunnyClick(bunny, isGolden);
    });
    
    // Add to container
    gameContainer.appendChild(bunny);
    currentBunny = bunny;
    
    // Add active class for fade-in effect
    bunny.classList.add('active');
    
    // Record spawn time for minimum visibility protection
    bunnySpawnTime = Date.now();
    
    // Schedule next spawn based on selected speed
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
    
    // Play pop sound
    popSound.currentTime = 0;
    popSound.play();
    
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
    if (spawnTimeout) {
        clearTimeout(spawnTimeout);
        spawnTimeout = null;
    }
    
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
    
    // Re-enable speed slider
    speedSlider.disabled = false;
    
    // Show game over overlay
    startBtn.classList.add('hidden');
    gameOver.classList.remove('hidden');
}
