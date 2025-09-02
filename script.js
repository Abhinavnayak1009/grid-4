let gameActive = false; 
let gamePaused = false;
let level = 1;
let sequenceStep = 0;
let totalSteps = 8; // 3 balls + 3 symmetries
let gameTimer;
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
let symmetryTimer;
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
  return document.getElementById(id);
}

function initGame() {
  updateTimer();
  updateProgress();
  if (gameTimer) clearInterval(gameTimer);
  gameTimer = setInterval(updateTimer, 1000);
}

function updateTimer() {
  if (!gamePaused && gameActive) {
    const el = safeGet("timer");
    if (el) {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      el.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (timeLeft > 0) {
      timeLeft--;
    } else {
      endGame("Time's Up!");
    }
  }
}

function updateProgress() {
  const fill = safeGet("progressFill");
  const text = safeGet("progressText");
  const percentage = (currentProgress / maxProgress) * 100;
  if (fill) fill.style.width = percentage + "%";
  if (text) text.textContent = currentProgress;
}

function updateLevel() {
  const el = safeGet("levelNum");
  if (el) el.textContent = level;
}

function createBalls() {
  const gameBoard = safeGet("gameBoard");
  if (!gameBoard) return;

  const existingBalls = gameBoard.querySelectorAll('.ball');
  existingBalls.forEach(ball => ball.remove());

  const ballCount = 15 + (level * 4);
  const positions = [];
  const boardRect = gameBoard.getBoundingClientRect();

  ballSequence = [];

  for (let i = 0; i < ballCount; i++) {
    let x, y, attempts = 0;
    do {
      x = Math.random() * (boardRect.width - 80) + 10;
      y = Math.random() * (boardRect.height - 140) + 60;
      attempts++;
    } while (isOverlapping(x, y, positions, 60, 20) && attempts < 100);

    positions.push({x, y});

    const ball = document.createElement("div");
    ball.classList.add("ball");
    ball.dataset.index = i;
    ball.style.left = x + "px";
    ball.style.top = y + "px";

    ball.addEventListener('click', (e) => handleBallClick(i, e));
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

function handleBallClick(ballIndex) {
  if (inSelectionPhase) {
    const ball = document.querySelector(`[data-index="${ballIndex}"]`);
    if (!ball) return;

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
}

function updateSelectionDisplay() {
  const el = safeGet('selectedCount');
  if (el) el.textContent = selectedBallsInOrder.length;
}

function startGame() {
  setupTimingSliders();

  const startScreen = safeGet("startScreen");
  if (startScreen) startScreen.style.display = "none";
  gameActive = true;

  const playBtn = safeGet("playBtn");
  if (playBtn) playBtn.textContent = "⏸";

  sequenceStep = 0;
  currentProgress = 1;
  shownSequence = [];
  symmetryResults = [];
  inSelectionPhase = false;

  updateLevel();
  initGame();
  createBalls();
  startSequence();
}

function startSequence() {
  if (sequenceStep >= totalSteps) {
    showSelectionPhase();
    return;
  }
  if (sequenceStep % 2 === 0) showBall();
  else showSymmetry();
}

function showBall() {
  if (!ballSequence.length) return;
  const ballIndex = Math.floor(Math.random() * ballSequence.length);
  const ball = document.querySelector(`[data-index="${ballIndex}"]`);

  const instr = safeGet("gameInstruction");
  if (instr) instr.textContent = `Remember this ball! (${ballDisplayTime/1000}s) - Sequence #${shownSequence.length + 1}`;

  if (ball) {
    ball.classList.add("active");

    shownSequence.push({
      ballIndex,
      sequenceOrder: shownSequence.length + 1,
      timing: ballDisplayTime,
      step: sequenceStep
    });

    setTimeout(() => {
      ball.classList.remove("active");
      sequenceStep++;
      currentProgress++;
      updateProgress();
      setTimeout(startSequence, 300);
    }, ballDisplayTime);
  }
}

function showSymmetry() {
  const pattern = symmetryPatterns[Math.floor(Math.random() * symmetryPatterns.length)];
  const overlay = safeGet("symmetryOverlay");
  const grid = safeGet("symmetryGrid");
  const question = safeGet("symmetryQuestion");

  if (!overlay || !grid || !question) return;

  question.textContent = pattern.question;
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
  symmetryTimeLeft = Math.ceil(symmetryTime / 1000);
  const timerEl = safeGet("symmetryTimer");
  if (timerEl) timerEl.textContent = symmetryTimeLeft;

  if (symmetryTimer) clearInterval(symmetryTimer);
  symmetryTimer = setInterval(() => {
    symmetryTimeLeft--;
    if (timerEl) timerEl.textContent = symmetryTimeLeft;

    if (symmetryTimeLeft <= 0) {
      clearInterval(symmetryTimer);
      answerSymmetry(false);
    }
  }, 1000);
}

function answerSymmetry(userAnswer) {
  if (symmetryTimer) clearInterval(symmetryTimer);
  if (!currentSymmetryPattern) return;

  const isCorrect = userAnswer === currentSymmetryPattern.symmetric;

  symmetryResults.push({
    pattern: currentSymmetryPattern,
    userAnswer,
    correct: isCorrect,
    step: sequenceStep
  });

  setTimeout(() => {
    const overlay = safeGet("symmetryOverlay");
    if (overlay) overlay.style.display = "none";
    sequenceStep++;
    currentProgress++;
    updateProgress();
    setTimeout(startSequence, 300);
  }, 800);
}

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
  if (totalNeeded) totalNeeded.textContent = shownSequence.length;
  updateSelectionDisplay();
}

function setupTimingSliders() {
  const ballSlider = safeGet("ballTimeSlider");
  const symmetrySlider = safeGet("symmetryTimeSlider");

  if (ballSlider && !ballSlider.dataset.bound) {
    ballSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      const label = safeGet("ballTimeLabel");
      if (label) label.textContent = value + "s";
      ballDisplayTime = value * 1000;
    });
    ballSlider.dataset.bound = true;
  }

  if (symmetrySlider && !symmetrySlider.dataset.bound) {
    symmetrySlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      const label = safeGet("symmetryTimeLabel");
      if (label) label.textContent = value + "s";
      symmetryTime = value * 1000;
    });
    symmetrySlider.dataset.bound = true;
  }
}

function resetSelection() {
  selectedBallsInOrder = [];
  document.querySelectorAll('.ball.selected').forEach(ball => {
    ball.classList.remove('selected');
    ball.removeAttribute('data-sequence-number');
  });
  updateSelectionDisplay();
}

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

  const ballScore = Math.round((correctSelections / correctSequence.length) * 100);
  const symmetryCorrect = symmetryResults.filter(r => r.correct).length;
  const symmetryScore = symmetryResults.length > 0 
    ? Math.round((symmetryCorrect / symmetryResults.length) * 100) 
    : 0;

  const overallScore = Math.round((ballScore + symmetryScore) / 2);

  if (overallScore >= levelAdvancementThreshold) {
    if (level < maxLevel) {
      level++;
      alert(`Excellent! Level ${level - 1} Complete!\n\nSequence Memory: ${ballScore}%\nSymmetry: ${symmetryScore}%\nOverall: ${overallScore}%\n\n🎉 ADVANCING TO LEVEL ${level}! 🎉`);
      setTimeout(startNextLevel, 2000);
    } else {
      alert(`🏆 GAME COMPLETED! 🏆\n\nYou've mastered all ${maxLevel} levels!\n\nOverall: ${overallScore}%\n\nCongratulations, Memory Master!`);
      setTimeout(restartGame, 3000);
    }
  } else {
    alert(`Level ${level} - Try Again!\n\nSequence Memory: ${ballScore}%\nSymmetry: ${symmetryScore}%\nOverall: ${overallScore}%\n\nNeed ${levelAdvancementThreshold}% to advance.`);
    setTimeout(retryCurrentLevel, 2000);
  }
}

function startNextLevel() {
  gameActive = false;
  gamePaused = false;
  if (gameTimer) clearInterval(gameTimer);
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

  updateLevel();
  updateProgress();
  updateTimer();

  const instr = safeGet("gameInstruction");
  if (instr) instr.textContent = `Level ${level} - Get Ready!`;

  setTimeout(() => {
    gameActive = true;
    const playBtn = safeGet("playBtn");
    if (playBtn) playBtn.textContent = "⏸";
    initGame();
    createBalls();
    startSequence();
  }, 1500);
}

function retryCurrentLevel() {
  gameActive = false;
  gamePaused = false;
  if (gameTimer) clearInterval(gameTimer);
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
    const playBtn = safeGet("playBtn");
    if (playBtn) playBtn.textContent = "⏸";
    initGame();
    createBalls();
    startSequence();
  }, 1500);
}

function restartGame() {
  gameActive = false;
  gamePaused = false;
  if (gameTimer) clearInterval(gameTimer);
  inSelectionPhase = false;

  const selectionProgress = safeGet("selectionProgress");
  const resetButton = safeGet("resetButton");
  const submitButton = safeGet("submitButton
