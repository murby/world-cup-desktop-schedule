// Renderer Process Script
let currentDateStr = '2026-06-12';
let mode = 'tray';
let liveSimInterval = null;
let simActive = false;

// DOM Elements
const prevDateBtn = document.getElementById('prev-date-btn');
const nextDateBtn = document.getElementById('next-date-btn');
const datePicker = document.getElementById('date-picker');
const friendlyDateEl = document.getElementById('friendly-date');
const matchesContainer = document.getElementById('matches-container');
const userTimezoneEl = document.getElementById('user-timezone');
const perfRamEl = document.getElementById('perf-ram');
const perfCpuEl = document.getElementById('perf-cpu');

const minimizeBtn = document.getElementById('minimize-btn');
const detachBtn = document.getElementById('detach-btn');
const closeBtn = document.getElementById('close-btn');
const simBtn = document.getElementById('sim-btn');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  // Log renderer loading performance
  if (window.performance) {
    const navStart = performance.timing.navigationStart;
    const domLoaded = Date.now();
    console.log(`[PERF] Renderer process loaded DOM in ${domLoaded - navStart}ms`);
  }

  // Check timezone and set input date picker to target date
  datePicker.value = currentDateStr;
  loadSchedule(currentDateStr);
  
  // Start real performance metric updates
  updateRealPerfMetrics();
  setInterval(updateRealPerfMetrics, 3000);
});

let livePollTimeout = null;

// Load Schedule for Date
async function loadSchedule(dateStr, isPoll = false) {
  // Clear any existing polling timeout
  if (livePollTimeout) {
    clearTimeout(livePollTimeout);
    livePollTimeout = null;
  }

  // If local simulation is active, block background polls
  if (isPoll && simActive) {
    return;
  }

  if (!isPoll) {
    matchesContainer.innerHTML = '<div class="cyber-loader font-mono">ESTABLISHING DATA LINK...</div>';
  }
  
  // Call main process API
  const result = await window.api.getMatches(dateStr);
  
  if (!result || !result.success) {
    if (!isPoll) {
      matchesContainer.innerHTML = `<div class="empty-state font-mono"><div class="empty-icon">⚠️</div>LINK FAILURE: UNABLE TO ACCESS DATABASE</div>`;
    }
    return;
  }
  
  // Update Header Banner Details
  friendlyDateEl.textContent = result.friendlyDate;
  userTimezoneEl.textContent = result.userTimezone;
  currentDateStr = result.dateStr;
  datePicker.value = currentDateStr;

  renderMatches(result.matches);

  // Poll every 30 seconds only if there's a live match in progress
  const hasLiveMatch = result.matches.some(match => !match.finished && match.timeElapsed !== 'notstarted');
  if (hasLiveMatch && !simActive) {
    console.log('[POLL] Live match detected. Scheduling next score update in 30 seconds...');
    livePollTimeout = setTimeout(() => {
      loadSchedule(currentDateStr, true);
    }, 30 * 1000);
  }
}

// Render Match Cards
function renderMatches(matches) {
  if (matches.length === 0) {
    matchesContainer.innerHTML = `
      <div class="empty-state font-mono">
        <div class="empty-icon">😴</div>
        NO SIGNAL // NO MATCHES SCHEDULED FOR THIS CYCLE
      </div>`;
    return;
  }

  matchesContainer.innerHTML = '';
  matches.forEach(match => {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.id = `match-${match.id}`;
    
    // Status formatting
    let statusText = 'SCHEDULED';
    let statusClass = 'status-upcoming';
    if (match.finished) {
      statusText = 'FINISHED';
      statusClass = 'status-finished';
    } else if (match.timeElapsed !== 'notstarted') {
      statusText = `LIVE // ${match.timeElapsed}'`;
      statusClass = 'status-live';
    }

    const homeFlag = match.homeTeam.flag || 'https://flagcdn.com/w80/un.png';
    const awayFlag = match.awayTeam.flag || 'https://flagcdn.com/w80/un.png';

    // Calculate progress values
    let progressLabel = '';
    let firstHalfWidth = '0%';
    let secondHalfWidth = '0%';
    
    if (match.finished) {
      card.classList.add('finished-card');
      progressLabel = 'FINISHED // FULL TIME';
      firstHalfWidth = '100%';
      secondHalfWidth = '100%';
    } else if (match.timeElapsed === 'HT') {
      progressLabel = 'HALFTIME // 45m remaining';
      firstHalfWidth = '100%';
      secondHalfWidth = '0%';
    } else if (match.timeElapsed === 'notstarted') {
      progressLabel = 'NOT STARTED // 90m remaining';
      firstHalfWidth = '0%';
      secondHalfWidth = '0%';
    } else {
      const elapsed = parseInt(match.timeElapsed) || 0;
      const remaining = Math.max(0, 90 - elapsed);
      if (elapsed <= 45) {
        progressLabel = `1ST HALF // ${elapsed}' (${remaining}m remaining)`;
        firstHalfWidth = `${(elapsed / 45) * 100}%`;
        secondHalfWidth = '0%';
      } else {
        progressLabel = `2ND HALF // ${elapsed}' (${remaining}m remaining)`;
        firstHalfWidth = '100%';
        secondHalfWidth = `${((elapsed - 45) / 45) * 100}%`;
      }
    }

    card.innerHTML = `
      <div class="card-header font-mono">
        <span class="match-id">MATCH #${match.id}</span>
        <span class="match-stage">${match.type === 'group' ? 'Group ' + match.group : match.type}</span>
        <span class="match-status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="teams-duel">
        <div class="team-profile home">
          <div class="flag-box">
            <img src="${homeFlag}" alt="${match.homeTeam.name} Flag" onerror="this.src='https://flagcdn.com/w80/un.png'">
          </div>
          <span class="team-name">${match.homeTeam.name}</span>
        </div>
        
        <div class="score-display home-score">${match.homeScore}</div>
        <div class="score-divider">:</div>
        <div class="score-display away-score">${match.awayScore}</div>
        
        <div class="team-profile away">
          <div class="flag-box">
            <img src="${awayFlag}" alt="${match.awayTeam.name} Flag" onerror="this.src='https://flagcdn.com/w80/un.png'">
          </div>
          <span class="team-name">${match.awayTeam.name}</span>
        </div>
      </div>
      <div class="match-progress-container">
        <div class="progress-labels">
          <span class="progress-time-remaining">${progressLabel}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-segment first-half-bar" style="width: ${firstHalfWidth}"></div>
          <div class="progress-bar-divider"></div>
          <div class="progress-bar-segment second-half-bar" style="width: ${secondHalfWidth}"></div>
        </div>
      </div>
      <div class="venue-details font-mono">
        <div class="time-row">
          <span>KICKOFF: <span class="kickoff-time">${match.kickoffUser}</span></span>
          <span class="local-kickoff">(${match.kickoffLocal} local)</span>
        </div>
        <div class="stadium-row">
          <span class="stadium-icon">🏟️</span>
          <span>${match.stadium.name} (${match.stadium.city}, ${match.stadium.country})</span>
        </div>
      </div>
    `;
    
    matchesContainer.appendChild(card);
  });
}

// Date Navigation Helpers
function shiftDate(days) {
  const current = new Date(currentDateStr + 'T12:00:00'); // Use noon to avoid timezone shift issues
  current.setDate(current.getDate() + days);
  
  const y = current.getFullYear();
  const m = String(current.getMonth() + 1).padStart(2, '0');
  const d = String(current.getDate()).padStart(2, '0');
  
  const targetStr = `${y}-${m}-${d}`;
  loadSchedule(targetStr);
}

prevDateBtn.addEventListener('click', () => {
  stopSimulation();
  shiftDate(-1);
});

nextDateBtn.addEventListener('click', () => {
  stopSimulation();
  shiftDate(1);
});

datePicker.addEventListener('change', (e) => {
  stopSimulation();
  loadSchedule(e.target.value);
});

// Title Bar Custom Actions
minimizeBtn.addEventListener('click', () => {
  window.api.minimizeApp();
});

closeBtn.addEventListener('click', () => {
  window.api.closeApp();
});

detachBtn.addEventListener('click', () => {
  window.api.toggleDetach();
});

// Listen to Mode Change from Main Process
window.api.onModeChange((newMode) => {
  mode = newMode;
  if (mode === 'window') {
    document.body.className = 'mode-window';
    detachBtn.textContent = 'ATTACH';
    detachBtn.title = 'Dock to Menu Bar';
  } else {
    document.body.className = 'mode-tray';
    detachBtn.textContent = 'DETACH';
    detachBtn.title = 'Detach Window';
  }
});

// Live Match Simulator
simBtn.addEventListener('click', () => {
  if (simActive) {
    stopSimulation();
  } else {
    startSimulation();
  }
});

function startSimulation() {
  const cards = document.querySelectorAll('.match-card');
  if (cards.length === 0) return;

  // Find the first card that is not finished
  let targetCard = null;
  for (let card of cards) {
    const badge = card.querySelector('.match-status-badge');
    if (!badge.classList.contains('status-finished')) {
      targetCard = card;
      break;
    }
  }

  // Fallback to first card if all finished
  if (!targetCard) targetCard = cards[0];

  simActive = true;
  simBtn.textContent = 'STOP_SIM';
  simBtn.classList.add('active');
  
  const badge = targetCard.querySelector('.match-status-badge');
  badge.className = 'match-status-badge status-live';
  badge.textContent = 'LIVE // 0\'';

  const homeScoreEl = targetCard.querySelector('.home-score');
  const awayScoreEl = targetCard.querySelector('.away-score');

  homeScoreEl.textContent = '0';
  awayScoreEl.textContent = '0';

  // Get progress elements for simulated card
  const firstHalfBar = targetCard.querySelector('.first-half-bar');
  const secondHalfBar = targetCard.querySelector('.second-half-bar');
  const progressLabel = targetCard.querySelector('.progress-time-remaining');

  // Reset progress bar on startup
  if (firstHalfBar) firstHalfBar.style.width = '0%';
  if (secondHalfBar) secondHalfBar.style.width = '0%';
  if (progressLabel) progressLabel.textContent = `1ST HALF // 0' (90m remaining)`;
  targetCard.classList.remove('finished-card');

  let min = 0;
  let homeScore = 0;
  let awayScore = 0;

  liveSimInterval = setInterval(() => {
    min += 5;
    if (min > 90) {
      min = 90;
      badge.className = 'match-status-badge status-finished';
      badge.textContent = 'FINISHED';
      
      // Update progress bar to completed state
      if (progressLabel) progressLabel.textContent = 'FINISHED // FULL TIME';
      if (firstHalfBar) firstHalfBar.style.width = '100%';
      if (secondHalfBar) secondHalfBar.style.width = '100%';
      targetCard.classList.add('finished-card');

      stopSimulation();
      return;
    }

    badge.textContent = `LIVE // ${min}'`;

    // Update progress bar during simulation ticks
    const remaining = 90 - min;
    if (min <= 45) {
      if (progressLabel) progressLabel.textContent = `1ST HALF // ${min}' (${remaining}m remaining)`;
      if (firstHalfBar) firstHalfBar.style.width = `${(min / 45) * 100}%`;
      if (secondHalfBar) secondHalfBar.style.width = '0%';
    } else {
      if (progressLabel) progressLabel.textContent = `2ND HALF // ${min}' (${remaining}m remaining)`;
      if (firstHalfBar) firstHalfBar.style.width = '100%';
      if (secondHalfBar) secondHalfBar.style.width = `${((min - 45) / 45) * 100}%`;
    }

    // Random goal probability
    if (Math.random() < 0.25) {
      if (Math.random() < 0.5) {
        homeScore++;
        homeScoreEl.textContent = homeScore;
        triggerGoalGlow(homeScoreEl);
      } else {
        awayScore++;
        awayScoreEl.textContent = awayScore;
        triggerGoalGlow(awayScoreEl);
      }
    }
  }, 1000);
}

function triggerGoalGlow(element) {
  element.style.color = 'var(--neon-pink)';
  element.style.borderColor = 'var(--neon-pink)';
  setTimeout(() => {
    element.style.color = '';
    element.style.borderColor = '';
  }, 800);
}

function stopSimulation() {
  simActive = false;
  simBtn.textContent = 'SIM_LIVE';
  simBtn.classList.remove('active');
  if (liveSimInterval) {
    clearInterval(liveSimInterval);
    liveSimInterval = null;
  }
  loadSchedule(currentDateStr);
}

// Footer performance metrics update
async function updateRealPerfMetrics() {
  try {
    const metrics = await window.api.getPerfMetrics();
    if (metrics && metrics.success) {
      const totalMemMB = (parseFloat(metrics.mainMemMB) + parseFloat(metrics.rendererMemMB)).toFixed(1);
      perfRamEl.textContent = `${totalMemMB} MB`;
      perfCpuEl.textContent = `${metrics.cpuPercent}%`;
    }
  } catch (err) {
    console.error('Error updating performance metrics:', err);
  }
}
