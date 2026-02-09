const STORAGE_KEY = "sledBusinessTycoonState";
const AUTOSAVE_INTERVAL_MS = 30000;
const OFFLINE_MODAL_THRESHOLD_S = 30;
const CHUNK_SECONDS = 10;

const elements = {
  cash: document.getElementById("cash"),
  sledCount: document.getElementById("sled-count"),
  condition: document.getElementById("condition"),
  production: document.getElementById("production"),
  electricity: document.getElementById("electricity"),
  status: document.getElementById("status"),
  sellSled: document.getElementById("sell-sled"),
  buySled: document.getElementById("buy-sled"),
  offlineModal: document.getElementById("offline-modal"),
  offlineTime: document.getElementById("offline-time"),
  offlineMoney: document.getElementById("offline-money"),
  offlineElectricity: document.getElementById("offline-electricity"),
  offlineCondition: document.getElementById("offline-condition"),
  closeModal: document.getElementById("close-modal"),
};

const defaultState = {
  cash: 0,
  sleds: 0,
  condition: 100,
  lastSaved: Date.now(),
};

let state = loadState();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function productionPerSecond(currentState) {
  const efficiency = currentState.condition / 100;
  return currentState.sleds * 1 * efficiency;
}

function electricityPerSecond(currentState) {
  return currentState.sleds * 0.2;
}

function conditionDecayPerSecond(currentState) {
  return currentState.sleds * 0.005;
}

function updateUI() {
  elements.cash.textContent = formatCurrency(state.cash);
  elements.sledCount.textContent = state.sleds.toString();
  elements.condition.textContent = `${state.condition.toFixed(1)}%`;
  elements.production.textContent = formatCurrency(productionPerSecond(state));
  elements.electricity.textContent = formatCurrency(electricityPerSecond(state));
  elements.buySled.disabled = state.cash < 50;
  elements.status.textContent = state.sleds
    ? "Your sleds are gliding smoothly."
    : "Recruit more sleds to start earning."
}

function saveState() {
  state.lastSaved = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { ...defaultState };
  }
  try {
    const parsed = JSON.parse(stored);
    return {
      ...defaultState,
      ...parsed,
      condition: clamp(parsed.condition ?? defaultState.condition, 0, 100),
    };
  } catch (error) {
    return { ...defaultState };
  }
}

function simulateProgress(seconds) {
  const total = {
    money: 0,
    electricity: 0,
    condition: 0,
  };

  let remaining = seconds;

  while (remaining > 0) {
    const step = Math.min(CHUNK_SECONDS, remaining);
    const production = productionPerSecond(state) * step;
    const electricity = electricityPerSecond(state) * step;
    const decay = conditionDecayPerSecond(state) * step;

    state.cash += production - electricity;
    state.condition = clamp(state.condition - decay, 0, 100);

    total.money += production - electricity;
    total.electricity += electricity;
    total.condition -= decay;

    remaining -= step;
  }

  return total;
}

function renderOfflineSummary(elapsedSeconds, totals) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  elements.offlineTime.textContent = `Time away: ${minutes}m ${seconds}s`;
  elements.offlineMoney.textContent = `Money gained: ${formatCurrency(totals.money)}`;
  elements.offlineElectricity.textContent = `Electricity cost: ${formatCurrency(totals.electricity)}`;
  elements.offlineCondition.textContent = `Condition change: ${totals.condition.toFixed(1)}%`;
  elements.offlineModal.classList.remove("hidden");
}

function maybeShowOfflineSummary() {
  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - state.lastSaved) / 1000);
  if (elapsedSeconds < 1) {
    return;
  }
  const totals = simulateProgress(elapsedSeconds);
  if (elapsedSeconds >= OFFLINE_MODAL_THRESHOLD_S) {
    renderOfflineSummary(elapsedSeconds, totals);
  }
  saveState();
}

function tick() {
  simulateProgress(1);
  updateUI();
}

function handleSellSled() {
  state.cash += 5;
  updateUI();
}

function handleBuySled() {
  if (state.cash < 50) {
    return;
  }
  state.cash -= 50;
  state.sleds += 1;
  saveState();
  updateUI();
}

function init() {
  maybeShowOfflineSummary();
  updateUI();

  elements.sellSled.addEventListener("click", handleSellSled);
  elements.buySled.addEventListener("click", handleBuySled);
  elements.closeModal.addEventListener("click", () => {
    elements.offlineModal.classList.add("hidden");
  });

  setInterval(tick, 1000);
  setInterval(saveState, AUTOSAVE_INTERVAL_MS);
  window.addEventListener("beforeunload", saveState);
}

init();
