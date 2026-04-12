// Game state
let score = 0;
let timeLeft = 40;
let gameDuration = 40;
let gameActive = false;
let timerInterval = null;
let spawnTimeout = null;
let currentBunny = null;
let currentGoldenBunny = null;
let goldenBunnyTimeout = null;
let spawnCount = 0;
let goldenSpawns = [];
let bunnySpawnTime = 0;
let nextGoldenBunnyTime = 0;

// Constants
const BUNNY_SIZE = 120;
const BUNNY_PADDING = 12;
const MISSED_BUNNY_DELAY = 220;
const SCORES_KEY = 'bunnyPopHighScores';
const RECORD_SCORES_KEY = 'bunnyPopRecordScoresEnabled';
const DURATION_KEY = 'bunnyPopGameDuration';
const MAX_SCORES = 50;
const GOLD_SPEED_MULTIPLIER = 2;
const popSound = new Audio('pop.mp3');

// DOM elements
const startBtn = document.getElementById('start-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const gameContainer = document.getElementById('game-container');
const gameOver = document.getElementById('game-over');
const scoreDisplay = document.getElementById('score');
const timerCountdown = document.getElementById('timer-countdown');
const timeSelector = document.getElementById('time-selector');
const finalScoreDisplay = document.getElementById('final-score');
const finalDurationDisplay = document.getElementById('final-duration');
const messageDisplay = document.getElementById('message');
const speedSlider = document.getElementById('speed-slider');
const speedText = document.getElementById('speed-text');
const viewScoresBtn = document.getElementById('view-scores-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalActions = document.getElementById('modal-actions');
const modalCloseBtn = document.getElementById('modal-close-btn');

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

// Initialize game duration
loadSavedGameDuration();
timerCountdown.textContent = '0s';

// Initialize record scores setting
loadRecordScoresSetting();

// Event listeners
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
speedSlider.addEventListener('input', handleSpeedChange);
timeSelector.addEventListener('change', handleTimeSelectorChange);
viewScoresBtn.addEventListener('click', showScoresModal);
modalCloseBtn.addEventListener('click', closeModal);

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

// Record scores control functions
function loadRecordScoresSetting() {
    const saved = localStorage.getItem(RECORD_SCORES_KEY);
    return saved === 'true';
}

function saveRecordScoresSetting(enabled) {
    localStorage.setItem(RECORD_SCORES_KEY, enabled.toString());
}

function isRecordScoresEnabled() {
    return loadRecordScoresSetting();
}

// Time selector functions
function loadSavedGameDuration() {
    const saved = localStorage.getItem(DURATION_KEY);
    const duration = saved ? parseInt(saved) : 40;
    timeSelector.value = duration;
    gameDuration = duration;
}

function handleTimeSelectorChange() {
    if (gameActive) return;
    
    const duration = parseInt(timeSelector.value);
    saveGameDuration(duration);
    gameDuration = duration;
}

function saveGameDuration(duration) {
    localStorage.setItem(DURATION_KEY, duration.toString());
}

function getSelectedGameDuration() {
    return parseInt(timeSelector.value);
}

function setTimeSelectorEnabled(enabled) {
    timeSelector.disabled = !enabled;
    if (enabled) {
        // After game ends, reset countdown to 0s
        timerCountdown.textContent = '0s';
    }
}

function startGame() {
    // Clear any existing intervals and timeouts
    if (timerInterval) clearInterval(timerInterval);
    if (spawnTimeout) {
        clearTimeout(spawnTimeout);
        spawnTimeout = null;
    }
    if (goldenBunnyTimeout) {
        clearTimeout(goldenBunnyTimeout);
        goldenBunnyTimeout = null;
    }
    
    // Remove any existing bunny
    if (currentBunny) {
        currentBunny.remove();
        currentBunny = null;
    }
    
    // Remove any existing golden bunny
    if (currentGoldenBunny) {
        currentGoldenBunny.remove();
        currentGoldenBunny = null;
    }
    
    // Clear any leftover transient effects
    const popTextElements = gameContainer.querySelectorAll('.pop-text');
    popTextElements.forEach(el => el.remove());
    
    const scorePops = document.querySelectorAll('.score-pop');
    scorePops.forEach(el => el.remove());
    
    // Get selected duration
    gameDuration = getSelectedGameDuration();
    
    // Reset game state
    score = 0;
    timeLeft = gameDuration;
    gameActive = true;
    spawnCount = 0;
    
    // Schedule golden bunny appearances
    // First one after 3-7 seconds, then every 8-15 seconds
    nextGoldenBunnyTime = Date.now() + 3000 + Math.random() * 4000;
    
    // Update displays
    scoreDisplay.textContent = score;
    timerCountdown.textContent = timeLeft + 's';
    
    // Hide/show elements
    startBtn.classList.add('hidden');
    gameOver.classList.add('hidden');
    
    // Disable controls during gameplay
    speedSlider.disabled = true;
    setTimeSelectorEnabled(false);
    viewScoresBtn.disabled = true;
    
    // Start timer
    timerInterval = setInterval(updateTimer, 1000);
    
    // Spawn first bunny
    spawnBunny();
}

function updateTimer() {
    timeLeft = Math.max(0, timeLeft - 1);
    timerCountdown.textContent = timeLeft + 's';
    
    // Check if it's time for a golden bunny
    if (Date.now() >= nextGoldenBunnyTime && !currentGoldenBunny) {
        spawnGoldenBunny();
        // Schedule next golden bunny
        nextGoldenBunnyTime = Date.now() + 8000 + Math.random() * 7000;
    }
    
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
    
    // Create normal bunny
    const bunny = document.createElement('div');
    bunny.className = 'bunny';
    bunny.textContent = '🐰';
    
    // Random position (ensure bunny stays inside container)
    const containerWidth = gameContainer.offsetWidth;
    const containerHeight = gameContainer.offsetHeight;
    
    const bunnyWidth = BUNNY_SIZE;
    const bunnyHeight = BUNNY_SIZE;
    
    const minX = BUNNY_PADDING;
    const minY = BUNNY_PADDING;
    const maxX = containerWidth - bunnyWidth - BUNNY_PADDING;
    const maxY = containerHeight - bunnyHeight - BUNNY_PADDING;
    
    // Normal bunny at random position
    const randomX = minX + Math.random() * Math.max(0, maxX - minX);
    const randomY = minY + Math.random() * Math.max(0, maxY - minY);
    
    bunny.style.left = randomX + 'px';
    bunny.style.top = randomY + 'px';
    
    // Add touch-friendly input handler
    bunny.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        handleBunnyClick(bunny, false);
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

function spawnGoldenBunny() {
    if (!gameActive) return;
    
    // Don't spawn if golden bunny already exists
    if (currentGoldenBunny) return;
    
    // Get container dimensions
    const containerWidth = gameContainer.offsetWidth;
    const containerHeight = gameContainer.offsetHeight;
    
    const bunnyWidth = BUNNY_SIZE;
    const bunnyHeight = BUNNY_SIZE;
    
    const minX = BUNNY_PADDING;
    const minY = BUNNY_PADDING;
    const maxX = containerWidth - bunnyWidth - BUNNY_PADDING;
    const maxY = containerHeight - bunnyHeight - BUNNY_PADDING;
    
    // Create golden bunny
    const goldenBunny = document.createElement('div');
    goldenBunny.className = 'bunny golden moving';
    goldenBunny.textContent = '🐰';
    
    // Golden bunny starts on the right side
    const startX = maxX;
    const startY = minY + Math.random() * Math.max(0, maxY - minY);
    const endX = minX - bunnyWidth; // Move completely off screen to the left
    
    goldenBunny.style.left = startX + 'px';
    goldenBunny.style.top = startY + 'px';
    
    // Calculate speed based on current speed setting
    const speedLevel = parseInt(speedSlider.value);
    const delayRange = speedConfig[speedLevel];
    // Base duration derived from speed - faster game = faster golden bunny
    const baseDuration = ((delayRange.min + delayRange.max) / 2) / 200; // Convert to reasonable seconds
    const goldDuration = Math.max(2, baseDuration / GOLD_SPEED_MULTIPLIER);
    
    // Set CSS variables for animation
    goldenBunny.style.setProperty('--start-left', startX + 'px');
    goldenBunny.style.setProperty('--end-left', endX + 'px');
    goldenBunny.style.setProperty('--gold-duration', goldDuration + 's');
    
    // Apply horizontal movement animation via inline style
    // This keeps it separate from the transform-based wobble animation
    goldenBunny.style.animation = `golden-move ${goldDuration}s linear forwards, golden-wobble 1.5s ease-in-out infinite`;
    
    // Add click handler
    goldenBunny.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        handleGoldenBunnyClick(goldenBunny);
    });
    
    // Add to container
    gameContainer.appendChild(goldenBunny);
    currentGoldenBunny = goldenBunny;
    
    // Add active class for fade-in effect
    goldenBunny.classList.add('active');
    
    // Remove golden bunny after animation completes
    goldenBunnyTimeout = setTimeout(() => {
        removeGoldenBunny();
    }, goldDuration * 1000);
}

function handleGoldenBunnyClick(goldenBunny) {
    if (!gameActive) return;
    
    // Prevent double-clicking during animation
    if (goldenBunny.dataset.popping === 'true') return;
    goldenBunny.dataset.popping = 'true';
    
    // Clear the auto-remove timeout
    if (goldenBunnyTimeout) {
        clearTimeout(goldenBunnyTimeout);
        goldenBunnyTimeout = null;
    }
    
    // Capture current visual position before removing animation
    const rect = goldenBunny.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    const currentLeft = rect.left - containerRect.left;
    const currentTop = rect.top - containerRect.top;
    
    // Freeze at current position
    goldenBunny.style.left = currentLeft + 'px';
    goldenBunny.style.top = currentTop + 'px';
    
    // Clear movement animations
    goldenBunny.style.animation = 'none';
    
    // Force a reflow to ensure the position is applied
    goldenBunny.offsetHeight;
    
    // Award bonus points
    const points = 5;
    score += points;
    scoreDisplay.textContent = score;
    
    // Play pop sound
    popSound.currentTime = 0;
    popSound.play();
    
    // Show pop animation and text
    showPopEffect(goldenBunny, points);
    
    // Remove golden bunny with pop animation
    goldenBunny.style.animation = 'pop 0.3s ease-out';
    setTimeout(() => {
        if (currentGoldenBunny === goldenBunny) {
            goldenBunny.remove();
            currentGoldenBunny = null;
        }
    }, 300);
}

function removeGoldenBunny() {
    if (currentGoldenBunny) {
        currentGoldenBunny.remove();
        currentGoldenBunny = null;
    }
    if (goldenBunnyTimeout) {
        clearTimeout(goldenBunnyTimeout);
        goldenBunnyTimeout = null;
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
    
    // Remove golden bunny
    removeGoldenBunny();
    
    // Remove ALL remaining bunny elements (catches any delayed spawns or leftovers)
    const allBunnies = gameContainer.querySelectorAll('.bunny, .golden');
    allBunnies.forEach(bunny => bunny.remove());
    
    // Show game over screen
    finalScoreDisplay.textContent = score;
    finalDurationDisplay.textContent = gameDuration;
    
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
    
    // Re-enable controls
    speedSlider.disabled = false;
    setTimeSelectorEnabled(true);
    viewScoresBtn.disabled = false;
    
    // Show game over overlay
    startBtn.classList.add('hidden');
    gameOver.classList.remove('hidden');
    
    // Check if record scores is enabled
    if (isRecordScoresEnabled()) {
        // Show scores modal with pending score after a brief delay
        setTimeout(() => {
            showScoresModal({ pendingScore: score, pendingDuration: gameDuration });
        }, 500);
    }
}

// Score Functions
function loadScores() {
    try {
        const data = localStorage.getItem(SCORES_KEY);
        if (!data) return [];
        const scores = JSON.parse(data);
        return Array.isArray(scores) ? scores : [];
    } catch (error) {
        console.error('Error loading scores:', error);
        return [];
    }
}

function saveScores(scores) {
    try {
        localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    } catch (error) {
        console.error('Error saving scores:', error);
    }
}

function getSortedScores() {
    const scores = loadScores();
    return scores.sort((a, b) => b.score - a.score);
}

function getNextDefaultPlayerName(scores) {
    // Find all existing Player X names
    const playerNumbers = scores
        .map(s => s.name)
        .filter(name => /^Player \d+$/.test(name))
        .map(name => parseInt(name.replace('Player ', '')))
        .filter(num => !isNaN(num));
    
    // Find the highest number
    const maxNumber = playerNumbers.length > 0 ? Math.max(...playerNumbers) : 0;
    
    // Return next number
    return `Player ${maxNumber + 1}`;
}

function getTrophyForRank(index) {
    const trophies = {
        0: '🥇',
        1: '🥈',
        2: '🥉'
    };
    return trophies[index] || '';
}

function normalizePlayerName(name) {
    if (!name) return '';
    
    // Trim and collapse multiple spaces to single space
    return name.trim().replace(/\s+/g, ' ');
}

function isValidPlayerName(name) {
    if (!name) return false;
    
    // Must contain at least one letter or number
    if (!/[a-zA-Z0-9]/.test(name)) return false;
    
    // Allow letters, numbers, spaces, apostrophes, hyphens
    if (!/^[a-zA-Z0-9\s'\-]+$/.test(name)) return false;
    
    return true;
}

function clearScores() {
    try {
        localStorage.removeItem(SCORES_KEY);
    } catch (error) {
        console.error('Error clearing scores:', error);
    }
}

function recordScore(name, newScore, durationSeconds) {
    const scores = loadScores();
    
    // Normalize and validate name
    let playerName = normalizePlayerName(name);
    if (!playerName) {
        playerName = getNextDefaultPlayerName(scores);
    }
    
    // Limit name length
    if (playerName.length > 15) {
        playerName = playerName.substring(0, 15);
    }
    
    // Create new score entry
    const newEntry = {
        name: playerName,
        score: newScore,
        durationSeconds: durationSeconds,
        recordedAt: new Date().toISOString()
    };
    
    // Add to scores
    scores.push(newEntry);
    
    // Sort and keep only top scores
    const sortedScores = scores.sort((a, b) => b.score - a.score);
    const topScores = sortedScores.slice(0, MAX_SCORES);
    
    // Save
    saveScores(topScores);
    
    return newEntry;
}

// Modal Functions
function openModal(title, bodyContent, actions, allowDismiss = true) {
    // Remove any existing record control from previous modals
    const existingRecordControl = modalOverlay.querySelector('.modal-record-control');
    if (existingRecordControl) {
        existingRecordControl.remove();
    }
    
    modalTitle.innerHTML = '';
    
    // Add sparkle to Scores title
    if (title === 'Scores') {
        const sparkle = document.createElement('span');
        sparkle.className = 'modal-title-sparkle';
        sparkle.textContent = '✨';
        modalTitle.appendChild(sparkle);
        
        const titleText = document.createElement('span');
        titleText.textContent = title;
        modalTitle.appendChild(titleText);
    } else {
        modalTitle.textContent = title;
    }
    
    // Set body content
    if (typeof bodyContent === 'string') {
        modalBody.innerHTML = bodyContent;
    } else if (bodyContent instanceof HTMLElement) {
        modalBody.innerHTML = '';
        modalBody.appendChild(bodyContent);
    }
    
    // Set actions
    modalActions.innerHTML = '';
    if (actions && actions.length > 0) {
        // Add class if there are multiple action types
        if (actions.some(a => a.danger) || (actions.length === 2 && actions.some(a => !a.primary))) {
            modalActions.classList.add('has-secondary');
        } else {
            modalActions.classList.remove('has-secondary');
        }
        
        actions.forEach(action => {
            const btn = document.createElement('button');
            let btnClass = 'modal-btn';
            if (action.primary) {
                btnClass += ' modal-btn-primary';
            } else if (action.danger) {
                btnClass += ' modal-btn-danger';
            } else {
                btnClass += ' modal-btn-secondary';
            }
            btn.className = btnClass;
            btn.textContent = action.label;
            btn.addEventListener('click', action.onClick);
            modalActions.appendChild(btn);
        });
    }
    
    // Show modal
    modalOverlay.classList.remove('hidden');
    
    // Handle dismiss behavior
    if (allowDismiss) {
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        };
    } else {
        modalOverlay.onclick = null;
    }
}

function closeModal() {
    // Remove any existing record control
    const existingRecordControl = modalOverlay.querySelector('.modal-record-control');
    if (existingRecordControl) {
        existingRecordControl.remove();
    }
    
    modalOverlay.classList.add('hidden');
    modalBody.innerHTML = '';
    modalActions.innerHTML = '';
    modalOverlay.onclick = null;
}

function showScoresModal(options = {}) {
    // Prevent opening during active gameplay
    if (gameActive) return;
    
    const { pendingScore = null, pendingDuration = null } = options;
    
    const scores = getSortedScores();
    
    // Create container for body content
    const container = document.createElement('div');
    
    let bodyContent;
    
    if (scores.length === 0 && !pendingScore) {
        // Empty state
        bodyContent = document.createElement('div');
        bodyContent.className = 'empty-scores';
        bodyContent.innerHTML = `
            <div class="empty-scores-icon">🏆</div>
            <div>No scores recorded yet</div>
        `;
        container.appendChild(bodyContent);
    } else {
        // Create scores list
        const list = document.createElement('ol');
        list.className = 'scores-list';
        
        // Create combined list with pending score if present
        let displayScores = [...scores];
        let pendingIndex = -1;
        
        if (pendingScore !== null) {
            // Create temporary pending entry
            const pendingEntry = {
                name: '',
                score: pendingScore,
                durationSeconds: pendingDuration,
                isPending: true
            };
            
            // Find correct position for pending score
            pendingIndex = displayScores.findIndex(s => s.score < pendingScore);
            if (pendingIndex === -1) {
                // Pending score is lowest, add at end
                pendingIndex = displayScores.length;
            }
            
            // Insert pending entry
            displayScores.splice(pendingIndex, 0, pendingEntry);
        }
        
        displayScores.forEach((entry, index) => {
            const item = document.createElement('li');
            item.className = 'score-item';
            
            if (entry.isPending) {
                item.classList.add('pending-score');
                
                // Render pending score row with inline input and actions
                const rank = document.createElement('span');
                rank.className = 'score-rank';
                
                const trophySpan = document.createElement('span');
                trophySpan.className = 'score-trophy';
                const trophy = getTrophyForRank(index);
                if (trophy) {
                    trophySpan.textContent = trophy;
                } else {
                    trophySpan.classList.add('empty');
                }
                rank.appendChild(trophySpan);
                
                const rankNum = document.createElement('span');
                rankNum.textContent = `${index + 1}.`;
                rank.appendChild(rankNum);
                
                // Name input
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.className = 'pending-score-input';
                nameInput.placeholder = 'Enter name';
                nameInput.maxLength = 15;
                
                const scoreValue = document.createElement('span');
                scoreValue.className = 'score-value';
                scoreValue.textContent = entry.score;
                
                item.appendChild(rank);
                item.appendChild(nameInput);
                item.appendChild(scoreValue);
                
                // Add duration if available
                if (entry.durationSeconds) {
                    const duration = document.createElement('span');
                    duration.className = 'score-duration';
                    duration.textContent = `${entry.durationSeconds}s`;
                    item.appendChild(duration);
                }
                
                // Add action buttons
                const actions = document.createElement('span');
                actions.className = 'pending-score-actions';
                
                const tickBtn = document.createElement('button');
                tickBtn.className = 'pending-action-btn pending-tick';
                tickBtn.textContent = '✔';
                tickBtn.title = 'Save score';
                
                const crossBtn = document.createElement('button');
                crossBtn.className = 'pending-action-btn pending-cross';
                crossBtn.textContent = '✖';
                crossBtn.title = 'Cancel';
                
                actions.appendChild(tickBtn);
                actions.appendChild(crossBtn);
                item.appendChild(actions);
                
                // Error message container
                const errorMsg = document.createElement('div');
                errorMsg.className = 'pending-score-error';
                item.appendChild(errorMsg);
                
                // Tick button handler
                tickBtn.addEventListener('click', () => {
                    const rawName = nameInput.value;
                    const normalized = normalizePlayerName(rawName);
                    
                    // Clear previous error
                    errorMsg.textContent = '';
                    errorMsg.style.display = 'none';
                    nameInput.classList.remove('error');
                    
                    // Validate non-blank names
                    if (normalized && !isValidPlayerName(normalized)) {
                        errorMsg.textContent = 'Letters, numbers, spaces, hyphens, apostrophes only';
                        errorMsg.style.display = 'block';
                        nameInput.classList.add('error');
                        return;
                    }
                    
                    // Save and get the saved entry
                    const savedEntry = recordScore(normalized || '', pendingScore, pendingDuration);
                    
                    // Transform pending row into normal saved row in-place
                    item.classList.remove('pending-score');
                    item.classList.add('newest');
                    
                    // Remove pending-specific elements
                    nameInput.remove();
                    actions.remove();
                    errorMsg.remove();
                    
                    // Create normal name span
                    const name = document.createElement('span');
                    name.className = 'score-name';
                    name.textContent = savedEntry.name;
                    
                    // Insert name after rank, before score
                    item.insertBefore(name, scoreValue);
                    
                    // Add date if available
                    if (savedEntry.recordedAt) {
                        const date = document.createElement('span');
                        date.className = 'score-date';
                        const dateObj = new Date(savedEntry.recordedAt);
                        date.textContent = dateObj.toLocaleDateString();
                        
                        // Find duration element to insert date after it
                        const duration = item.querySelector('.score-duration');
                        if (duration) {
                            duration.after(date);
                        } else {
                            item.appendChild(date);
                        }
                    }
                });
                
                // Cross button handler
                crossBtn.addEventListener('click', () => {
                    // Remove pending row without saving
                    item.remove();
                });
                
                // Enter key handler
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        tickBtn.click();
                    }
                });
                
                // Focus input after render
                setTimeout(() => nameInput.focus(), 150);
                
            } else {
                // Regular score row (existing logic)
                // Add rank class for top 3
                if (index < 3) {
                    item.classList.add(`rank-${index + 1}`);
                }
                
                const rank = document.createElement('span');
                rank.className = 'score-rank';
                
                const trophySpan = document.createElement('span');
                trophySpan.className = 'score-trophy';
                
                const trophy = getTrophyForRank(index);
                if (trophy) {
                    trophySpan.textContent = trophy;
                } else {
                    trophySpan.classList.add('empty');
                }
                rank.appendChild(trophySpan);
                
                const rankNum = document.createElement('span');
                rankNum.textContent = `${index + 1}.`;
                rank.appendChild(rankNum);
                
                const name = document.createElement('span');
                name.className = 'score-name';
                name.textContent = entry.name;
                
                const scoreValue = document.createElement('span');
                scoreValue.className = 'score-value';
                scoreValue.textContent = entry.score;
                
                item.appendChild(rank);
                item.appendChild(name);
                item.appendChild(scoreValue);
                
                // Add duration if available
                if (entry.durationSeconds) {
                    const duration = document.createElement('span');
                    duration.className = 'score-duration';
                    duration.textContent = `${entry.durationSeconds}s`;
                    item.appendChild(duration);
                }
                
                // Add date if available (hidden on mobile via CSS)
                if (entry.recordedAt) {
                    const date = document.createElement('span');
                    date.className = 'score-date';
                    const dateObj = new Date(entry.recordedAt);
                    date.textContent = dateObj.toLocaleDateString();
                    item.appendChild(date);
                }
            }
            
            list.appendChild(item);
        });
        
        container.appendChild(list);
        
        // Scroll to pending score row if it exists
        if (pendingScore !== null) {
            setTimeout(() => {
                const scoresList = list;
                const pendingRow = scoresList.querySelector('.pending-score');
                
                if (scoresList && pendingRow) {
                    const rowTop = pendingRow.offsetTop;
                    const rowHeight = pendingRow.offsetHeight;
                    const listHeight = scoresList.clientHeight;
                    
                    const targetScrollTop = rowTop - (listHeight / 2) + (rowHeight / 2);
                    
                    scoresList.scrollTo({
                        top: Math.max(0, targetScrollTop),
                        behavior: 'smooth'
                    });
                }
            }, 150);
        }
    }
    
    // Create record control section
    const recordControl = document.createElement('div');
    recordControl.className = 'modal-record-control';
    
    const recordLabel = document.createElement('label');
    recordLabel.className = 'record-checkbox-label';
    
    const recordCheckbox = document.createElement('input');
    recordCheckbox.type = 'checkbox';
    recordCheckbox.className = 'record-checkbox';
    recordCheckbox.id = 'modal-record-scores-checkbox';
    recordCheckbox.checked = isRecordScoresEnabled();
    recordCheckbox.addEventListener('change', (e) => {
        saveRecordScoresSetting(e.target.checked);
    });
    
    const recordCheckmark = document.createElement('span');
    recordCheckmark.className = 'record-checkmark';
    
    const recordLabelText = document.createElement('span');
    recordLabelText.className = 'record-label-text';
    recordLabelText.textContent = 'Record scores?';
    
    recordLabel.appendChild(recordCheckbox);
    recordLabel.appendChild(recordCheckmark);
    recordLabel.appendChild(recordLabelText);
    recordControl.appendChild(recordLabel);
    
    // Insert the second panel section into modal
    const modalPanel = modalOverlay.querySelector('.modal-panel');
    const existingRecordControl = modalPanel.querySelector('.modal-record-control');
    if (existingRecordControl) {
        existingRecordControl.remove();
    }
    
    // Create actions array
    const actions = [];
    
    // Add Clear Scores button first if there are scores (left side, secondary/danger)
    if (scores.length > 0) {
        // Use shorter text with icon on mobile
        const clearLabel = window.innerWidth <= 480 ? '❌ Clear' : '❌ Clear';
        actions.push({
            label: clearLabel,
            danger: true,
            onClick: showClearScoresConfirmModal
        });
    }
    
    // Add Close button as primary action (right side)
    actions.push({
        label: '✔ Close',
        primary: true,
        onClick: closeModal
    });
    
    openModal('Scores', container, actions, true);
    
    // Insert record control after modal body
    modalBody.parentNode.insertBefore(recordControl, modalActions);
}

function showClearScoresConfirmModal() {
    const message = document.createElement('div');
    message.style.textAlign = 'center';
    message.style.fontSize = '1.2rem';
    message.style.color = '#ff69b4';
    message.style.padding = '20px';
    message.textContent = 'Clear all saved scores?';
    
    const actions = [
        {
            label: '❌ Clear',
            danger: true,
            onClick: () => {
                clearScores();
                closeModal();
                // Show updated scores (empty state)
                setTimeout(showScoresModal, 100);
            }
        },
        {
            label: 'Cancel',
            primary: true,
            onClick: () => {
                closeModal();
                // Re-open scores modal
                setTimeout(showScoresModal, 100);
            }
        }
    ];
    
    openModal('Confirm Clear', message, actions, false);
}

function showRecordScoreModal(newScore, durationSeconds) {
    // Create record form
    const form = document.createElement('div');
    form.className = 'record-form';
    
    const message = document.createElement('p');
    message.className = 'record-message';
    message.textContent = 'Do you want to record your score?';
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'record-score-display';
    scoreDisplay.innerHTML = `<span>Score: ${newScore}</span><span class="record-separator">•</span><span>Time: ${durationSeconds}s</span>`;
    
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';
    
    const label = document.createElement('label');
    label.className = 'input-label';
    label.textContent = 'Player';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'player-name-input';
    input.placeholder = 'Enter name or leave blank';
    input.maxLength = 15;
    
    const errorMsg = document.createElement('span');
    errorMsg.className = 'input-error';
    
    inputGroup.appendChild(label);
    inputGroup.appendChild(input);
    inputGroup.appendChild(errorMsg);
    
    form.appendChild(message);
    form.appendChild(scoreDisplay);
    form.appendChild(inputGroup);
    
    // Helper to show error
    const showError = (msg) => {
        errorMsg.textContent = msg;
        errorMsg.classList.add('visible');
        input.classList.add('error');
    };
    
    // Helper to clear error
    const clearError = () => {
        errorMsg.textContent = '';
        errorMsg.classList.remove('visible');
        input.classList.remove('error');
    };
    
    // Clear error on input
    input.addEventListener('input', clearError);
    
    // Handle form submission
    const handleSubmit = () => {
        clearError();
        
        const rawName = input.value;
        const normalized = normalizePlayerName(rawName);
        
        // If blank, allow it (will use default Player X)
        if (!normalized) {
            recordScore('', newScore, durationSeconds);
            closeModal();
            return;
        }
        
        // Validate non-blank names
        if (!isValidPlayerName(normalized)) {
            showError('Please use letters, numbers, spaces, hyphens, or apostrophes only');
            return;
        }
        
        // If valid, save and continue
        recordScore(normalized, newScore, durationSeconds);
        closeModal();
    };
    
    // Handle Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    });
    
    const actions = [
        {
            label: 'No',
            primary: false,
            onClick: () => {
                closeModal();
            }
        },
        {
            label: '✔ Yes',
            primary: true,
            onClick: handleSubmit
        }
    ];
    
    openModal('Record Score', form, actions, false);
    
    // Focus input
    setTimeout(() => input.focus(), 100);
}

function highlightNewestScore() {
    // Find the most recently added score and highlight it
    const scores = getSortedScores();
    if (scores.length === 0) return;
    
    // Find most recent by timestamp
    let newestIndex = 0;
    let newestTime = new Date(scores[0].recordedAt);
    
    for (let i = 1; i < scores.length; i++) {
        const time = new Date(scores[i].recordedAt);
        if (time > newestTime) {
            newestTime = time;
            newestIndex = i;
        }
    }
    
    // Add highlight class
    const scoreItems = document.querySelectorAll('.score-item');
    if (scoreItems[newestIndex]) {
        scoreItems[newestIndex].classList.add('newest');
    }
}
