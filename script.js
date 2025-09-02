// ===== Global variables =====
let gameActive = false;
let gamePaused = false;
let sequenceStep = 0;
let currentProgress = 0;
let shownSequence = [];
let symmetryResults = [];
let selectedBallsInOrder = [];
let inSelectionPhase = false;

// ===== Helper to safely get elements =====
function safeGet(id) {
  return document.getElementById(id);
}

// ===== Setup timing sliders (placeholder) =====
function setupTimingSliders() {
  // for now just log (you can later add your slider logic here)
  console.log("Sliders initialized...");
}

// ===== Update level (placeholder) =====
function updateLevel() {
  console.log("Level updated...");
}

// ===== Initialize game (placeholder) =====
function initGame() {
  console.log("Game initialized...");
}

// ===== Create balls dynamically =====
function createBalls() {
  const gameContainer = safeGet("gameContainer");
  if (!gameContainer) return;

  gameContainer.innerHTML = ""; // clear old balls

  // create 3 balls for now (you can change number later)
  for (let i = 0; i < 3; i++) {
    const ball = document.createElement("div");
    ball.className = "ball";
    ball.textContent = i + 1;
    ball.addEventListener("click", () => handleBallClick(i));
    gameContainer.appendChild(ball);
  }
}

// ===== Handle ball clicks =====
function handleBallClick(index) {
  console.log("Ball clicked:", index);
  selectedBallsInOrder.push(index);
}

// ===== Start sequence (placeholder) =====
function startSequence() {
  console.log("Sequence started...");
  // for now just highlight first ball
  const balls = document.querySelectorAll(".ball");
  if (balls[0]) {
    balls[0].style.background = "yellow";
    setTimeout(() => (balls[0].style.background = "lightblue"), 1000);
  }
}

// ===== Main Start Game function =====
function startGame() {
  // only initialize sliders once
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

// ===== Hook start button =====
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = safeGet("startBtn");
  if (startBtn) startBtn.addEventListener("click", startGame);
});
