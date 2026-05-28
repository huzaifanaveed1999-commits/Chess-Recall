// Global Error Diagnostics Overlay
window.addEventListener("error", (e) => {
  const errorBanner = document.createElement("div");
  errorBanner.style.position = "fixed";
  errorBanner.style.top = "0";
  errorBanner.style.left = "0";
  errorBanner.style.width = "100%";
  errorBanner.style.background = "#ff4d4d";
  errorBanner.style.color = "#ffffff";
  errorBanner.style.padding = "15px";
  errorBanner.style.zIndex = "100000";
  errorBanner.style.fontWeight = "bold";
  errorBanner.style.fontFamily = "monospace";
  errorBanner.style.fontSize = "14px";
  errorBanner.style.boxShadow = "0 4px 10px rgba(0,0,0,0.5)";
  errorBanner.innerHTML = `⚠️ DIAGNOSTIC RUNTIME ERROR: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`;
  document.body.appendChild(errorBanner);
});

// Floating Debug Logger Setup
const debugEl = document.createElement("div");
debugEl.id = "debugOverlayLog";
debugEl.style.position = "fixed";
debugEl.style.bottom = "50px";
debugEl.style.right = "20px";
debugEl.style.width = "300px";
debugEl.style.maxHeight = "200px";
debugEl.style.background = "rgba(0, 0, 0, 0.85)";
debugEl.style.color = "#00ff00";
debugEl.style.fontFamily = "monospace";
debugEl.style.fontSize = "11px";
debugEl.style.padding = "10px";
debugEl.style.zIndex = "999999";
debugEl.style.overflowY = "auto";
debugEl.style.borderRadius = "8px";
debugEl.style.border = "1px solid #00ff00";
debugEl.style.pointerEvents = "none";
debugEl.style.display = "none"; // Hidden by default for premium aesthetics (toggle with ` or ~ key)
debugEl.innerHTML = "<div>-- DEBUG LOG STARTED --</div>";
document.body.appendChild(debugEl);

function logDebug(msg) {
  const line = document.createElement("div");
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  debugEl.appendChild(line);
  debugEl.scrollTop = debugEl.scrollHeight;
  console.log(msg);
}

// ========================================================================
// CHESS RECALL - CORE APPLICATION ENGINE (PREMIUM CHESSABLE UPGRADES)
// ========================================================================

// ==========================================
// Global Constant Definitions
// ==========================================
const PIECE_IMAGES = {
  w: {
    p: "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg",
    n: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
    b: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
    r: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
    q: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
    k: "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg"
  },
  b: {
    p: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg",
    n: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg",
    b: "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg",
    r: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg",
    q: "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg",
    k: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg"
  }
};

// ==========================================
// Global State Variable Declarations
// ==========================================
let library = [];             // Stores imported game objects loaded from localStorage
let activeGame = null;        // Currently active game object being practiced
let game = null;              // Live Chess.js rules engine validator instance
let currentIndex = 0;         // Current ply index the player must recall
let runMistakes = 0;          // Mistakes made in the current run (resets on backtracking)
let sessionMistakes = 0;      // Persistent cumulative mistakes made in the entire study attempt
let totalAttempts = 1;        // Tracks overall attempts made on the active game in this session
let boardFlipped = false;     // Perspective toggle pointer
let selectedSquare = null;    // Selection coordinate pointer (e.g. 'e2')
let validMoves = [];          // Cached legal moves array for active selections
let resetTimeout = null;       // lockout timeout pointer

// Spaced-Repetition Review Queue (Failed moves tracking):
let reviewQueue = [];         // Stores indices of moves failed during the run
let isReviewMode = false;     // Flag indicating whether we are replaying failed moves
let mistakeHotspots = {};     // Map tracking mistake counts per move index: { index: count }
let hintsUsed = 0;            // Count of hints requested in this attempt

// Speed Trainer Timer state variables:
let sessionSeconds = 0;       // Counts total elapsed practice seconds
let timerInterval = null;     // Interval pointer for speed trainer

// Unified Dragging State Variables (Pointer Events):
let activeDragPiece = null;       // Absolute element copy being dragged
let dragStartSquare = null;       // Origin cell coordinates
let currentDragHoverSquare = null; // Coordinates of cell currently hovered by pointer
let lastPointerUpTime = 0;        // Prevent pointerup click conflicts

// Audio Context toggles:
let audioCtx = null;
let soundsEnabled = true;

// ==========================================
// Cache Static DOM Element References
// ==========================================
const savedGamesListEl = document.getElementById("savedGamesList");
const importBtn = document.getElementById("importBtn");
const welcomeImportBtn = document.getElementById("welcomeImportBtn");
const pgnModal = document.getElementById("pgnModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const savePgnBtn = document.getElementById("savePgnBtn");
const pgnInput = document.getElementById("pgnInput");
const pgnError = document.getElementById("pgnError");
const pgnErrorText = document.getElementById("pgnErrorText");

const boardEl = document.getElementById("board");
const reviewBanner = document.getElementById("reviewBanner");
const gameTitleEl = document.getElementById("gameTitle");
const gamePlayersEl = document.getElementById("gamePlayers");
const bestScoreValEl = document.getElementById("bestScoreVal");
const headerMistakesEl = document.getElementById("headerMistakes");
const memoryBadgeEl = document.getElementById("memoryBadge");

const welcomePanel = document.getElementById("welcomePanel");
const studyPanel = document.getElementById("studyPanel");
const moveRatioText = document.getElementById("moveRatioText");
const studyProgressFill = document.getElementById("studyProgressFill");
const statTimer = document.getElementById("statTimer");
const statAttemptNum = document.getElementById("statAttemptNum");
const statMistakeNum = document.getElementById("statMistakeNum");
const statNextPlayer = document.getElementById("statNextPlayer");
const moveHistoryTimeline = document.getElementById("moveHistoryTimeline");

const resetStudyBtn = document.getElementById("resetStudyBtn");
const flipBoardBtn = document.getElementById("flipBoardBtn");
const hintBtn = document.getElementById("hintBtn");
const deleteGameBtn = document.getElementById("deleteGameBtn");

const mistakeOverlay = document.getElementById("mistakeOverlay");
const mistakeMoveText = document.getElementById("mistakeMoveText");
const mistakeSubText = document.getElementById("mistakeSubText");
const overlayResetProgress = document.getElementById("overlayResetProgress");

const successOverlay = document.getElementById("successOverlay");
const successScoreEl = document.getElementById("successScore");
const successMistakesEl = document.getElementById("successMistakes");
const successAttemptsEl = document.getElementById("successAttempts");
const successDescEl = document.getElementById("successDesc");
const hotspotsBox = document.getElementById("hotspotsBox");
const successHotspots = document.getElementById("successHotspots");
const successCloseBtn = document.getElementById("successCloseBtn");
const soundToggle = document.getElementById("soundToggle");

// Spaced repetition scheduler buttons:
const sched1DayBtn = document.getElementById("sched1DayBtn");
const sched3DaysBtn = document.getElementById("sched3DaysBtn");
const sched7DaysBtn = document.getElementById("sched7DaysBtn");

// ==========================================
// Register DOMContentLoaded Listener
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  initAudio();
  loadLibrary();
  setupEventListeners();
  renderLibrary();
  drawBoard();
});

// ==========================================
// Audio Context Setup Helpers
// ==========================================
function initAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  } catch (e) {
    console.warn("Web Audio API is not supported in this browser.");
  }
}

// Real-time wood click/chime/buzzer wave generator node sweeps:
function playSound(type) {
  if (!soundsEnabled || !audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const now = audioCtx.currentTime;

  switch (type) {
    case 'move': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    }
    case 'capture': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      const noise = createNoiseBuffer();
      if (noise) {
        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = noise;
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.08, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        noiseNode.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseNode.start(now);
      }
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }
    case 'check': {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(780, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1040, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
      break;
    }
    case 'mistake': {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(115, now);
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(118, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
      break;
    }
    case 'victory': {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.15, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
      });
      break;
    }
  }
}

function createNoiseBuffer() {
  if (!audioCtx) return null;
  const bufferSize = audioCtx.sampleRate * 0.08;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ==========================================
// Persistence LocalStorage Engines
// ==========================================
function loadLibrary() {
  try {
    const raw = localStorage.getItem("chess_recall_library");
    library = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse games library:", e);
    library = [];
  }
}

function saveLibrary() {
  localStorage.setItem("chess_recall_library", JSON.stringify(library));
}

// ==========================================
// Setup Listeners and Events
// ==========================================
function setupEventListeners() {
  const showModal = () => {
    pgnModal.classList.add("show");
    pgnError.classList.add("hidden");
    pgnInput.value = "";
    pgnInput.focus();
  };
  const hideModal = () => pgnModal.classList.remove("show");
  
  importBtn.addEventListener("click", showModal);
  welcomeImportBtn.addEventListener("click", showModal);
  closeModalBtn.addEventListener("click", hideModal);
  cancelModalBtn.addEventListener("click", hideModal);
  
  savePgnBtn.addEventListener("click", handlePgnSubmit);
  
  resetStudyBtn.addEventListener("click", () => {
    if (activeGame) {
      clearInterval(timerInterval);
      startStudy(activeGame, true);
    }
  });
  
  flipBoardBtn.addEventListener("click", () => {
    boardFlipped = !boardFlipped;
    drawBoard();
  });

  hintBtn.addEventListener("click", handleShowHint);
  
  deleteGameBtn.addEventListener("click", () => {
    if (activeGame && confirm(`Are you sure you want to delete "${activeGame.event}"?`)) {
      deleteActiveGame();
    }
  });

  successCloseBtn.addEventListener("click", () => {
    successOverlay.classList.remove("show");
    unloadGame();
  });

  soundToggle.addEventListener("click", () => {
    soundsEnabled = !soundsEnabled;
    if (soundsEnabled) {
      soundToggle.classList.remove("muted");
      soundToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        Sound Enabled
      `;
      initAudio();
      playSound('move');
    } else {
      soundToggle.classList.add("muted");
      soundToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        Sound Muted
      `;
    }
  });

  // Wire Spaced Repetition scheduler click listeners:
  sched1DayBtn.addEventListener("click", () => scheduleNextReview(1));
  sched3DaysBtn.addEventListener("click", () => scheduleNextReview(3));
  sched7DaysBtn.addEventListener("click", () => scheduleNextReview(7));

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
    if (e.key === "`" || e.key === "~") {
      debugEl.style.display = debugEl.style.display === "none" ? "block" : "none";
    }
  });

  // Bind Global Pointer Event Listeners dynamically for custom drags sweeps:
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);
}

// ==========================================
// Spaced Repetition Interval Scheduler
// ==========================================
function scheduleNextReview(days) {
  if (!activeGame) return;
  const gameInLib = library.find(g => g.id === activeGame.id);
  if (gameInLib) {
    const timeDelta = days * 24 * 60 * 60 * 1000; // Calculate millisecond delta
    gameInLib.reviewDue = Date.now() + timeDelta; // Set future timestamp
    saveLibrary();
    renderLibrary();

    // Toggle active classes on scheduler buttons
    [sched1DayBtn, sched3DaysBtn, sched7DaysBtn].forEach(btn => btn.classList.remove("active"));
    if (days === 1) sched1DayBtn.classList.add("active");
    if (days === 3) sched3DaysBtn.classList.add("active");
    if (days === 7) sched7DaysBtn.classList.add("active");
    
    playSound('check');
  }
}

// ==========================================
// PGN Parser Validation and Submission
// ==========================================
function handlePgnSubmit() {
  const pgn = pgnInput.value.trim();
  
  if (!pgn) {
    showPgnError("Please paste a PGN string.");
    return;
  }

  const eventMatches = pgn.match(/\[Event\s+/gi);
  if (eventMatches && eventMatches.length > 1) {
    showPgnError("Multiple games detected! Please paste exactly one game PGN.");
    return;
  }

  try {
    const tempChess = new Chess();
    if (!tempChess.load_pgn(pgn)) {
      showPgnError("Invalid PGN format. Could not parse chess moves. Check input.");
      return;
    }

    const history = tempChess.history({ verbose: true });
    if (history.length === 0) {
      showPgnError("No moves found in this game PGN.");
      return;
    }

    const headers = tempChess.header();
    const white = headers.White || "Unknown White";
    const black = headers.Black || "Unknown Black";
    const event = headers.Event || "Casual Study Game";
    const date = headers.Date || new Date().toLocaleDateString();
    
    const gameId = Date.now().toString();

    const movesVerbose = history.map(m => ({
      from: m.from,
      to: m.to,
      san: m.san,
      color: m.color,
      promotion: m.promotion || null
    }));

    const newGame = {
      id: gameId,
      event: event,
      date: date.replace(/\?/g, "").trim() || "Unknown Date",
      white: white,
      black: black,
      movesVerbose: movesVerbose,
      bestScore: null,
      attempts: 0,
      reviewDue: null // Scheduler variable default
    };

    library.push(newGame);
    saveLibrary();
    renderLibrary();
    
    pgnModal.classList.remove("show");
    startStudy(newGame);
    playSound('victory');
    
  } catch (err) {
    showPgnError("Error parsing PGN: " + err.message);
  }
}

function showPgnError(text) {
  pgnErrorText.textContent = text;
  pgnError.classList.remove("hidden");
  const modal = document.querySelector(".modal");
  modal.classList.add("animate-shake");
  setTimeout(() => modal.classList.remove("animate-shake"), 500);
}

// ==========================================
// Sidebar Library Listings Renderer
// ==========================================
function renderLibrary() {
  if (library.length === 0) {
    savedGamesListEl.innerHTML = `
      <div class="empty-library">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <p>Your library is empty.</p>
        <span>Import a single game PGN to start memorizing.</span>
      </div>
    `;
    return;
  }

  savedGamesListEl.innerHTML = "";
  const sortedGames = library.slice().reverse();

  sortedGames.forEach(gameItem => {
    const card = document.createElement("div");
    card.className = "game-card";
    if (activeGame && activeGame.id === gameItem.id) {
      card.classList.add("active");
    }

    const header = document.createElement("div");
    header.className = "game-card-header";
    
    const title = document.createElement("span");
    title.className = "game-card-title";
    title.textContent = gameItem.event;
    title.title = gameItem.event;
    header.appendChild(title);

    // Spaced-Repetition: Render visual gold pulsing badge if game review is due:
    if (gameItem.reviewDue && Date.now() >= gameItem.reviewDue) {
      const dueBadge = document.createElement("span");
      dueBadge.className = "review-due-badge";
      dueBadge.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        DUE
      `;
      header.appendChild(dueBadge);
    } else if (gameItem.bestScore !== null) {
      // Otherwise, render best score star badge
      const scoreBadge = document.createElement("span");
      scoreBadge.className = `game-card-score ${gameItem.bestScore === 100 ? 'perfect' : ''}`;
      scoreBadge.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="10" height="10">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
        ${gameItem.bestScore}
      `;
      header.appendChild(scoreBadge);
    }
    card.appendChild(header);

    const sub = document.createElement("span");
    sub.className = "game-card-sub";
    sub.textContent = `${gameItem.white} vs ${gameItem.black}`;
    card.appendChild(sub);

    const meta = document.createElement("div");
    meta.className = "game-card-meta";
    
    const countBadge = document.createElement("span");
    countBadge.className = "game-card-badge";
    countBadge.textContent = `${gameItem.movesVerbose.length} plies`;
    
    const dateLabel = document.createElement("span");
    dateLabel.className = "game-card-sub";
    dateLabel.style.fontSize = "0.65rem";
    dateLabel.textContent = gameItem.date;

    meta.appendChild(countBadge);
    meta.appendChild(dateLabel);
    card.appendChild(meta);

    card.addEventListener("click", () => {
      successOverlay.classList.remove("show");
      startStudy(gameItem);
    });

    savedGamesListEl.appendChild(card);
  });
}

// ==========================================
// Active Recall Practice Manager
// ==========================================
function startStudy(gameItem, isReset = false) {
  activeGame = gameItem;
  game = new Chess();
  currentIndex = 0;
  selectedSquare = null;
  validMoves = [];
  
  isReviewMode = false;
  reviewQueue = [];
  mistakeHotspots = {};
  hintsUsed = 0;
  reviewBanner.classList.remove("show");

  // Speed Trainer Timer Setup:
  sessionSeconds = 0;
  statTimer.textContent = "00:00";
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    sessionSeconds++;
    const mins = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
    const secs = (sessionSeconds % 60).toString().padStart(2, '0');
    statTimer.textContent = `${mins}:${secs}`;
  }, 1000);

  // Mistakes persistent accounting across the session checks:
  if (!isReset) {
    runMistakes = 0;
    sessionMistakes = 0;
    totalAttempts = 1;
    boardFlipped = false;
  } else {
    runMistakes = 0;
    totalAttempts++;
  }

  if (resetTimeout) {
    clearTimeout(resetTimeout);
    resetTimeout = null;
  }
  mistakeOverlay.classList.remove("show");

  renderLibrary();

  // Reset active scheduler choices colors:
  [sched1DayBtn, sched3DaysBtn, sched7DaysBtn].forEach(btn => btn.classList.remove("active"));

  // DOM bindings
  gameTitleEl.textContent = gameItem.event;
  gamePlayersEl.textContent = `${gameItem.white} vs ${gameItem.black} (${gameItem.date})`;
  
  bestScoreValEl.textContent = gameItem.bestScore !== null ? `${gameItem.bestScore}/100` : "-";
  headerMistakesEl.textContent = runMistakes;
  memoryBadgeEl.textContent = getMemoryGrade(gameItem.bestScore);
  memoryBadgeEl.className = `value ` + getMemoryGradeColorClass(gameItem.bestScore);

  statAttemptNum.textContent = totalAttempts;
  statMistakeNum.textContent = runMistakes;
  
  updateStudyProgress();
  renderMoveHistoryTimeline();

  welcomePanel.classList.add("hidden");
  studyPanel.classList.remove("hidden");

  drawBoard();
}

function unloadGame() {
  activeGame = null;
  game = null;
  currentIndex = 0;
  runMistakes = 0;
  sessionMistakes = 0;
  totalAttempts = 1;
  selectedSquare = null;
  validMoves = [];
  isReviewMode = false;
  reviewQueue = [];
  mistakeHotspots = {};
  hintsUsed = 0;
  reviewBanner.classList.remove("show");

  // Disable timer:
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (resetTimeout) {
    clearTimeout(resetTimeout);
    resetTimeout = null;
  }
  mistakeOverlay.classList.remove("show");

  welcomePanel.classList.remove("hidden");
  studyPanel.classList.add("hidden");
  
  gameTitleEl.textContent = "No Game Loaded";
  gamePlayersEl.textContent = "Select or import a game to practice your recall";
  bestScoreValEl.textContent = "-";
  headerMistakesEl.textContent = "0";
  memoryBadgeEl.textContent = "-";
  memoryBadgeEl.className = "value";

  renderLibrary();
  boardEl.innerHTML = "";
}

function deleteActiveGame() {
  if (!activeGame) return;
  library = library.filter(g => g.id !== activeGame.id);
  saveLibrary();
  unloadGame();
}

// Memory Ranks computations:
function getMemoryGrade(score) {
  if (score === null) return "-";
  if (score === 100) return "S Rank 👑";
  if (score >= 90) return "A Rank ⭐";
  if (score >= 80) return "B Rank 🥈";
  if (score >= 70) return "C Rank 🥉";
  return "D Rank 📚";
}

function getMemoryGradeColorClass(score) {
  if (score === null) return "";
  if (score === 100) return "text-emerald";
  if (score >= 80) return "text-gold";
  return "text-red";
}

// Fair penalty scoring system based on session unique mistakes and hints:
function calculateScore(mistakes, totalMoves) {
  const baseScore = 100 - (hintsUsed * 4); // Deduct 4 points per requested hint
  if (mistakes === 0) return Math.max(10, baseScore);
  const penaltyPerMistake = Math.max(3, Math.min(15, Math.ceil(40 / Math.sqrt(totalMoves))));
  return Math.max(10, Math.round(baseScore - (mistakes * penaltyPerMistake)));
}

// ==========================================
// 8x8 Board UI Grid Loop Renderer
// ==========================================
function drawBoard() {
  boardEl.innerHTML = "";

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const boardRanks = boardFlipped ? ranks.slice().reverse() : ranks;
  const boardFiles = boardFlipped ? files.slice().reverse() : files;

  let lastMoveFrom = null;
  let lastMoveTo = null;
  if (currentIndex > 0 && activeGame) {
    const prevMove = activeGame.movesVerbose[currentIndex - 1];
    lastMoveFrom = prevMove.from;
    lastMoveTo = prevMove.to;
  }

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const squareName = boardFiles[f] + boardRanks[r]; 
      const square = document.createElement("div");
      
      const isSquareLight = (r + f) % 2 === 0;
      square.className = `square ${isSquareLight ? 'light' : 'dark'}`;
      square.dataset.square = squareName;

      if (squareName === selectedSquare) {
        square.classList.add("selected");
      }
      
      if (squareName === lastMoveFrom || squareName === lastMoveTo) {
        square.classList.add("last-move-highlight");
      }

      if (game && game.in_check()) {
        const piece = game.get(squareName);
        if (piece && piece.type === 'k' && piece.color === game.turn()) {
          square.classList.add("checked");
        }
      }

      if (game) {
        const piece = game.get(squareName);
        if (piece) {
          square.classList.add("has-piece");
          const pieceImg = document.createElement("img");
          pieceImg.className = "piece";
          pieceImg.src = PIECE_IMAGES[piece.color][piece.type];
          pieceImg.dataset.square = squareName;
          pieceImg.draggable = false; // Disable native drag behaviors to avoid HTML5 ghost overlays conflicts

          // Only bind pointer dragging events to friendly pieces on their active turn:
          if (piece.color === game.turn()) {
            pieceImg.addEventListener("pointerdown", handlePointerDown);
          }

          square.appendChild(pieceImg);
        }
      }

      if (validMoves.includes(squareName)) {
        const dot = document.createElement("div");
        dot.className = "move-dest-dot";
        square.appendChild(dot);
      }

      if (f === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "coordinate rank";
        rankLabel.textContent = boardRanks[r];
        square.appendChild(rankLabel);
      }

      if (r === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "coordinate file";
        fileLabel.textContent = boardFiles[f];
        square.appendChild(fileLabel);
      }

      square.addEventListener("click", handleSquareClick);

      boardEl.appendChild(square);
    }
  }
}

// ==========================================
// Click Selection Interactions Handler
// ==========================================
function handleSquareClick(e) {
  const squareEl = e.currentTarget;
  const clickedSquare = squareEl.dataset.square;
  logDebug(`click event on square: ${clickedSquare}`);

  if (resetTimeout) {
    logDebug("click aborted: resetTimeout active");
    return;
  }
  
  const timeDiff = Date.now() - lastPointerUpTime;
  logDebug(`time since pointerup: ${timeDiff}ms`);
  if (timeDiff < 350) {
    logDebug("click aborted: synthetic click filtered");
    return;
  }
  
  if (selectedSquare === clickedSquare) {
    logDebug("deselecting square");
    selectedSquare = null;
    validMoves = [];
    drawBoard();
    return;
  }

  const piece = game ? game.get(clickedSquare) : null;
  logDebug(`click piece: ${piece ? JSON.stringify(piece) : 'none'}, turn: ${game ? game.turn() : 'null'}`);

  if (piece && piece.color === game.turn()) {
    logDebug(`selecting piece on square ${clickedSquare}`);
    selectedSquare = clickedSquare;
    const moves = game.moves({ square: clickedSquare, verbose: true });
    validMoves = moves.map(m => m.to);
    drawBoard();
  } else if (selectedSquare) {
    logDebug(`attempting user move from ${selectedSquare} to ${clickedSquare}`);
    attemptUserMove(selectedSquare, clickedSquare);
  }
}

// ==========================================
// Unified Pointer Event Drag & Drop System
// ==========================================
function handlePointerDown(e) {
  logDebug("pointerdown event triggered!");
  
  // If mistake lockout timer is active, ignore drags:
  if (resetTimeout) {
    logDebug("pointerdown aborted: resetTimeout active");
    e.preventDefault();
    return;
  }
  
  const pieceImg = e.currentTarget;
  const fromSquare = pieceImg.dataset.square;
  logDebug(`pointerdown on square: ${fromSquare}`);
  
  const piece = game ? game.get(fromSquare) : null;
  logDebug(`piece found: ${piece ? JSON.stringify(piece) : 'none'}, active turn: ${game ? game.turn() : 'null'}`);
  
  if (!piece) {
    logDebug("pointerdown aborted: no piece found on square");
    return;
  }

  // Toggle selection if clicking the already selected piece:
  if (selectedSquare === fromSquare) {
    logDebug(`toggle selection: deselecting ${fromSquare}`);
    selectedSquare = null;
    validMoves = [];
    drawBoard();
    return;
  }
  
  // Get original dimensions before modifying the DOM
  const pieceWidth = pieceImg.clientWidth;
  const pieceHeight = pieceImg.clientHeight;
  logDebug(`piece dimensions: ${pieceWidth}x${pieceHeight}`);

  // Set pointer capture to receive drag moves globally:
  try {
    pieceImg.setPointerCapture(e.pointerId);
    logDebug(`setPointerCapture succeeded for pointerId ${e.pointerId}`);
  } catch (err) {
    logDebug(`setPointerCapture failed: ${err.message}`);
  }
  
  // Initialize drag state variables:
  dragStartSquare = fromSquare;
  selectedSquare = fromSquare;
  currentDragHoverSquare = fromSquare;

  // Retrieve legal moves for selection highlights:
  const moves = game.moves({ square: fromSquare, verbose: true });
  validMoves = moves.map(m => m.to);

  // Dynamically update DOM highlights & dots without clearing the board structure:
  document.querySelectorAll(".square").forEach(sq => {
    sq.classList.remove("selected");
    const dot = sq.querySelector(".move-dest-dot");
    if (dot) dot.remove();
  });

  const startSqEl = document.querySelector(`.square[data-square="${fromSquare}"]`);
  if (startSqEl) startSqEl.classList.add("selected");

  validMoves.forEach(toSq => {
    const sqEl = document.querySelector(`.square[data-square="${toSq}"]`);
    if (sqEl) {
      const dot = document.createElement("div");
      dot.className = "move-dest-dot";
      sqEl.appendChild(dot);
    }
  });

  // Create absolute floating piece copy scaled slightly for premium tactile feedback:
  activeDragPiece = pieceImg.cloneNode(true);
  activeDragPiece.className = "piece pointer-dragging";
  activeDragPiece.style.width = pieceWidth + "px";
  activeDragPiece.style.height = pieceHeight + "px";
  activeDragPiece.style.left = e.clientX + "px";
  activeDragPiece.style.top = e.clientY + "px";
  
  document.body.appendChild(activeDragPiece);

  // Fade original piece visibility:
  pieceImg.classList.add("dragging");
}

function handlePointerMove(e) {
  if (!activeDragPiece) return;
  e.preventDefault();

  // Position floating absolute piece centered directly under pointer:
  activeDragPiece.style.left = e.clientX + "px";
  activeDragPiece.style.top = e.clientY + "px";

  // Mathematical Coordinate Tracking (100% accurate, handles overlapping elements perfectly):
  const rect = boardEl.getBoundingClientRect();
  const colIdx = Math.floor((e.clientX - rect.left) / (rect.width / 8));
  const rowIdx = Math.floor((e.clientY - rect.top) / (rect.height / 8));

  let hoverSquare = null;
  // If pointer coordinates sit within 8x8 boundaries:
  if (colIdx >= 0 && colIdx < 8 && rowIdx >= 0 && rowIdx < 8) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const boardRanks = boardFlipped ? ranks.slice().reverse() : ranks;
    const boardFiles = boardFlipped ? files.slice().reverse() : files;
    
    // Resolve algebraic square coordinate string:
    hoverSquare = boardFiles[colIdx] + boardRanks[rowIdx];
  }

  // Soft gold hover overlay highlighting logic:
  if (hoverSquare !== currentDragHoverSquare) {
    // Clear old hovers:
    document.querySelectorAll(".square").forEach(sq => sq.classList.remove("square-hover"));
    currentDragHoverSquare = hoverSquare;

    // Gold outline if hovering over valid move:
    if (hoverSquare && hoverSquare !== dragStartSquare && validMoves.includes(hoverSquare)) {
      const squareEl = document.querySelector(`.square[data-square="${hoverSquare}"]`);
      if (squareEl) squareEl.classList.add("square-hover");
    }
  }
}

function handlePointerUp(e) {
  logDebug(`pointerup event triggered, dragStartSquare: ${dragStartSquare}`);
  if (!dragStartSquare) return;
  e.preventDefault();

  lastPointerUpTime = Date.now();

  // Clear visual gold outlines:
  document.querySelectorAll(".square").forEach(sq => sq.classList.remove("square-hover"));

  // Remove pointer capture:
  const originalPiece = document.querySelector(`.piece.dragging`);
  if (originalPiece) {
    try {
      originalPiece.releasePointerCapture(e.pointerId);
      logDebug("released pointer capture successfully");
    } catch(err) {
      logDebug(`release pointer capture failed: ${err.message}`);
    }
    originalPiece.classList.remove("dragging");
  }

  // Delete absolute floating drag copy from DOM:
  if (activeDragPiece) {
    activeDragPiece.remove();
    activeDragPiece = null;
  }

  const toSquare = currentDragHoverSquare;
  currentDragHoverSquare = null;
  
  const fromSquare = dragStartSquare;
  dragStartSquare = null;

  logDebug(`pointerup resolved drag from ${fromSquare} to ${toSquare}`);

  // Resolve release actions:
  // If dropped on different square, attempt move execution:
  if (fromSquare && toSquare && fromSquare !== toSquare) {
    logDebug(`attempting user move on drop: from ${fromSquare} to ${toSquare}`);
    attemptUserMove(fromSquare, toSquare);
  } else {
    logDebug("released on same square, calling drawBoard()");
    // Click-select integration: If released on the origin cell, keep visual selections highlighted!
    drawBoard();
  }
}

// ==========================================
// Tactical Show Hint Actions Trigger
// ==========================================
function handleShowHint() {
  if (resetTimeout || !activeGame) return;

  // Get current expected correct move object:
  const correctMove = activeGame.movesVerbose[currentIndex];
  if (!correctMove) return;

  // Increment hints used session counts:
  hintsUsed++;
  playSound('move');

  // Highlight path in gold hint colors on the board:
  const fromSqEl = document.querySelector(`.square[data-square="${correctMove.from}"]`);
  const toSqEl = document.querySelector(`.square[data-square="${correctMove.to}"]`);
  
  if (fromSqEl) fromSqEl.classList.add("hint");
  if (toSqEl) toSqEl.classList.add("correct");

  // Lock inputs for 1.2 seconds while hint displays:
  resetTimeout = setTimeout(() => {
    // Clear gold overlay hint styles
    if (fromSqEl) fromSqEl.classList.remove("hint");
    if (toSqEl) toSqEl.classList.remove("correct");
    resetTimeout = null;
  }, 1200);
}

// ==========================================
// Spaced-Repetition Review Loop
// ==========================================
function startReviewMode() {
  isReviewMode = true;
  reviewBanner.classList.add("show"); // Slide in custom Review Mode header banner

  // Sort failed indices chronologically to review in order:
  reviewQueue.sort((a, b) => a - b);
  
  // Load the first review move position:
  loadReviewMove(reviewQueue[0]);
}

function loadReviewMove(targetIndex) {
  currentIndex = targetIndex;
  
  // Re-instantiate engine to restore exact state before missed move:
  game = new Chess();
  for (let i = 0; i < targetIndex; i++) {
    const m = activeGame.movesVerbose[i];
    game.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
  }

  selectedSquare = null;
  validMoves = [];
  
  // Update study labels:
  statNextPlayer.textContent = "Reviewing...";
  statNextPlayer.className = "stat-val text-gold";

  updateStudyProgress();
  renderMoveHistoryTimeline();
  drawBoard();
}

// ==========================================
// Core Recall Gameplay Engine (Validations)
// ==========================================
function attemptUserMove(fromSq, toSq) {
  logDebug(`attemptUserMove called: from ${fromSq} to ${toSq}`);
  if (resetTimeout || !activeGame) {
    logDebug(`attemptUserMove aborted: resetTimeout=${!!resetTimeout}, activeGame=${!!activeGame}`);
    return;
  }

  const targetMove = activeGame.movesVerbose[currentIndex];
  logDebug(`target move at index ${currentIndex}: ${JSON.stringify(targetMove)}`);
  
  // Legal moves checking:
  const legalMoves = game.moves({ square: fromSq, verbose: true });
  const legalMove = legalMoves.find(m => m.to === toSq);
  logDebug(`legalMove found: ${legalMove ? JSON.stringify(legalMove) : 'none'}`);

  // If illegal, deselect
  if (!legalMove) {
    logDebug("illegal move attempted, resetting selection");
    selectedSquare = null;
    validMoves = [];
    drawBoard();
    return;
  }

  const promotionValue = legalMove.promotion ? 'q' : null;

  // Validation matches coordinates:
  const fromMatches = (fromSq === targetMove.from);
  const toMatches = (toSq === targetMove.to);
  const promotionMatches = (!targetMove.promotion || targetMove.promotion === promotionValue);
  logDebug(`matches: fromMatches=${fromMatches}, toMatches=${toMatches}, promotionMatches=${promotionMatches}`);

  if (fromMatches && toMatches && promotionMatches) {
    // --- CORRECT PATHS ---
    logDebug("correct move matched target move!");
    const captured = legalMove.captured;
    game.move({ from: fromSq, to: toSq, promotion: promotionValue || undefined });
    
    selectedSquare = null;
    validMoves = [];

    // Trigger feedback sound sweeps:
    if (game.in_check()) {
      playSound('check');
    } else if (captured) {
      playSound('capture');
    } else {
      playSound('move');
    }

    if (isReviewMode) {
      // CORRECT REVIEW MOVE execution:
      // Remove failed index from review Queue:
      reviewQueue.shift();
      
      // Flash correct target square green briefly to show success:
      const targetSqEl = document.querySelector(`.square[data-square="${toSq}"]`);
      if (targetSqEl) targetSqEl.classList.add("correct");

      resetTimeout = setTimeout(() => {
        if (targetSqEl) targetSqEl.classList.remove("correct");
        resetTimeout = null;

        // If more failed review moves remain:
        if (reviewQueue.length > 0) {
          loadReviewMove(reviewQueue[0]);
        } else {
          // If all failed moves are reviewed successfully, complete attempt:
          isReviewMode = false;
          reviewBanner.classList.remove("show");
          handleRecallSuccess();
        }
      }, 1000);

    } else {
      // CORRECT STANDARD PRACTICE MOVE execution:
      currentIndex++;
      updateStudyProgress();
      renderMoveHistoryTimeline();
      drawBoard();

      // Check game completion:
      if (currentIndex === activeGame.movesVerbose.length) {
        // If there are missed moves logged during the run, launch Spaced Repetition Review:
        if (reviewQueue.length > 0) {
          startReviewMode();
        } else {
          // Straight success completion
          handleRecallSuccess();
        }
      }
    }

  } else {
    // --- INCORRECT PATHS (Mistake committed) ---
    logDebug("incorrect move attempted! target mismatch.");
    if (isReviewMode) {
      // MISTAKE IN REVIEW MODE:
      // Log errors into hotspots:
      mistakeHotspots[currentIndex] = (mistakeHotspots[currentIndex] || 0) + 1;
      sessionMistakes++;

      // Trigger mistake buzzer tone:
      playSound('mistake');
      
      // Golden correct coordinates hint, ruby red error highlights:
      const correctFromSqEl = document.querySelector(`.square[data-square="${targetMove.from}"]`);
      const correctToSqEl = document.querySelector(`.square[data-square="${targetMove.to}"]`);
      if (correctFromSqEl) correctFromSqEl.classList.add("hint");
      if (correctToSqEl) correctToSqEl.classList.add("selected");
      
      const wrongToSqEl = document.querySelector(`.square[data-square="${legalMove.to}"]`);
      if (wrongToSqEl) wrongToSqEl.classList.add("checked");

      // Slide in mistake review overlay for learning:
      mistakeMoveText.innerHTML = `Mistake in Review! The correct move was: <strong class="text-gold" style="font-size: 1.2rem;">${targetMove.san}</strong>`;
      mistakeSubText.textContent = "Retrying review move...";
      mistakeOverlay.classList.add("show");

      overlayResetProgress.style.transition = "none";
      overlayResetProgress.style.width = "0%";
      setTimeout(() => {
        overlayResetProgress.style.transition = "width 2.2s linear";
        overlayResetProgress.style.width = "100%";
      }, 50);

      resetTimeout = setTimeout(() => {
        mistakeOverlay.classList.remove("show");
        resetTimeout = null;
        // Reload exact position to let them retry immediately
        loadReviewMove(currentIndex);
      }, 2250);

    } else {
      // MISTAKE IN STANDARD PRACTICE:
      // Push missed index to Spaced Repetition Review Queue (avoid duplicates):
      if (!reviewQueue.includes(currentIndex)) {
        reviewQueue.push(currentIndex);
      }
      
      // Log error hotspots details:
      mistakeHotspots[currentIndex] = (mistakeHotspots[currentIndex] || 0) + 1;
      
      handleRecallMistake(legalMove, targetMove);
    }
  }
}

// ==========================================
// STEP 10.3: Success Victory Presentation
// ==========================================
function handleRecallSuccess() {
  playSound('victory');
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Persist score rating:
  const finalScore = calculateScore(sessionMistakes, activeGame.movesVerbose.length);
  
  const savedGame = library.find(g => g.id === activeGame.id);
  if (savedGame) {
    savedGame.attempts = (savedGame.attempts || 0) + totalAttempts;
    if (savedGame.bestScore === null || finalScore > savedGame.bestScore) {
      savedGame.bestScore = finalScore;
    }
    // Review mode schedule auto-reset on full game completion:
    savedGame.reviewDue = null; 
    saveLibrary();
    renderLibrary();
  }

  // Populate dynamic overlay card values:
  successScoreEl.textContent = finalScore;
  successMistakesEl.textContent = sessionMistakes; // Show total session mistakes
  successAttemptsEl.textContent = totalAttempts;
  
  // Format Review speed and Analytics details:
  const mins = Math.floor(sessionSeconds / 60);
  const secs = sessionSeconds % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  let efficiencyRate = "Lightning Recall ⚡";
  const secondsPerMove = sessionSeconds / activeGame.movesVerbose.length;
  if (secondsPerMove >= 3.5) {
    efficiencyRate = "Deep Contemplative 🐢";
  } else if (secondsPerMove >= 1.5) {
    efficiencyRate = "Methodical Master 🧠";
  }

  if (finalScore === 100) {
    successDescEl.innerHTML = `🌟 <strong>Perfect S Rank!</strong> You recalled all ${activeGame.movesVerbose.length} plies of the game perfectly without mistakes in ${timeStr} (${efficiencyRate})!`;
  } else {
    successDescEl.innerHTML = `🏆 <strong>Recall Complete!</strong> Total Time: <strong>${timeStr}</strong> (${efficiencyRate}). Missed moves successfully reviewed.`;
  }

  // Display Mistake Hotspots reports:
  const hotspotsArr = Object.keys(mistakeHotspots);
  if (hotspotsArr.length > 0) {
    successHotspots.innerHTML = "";
    hotspotsArr.sort((a, b) => mistakeHotspots[b] - mistakeHotspots[a]).forEach(idx => {
      const moveIndex = parseInt(idx);
      const moveNum = Math.ceil((moveIndex + 1) / 2);
      const colorPrefix = moveIndex % 2 === 0 ? "White" : "Black";
      const moveObj = activeGame.movesVerbose[moveIndex];
      const count = mistakeHotspots[idx];

      const item = document.createElement("div");
      item.className = "hotspot-item";
      item.innerHTML = `
        <span>Move ${moveNum} (${colorPrefix} - <strong class="text-gold">${moveObj.san}</strong>)</span>
        <span class="count">${count} mistake${count > 1 ? 's' : ''}</span>
      `;
      successHotspots.appendChild(item);
    });
    hotspotsBox.classList.remove("hidden");
  } else {
    hotspotsBox.classList.add("hidden");
  }

  successOverlay.classList.add("show"); 
  triggerConfetti(); 
}

// ==========================================
// STEP 10.4: Spaced Repetition 5-Move Backtrack Lockout
// ==========================================
function handleRecallMistake(attemptedLegalMove, targetMove) {
  playSound('mistake');
  runMistakes++;
  sessionMistakes++;
  
  headerMistakesEl.textContent = runMistakes;
  statMistakeNum.textContent = runMistakes;

  selectedSquare = null;
  validMoves = [];
  drawBoard();

  // Gold hints, ruby error highlights:
  const correctFromSqEl = document.querySelector(`.square[data-square="${targetMove.from}"]`);
  const correctToSqEl = document.querySelector(`.square[data-square="${targetMove.to}"]`);
  
  if (correctFromSqEl) correctFromSqEl.classList.add("hint");
  if (correctToSqEl) correctToSqEl.classList.add("selected");
  
  const wrongToSqEl = document.querySelector(`.square[data-square="${attemptedLegalMove.to}"]`);
  if (wrongToSqEl) wrongToSqEl.classList.add("checked");

  const moveNumber = Math.ceil((currentIndex + 1) / 2);
  const activeColor = (currentIndex % 2 === 0) ? "White" : "Black";
  const displayMove = `${moveNumber}.${activeColor === "Black" ? '..' : ''} ${targetMove.san}`;

  // Configure overlay text for 5-move backtracking:
  const isRollbackToStart = currentIndex < 5;
  mistakeMoveText.innerHTML = `The correct move was: <strong class="text-gold" style="font-size: 1.2rem;">${displayMove}</strong>`;
  mistakeSubText.textContent = isRollbackToStart ? "Backtracking to starting position..." : "Backtracking 5 moves to retry...";
  
  mistakeOverlay.classList.add("show");

  overlayResetProgress.style.transition = "none";
  overlayResetProgress.style.width = "0%";
  
  setTimeout(() => {
    overlayResetProgress.style.transition = "width 2.2s linear";
    overlayResetProgress.style.width = "100%";
  }, 50);

  // Set timeout to roll board back 5 moves:
  resetTimeout = setTimeout(() => {
    // Backtracking index logic:
    const newIndex = Math.max(0, currentIndex - 5);
    
    // Replay moves up to backtrack point:
    game = new Chess();
    for (let i = 0; i < newIndex; i++) {
      const m = activeGame.movesVerbose[i];
      game.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
    }
    
    currentIndex = newIndex;
    runMistakes = 0; // Reset run mistakes count for the backtracked run (sessionMistakes is persistent)
    
    mistakeOverlay.classList.remove("show");
    resetTimeout = null;

    updateStudyProgress();
    renderMoveHistoryTimeline();
    drawBoard();
  }, 2250);
}

// Updates ratio texts and fills bars:
function updateStudyProgress() {
  if (!activeGame) return;
  
  const total = activeGame.movesVerbose.length;
  moveRatioText.textContent = `${currentIndex} / ${total} Plies`;
  
  const percentage = (currentIndex / total) * 100;
  studyProgressFill.style.width = percentage + "%"; 

  const nextColor = (currentIndex % 2 === 0) ? "White" : "Black";
  statNextPlayer.textContent = isReviewMode ? "Review" : nextColor;
  statNextPlayer.className = `stat-val ` + (nextColor === "White" ? "text-gold" : "text-emerald");
}

// Generates timeline move bubbles lists:
function renderMoveHistoryTimeline() {
  if (!activeGame) return;
  moveHistoryTimeline.innerHTML = "";

  const moves = activeGame.movesVerbose;
  
  for (let i = 0; i < moves.length; i += 2) {
    const moveIndex = Math.floor(i / 2) + 1;
    
    const row = document.createElement("div");
    row.className = "move-row";
    
    const numLabel = document.createElement("span");
    numLabel.className = "move-num-label";
    numLabel.textContent = `${moveIndex}.`;
    row.appendChild(numLabel);

    const wMove = moves[i];
    const wCell = createMoveTimelineCell(wMove, i);
    row.appendChild(wCell);

    const bMove = moves[i + 1];
    const bCell = bMove ? createMoveTimelineCell(bMove, i + 1) : createEmptyTimelineCell();
    row.appendChild(bCell);

    moveHistoryTimeline.appendChild(row);
  }

  const activeCell = moveHistoryTimeline.querySelector(".active-step");
  if (activeCell) {
    activeCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function createMoveTimelineCell(move, index) {
  const cell = document.createElement("div");
  cell.className = "move-cell";
  cell.textContent = move.san;

  if (index < currentIndex) {
    cell.classList.add("completed");
  } else if (index === currentIndex) {
    cell.classList.add("active-step");
  } else {
    cell.classList.add("future");
  }

  return cell;
}

function createEmptyTimelineCell() {
  const cell = document.createElement("div");
  cell.className = "move-cell future";
  cell.textContent = "...";
  return cell;
}

// Confetti particle simulator gravity curves:
function triggerConfetti() {
  const colors = ['#d4af37', '#f3e5ab', '#ffffff', '#4caf50'];
  for (let i = 0; i < 40; i++) {
    const particle = document.createElement("div");
    particle.style.position = "fixed";
    particle.style.width = Math.random() * 8 + 4 + "px";
    particle.style.height = particle.style.width;
    particle.style.borderRadius = "50%";
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = "50vw";
    particle.style.top = "50vh";
    particle.style.zIndex = "99999";
    particle.style.pointerEvents = "none";
    particle.style.boxShadow = `0 0 10px ${particle.style.backgroundColor}`;
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 200 + 100;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity;
    
    document.body.appendChild(particle);

    let opac = 1;
    const start = Date.now();
    const duration = 1200;

    const anim = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        particle.remove();
        return;
      }
      const progress = elapsed / duration;
      const x = 50 + (dx * progress) / window.innerWidth * 100;
      const y = 50 + (dy * progress + 0.5 * 180 * progress * progress) / window.innerHeight * 100; 
      
      particle.style.left = x + "vw";
      particle.style.top = y + "vh";
      particle.style.opacity = 1 - progress;
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }
}