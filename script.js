/* ---------------------------
  script.js  — Fixed & Hardened
   - Works with your provided HTML
   - Defensive checks (safeGet)
   - Safe timer clear / reassign
   - Prevent duplicate slider listeners
   - Handles missing DOM gracefully
---------------------------- */

let gameActive = false;
let gamePaused = false;
let level = 1;
let sequenceStep = 0;
let totalSteps = 8; // 3 balls + 3 symmetries
let gameTimer = null;
let timeLeft = 300; // 5 minutes
let currentProgress = 1;
let maxProgress = 6;

// LEVEL PROGRESSION VARIABLES
let levelAdvancementThreshold = 70; // Minimum overall score needed to advance level
let maxLevel = 100; // Maximum level in the game

// SEQUENCE-BASED tracking
let ballSequence = [];
let shownSequence = [];
let symmetryResults = [];
let ballDisplayTime = 1500;
let symmetryTime = 3000;
let selectedBallsInOrder = [];
let inSelectionPhase = false;

// Symmetry data
let symmetryTimer = null;
let symmetryTimeLeft = 0;
let currentSymmetryPattern = null;

// Expanded symmetry patterns
const symmetryPatterns = [
  {
    pattern: [1,1,1,1,1,0,1,1,1,1,1,
              1,0,0,0,0,0,1,0,1,0,1,
              1,0,1,0,0,0,1,0,1,0,1,
              1,0,0,0,0,0,1,0,1,1,1,
              1,1,1,1,1,0,1,1,0,0,1],
    symmetric: false,
    question: "Mirror symmetry across red line?"
  },
  {
    pattern: [1,1,1,1,1,0,1,1,1,1,1,
              1,0,0,0,0,0,0,0,0,0,1,
              1,1,1,1,1,0,1,1,1,1,1,
              0,0,0,0,1,0,1,0,0,0,0,
              1,1,1,1,1,0,1,1,1,1,1],
    symmetric: true,
    question: "Mirror symmetry across red line?"
  },
  {
    pattern: [1,1,1,1,1,0,1,1,1,1,1,
              1,0,0,0,0,0,1,0,1,0,1,
              1,0,1,0,0,0,1,0,1,0,1,
              1,0,0,0,0,0,1,0,1,1,1,
              1,1,1,1,1,0,1,1,0,0,1],
    symmetric: false,
    question: "Mirror symmetry across red line?"
  },
  {
    pattern: [1,1,1,1,1,0,1,1,1,1,1,
              1,0,0,0,0,0,0,0,0,0,1,
              1,1,1,1,1,0,1,1,1,1,1,
              0,0,0,0,1,0,1,0,0,0,0,
              1,1,1,1,1,0,1,1,1,1,1],
    symmetric: true,
    question: "Mirror symmetry across red line?"
  },
  {
    pattern: [1,0,1,0,1,0,1,0,1,0,1,
              0,1,0,1,0,0,0,1,0,1,0,
              1,0,1,0,1,0,1,0,1,0,1,
              0,1,0,1,0,0,0,1,0,1,0,
              1,0,1,0,1,0,1,0,1,0,1],
    symmetric: true,
    question: "Mirror symmetry across red line?"
  },
  {
    pattern: [1,1,0,0,1,0,1,0,0,1,1,
              0,1,1,0,0,0,0,0,1,1,0,
              1,0,1,1,0,0,0,1,1,0,1,
              0,0,1,0,1,0,1,0,1,0,0,
              1,1,0,0,1,0,1,0,0,1,1],
    symmetric: false,
    question: "Mirror symmetry across red line?"
  }
];

function safeGet(id) {
  try {
    return document.getElementById(id);
  } catch (e) {
    return null;
  }
}

/* -------------------------
   Initialization / timers
   ------------------------- */
function initGame() {
  // ensure existing timer cleared
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
  updateTimer();    // update UI immediately
  updateProgress(); // update progress UI
  // start repeating timer
  gameTimer = setInterval(updateTimer, 1000);
}

function updateTimer() {
  // Only tick when active & not paused
  if (!gameActive || gamePaused) return;

  const el = safeGet("timer");
  if (el) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    el.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  if (timeLeft > 0) {
    timeLeft--;
  } else {
    // time's up
    endGame("Time's Up!");
  }
}

function updateProgress() {
  const fill = safeGet("progressFill");
  const text = safeGet("progressText");
  const percentage = Math.max(0, Math.min(100, (currentProgress / maxProgress) * 100));
  if (fill) fill.style.width = percentage + "%";
  if (text) text.textContent = currentProgress;
}

function updateLevel() {
  const el = safeGet("levelNum");
  if (el) el.textContent = level;
}

/* -------------------------
   Ball creation + layout
   ------------------------- */
function createBalls() {
  const gameBoard = safeGet("gameBoard");
  if (!gameBoard) return;

  // remove previous balls
  const existingBalls = gameBoard.querySelectorAll('.ball');
  existingBalls.forEach(b => b.remove());

  // compute ball count (same formula you used)
  const ballCount = Math.max(3, 15 + (level * 4));
  const positions = [];
  // safe fallback for size
  let boardRect = { width: 800, height: 400 };
  try {
    const rect = gameBoard.getBoundingClientRect();
    if (rect && rect.width && rect.height) boardRect = rect;
  } catch (e) { /* ignore */ }

  ballSequence = [];

  for (let i = 0; i < ballCount; i++) {
    let x = 20, y = 60, attempts = 0;
    do {
      x = Math.random() * Math.max(10, boardRect.width - 80) + 10;
      y = Math.random() * Math.max(60, boardRect.height - 140) + 60;
      attempts++;
    } while (isOverlapping(x, y, positions, 60, 20) && attempts < 100);

    positions.push({ x, y });

    const ball = document.createElement("div");
    ball.classList.add("ball");
    ball.dataset.index = String(i);
    ball.style.left = x + "px";
    ball.style.top = y + "px";
    // optional label (index) — remove if undesired:
    // ball.textContent = i+1;

    // click handler (no duplicate handlers because element is fresh)
    ball.addEventListener('click', () => handleBallClick(i));
    gameBoard.appendChild(ball);

    ballSequence.push({ index: i, x, y });
  }
}

function isOverlapping(x, y, positions, size = 60, padding = 20) {
  for (let pos of positions) {
    const dx = pos.x - x;
    const dy = pos.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < size + padding) return true;
  }
  return false;
}

/* -------------------------
   Ball selection & UI
   ------------------------- */
function handleBallClick(ballIndex) {
  if (!inSelectionPhase) return;
  const ball = document.querySelector(`[data-index="${ballIndex}"]`);
  if (!ball) return;

  // toggle selection
  if (ball.classList.contains('selected')) {
    ball.classList.remove('selected');
    ball.removeAttribute('data-sequence-number');
    selectedBallsInOrder = selectedBallsInOrder.filter(item => item.ballIndex !== ballIndex);
    updateSelectionDisplay();
    return;
  }

  selectedBallsInOrder.push({
    ballIndex,
    selectionOrder: selectedBallsInOrder.length + 1
  });

  ball.classList.add('selected');
  ball.setAttribute('data-sequence-number', selectedBallsInOrder.length);
  updateSelectionDisplay();
}

function updateSelectionDisplay() {
  const el = safeGet('selectedCount');
  if (el) el.textContent = selectedBallsInOrder.length;
}

/* -------------------------
   Game flow: start / sequence
   ------------------------- */
function startGame() {
  // only initialize sliders once (setupTimingSliders guards duplicates)
  setupTimingSliders();

  // hide start screen if present
  const startScreen = safeGet("startScreen");
  if (startScreen) startScreen.style.display = "none";

  // basic state
  gameActive = true;
  gamePaused = false;
  sequenceStep = 0;
  currentProgress = 1;
  shownSequence = [];
  symmetryResults = [];
  selectedBallsInOrder = [];
  inSelectionPhase = false;

  const playBtn = safeGet("playBtn");
  if (playBtn) playBtn.textContent = "⏸";

  updateLevel();
  initGame();
  createBalls();
  // small delay so DOM settles (ensures getBoundingClientRect is sensible)
  setTimeout(startSequence, 120);
}

function startSequence() {
  // guard: only run when game active
  if (!gameActive) return;

  if (sequenceStep >= totalSteps) {
    showSelectionPhase();
    return;
  }

  if (sequenceStep % 2 === 0) {
    showBall();
  } else {
    showSymmetry();
  }
}

function showBall() {
  if (!ballSequence.length) {
    // if no balls exist, create them and continue
    createBalls();
    if (!ballSequence.length) return; // still none
  }

  const randomIndex = Math.floor(Math.random() * ballSequence.length);
  const ballIndex = randomIndex;
  const ball = document.querySelector(`[data-index="${ballIndex}"]`);

  const instr = safeGet("gameInstruction");
  if (instr) instr.textContent = `Remember this ball! (${(ballDisplayTime/1000).toFixed(1)}s) - Sequence #${shownSequence.length + 1}`;

  if (ball) {
    ball.classList.add("active");

    shownSequence.push({
      ballIndex,
      sequenceOrder: shownSequence.length + 1,
      timing: ballDisplayTime,
      step: sequenceStep
    });

    // ensure we remove class even if something else interrupts
    setTimeout(() => {
      ball.classList.remove("active");
      sequenceStep++;
      currentProgress++;
      updateProgress();
      setTimeout(startSequence, 300);
    }, Math.max(200, ballDisplayTime)); // guard minimal display
  } else {
    // if ball not present, just advance
    sequenceStep++;
    currentProgress++;
    updateProgress();
    setTimeout(startSequence, 300);
  }
}

/* -------------------------
   Symmetry: show + timing
   ------------------------- */
function showSymmetry() {
  // pick pattern
  const pattern = symmetryPatterns[Math.floor(Math.random() * symmetryPatterns.length)];
  const overlay = safeGet("symmetryOverlay");
  const grid = safeGet("symmetryGrid");
  const question = safeGet("symmetryQuestion");

  if (!overlay || !grid || !question) {
    // if UI missing, skip symmetry and continue
    sequenceStep++;
    currentProgress++;
    updateProgress();
    setTimeout(startSequence, 300);
    return;
  }

  question.textContent = pattern.question || "Is it symmetric?";
  currentSymmetryPattern = pattern;

  grid.innerHTML = "";
  pattern.pattern.forEach(cell => {
    const div = document.createElement("div");
    div.className = cell === 1 ? "grid-cell" : "grid-cell dot";
    grid.appendChild(div);
  });

  overlay.style.display = "flex";
  startSymmetryTimer();
}

function startSymmetryTimer() {
  symmetryTimeLeft = Math.max(1, Math.ceil(symmetryTime / 1000));
  const timerEl = safeGet("symmetryTimer");
  if (timerEl) timerEl.textContent = symmetryTimeLeft;

  if (symmetryTimer) {
    clearInterval(symmetryTimer);
    symmetryTimer = null;
  }

  symmetryTimer = setInterval(() => {
    symmetryTimeLeft--;
    const timerElInner = safeGet("symmetryTimer");
    if (timerElInner) timerElInner.textContent = symmetryTimeLeft;

    if (symmetryTimeLeft <= 0) {
      if (symmetryTimer) {
        clearInterval(symmetryTimer);
        symmetryTimer = null;
      }
      // default answer = false if timed out
      answerSymmetry(false);
    }
  }, 1000);
}

function answerSymmetry(userAnswer) {
  // if timer still running, stop it
  if (symmetryTimer) {
    clearInterval(symmetryTimer);
    symmetryTimer = null;
  }

  // safety
  if (!currentSymmetryPattern) {
    // nothing to evaluate, continue
    const overlay = safeGet("symmetryOverlay");
    if (overlay) overlay.style.display = "none";
    sequenceStep++;
    currentProgress++;
    updateProgress();
    setTimeout(startSequence, 300);
    return;
  }

  const isCorrect = userAnswer === currentSymmetryPattern.symmetric;
  symmetryResults.push({
    pattern: currentSymmetryPattern,
    userAnswer,
    correct: isCorrect,
    step: sequenceStep
  });

  // hide overlay and continue
  setTimeout(() => {
    const overlay = safeGet("symmetryOverlay");
    if (overlay) overlay.style.display = "none";
    currentSymmetryPattern = null;
    sequenceStep++;
    currentProgress++;
    updateProgress();
    setTimeout(startSequence, 300);
  }, 300);
}

/* -------------------------
   Selection phase UI
   ------------------------- */
function showSelectionPhase() {
  inSelectionPhase = true;
  selectedBallsInOrder = [];

  const selectionProgress = safeGet("selectionProgress");
  const resetButton = safeGet("resetButton");
  const submitButton = safeGet("submitButton");
  if (selectionProgress) selectionProgress.style.display = "block";
  if (resetButton) resetButton.style.display = "block";
  if (submitButton) submitButton.style.display = "block";

  const instr = safeGet("gameInstruction");
  if (instr) instr.textContent = "Click the balls in the same order!";
  const totalNeeded = safeGet("totalNeeded");
  if (totalNeeded) totalNeeded.textContent = shownSequence.length || 0;
  updateSelectionDisplay();
}

/* -------------------------
   Sliders setup (guarded)
   ------------------------- */
function setupTimingSliders() {
  const ballSlider = safeGet("ballTimeSlider");
  const symmetrySlider = safeGet("symmetryTimeSlider");

  if (ballSlider && !ballSlider.dataset.bound) {
    ballSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value) || 1.5;
      const label = safeGet("ballTimeLabel");
      if (label) label.textContent = value.toFixed(1) + "s";
      ballDisplayTime = Math.max(200, value * 1000);
    });
    ballSlider.dataset.bound = "1";
    // set initial label
    const lbl = safeGet("ballTimeLabel");
    if (lbl) lbl.textContent = (parseFloat(ballSlider.value) || 1.5).toFixed(1) + "s";
  }

  if (symmetrySlider && !symmetrySlider.dataset.bound) {
    symmetrySlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value) || 3;
      const label = safeGet("symmetryTimeLabel");
      if (label) label.textContent = value.toFixed(1) + "s";
      symmetryTime = Math.max(1000, value * 1000);
    });
    symmetrySlider.dataset.bound = "1";
    // set initial label
    const lbl2 = safeGet("symmetryTimeLabel");
    if (lbl2) lbl2.textContent = (parseFloat(symmetrySlider.value) || 3).toFixed(1) + "s";
  }
}

/* -------------------------
   Selection helpers
   ------------------------- */
function resetSelection() {
  selectedBallsInOrder = [];
  document.querySelectorAll('.ball.selected').forEach(ball => {
    ball.classList.remove('selected');
    ball.removeAttribute('data-sequence-number');
  });
  updateSelectionDisplay();
}

/* -------------------------
   Scoring & level progression
   ------------------------- */
function submitFinalAnswer() {
  if (!shownSequence.length) {
    alert("No sequence shown, cannot evaluate.");
    return;
  }

  const correctSequence = shownSequence.map(item => item.ballIndex);
  const userSequence = selectedBallsInOrder.map(item => item.ballIndex);

  let correctSelections = 0;
  for (let i = 0; i < Math.min(userSequence.length, correctSequence.length); i++) {
    if (userSequence[i] === correctSequence[i]) correctSelections++;
  }

  const ballScore = correctSequence.length ? Math.round((correctSelections / correctSequence.length) * 100) : 0;
  const symmetryCorrect = symmetryResults.filter(r => r.correct).length;
  const symmetryScore = symmetryResults.length ? Math.round((symmetryCorrect / symmetryResults.length) * 100) : 0;
  const overallScore = Math.round((ballScore + symmetryScore) / 2);

  if (overallScore >= levelAdvancementThreshold) {
    if (level < maxLevel) {
      level++;
      alert(`Excellent! Level ${level - 1} Complete!\n\nSequence Memory: ${ballScore}%\nSymmetry: ${symmetryScore}%\nOverall: ${overallScore}%\n\n🎉 ADVANCING TO LEVEL ${level}! 🎉`);
      setTimeout(startNextLevel, 1000);
    } else {
      alert(`🏆 GAME COMPLETED! 🏆\n\nYou've mastered all ${maxLevel} levels!\n\nOverall: ${overallScore}%\n\nCongratulations!`);
      setTimeout(restartGame, 2000);
    }
  } else {
    alert(`Level ${level} - Try Again!\n\nSequence Memory: ${ballScore}%\nSymmetry: ${symmetryScore}%\nOverall: ${overallScore}%\n\nNeed ${levelAdvancementThreshold}% to advance.`);
    setTimeout(retryCurrentLevel, 800);
  }
}

/* -------------------------
   Level control helpers
   ------------------------- */
function startNextLevel() {
  // stop timers
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
  if (symmetryTimer) { clearInterval(symmetryTimer); symmetryTimer = null; }

  gameActive = false;
  gamePaused = false;
  inSelectionPhase = false;

  // hide selection UI
  const selectionProgress = safeGet("selectionProgress");
  const resetButton = safeGet("resetButton");
  const submitButton = safeGet("submitButton");
  if (selectionProgress) selectionProgress.style.display = "none";
  if (resetButton) resetButton.style.display = "none";
  if (submitButton) submitButton.style.display = "none";

  // hide overlay
  const overlay = safeGet("symmetryOverlay");
  if (overlay) overlay.style.display = "none";

  // reset sequences
  sequenceStep = 0;
  currentProgress = 1;
  shownSequence = [];
  symmetryResults = [];
  timeLeft = 300;

  updateLevel();
  updateProgress();
  updateTimer();

  const instr = safeGet("gameInstruction");
  if (instr) instr.textContent = `Level ${level} - Get Ready!`;

  setTimeout(() => {
    gameActive = true;
    const playBtn = safeGet("playBtn"); if (playBtn) playBtn.textContent = "⏸";
    initGame();
    createBalls();
    startSequence();
  }, 700);
}

function retryCurrentLevel() {
  // clear timers
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
  if (symmetryTimer) { clearInterval(symmetryTimer); symmetryTimer = null; }

  gameActive = false;
  gamePaused = false;
  inSelectionPhase = false;

  const selectionProgress = safeGet("selectionProgress");
  const resetButton = safeGet("resetButton");
  const submitButton = safeGet("submitButton");
  if (selectionProgress) selectionProgress.style.display = "none";
  if (resetButton) resetButton.style.display = "none";
  if (submitButton) submitButton.style.display = "none";

  const overlay = safeGet("symmetryOverlay");
  if (overlay) overlay.style.display = "none";

  sequenceStep = 0;
  currentProgress = 1;
  shownSequence = [];
  symmetryResults = [];
  timeLeft = 300;

  updateProgress();
  updateTimer();

  const instr = safeGet("gameInstruction");
  if (instr) instr.textContent = `Level ${level} - Try Again!`;

  setTimeout(() => {
    gameActive = true;
    const playBtn = safeGet("playBtn"); if (playBtn) playBtn.textContent = "⏸";
    initGame();
    createBalls();
    startSequence();
  }, 700);
}

/* -------------------------
   Restart / pause / end
   ------------------------- */
function restartGame() {
  // stop timers
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
  if (symmetryTimer) { clearInterval(symmetryTimer); symmetryTimer = null; }

  gameActive = false;
  gamePaused = false;
  inSelectionPhase = false;

  // hide overlays & selection UI
  const selectionProgress = safeGet("selectionProgress");
  const resetButton = safeGet("resetButton");
  const submitButton = safeGet("submitButton");
  const overlay = safeGet("symmetryOverlay");
  const startScreen = safeGet("startScreen");
  if (selectionProgress) selectionProgress.style.display = "none";
  if (resetButton) resetButton.style.display = "none";
  if (submitButton) submitButton.style.display = "none";
  if (overlay) overlay.style.display = "none";
  if (startScreen) startScreen.style.display = "flex";

  // reset state values
  level = 1;
  sequenceStep = 0;
  currentProgress = 1;
  shownSequence = [];
  symmetryResults = [];
  selectedBallsInOrder = [];
  timeLeft = 300;

  // clear any balls
  const gameBoard = safeGet("gameBoard");
  if (gameBoard) {
    gameBoard.querySelectorAll('.ball').forEach(b => b.remove());
    const instr = safeGet("gameInstruction");
    if (instr) instr.textContent = "Press Start to Begin!";
  }

  updateLevel();
  updateProgress();
  updateTimer();

  const playBtn = safeGet("playBtn");
  if (playBtn) playBtn.textContent = "▶";
}

/* Pause/resume */
function togglePause() {
  // If game is not active and startScreen exists, do nothing (user should click Start)
  if (!gameActive) return;

  if (gamePaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function pauseGame() {
  gamePaused = true;
  const playBtn = safeGet("playBtn");
  if (playBtn) playBtn.textContent = "▶";
  const instr = safeGet("gameInstruction");
  if (instr) instr.textContent = "Game Paused";
}

function resumeGame() {
  gamePaused = false;
  const playBtn = safeGet("playBtn");
  if (playBtn) playBtn.textContent = "⏸";
  const instr = safeGet("gameInstruction");
  if (instr) instr.textContent = "Game Resumed";
}

/* End game */
function endGame(message) {
  // stop timers
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
  if (symmetryTimer) { clearInterval(symmetryTimer); symmetryTimer = null; }

  gameActive = false;
  gamePaused = false;
  alert(message || "Game Over");
  // restart back to start screen after a short delay
  setTimeout(restartGame, 800);
}

/* -------------------------
   Keyboard shortcuts
   ------------------------- */
document.addEventListener('keydown', (e) => {
  // if symmetry overlay is visible, allow y/n
  const overlay = safeGet("symmetryOverlay");
  if (overlay && overlay.style.display === "flex") {
    const key = (e.key || '').toLowerCase();
    if (key === 'y' || key === '1') answerSymmetry(true);
    if (key === 'n' || key === '2') answerSymmetry(false);
  }

  // spacebar toggles pause/resume when game active
  if ((e.code === 'Space' || e.key === ' ') && gameActive) {
    e.preventDefault();
    togglePause();
  }
});

/* -------------------------
   Boot: initial UI sync
   ------------------------- */
window.addEventListener('load', () => {
  // Hide selection UI initially (in case CSS hasn't)
  const selectionProgress = safeGet("selectionProgress");
  if (selectionProgress) selectionProgress.style.display = "none";
  const resetButton = safeGet("resetButton");
  if (resetButton) resetButton.style.display = "none";
  const submitButton = safeGet("submitButton");
  if (submitButton) submitButton.style.display = "none";
  const overlay = safeGet("symmetryOverlay");
  if (overlay) overlay.style.display = "none";

  // Wire up inline controls if they exist (defensive: they already use inline onclick in your HTML)
  const startBtn = safeGet("startBtn");
  if (startBtn && !startBtn.dataset.bound) {
    startBtn.addEventListener('click', startGame);
    startBtn.dataset.bound = "1";
  }

  // Sync UI labels for sliders
  setupTimingSliders();

  // initial UI display
  updateLevel();
  updateProgress();
  updateTimer();
});
