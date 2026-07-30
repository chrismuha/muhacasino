// Config
const SYMBOLS = ["💎", "🍀", "⭐", "🔔", "🍋", "🍒"];

// Weights (higher = more common)
const WEIGHTS = {
    "💎": 1,
    "🍀": 3,
    "⭐": 4,
    "🔔": 6,
    "🍋": 7,
    "🍒": 8,
};

// Paytable (multipliers) for 3/4/5 in a row from the left
const PAYTABLE = {
    "💎": { 3: 60, 4: 240, 5: 1200 },
    "🍀": { 3: 30, 4: 120, 5: 600 },
    "⭐": { 3: 18, 4: 72, 5: 360 },
    "🔔": { 3: 12, 4: 48, 5: 240 },
    "🍋": { 3: 8, 4: 30, 5: 150 },
    "🍒": { 3: 5, 4: 20, 5: 100 },
};

const JACKPOT_TIERS = [
    { name: "Mini", elementId: "jackpotMini", oddsElementId: "miniJackpotOdds", customId: "miniJackpotCustomOdds", winInputId: "miniJackpotWinPercent", lossInputId: "miniJackpotLossPercent", defaultRate: 0.001, amountUSD: 10 },
    { name: "Minor", elementId: "jackpotMinor", oddsElementId: "minorJackpotOdds", customId: "minorJackpotCustomOdds", winInputId: "minorJackpotWinPercent", lossInputId: "minorJackpotLossPercent", defaultRate: 0.0002, amountUSD: 100 },
    { name: "Major", elementId: "jackpotMajor", oddsElementId: "majorJackpotOdds", customId: "majorJackpotCustomOdds", winInputId: "majorJackpotWinPercent", lossInputId: "majorJackpotLossPercent", defaultRate: 0.00005, amountUSD: 1000 },
    { name: "Grand", elementId: "jackpotGrand", oddsElementId: "grandJackpotOdds", customId: "grandJackpotCustomOdds", winInputId: "grandJackpotWinPercent", lossInputId: "grandJackpotLossPercent", defaultRate: 0.00001, amountUSD: 10000 },
];

const ROWS = 5;
const COLS = 5;
const MAX_OUTCOME_ATTEMPTS = 200;
const MONTE_CARLO_BASELINES_BY_LINES = {
    spins: 500000,
    byLines: {
        1: { winRate: 0.047536, lossRate: 0.952464, rtp: 0.406668, houseEdge: 0.593332 },
        2: { winRate: 0.093756, lossRate: 0.906244, rtp: 0.418394, houseEdge: 0.581606 },
        3: { winRate: 0.136486, lossRate: 0.863514, rtp: 0.42093733333333333, houseEdge: 0.5790626666666667 },
        4: { winRate: 0.177584, lossRate: 0.822416, rtp: 0.416944, houseEdge: 0.583056 },
        5: { winRate: 0.217176, lossRate: 0.782824, rtp: 0.4209688, houseEdge: 0.5790312 },
        6: { winRate: 0.253474, lossRate: 0.746526, rtp: 0.417354, houseEdge: 0.582646 },
        7: { winRate: 0.285758, lossRate: 0.714242, rtp: 0.4150897142857143, houseEdge: 0.5849102857142857 },
        8: { winRate: 0.318648, lossRate: 0.681352, rtp: 0.4166925, houseEdge: 0.5833075 },
        9: { winRate: 0.339284, lossRate: 0.660716, rtp: 0.41754355555555556, houseEdge: 0.5824564444444444 },
        10: { winRate: 0.358774, lossRate: 0.641226, rtp: 0.4148412, houseEdge: 0.5851588 },
    },
};

// Paylines
const PAYLINES = [
    [2, 2, 2, 2, 2], // 1 middle
    [0, 0, 0, 0, 0], // 2 top
    [4, 4, 4, 4, 4], // 3 bottom
    [1, 1, 1, 1, 1], // 4 upper-mid
    [3, 3, 3, 3, 3], // 5 lower-mid
    [0, 1, 2, 3, 4], // 6 diagonal down
    [4, 3, 2, 1, 0], // 7 diagonal up
    [1, 2, 3, 2, 1], // 8 V around center
    [0, 1, 0, 1, 0], // 9 small wave near top
    [4, 3, 4, 3, 4], // 10 small wave near bottom
];


// DOM
const reelsEl = document.getElementById("reels");
const messageEl = document.getElementById("message");
const balanceEl = document.getElementById("balance");
const totalBetEl = document.getElementById("totalBet");
const denomEl = document.getElementById("denom");
const linesEl = document.getElementById("lines");
const betEl = document.getElementById("bet");
const winOddsEl = document.getElementById("winOdds");
const freeSpinsOddsEl = document.getElementById("freeSpinsOdds");
const freeSpinsAwardEl = document.getElementById("freeSpinsAward");
const bonusGameOddsEl = document.getElementById("bonusGameOdds");
const featureOddsRulesEl = document.getElementById("featureOddsRules");
const bonusPrizeSelectEls = [1, 2, 3].map((number) => document.getElementById(`bonusPrize${number}`));
const bonusPrizeCustomEls = [1, 2, 3].map((number) => document.getElementById(`bonusPrize${number}Custom`));
const maxBetUsesAvailableCreditsEl = document.getElementById("maxBetUsesAvailableCredits");
const skipWinAnimationDelayEl = document.getElementById("skipWinAnimationDelay");
const creditStepEl = document.getElementById("creditStep");
const creditStepEffectEl = document.getElementById("creditStepEffect");
const creditUpBtn = document.getElementById("creditUp");
const creditDownBtn = document.getElementById("creditDown");
const spinBtn = document.getElementById("spin");
const maxBtn = document.getElementById("max");
const resetSessionBtn = document.getElementById("resetSession");
const settingsButtonEl = document.getElementById("settingsButton");
const autoSpinHintEl = document.getElementById("autoSpinHint");
const autoSpinElapsedEl = document.getElementById("autoSpinElapsed");
const payInfoBtn = document.getElementById("payInfo");
const previewOverlayEl = document.getElementById("previewOverlay");
const previewOverlayCloseBtn = document.getElementById("previewOverlayClose");
const lastChanceOverlayEl = document.getElementById("lastChanceOverlay");
const lastChanceCloseBtn = document.getElementById("lastChanceClose");
const lastChanceCancelBtn = document.getElementById("lastChanceCancel");
const lastChanceConfirmBtn = document.getElementById("lastChanceConfirm");
const lastChanceSummaryEl = document.getElementById("lastChanceSummary");
const lastChanceQuestionEl = document.getElementById("lastChanceQuestion");
const linesPreviewOverlayEl = document.getElementById("linesPreviewOverlay");
const overlayPrevBtn = document.getElementById("overlayPrev");
const overlayNextBtn = document.getElementById("overlayNext");
const overlayPageLabelEl = document.getElementById("overlayPageLabel");
const overlayPageEls = Array.from(document.querySelectorAll("[data-info-page]"));
const casinoAdvantageTextEl = document.getElementById("casinoAdvantageText");
const winLossOddsTextEl = document.getElementById("winLossOddsText");
const sessionStatDisplayEl = document.getElementById("sessionStatDisplay");
const creditsInsertedEl = document.getElementById("creditsInserted");
const SESSION_STAT_CLEANUP_SELECTORS = [
    "#sessionWinningsBox",
    "#sessionLossesBox",
    "#netSessionWinningsBox",
    "#netSessionLossesBox",
    "#actualSessionWinningsBox",
    "#actualSessionLossesBox",
    "#sessionWinnings",
    "#sessionLosses",
    "#netSessionWinnings",
    "#netSessionLosses",
    "#actualSessionWinnings",
    "#actualSessionLosses",
];
const SESSION_VISIBILITY_BY_MODE = {
    both: { winnings: true, losses: true, netWinnings: false, netLosses: false, actualWinnings: false, actualLosses: false },
    winnings: { winnings: true, losses: false, netWinnings: false, netLosses: false, actualWinnings: false, actualLosses: false },
    losses: { winnings: false, losses: true, netWinnings: false, netLosses: false, actualWinnings: false, actualLosses: false },
    netBoth: { winnings: false, losses: false, netWinnings: true, netLosses: true, actualWinnings: false, actualLosses: false },
    netWinnings: { winnings: false, losses: false, netWinnings: true, netLosses: false, actualWinnings: false, actualLosses: false },
    netLosses: { winnings: false, losses: false, netWinnings: false, netLosses: true, actualWinnings: false, actualLosses: false },
    actualNetBoth: { winnings: false, losses: false, netWinnings: false, netLosses: false, actualWinnings: true, actualLosses: true },
    actualNetWinnings: { winnings: false, losses: false, netWinnings: false, netLosses: false, actualWinnings: true, actualLosses: false },
    actualNetLosses: { winnings: false, losses: false, netWinnings: false, netLosses: false, actualWinnings: false, actualLosses: true },
};


// State
const INITIAL_CREDITS_USD = 100.0;
let balance = INITIAL_CREDITS_USD;
let isSpinning = false;
let overlayPageIndex = 0;
let autoSpinRunning = false;
let autoSpinStopRequested = false;
let autoSpinRemaining = 0;
let autoSpinStartedAt = 0;
let spinElapsedAccumulatedMs = 0;
let autoSpinElapsedTimer = 0;
let spinHoldTimer = 0;
let spaceSpinHoldTimer = 0;
let suppressSpinClick = false;
let lastTouchEndAt = 0;
let pendingLastChanceSpinUSD = 0;
let totalBetDisplayOverrideUSD = null;
let settingsOverlayEl = null;
let settingsPageIndex = 0;
let settingsItems = [];
let settingsPins = {};
const SETTINGS_PIN_STORAGE_KEY = "bigMoneyDeluxe.settingsPins.v1";

// Session Winnings State
let sessionWinningsUSD = 0;
let sessionLossesUSD = 0;
let netSessionWinningsUSD = 0;
let netSessionLossesUSD = 0;
let actualSessionNetUSD = 0;
let creditsInsertedUSD = INITIAL_CREDITS_USD;
let freeSpinsRemaining = 0;
let freeSpinWagerConfig = null;
let featureStatusEl = null;
let bonusOverlayEl = null;

document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });
document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEndAt < 300) {
        e.preventDefault();
    }
    lastTouchEndAt = now;
}, { passive: false });


// Utilities
function fmtUSD(n) {
    return `$${Number(n).toFixed(2)}`;
}

function fmtPercent(n) {
    return `${(Number(n) * 100).toFixed(2)}%`;
}

function fmtOneIn(p) {
    if (!Number.isFinite(p) || p <= 0) return "N/A";
    return `1 in ${(1 / p).toFixed(2)}`;
}

function roundUSD(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function clampBalanceUSD(value) {
    return roundUSD(Math.max(0, value));
}

function syncCreditStepFieldMode() {
    if (!creditStepEl) return;
    creditStepEl.inputMode = "numeric";
    creditStepEl.pattern = "[1-9][0-9]*";
}

function isValidCreditStepValue(rawValue) {
    const value = String(rawValue ?? "").trim();
    if (!/^[1-9]\d*$/.test(value)) return false;
    return true;
}

function isPotentialCreditStepValue(rawValue) {
    const value = String(rawValue ?? "").trim();
    if (value === "") return true;
    return /^\d*$/.test(value);
}

function normalizeCreditStepValue(rawValue) {
    if (!isValidCreditStepValue(rawValue)) return 1;
    const parsed = Number.parseFloat(String(rawValue).trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return 1;
    return Math.max(1, Math.round(parsed));
}

function formatCreditStepValue(value) {
    const normalized = normalizeCreditStepValue(value);
    return normalized.toFixed(2).replace(/\.?0+$/, "");
}

function updateCreditStepEffect() {
    if (!creditStepEffectEl || !creditStepEl) return;
    const creditStep = normalizeCreditStepValue(creditStepEl.value);
    creditStepEffectEl.textContent = `Each arrow press: ${fmtUSD(creditStep)}`;
}

function getAvailableCreditsBetUSD() {
    return clampBalanceUSD(balance);
}

function shouldSkipWinAnimationDelay() {
    return Boolean(skipWinAnimationDelayEl?.checked);
}

function getNextInputValue(input, insertedText) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    return `${input.value.slice(0, start)}${insertedText}${input.value.slice(end)}`;
}

function cleanupCreditStepWhileTyping(rawValue) {
    const value = String(rawValue ?? "");
    if (!value) return value;

    if (allowsFractionalCreditSteps()) {
        if (/^0+\d/.test(value)) {
            return value.replace(/^0+/, "");
        }
        return value;
    }

    if (/^0+\d/.test(value)) {
        return value.replace(/^0+/, "");
    }
    return value;
}

function syncCreditStepInput(rawValue) {
    syncCreditStepFieldMode();
    if (isValidCreditStepValue(rawValue)) {
        const normalized = formatCreditStepValue(rawValue);
        creditStepEl.value = normalized;
        creditStepEl.dataset.lastValidValue = normalized;
        updateCreditStepEffect();
        return;
    }
    const fallbackValue = formatCreditStepValue(creditStepEl.dataset.lastValidValue || "1");
    creditStepEl.value = fallbackValue;
    creditStepEl.dataset.lastValidValue = fallbackValue;
    updateCreditStepEffect();
}

function getTargetSpinWinRate() {
    const value = Number.parseFloat(winOddsEl?.value ?? "0.5");
    if (!Number.isFinite(value)) return 0.5;
    return Math.min(0.99, Math.max(0.01, value));
}

function getTargetJackpotRate(tier) {
    const select = document.getElementById(tier.oddsElementId);
    const value = select?.value === "custom"
        ? Number.parseFloat(document.getElementById(tier.winInputId)?.value) / 100
        : Number.parseFloat(select?.value ?? tier.defaultRate);
    return Number.isFinite(value) ? Math.min(1, Math.max(0.00001, value)) : tier.defaultRate;
}

function syncCustomJackpotOdds(tier, changedSide = null) {
    const select = document.getElementById(tier.oddsElementId);
    const customRow = document.getElementById(tier.customId);
    const winInput = document.getElementById(tier.winInputId);
    const lossInput = document.getElementById(tier.lossInputId);
    if (!select || !customRow || !winInput || !lossInput) return;
    customRow.hidden = select.value !== "custom";
    if (select.value !== "custom") return;
    if (!changedSide) changedSide = "win";
    if (changedSide === "win") {
        const win = Math.min(100, Math.max(0.1, Math.round((Number.parseFloat(winInput.value) || 0.1) * 10) / 10));
        winInput.value = String(win);
        lossInput.value = String(Math.round((100 - win) * 10) / 10);
    } else {
        const loss = Math.min(99.9, Math.max(0, Math.round((Number.parseFloat(lossInput.value) || 0) * 10) / 10));
        lossInput.value = String(loss);
        winInput.value = String(Math.round((100 - loss) * 10) / 10);
    }
    updateGameOddsDisplay();
}

function resetCustomJackpotOdds() {
    for (const tier of JACKPOT_TIERS) {
        document.getElementById(tier.oddsElementId).value = String(tier.defaultRate);
        const defaultWinPercent = tier.defaultRate * 100;
        document.getElementById(tier.winInputId).value = String(defaultWinPercent);
        document.getElementById(tier.lossInputId).value = String(100 - defaultWinPercent);
        syncCustomJackpotOdds(tier);
    }
}

function choiceWeighted(weightsMap) {
    const entries = Object.entries(weightsMap);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [sym, w] of entries) {
        if ((r -= w) <= 0) return sym;
    }
    return entries[entries.length - 1][0];
}

function createGrid(cellFactory) {
    return Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, (_, col) => cellFactory(col))
    );
}

function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function getDenominationValue() {
    const value = Number.parseFloat(denomEl?.value ?? "1");
    return Number.isFinite(value) && value > 0 ? value : 1;
}

function getTotalBet() {
    const lines = parseInt(linesEl.value, 10);
    const betPerLine = parseFloat(betEl.value);
    const denom = getDenominationValue();
    // Total bet shown in dollars to user (lines * bet credits * denom)
    return roundUSD(lines * betPerLine * denom);
}

function getActiveTotalBetUSD(totalBetOverrideUSD = totalBetDisplayOverrideUSD) {
    return Number.isFinite(totalBetOverrideUSD)
        ? roundUSD(totalBetOverrideUSD)
        : getTotalBet();
}

function shouldOfferLastChanceSpin(totalBetOverrideUSD = totalBetDisplayOverrideUSD) {
    if (freeSpinsRemaining > 0) return false;
    const totalBetUSD = getActiveTotalBetUSD(totalBetOverrideUSD);
    return balance > 0 && balance < totalBetUSD;
}

function getWagerConfig(totalBetOverrideUSD = null) {
    const linesActive = parseInt(linesEl.value, 10);
    const denom = getDenominationValue();
    const totalBetUSD = Number.isFinite(totalBetOverrideUSD) ? roundUSD(totalBetOverrideUSD) : getTotalBet();
    const betPerLine = linesActive > 0 && denom > 0 ? totalBetUSD / (linesActive * denom) : 0;
    return { linesActive, denom, totalBetUSD, betPerLine };
}

function getHighestBetOptionValue() {
    const betOptions = Array.from(betEl?.options ?? []);
    if (betOptions.length <= 0) return null;
    return betOptions.reduce((max, option) =>
        parseFloat(option.value) > parseFloat(max.value) ? option : max
    ).value;
}

function updateTotals() {
    const totalBet = getActiveTotalBetUSD();
    totalBetEl.textContent = fmtUSD(totalBet);
    balanceEl.textContent = fmtUSD(balance);
    const canSpinNow = freeSpinsRemaining > 0 || balance >= totalBet;
    const canUseLastChance = balance > 0 && balance < totalBet;
    spinBtn.disabled = autoSpinRunning ? false : (!(canSpinNow || canUseLastChance) || isSpinning);
    maxBtn.disabled = isSpinning || autoSpinRunning;
    if (resetSessionBtn) resetSessionBtn.disabled = isSpinning || autoSpinRunning;
}

function clearMessage() {
    messageEl.textContent = " ";
}

function setMessage(msg) {
    messageEl.textContent = msg;
}

function updateFeatureStatus() {
    if (!featureStatusEl) return;
    const freeSpinsActive = getFeatureRate(freeSpinsOddsEl, 0.03) > 0;
    const bonusActive = getFeatureRate(bonusGameOddsEl, 0.01) > 0;
    if (freeSpinsRemaining > 0) {
        featureStatusEl.textContent = `FREE SPINS: ${freeSpinsRemaining}`;
    } else if (freeSpinsActive && bonusActive) {
        featureStatusEl.textContent = "Free Spins & Bonus Plays active";
    } else {
        featureStatusEl.textContent = `Free Spins ${freeSpinsActive ? "active" : "not active"} • Bonus Plays ${bonusActive ? "active" : "not active"}`;
    }
    featureStatusEl.classList.toggle("feature-active", freeSpinsRemaining > 0 || freeSpinsActive || bonusActive);
}

function getFeatureRate(select, fallback) {
    const value = Number.parseFloat(select?.value);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function getFreeSpinsAward() {
    const value = Number.parseInt(freeSpinsAwardEl?.value, 10);
    return Number.isFinite(value) && value > 0 ? value : 8;
}

function getBonusPrizeMultiplier(index) {
    const select = bonusPrizeSelectEls[index];
    const source = select?.value === "custom" ? bonusPrizeCustomEls[index]?.value : select?.value;
    const value = Number.parseFloat(source);
    return Number.isFinite(value) && value > 0 ? value : [2, 5, 10][index];
}

function getBonusPrizeMultipliers() {
    return [0, 1, 2].map(getBonusPrizeMultiplier);
}

function syncBonusPrizeCustomInput(index) {
    const customInput = bonusPrizeCustomEls[index];
    const customLabel = customInput?.closest(".bonus-custom-label");
    if (!customLabel) return;
    customLabel.hidden = bonusPrizeSelectEls[index]?.value !== "custom";
}

function updateFeatureRules() {
    if (!featureOddsRulesEl) return;
    const freeRate = getFeatureRate(freeSpinsOddsEl, 0.03);
    const bonusRate = getFeatureRate(bonusGameOddsEl, 0.01);
    const prizes = getBonusPrizeMultipliers().map((value) => `${value}x`).join(", ");
    featureOddsRulesEl.textContent = `With the current settings, each paid spin independently has a ${(freeRate * 100).toFixed(0)}% win / ${((1 - freeRate) * 100).toFixed(0)}% loss chance to award ${getFreeSpinsAward()} free spins, and a ${(bonusRate * 100).toFixed(0)}% win / ${((1 - bonusRate) * 100).toFixed(0)}% loss chance to open Bonus Plays. The three shuffled prizes are ${prizes} the triggering bet.`;
}

function setupFeatureUI() {
    featureStatusEl = document.createElement("div");
    featureStatusEl.className = "feature-status";
    featureStatusEl.setAttribute("aria-live", "polite");
    reelsEl.insertAdjacentElement("afterend", featureStatusEl);

    bonusOverlayEl = document.createElement("div");
    bonusOverlayEl.className = "feature-overlay";
    bonusOverlayEl.hidden = true;
    bonusOverlayEl.innerHTML = `<div class="feature-dialog" role="dialog" aria-modal="true" aria-labelledby="bonusTitle"><h2 id="bonusTitle">Pick a Dollar Bill!</h2><p>Pick one bill to reveal a configured prize.</p><div class="bonus-choices"><button type="button">💵</button><button type="button">💵</button><button type="button">💵</button></div></div>`;
    bonusOverlayEl.addEventListener("keydown", (event) => {
        if (event.code !== "Space") return;
        event.preventDefault();
        event.stopPropagation();
    });
    document.body.appendChild(bonusOverlayEl);
    updateFeatureStatus();
}

function playBonusGame(totalBetUSD) {
    if (!bonusOverlayEl) return Promise.resolve(0);
    bonusOverlayEl.hidden = false;
    const buttons = Array.from(bonusOverlayEl.querySelectorAll(".bonus-choices button"));
    const prizes = getBonusPrizeMultipliers().sort(() => Math.random() - 0.5);
    return new Promise((resolve) => {
        buttons.forEach((button, index) => {
            button.disabled = false;
            button.textContent = "💵";
            button.onclick = () => {
                const multiplier = prizes[index];
                const winUSD = roundUSD(totalBetUSD * multiplier);
                buttons.forEach((choice) => { choice.disabled = true; });
                button.textContent = `${multiplier}×`;
                setTimeout(() => {
                    bonusOverlayEl.hidden = true;
                    resolve(winUSD);
                }, 900);
            };
        });
        buttons[0]?.focus();
    });
}

function getCreditStatusMessage(totalBetOverrideUSD = totalBetDisplayOverrideUSD) {
    if (freeSpinsRemaining > 0) return "";
    const totalBetUSD = getActiveTotalBetUSD(totalBetOverrideUSD);
    if (balance <= 0) return "Out of credits. Add credits to continue.";
    if (balance < totalBetUSD) return "Insufficient credits for this bet. Lower bet/lines or add credits.";
    return "";
}

function isCreditStatusMessage(msg) {
    const text = (msg || "").trim();
    return (
        text === "Out of credits. Add credits to continue." ||
        text === "Insufficient credits for this bet. Lower bet/lines or add credits."
    );
}

function updateRealtimeCreditMessage() {
    if (isSpinning) return;
    const status = getCreditStatusMessage();
    if (status) {
        setMessage(status);
        return;
    }
    if (isCreditStatusMessage(messageEl?.textContent)) {
        clearMessage();
    }
}

function createCell(content = "", isWinning = false) {
    const cell = document.createElement("div");
    cell.className = "cell";
    if (isWinning) cell.classList.add("win");
    if (content) {
        const chip = document.createElement("span");
        chip.className = "money-chip";
        if (typeof content === "object") {
            chip.classList.add("jackpot-chip", `jackpot-${content.jackpot.toLowerCase()}`);
            const name = document.createElement("strong");
            name.textContent = content.jackpot;
            const value = document.createElement("span");
            value.textContent = content.value;
            chip.append(name, value);
        } else {
            chip.textContent = content;
        }
        chip.setAttribute("aria-hidden", "true");
        cell.appendChild(chip);
        const spokenContent = typeof content === "object"
            ? `${content.jackpot} jackpot, won ${content.value}`
            : `Won ${content}`;
        cell.setAttribute("aria-label", isWinning ? spokenContent : "Dollar chip");
    } else {
        cell.setAttribute("aria-label", "Blank reel");
    }
    return cell;
}

function renderGrid(grid, winningPositions = new Set()) {
    reelsEl.innerHTML = "";
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const key = `${row},${col}`;
            const isWin = winningPositions.has(key);
            reelsEl.appendChild(createCell(grid[row][col], isWin));
        }
    }
}

function renderBlankGrid() {
    renderGrid(createGrid(() => ""));
}

function renderWinningPayouts(lineWins, jackpotWins = []) {
    const payoutsByPosition = new Map();

    for (const win of lineWins) {
        const payoutColumn = win.count - 1;
        const payoutRow = PAYLINES[win.lineIndex - 1][payoutColumn];
        const key = `${payoutRow},${payoutColumn}`;
        const prior = payoutsByPosition.get(key) || 0;
        payoutsByPosition.set(key, roundUSD(prior + win.winUSD));
    }

    const payoutGrid = createGrid(() => "");
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const payout = payoutsByPosition.get(`${row},${col}`);
            payoutGrid[row][col] = payout ? fmtUSD(payout) : "";
        }
    }


    const preferredPositions = [[2, 2], [2, 1], [2, 3], [1, 2], [3, 2], [0, 2], [4, 2], [1, 1], [1, 3]];
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) preferredPositions.push([row, col]);
    }
    for (const jackpotWin of jackpotWins) {
        const [row, col] = preferredPositions.find(([r, c]) => !payoutGrid[r][c]);
        payoutGrid[row][col] = { jackpot: jackpotWin.name, value: fmtUSD(jackpotWin.amountUSD) };
        payoutsByPosition.set(`${row},${col}`, jackpotWin.amountUSD);
    }

    renderGrid(payoutGrid, new Set(payoutsByPosition.keys()));
}

function resolveJackpotWins() {
    const jackpotTiers = JACKPOT_TIERS.map((tier) => ({
        tier,
        rate: getTargetJackpotRate(tier)
    }));
    const jackpotRate = Math.max(...jackpotTiers.map(({ rate }) => rate));
    if (Math.random() >= jackpotRate) return [];
    return jackpotTiers
        .filter(({ rate }) => Math.random() < rate / jackpotRate)
        .map(({ tier }) => tier);
}

function updateJackpotDisplay() {
    for (const tier of JACKPOT_TIERS) {
        const valueEl = document.getElementById(tier.elementId);
        if (!valueEl) continue;
        valueEl.textContent = fmtUSD(tier.amountUSD);
    }
}

function spinOnce() {
    return createGrid(() => choiceWeighted(WEIGHTS));
}

function getLineMatchResult(path, grid) {
    const lineSymbols = path.map((row, col) => grid[row][col]);
    const baseSymbol = lineSymbols[0];

    let count = 0;
    for (const symbol of lineSymbols) {
        if (symbol === baseSymbol) {
            count += 1;
            continue;
        }
        break;
    }

    return { count, symbol: baseSymbol };
}

function resolveSpinGrid(forceWin) {
    for (let attempt = 0; attempt < MAX_OUTCOME_ATTEMPTS; attempt++) {
        const grid = spinOnce();
        const { totalWinUSD } = evaluateGrid(grid);
        const isWin = totalWinUSD > 0;
        if (isWin === forceWin) return grid;
    }

    return spinOnce();
}

// Returns { totalWinUSD, lineWins: [...], winningPositions: Set<string> }
function evaluateGrid(grid, wagerConfig = getWagerConfig()) {
    const { linesActive, betPerLine, denom } = wagerConfig;

    let totalWinUSD = 0;
    const lineWins = [];
    const winningPositions = new Set();

    for (let li = 0; li < linesActive; li++) {
        const path = PAYLINES[li];
        const { count, symbol } = getLineMatchResult(path, grid);

        if (count >= 3 && PAYTABLE[symbol]?.[count]) {
            const multiplier = PAYTABLE[symbol][count];
            const winUSD = roundUSD(multiplier * betPerLine * denom);
            totalWinUSD = roundUSD(totalWinUSD + winUSD);

            lineWins.push({ lineIndex: li + 1, count, symbol, winUSD });

            for (let c = 0; c < count; c++) {
                const r = path[c];
                winningPositions.add(`${r},${c}`);
            }
        }
    }

    return { totalWinUSD, lineWins, winningPositions };
}

function animateSpin(durationMs = 600) {
    const start = performance.now();
    function frame(t) {
        const grid = createGrid(() => Math.random() < 0.38 ? "$" : "");
        renderGrid(grid);
        if (t - start < durationMs) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}


// Lines Preview (now 5 rows)
function renderSingleLinesPreview(targetEl) {
    if (!targetEl) return;
    const active = parseInt(linesEl.value, 10);
    targetEl.innerHTML = "";

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const dot = document.createElement("div");
            dot.className = "dot2";
            for (let li = 0; li < active; li++) {
                const path = PAYLINES[li];
                if (path[col] === row) {
                    dot.classList.add("path");
                    break;
                }
            }
            targetEl.appendChild(dot);
        }
    }
}

function renderLinesPreview() {
    renderSingleLinesPreview(linesPreviewOverlayEl);
}

function getPerLineOddsAndReturn() {
    const totalWeight = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
    let lineWinProb = 0;
    let lineExpectedReturn = 0;

    for (const symbol of SYMBOLS) {
        const p = (WEIGHTS[symbol] || 0) / totalWeight;
        const p3 = p ** 3;
        const p4 = p ** 4;
        const p5 = p ** 5;

        lineWinProb += p3;
        lineExpectedReturn +=
            (PAYTABLE[symbol]?.[3] || 0) * p3 * (1 - p) +
            (PAYTABLE[symbol]?.[4] || 0) * p4 * (1 - p) +
            (PAYTABLE[symbol]?.[5] || 0) * p5;
    }

    return {
        lineWinProb,
        lineLossProb: Math.max(0, 1 - lineWinProb),
        returnToPlayer: lineExpectedReturn,
        casinoAdvantage: Math.max(0, 1 - lineExpectedReturn),
    };
}

function updateGameOddsDisplay() {
    if (!casinoAdvantageTextEl || !winLossOddsTextEl) return;

    const { lineWinProb, lineLossProb, returnToPlayer, casinoAdvantage } = getPerLineOddsAndReturn();
    const linesActive = Math.min(10, Math.max(1, parseInt(linesEl.value, 10) || 1));
    const targetSpinWinRate = getTargetSpinWinRate();
    const jackpotOddsText = JACKPOT_TIERS
        .map((tier) => `${tier.name} ${fmtPercent(getTargetJackpotRate(tier))}`)
        .join(", ");

    casinoAdvantageTextEl.textContent =
        `Configured spin resolution: win ${fmtPercent(targetSpinWinRate)}, loss ${fmtPercent(1 - targetSpinWinRate)}. ` +
        `Independent jackpot chances: ${jackpotOddsText}. Multiple jackpots and a regular win can occur together.`;

    winLossOddsTextEl.textContent =
        `Current ${linesActive}-line paytable model: per-line win ${fmtPercent(lineWinProb)} (${fmtOneIn(lineWinProb)}), ` +
        `per-line loss ${fmtPercent(lineLossProb)}, model RTP ${fmtPercent(returnToPlayer)} / house edge ${fmtPercent(casinoAdvantage)}.`;
}


// Info Overlay
function applyOverlayPage(index) {
    const max = Math.max(overlayPageEls.length - 1, 0);
    overlayPageIndex = Math.min(Math.max(index, 0), max);

    overlayPageEls.forEach((el, i) => {
        el.hidden = i !== overlayPageIndex;
    });

    if (overlayPageLabelEl) {
        overlayPageLabelEl.textContent = `Page ${overlayPageIndex + 1} of ${Math.max(overlayPageEls.length, 1)}`;
    }
}

function stepOverlayPage(delta) {
    const total = overlayPageEls.length;
    if (total <= 0) return;
    const wrappedIndex = ((overlayPageIndex + delta) % total + total) % total;
    applyOverlayPage(wrappedIndex);
}

function togglePreviewOverlay(force) {
    if (!previewOverlayEl) return;
    const wantOpen = (typeof force === "boolean") ? force : previewOverlayEl.hidden;
    previewOverlayEl.hidden = !wantOpen;
    payInfoBtn?.setAttribute("aria-expanded", String(wantOpen));
    syncOverlayOpenState();
}

function syncOverlayOpenState() {
    const anyOpen =
        (previewOverlayEl && !previewOverlayEl.hidden) ||
        (lastChanceOverlayEl && !lastChanceOverlayEl.hidden) ||
        (settingsOverlayEl && !settingsOverlayEl.hidden);
    document.body.classList.toggle("overlay-open", Boolean(anyOpen));
    document.documentElement.classList.toggle("overlay-open", Boolean(anyOpen));
}

function closeLastChanceOverlay({ restoreFocus = false } = {}) {
    pendingLastChanceSpinUSD = 0;
    if (lastChanceOverlayEl) lastChanceOverlayEl.hidden = true;
    syncOverlayOpenState();
    if (restoreFocus) spinBtn?.focus();
}

function updateLastChanceOverlayContent() {
    if (!lastChanceSummaryEl || !lastChanceQuestionEl) return;
    const totalBetUSD = getActiveTotalBetUSD();
    const remainderUSD = clampBalanceUSD(balance);
    const requiredCreditUSD = roundUSD(Math.max(totalBetUSD - remainderUSD, 0));
    lastChanceSummaryEl.textContent =
        `You have ${fmtUSD(remainderUSD)} left, and your current bet needs ${fmtUSD(totalBetUSD)}.`;
    lastChanceQuestionEl.textContent =
        `Add ${fmtUSD(requiredCreditUSD)} so you can make one last spin at your current wager across ${parseInt(linesEl.value, 10)} lines?`;
    if (lastChanceConfirmBtn) {
        lastChanceConfirmBtn.textContent = `Add ${fmtUSD(requiredCreditUSD)} and Spin`;
    }
}

function openLastChanceOverlay() {
    if (!shouldOfferLastChanceSpin() || !lastChanceOverlayEl || autoSpinRunning || isSpinning) return false;
    pendingLastChanceSpinUSD = getActiveTotalBetUSD();
    updateLastChanceOverlayContent();
    lastChanceOverlayEl.hidden = false;
    syncOverlayOpenState();
    lastChanceConfirmBtn?.focus();
    return true;
}

async function tryLastChanceSpin() {
    if (!pendingLastChanceSpinUSD) {
        closeLastChanceOverlay();
        updateRealtimeCreditMessage();
        return;
    }
    const totalBetUSD = roundUSD(pendingLastChanceSpinUSD);
    const requiredCreditUSD = roundUSD(Math.max(totalBetUSD - balance, 0));
    if (requiredCreditUSD > 0) {
        balance = clampBalanceUSD(balance + requiredCreditUSD);
        creditsInsertedUSD = roundUSD(creditsInsertedUSD + requiredCreditUSD);
        updateCreditsInsertedDisplay();
    }
    closeLastChanceOverlay();
    await doSpin({ totalBetOverrideUSD: totalBetUSD, offerLastChance: false });
}

async function handleSpinAction() {
    const totalBetOverrideUSD = Number.isFinite(totalBetDisplayOverrideUSD)
        ? roundUSD(totalBetDisplayOverrideUSD)
        : null;

    if (autoSpinRunning) {
        cancelAutoSpin();
        return;
    }

    if (shouldOfferLastChanceSpin(totalBetOverrideUSD)) {
        openLastChanceOverlay();
        return;
    }

    await doSpin({ offerLastChance: true, totalBetOverrideUSD });
}

function syncLastChanceOverlayState() {
    if (shouldOfferLastChanceSpin()) {
        if (lastChanceOverlayEl && !lastChanceOverlayEl.hidden) {
            pendingLastChanceSpinUSD = getTotalBet();
            updateLastChanceOverlayContent();
        }
        return;
    }
    if (lastChanceOverlayEl && !lastChanceOverlayEl.hidden) {
        closeLastChanceOverlay();
    }
}

function bindRapidPress(button, action, options = {}) {
    if (!button || typeof action !== "function") return;

    const { immediate = false, repeatDelayMs = 220, repeatIntervalMs = 85 } = options;
    let holdTimer = 0;
    let repeatTimer = 0;
    let didRepeat = false;
    let handledOnPointerDown = false;

    const clearRepeat = () => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = 0;
        }
        if (repeatTimer) {
            clearInterval(repeatTimer);
            repeatTimer = 0;
        }
    };

    button.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        didRepeat = false;
        handledOnPointerDown = false;
        clearRepeat();
        if (immediate) {
            action();
            handledOnPointerDown = true;
        }
        holdTimer = setTimeout(() => {
            didRepeat = true;
            action();
            repeatTimer = setInterval(action, repeatIntervalMs);
        }, repeatDelayMs);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((evt) => {
        button.addEventListener(evt, clearRepeat);
    });

    button.addEventListener("click", () => {
        if (didRepeat) {
            didRepeat = false;
            return;
        }
        if (handledOnPointerDown) {
            handledOnPointerDown = false;
            return;
        }
        action();
    });
}

function handleEsc(e) {
    if (e.key !== "Escape") return;

    if (settingsOverlayEl && !settingsOverlayEl.hidden) {
        closeSettingsOverlay();
        settingsButtonEl?.focus();
        return;
    }

    if (lastChanceOverlayEl && !lastChanceOverlayEl.hidden) {
        closeLastChanceOverlay({ restoreFocus: true });
        return;
    }

    if (previewOverlayEl && !previewOverlayEl.hidden) {
        togglePreviewOverlay(false);
        payInfoBtn?.focus();
    }
}

function getSettingsDefinitions() {
    return [
        { key: "adjustMoney", title: "Adjust Money", element: creditStepEl?.closest(".credit-controls") },
        { key: "denomination", title: "Denomination", element: denomEl?.closest(".select") },
        { key: "lines", title: "Lines", element: linesEl?.closest(".select") },
        { key: "bet", title: "Bet Per Line", element: betEl?.closest(".select") },
        { key: "maxBetCredits", title: "Max Bet Credits", element: maxBetUsesAvailableCreditsEl?.closest(".checkbox-setting") },
        { key: "winDelay", title: "Winning Highlight Delay", element: skipWinAnimationDelayEl?.closest(".checkbox-setting") },
        { key: "sessionStats", title: "Session Stats Display", element: sessionStatDisplayEl?.closest(".select") },
        { key: "creditsInserted", title: "Credits Inserted", element: creditsInsertedEl?.closest(".stat") },
        { key: "winOdds", title: "Regular Win Odds", element: winOddsEl?.closest(".select") },
        ...JACKPOT_TIERS.map((tier) => ({
            key: `${tier.name.toLowerCase()}JackpotOdds`,
            title: `${tier.name} Jackpot Odds`,
            element: document.getElementById(tier.oddsElementId)?.closest(".select"),
        })),
        { key: "freeSpinsOdds", title: "Free Spins Odds", element: freeSpinsOddsEl?.closest(".select") },
        { key: "freeSpinsAward", title: "Free Spins Award", element: freeSpinsAwardEl?.closest(".select") },
        { key: "bonusGameOdds", title: "Bonus Plays Odds", element: bonusGameOddsEl?.closest(".select") },
        ...bonusPrizeSelectEls.map((select, index) => ({ key: `bonusPrize${index + 1}`, title: `Bonus Plays Prize ${index + 1}`, element: select?.closest(".select") })),
    ].filter((setting) => setting.element);
}

function saveSettingsPins() {
    try {
        localStorage.setItem(SETTINGS_PIN_STORAGE_KEY, JSON.stringify(settingsPins));
    } catch {
        // Pinning still works for the current page when storage is unavailable.
    }
}

function placeSettingsOnHome() {
    for (const setting of settingsItems) {
        if (settingsPins[setting.key]) {
            setting.marker.parentNode.insertBefore(setting.element, setting.marker.nextSibling);
        } else {
            settingsOverlayEl.querySelector(".settings-stash").appendChild(setting.element);
        }
    }
}

function showSettingsPage(index) {
    if (!settingsItems.length) return;
    const stash = settingsOverlayEl.querySelector(".settings-stash");
    const stage = settingsOverlayEl.querySelector(".settings-stage");
    const current = stage.firstElementChild;
    if (current) stash.appendChild(current);
    settingsPageIndex = (index + settingsItems.length) % settingsItems.length;
    const setting = settingsItems[settingsPageIndex];
    stage.appendChild(setting.element);
    settingsOverlayEl.querySelector(".settings-page-title").textContent = setting.title;
    settingsOverlayEl.querySelector(".settings-page-count").textContent =
        `Page ${settingsPageIndex + 1} of ${settingsItems.length}`;
    settingsOverlayEl.querySelector(".settings-pin-toggle").checked = Boolean(settingsPins[setting.key]);
}

function openSettingsOverlay() {
    if (!settingsOverlayEl) return;
    settingsOverlayEl.hidden = false;
    settingsButtonEl?.setAttribute("aria-expanded", "true");
    showSettingsPage(0);
    syncOverlayOpenState();
}

function closeSettingsOverlay() {
    if (!settingsOverlayEl) return;
    const stageSetting = settingsOverlayEl.querySelector(".settings-stage").firstElementChild;
    if (stageSetting) settingsOverlayEl.querySelector(".settings-stash").appendChild(stageSetting);
    placeSettingsOnHome();
    settingsOverlayEl.hidden = true;
    settingsButtonEl?.setAttribute("aria-expanded", "false");
    syncOverlayOpenState();
}

function setupSettingsOverlay() {
    try {
        settingsPins = JSON.parse(localStorage.getItem(SETTINGS_PIN_STORAGE_KEY) || "{}");
    } catch {
        settingsPins = {};
    }
    if (!Object.prototype.hasOwnProperty.call(settingsPins, "denomination")) {
        settingsPins.denomination = true;
    }
    settingsPins.adjustMoney = true;
    if (!Object.prototype.hasOwnProperty.call(settingsPins, "creditsInserted")) settingsPins.creditsInserted = true;
    saveSettingsPins();

    settingsOverlayEl = document.createElement("div");
    settingsOverlayEl.className = "overlay settings-overlay";
    settingsOverlayEl.hidden = true;
    settingsOverlayEl.innerHTML = `
        <div class="overlay-panel settings-panel" role="dialog" aria-modal="true" aria-labelledby="settingsOverlayTitle">
            <div class="overlay-head">
                <h3 id="settingsOverlayTitle">Game Settings</h3>
                <button type="button" class="overlay-close settings-close">Close</button>
            </div>
            <div class="settings-toolbar">
                <button type="button" class="settings-prev" aria-label="Previous setting">← Previous</button>
                <span class="settings-page-count"></span>
                <button type="button" class="settings-next" aria-label="Next setting">Next →</button>
            </div>
            <h4 class="settings-page-title"></h4>
            <div class="settings-stage"></div>
            <label class="settings-pin-row">
                <input type="checkbox" class="settings-pin-toggle" />
                <span>Show this setting on the home screen</span>
            </label>
            <div class="settings-stash" hidden></div>
        </div>`;
    document.body.appendChild(settingsOverlayEl);

    settingsItems = getSettingsDefinitions().map((setting) => {
        const marker = document.createComment(`settings-home-${setting.key}`);
        setting.element.parentNode.insertBefore(marker, setting.element);
        return { ...setting, marker };
    });

    settingsOverlayEl.querySelector(".settings-close").addEventListener("click", closeSettingsOverlay);
    settingsOverlayEl.querySelector(".settings-prev").addEventListener("click", () => showSettingsPage(settingsPageIndex - 1));
    settingsOverlayEl.querySelector(".settings-next").addEventListener("click", () => showSettingsPage(settingsPageIndex + 1));
    settingsOverlayEl.querySelector(".settings-pin-toggle").addEventListener("change", (event) => {
        settingsPins[settingsItems[settingsPageIndex].key] = event.target.checked;
        saveSettingsPins();
    });
    settingsButtonEl?.addEventListener("click", openSettingsOverlay);
    placeSettingsOnHome();
}

// Credit step controls (▲ / ▼)

// -----------------------------
// Session Winnings UI (match Available Credits, DELETE duplicates hard + orphans)
// -----------------------------

const BOX_SELECTOR = ".credits-box, .available-box, .stat-box, .box, .tile, .panel, .balance-box, .stat";

/* Locate the Available Credits box containing the balance value. */
function findAvailableCreditsBox() {
    if (!balanceEl) return null;
    let node = balanceEl;
    while (node && node !== document.body) {
        if (node.matches?.(BOX_SELECTOR)) {
            const lbl = node.querySelector(".label, [data-label], label") || node.firstElementChild;
            const txt = (lbl?.textContent || "").trim().toLowerCase();
            if (txt.includes("available")) return node;
        }
        node = node.parentElement;
    }
    return balanceEl.closest(BOX_SELECTOR) || balanceEl.parentElement || null;
}

/* Match the $ value typography to the Available Credits value node (no layout changes). */
function matchValueTypography(srcValueEl, destValueEl) {
    if (!srcValueEl || !destValueEl) return;
    const cs = getComputedStyle(srcValueEl);
    destValueEl.style.fontFamily = cs.fontFamily;
    destValueEl.style.fontWeight = cs.fontWeight;
    destValueEl.style.fontStyle = cs.fontStyle;
    destValueEl.style.letterSpacing = cs.letterSpacing;
    destValueEl.style.fontSize = cs.fontSize;
    destValueEl.style.lineHeight = cs.lineHeight;
    destValueEl.style.color = cs.color;
    destValueEl.style.textTransform = cs.textTransform;
    destValueEl.style.textShadow = cs.textShadow;
}

function createSessionStatBox({ availBox, boxId, valueId, labelText }) {
    const statBox = document.createElement("div");
    statBox.className = availBox.className || "stat";
    statBox.id = boxId;

    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = `${labelText}:`;

    const value = document.createElement("b");
    value.id = valueId;
    value.textContent = fmtUSD(0);
    value.setAttribute("aria-label", labelText);

    matchValueTypography(balanceEl, value);

    statBox.append(label, document.createTextNode(" "), value);
    return statBox;
}

/* Ensure session stat boxes exist, matching Available Credits. */
function ensureSessionStatsUI() {
    // HARD DELETE existing session stat containers/values
    SESSION_STAT_CLEANUP_SELECTORS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((n) => n.remove());
    });

    const availBox = findAvailableCreditsBox();
    if (!availBox) return;

    const winningsBox = createSessionStatBox({
        availBox,
        boxId: "sessionWinningsBox",
        valueId: "sessionWinnings",
        labelText: "Session Winnings",
    });
    availBox.insertAdjacentElement("afterend", winningsBox);

    const lossesBox = createSessionStatBox({
        availBox,
        boxId: "sessionLossesBox",
        valueId: "sessionLosses",
        labelText: "Session Losses",
    });
    winningsBox.insertAdjacentElement("afterend", lossesBox);

    const netWinningsBox = createSessionStatBox({
        availBox,
        boxId: "netSessionWinningsBox",
        valueId: "netSessionWinnings",
        labelText: "Net Session Winnings",
    });
    lossesBox.insertAdjacentElement("afterend", netWinningsBox);

    const netLossesBox = createSessionStatBox({
        availBox,
        boxId: "netSessionLossesBox",
        valueId: "netSessionLosses",
        labelText: "Net Session Losses",
    });
    netWinningsBox.insertAdjacentElement("afterend", netLossesBox);

    const actualWinningsBox = createSessionStatBox({
        availBox,
        boxId: "actualSessionWinningsBox",
        valueId: "actualSessionWinnings",
        labelText: "Actual Net Session Winnings",
    });
    netLossesBox.insertAdjacentElement("afterend", actualWinningsBox);

    const actualLossesBox = createSessionStatBox({
        availBox,
        boxId: "actualSessionLossesBox",
        valueId: "actualSessionLosses",
        labelText: "Actual Net Session Losses",
    });
    actualWinningsBox.insertAdjacentElement("afterend", actualLossesBox);
}

function updateSessionDisplay(valueId, amountUSD) {
    const el = document.getElementById(valueId);
    if (el) el.textContent = fmtUSD(amountUSD);
}

function updateSessionWinningsDisplay() {
    updateSessionDisplay("sessionWinnings", sessionWinningsUSD);
}

function updateSessionLossesDisplay() {
    updateSessionDisplay("sessionLosses", sessionLossesUSD);
}

function updateNetSessionWinningsDisplay() {
    updateSessionDisplay("netSessionWinnings", netSessionWinningsUSD);
}

function updateNetSessionLossesDisplay() {
    updateSessionDisplay("netSessionLosses", netSessionLossesUSD);
}

function updateActualSessionWinningsDisplay() {
    updateSessionDisplay("actualSessionWinnings", Math.max(actualSessionNetUSD, 0));
}

function updateActualSessionLossesDisplay() {
    updateSessionDisplay("actualSessionLosses", Math.max(-actualSessionNetUSD, 0));
}

function updateSessionStatsVisibility() {
    const mode = sessionStatDisplayEl?.value || "actualNetBoth";
    const winningsBox = document.getElementById("sessionWinningsBox");
    const lossesBox = document.getElementById("sessionLossesBox");
    const netWinningsBox = document.getElementById("netSessionWinningsBox");
    const netLossesBox = document.getElementById("netSessionLossesBox");
    const actualWinningsBox = document.getElementById("actualSessionWinningsBox");
    const actualLossesBox = document.getElementById("actualSessionLossesBox");
    if (
        !winningsBox ||
        !lossesBox ||
        !netWinningsBox ||
        !netLossesBox ||
        !actualWinningsBox ||
        !actualLossesBox
    ) return;

    const selected = SESSION_VISIBILITY_BY_MODE[mode] || SESSION_VISIBILITY_BY_MODE.actualNetBoth;

    winningsBox.hidden = !selected.winnings;
    lossesBox.hidden = !selected.losses;
    netWinningsBox.hidden = !selected.netWinnings;
    netLossesBox.hidden = !selected.netLosses;
    actualWinningsBox.hidden = !selected.actualWinnings;
    actualLossesBox.hidden = !selected.actualLosses;
}

function addSessionWinnings(amountUSD) {
    if (!Number.isFinite(amountUSD) || amountUSD <= 0) return;
    sessionWinningsUSD += amountUSD;
    updateSessionWinningsDisplay();
}

function addSessionLosses(amountUSD) {
    if (!Number.isFinite(amountUSD) || amountUSD <= 0) return;
    sessionLossesUSD += amountUSD;
    updateSessionLossesDisplay();
}

function addNetSessionWinnings(amountUSD) {
    if (!Number.isFinite(amountUSD) || amountUSD === 0) return;
    netSessionWinningsUSD = Math.max(0, netSessionWinningsUSD + amountUSD);
    updateNetSessionWinningsDisplay();
}

function addNetSessionLosses(amountUSD) {
    if (!Number.isFinite(amountUSD) || amountUSD === 0) return;
    netSessionLossesUSD = Math.max(0, netSessionLossesUSD + amountUSD);
    updateNetSessionLossesDisplay();
}

function subtractNetSessionWinnings(amountUSD) {
    if (!Number.isFinite(amountUSD) || amountUSD <= 0) return;
    addNetSessionWinnings(-amountUSD);
}

function subtractNetSessionLosses(amountUSD) {
    if (!Number.isFinite(amountUSD) || amountUSD <= 0) return;
    addNetSessionLosses(-amountUSD);
}

function adjustActualSessionNet(amountUSD) {
    if (!Number.isFinite(amountUSD) || amountUSD === 0) return;
    actualSessionNetUSD += amountUSD;
    updateActualSessionWinningsDisplay();
    updateActualSessionLossesDisplay();
}

function updateAllSessionDisplays() {
    updateSessionWinningsDisplay();
    updateSessionLossesDisplay();
    updateNetSessionWinningsDisplay();
    updateNetSessionLossesDisplay();
    updateActualSessionWinningsDisplay();
    updateActualSessionLossesDisplay();
    updateCreditsInsertedDisplay();
}

function updateCreditsInsertedDisplay() {
    if (creditsInsertedEl) creditsInsertedEl.textContent = fmtUSD(creditsInsertedUSD);
}

function resetSessionState() {
    if (isSpinning || autoSpinRunning) return;

    balance = INITIAL_CREDITS_USD;
    totalBetDisplayOverrideUSD = null;
    pendingLastChanceSpinUSD = 0;
    sessionWinningsUSD = 0;
    sessionLossesUSD = 0;
    netSessionWinningsUSD = 0;
    netSessionLossesUSD = 0;
    actualSessionNetUSD = 0;
    creditsInsertedUSD = INITIAL_CREDITS_USD;
    spinElapsedAccumulatedMs = 0;
    autoSpinStartedAt = 0;
    window.clearInterval(autoSpinElapsedTimer);
    autoSpinElapsedTimer = 0;
    updateAutoSpinElapsed();
    freeSpinsRemaining = 0;
    freeSpinWagerConfig = null;
    updateFeatureStatus();
    resetCustomJackpotOdds();
    updateGameOddsDisplay();

    if (lastChanceOverlayEl && !lastChanceOverlayEl.hidden) {
        closeLastChanceOverlay();
    }

    updateTotals();
    updateAllSessionDisplays();
    updateRealtimeCreditMessage();
    updateAutoSpinControls();
    updateAutoSpinHint();
    syncLastChanceOverlayState();
    setMessage("Session reset.");
}

function adjustBalanceByCredits(creditDelta) {
    const step = normalizeCreditStepValue(creditStepEl.value);
    creditStepEl.value = formatCreditStepValue(step);
    const adjustmentUSD = roundUSD(step * creditDelta);
    const previousBalanceUSD = balance;
    balance = clampBalanceUSD(balance + adjustmentUSD);
    const appliedAdjustmentUSD = roundUSD(balance - previousBalanceUSD);
    creditsInsertedUSD = clampBalanceUSD(creditsInsertedUSD + appliedAdjustmentUSD);
    updateCreditsInsertedDisplay();
    updateTotals();
    updateRealtimeCreditMessage();
    syncLastChanceOverlayState();
}

function updateAutoSpinControls() {
    if (!spinBtn) return;
    spinBtn.textContent = autoSpinRunning ? "Cancel" : "Spin";
}

function updateAutoSpinElapsed() {
    if (!autoSpinElapsedEl) return;
    const activeElapsedMs = autoSpinStartedAt ? Date.now() - autoSpinStartedAt : 0;
    const totalSeconds = Math.floor((spinElapsedAccumulatedMs + activeElapsedMs) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    autoSpinElapsedEl.textContent = `Time elapsed: ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startSpinElapsedTimer() {
    if (autoSpinStartedAt) return;
    autoSpinStartedAt = Date.now();
    window.clearInterval(autoSpinElapsedTimer);
    updateAutoSpinElapsed();
    autoSpinElapsedTimer = window.setInterval(updateAutoSpinElapsed, 250);
}

function pauseSpinElapsedTimer() {
    if (autoSpinStartedAt) {
        spinElapsedAccumulatedMs += Date.now() - autoSpinStartedAt;
        autoSpinStartedAt = 0;
    }
    window.clearInterval(autoSpinElapsedTimer);
    autoSpinElapsedTimer = 0;
    updateAutoSpinElapsed();
}

function updateAutoSpinHint() {
    if (!autoSpinHintEl) return;
    if (autoSpinRunning) {
        const totalBetUSD = getTotalBet();
        if (balance < totalBetUSD) {
            autoSpinHintEl.textContent = `Auto spin paused. Add credits or tap Cancel to stop.`;
            return;
        }
        autoSpinHintEl.textContent = `Auto spin running (${autoSpinRemaining} spins). Tap Cancel to stop.`;
        return;
    }
    autoSpinHintEl.textContent = "Tap Spin or Spacebar once to spin. Hold either one for auto spin. Tap again to stop.";
}

function cancelAutoSpin() {
    if (!autoSpinRunning) return;
    autoSpinStopRequested = true;
    setMessage("Stopping auto spins...");
}

async function runAutoSpin() {
    if (autoSpinRunning || isSpinning) return;

    autoSpinRunning = true;
    autoSpinStopRequested = false;
    autoSpinRemaining = 0;
    updateAutoSpinControls();
    updateAutoSpinHint();
    updateTotals();

    let stoppedForInsufficientCredits = false;
    while (!autoSpinStopRequested) {
        const result = await doSpin({ silentNoWin: true });
        if (!result?.completed) {
            if (result?.reason === "insufficient_credits") {
                updateRealtimeCreditMessage();
                stoppedForInsufficientCredits = true;
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
            continue;
        }
        if (autoSpinStopRequested) break;
        autoSpinRemaining += 1;
        updateAutoSpinHint();

        if (result.totalWinUSD > 0 && !autoSpinStopRequested && !shouldSkipWinAnimationDelay()) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }

    const wasStopped = autoSpinStopRequested;
    autoSpinRunning = false;
    autoSpinStopRequested = false;
    autoSpinRemaining = 0;

    if (wasStopped) {
        setMessage("Auto spin canceled.");
    } else {
        clearMessage();
    }

    updateAutoSpinControls();
    updateAutoSpinHint();
    updateTotals();
    if (stoppedForInsufficientCredits) openLastChanceOverlay();
}

// Main Spin Flow
async function doSpin(options = {}) {
    if (isSpinning) {
        return { completed: false, reason: "busy", totalWinUSD: 0 };
    }
    const isFreeSpin = freeSpinsRemaining > 0;
    const wagerConfig = isFreeSpin && freeSpinWagerConfig
        ? { ...freeSpinWagerConfig }
        : getWagerConfig(options.totalBetOverrideUSD);
    const { totalBetUSD } = wagerConfig;
    if (!isFreeSpin && balance < totalBetUSD) {
        totalBetDisplayOverrideUSD = null;
        updateRealtimeCreditMessage();
        return { completed: false, reason: "insufficient_credits", totalWinUSD: 0 };
    }

    startSpinElapsedTimer();
    isSpinning = true;
    totalBetDisplayOverrideUSD = Number.isFinite(options.totalBetOverrideUSD) ? totalBetUSD : null;
    updateTotals();
    clearMessage();

    // Deduct paid bets up front. Free spins retain the triggering wager.
    if (isFreeSpin) {
        freeSpinsRemaining -= 1;
        updateFeatureStatus();
    } else {
        balance = clampBalanceUSD(balance - totalBetUSD);
    }
    updateTotals();

    const instantSpin = Boolean(options.instant);
    if (!instantSpin) {
        animateSpin(650);
        await new Promise(r => setTimeout(r, 700));
    }

    // Final outcome
    const shouldWin = Math.random() < getTargetSpinWinRate();
    const grid = resolveSpinGrid(shouldWin);
    const { totalWinUSD: regularWinUSD, lineWins } = evaluateGrid(grid, wagerConfig);
    const jackpotWins = resolveJackpotWins();
    const jackpotWinUSD = jackpotWins.reduce((sum, jackpot) => sum + jackpot.amountUSD, 0);
    const bonusTriggered = !isFreeSpin && Math.random() < getFeatureRate(bonusGameOddsEl, 0.01);
    const bonusWinUSD = bonusTriggered ? await playBonusGame(totalBetUSD) : 0;
    const freeSpinsTriggered = !isFreeSpin && Math.random() < getFeatureRate(freeSpinsOddsEl, 0.03);
    const freeSpinsAwarded = getFreeSpinsAward();
    if (freeSpinsTriggered) {
        freeSpinsRemaining += freeSpinsAwarded;
        freeSpinWagerConfig = { ...wagerConfig };
        updateFeatureStatus();
    }
    const totalWinUSD = roundUSD(regularWinUSD + jackpotWinUSD + bonusWinUSD);
    const lossComponentUSD = isFreeSpin ? 0 : Math.max(totalBetUSD - totalWinUSD, 0);
    if (totalWinUSD > 0) {
        renderWinningPayouts(lineWins, jackpotWins);
    } else {
        renderBlankGrid();
    }
    addSessionLosses(lossComponentUSD);
    addNetSessionLosses(lossComponentUSD);
    subtractNetSessionWinnings(lossComponentUSD);
    if (!isFreeSpin) adjustActualSessionNet(-totalBetUSD);

    // Payout
    if (totalWinUSD > 0) {
        balance = clampBalanceUSD(balance + totalWinUSD);
        addSessionWinnings(totalWinUSD);
        addNetSessionWinnings(totalWinUSD);
        subtractNetSessionLosses(totalWinUSD);
        adjustActualSessionNet(totalWinUSD);

        const linesText = lineWins
            .map(w => `Line ${w.lineIndex}: ${fmtUSD(w.winUSD)}`)
            .concat(jackpotWins.map((jackpot) => `${jackpot.name.toUpperCase()} JACKPOT: ${fmtUSD(jackpot.amountUSD)}`))
            .concat(bonusWinUSD ? [`BONUS PLAYS: ${fmtUSD(bonusWinUSD)}`] : [])
            .concat(freeSpinsTriggered ? [`${freeSpinsAwarded} FREE SPINS AWARDED`] : [])
            .join(" • ");
        setMessage(`WIN ${fmtUSD(totalWinUSD)} — ${linesText}`);
    } else {
        let creditHint = "";
        const status = getCreditStatusMessage(options.totalBetOverrideUSD);
        if (status) creditHint = ` ${status}`;
        if (!options.silentNoWin) {
            const featureText = freeSpinsTriggered ? ` ${freeSpinsAwarded} FREE SPINS AWARDED!` : "";
            setMessage(`${isFreeSpin ? "Free spin" : "No win — try again!"}${featureText}${creditHint}`);
        }
    }

    isSpinning = false;
    pauseSpinElapsedTimer();
    totalBetDisplayOverrideUSD = null;
    if (freeSpinsRemaining === 0) freeSpinWagerConfig = null;
    updateTotals();
    syncLastChanceOverlayState();

    updateAllSessionDisplays();
    if (options.offerLastChance && !Number.isFinite(options.totalBetOverrideUSD) && shouldOfferLastChanceSpin()) {
        openLastChanceOverlay();
    }
    return { completed: true, totalWinUSD };
}

async function doMaxBet() {
    if (maxBetUsesAvailableCreditsEl?.checked) {
        const availableCreditsBetUSD = getAvailableCreditsBetUSD();
        if (!availableCreditsBetUSD) {
            totalBetDisplayOverrideUSD = null;
            updateTotals();
            updateRealtimeCreditMessage();
            return;
        }
        totalBetDisplayOverrideUSD = availableCreditsBetUSD;
        updateTotals();
        if (lastChanceOverlayEl && !lastChanceOverlayEl.hidden) {
            closeLastChanceOverlay();
        }
        updateRealtimeCreditMessage();
        return;
    }

    totalBetDisplayOverrideUSD = null;
    const highestBetValue = getHighestBetOptionValue();
    if (highestBetValue != null) betEl.value = highestBetValue;
    linesEl.value = "10";
    onConfigChange();
}

function bindSpinHold() {
    if (!spinBtn) return;

    const clearHoldTimer = () => {
        if (!spinHoldTimer) return;
        clearTimeout(spinHoldTimer);
        spinHoldTimer = 0;
    };

    spinBtn.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || isSpinning || autoSpinRunning || shouldOfferLastChanceSpin()) return;
        suppressSpinClick = false;
        clearHoldTimer();
        spinHoldTimer = setTimeout(() => {
            suppressSpinClick = true;
            runAutoSpin();
        }, 420);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((evt) => {
        spinBtn.addEventListener(evt, clearHoldTimer);
    });

    spinBtn.addEventListener("click", () => {
        clearHoldTimer();
        if (suppressSpinClick) {
            suppressSpinClick = false;
            return;
        }
        handleSpinAction();
    });
}

// Events
function onConfigChange() {
    totalBetDisplayOverrideUSD = null;
    updateTotals();
    renderLinesPreview();
    updateGameOddsDisplay();
    updateJackpotDisplay();
    updateAutoSpinControls();
    updateCreditStepEffect();
    updateRealtimeCreditMessage();
    syncLastChanceOverlayState();
}

maxBtn.addEventListener("click", doMaxBet);
denomEl.addEventListener("change", onConfigChange);
linesEl.addEventListener("change", onConfigChange);
betEl.addEventListener("change", onConfigChange);
winOddsEl?.addEventListener("change", onConfigChange);
JACKPOT_TIERS.forEach((tier) => {
    document.getElementById(tier.oddsElementId)?.addEventListener("change", () => {
        syncCustomJackpotOdds(tier);
        onConfigChange();
    });
    document.getElementById(tier.winInputId)?.addEventListener("change", () => syncCustomJackpotOdds(tier, "win"));
    document.getElementById(tier.lossInputId)?.addEventListener("change", () => syncCustomJackpotOdds(tier, "loss"));
});
maxBetUsesAvailableCreditsEl?.addEventListener("change", onConfigChange);
skipWinAnimationDelayEl?.addEventListener("change", updateAutoSpinHint);
sessionStatDisplayEl?.addEventListener("change", updateSessionStatsVisibility);
resetSessionBtn?.addEventListener("click", resetSessionState);

bindRapidPress(creditUpBtn, () => adjustBalanceByCredits(1), { immediate: true });
bindRapidPress(creditDownBtn, () => adjustBalanceByCredits(-1), { immediate: true });

syncCreditStepFieldMode();
creditStepEl.dataset.lastValidValue = formatCreditStepValue(creditStepEl.value);
updateCreditStepEffect();

creditStepEl.addEventListener("beforeinput", (e) => {
    if (e.inputType.startsWith("delete")) return;
    if (e.inputType === "insertFromPaste" && !isPotentialCreditStepValue(getNextInputValue(creditStepEl, e.data ?? ""))) {
        e.preventDefault();
        return;
    }
    if (e.data == null) return;
    if (!isPotentialCreditStepValue(getNextInputValue(creditStepEl, e.data))) {
        e.preventDefault();
    }
});

creditStepEl.addEventListener("input", () => {
    const cleanedValue = cleanupCreditStepWhileTyping(creditStepEl.value);
    if (cleanedValue !== creditStepEl.value) {
        creditStepEl.value = cleanedValue;
    }
    if (isPotentialCreditStepValue(creditStepEl.value)) return;
    syncCreditStepInput(creditStepEl.value);
});

creditStepEl.addEventListener("blur", () => {
    syncCreditStepInput(creditStepEl.value);
});

creditStepEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
        e.preventDefault();
        creditUpBtn.click();
        return;
    }
    if (e.key === "ArrowDown") {
        e.preventDefault();
        creditDownBtn.click();
        return;
    }
    if (e.key === "Enter") {
        e.preventDefault();
        creditStepEl.value = formatCreditStepValue(creditStepEl.value);
        creditUpBtn.click();
    }
});

payInfoBtn?.addEventListener("click", () => {
    applyOverlayPage(0);
    togglePreviewOverlay(true);
});
document.addEventListener("keydown", handleEsc);
previewOverlayCloseBtn?.addEventListener("click", () => togglePreviewOverlay(false));
lastChanceCloseBtn?.addEventListener("click", () => closeLastChanceOverlay({ restoreFocus: true }));
lastChanceCancelBtn?.addEventListener("click", () => closeLastChanceOverlay({ restoreFocus: true }));
lastChanceConfirmBtn?.addEventListener("click", () => {
    tryLastChanceSpin();
});
bindRapidPress(overlayPrevBtn, () => stepOverlayPage(-1));
bindRapidPress(overlayNextBtn, () => stepOverlayPage(1));

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    const target = e.target;
    const isTypingField = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
    );
    if (isTypingField) return;

    const overlayOpen =
        (previewOverlayEl && !previewOverlayEl.hidden) ||
        (settingsOverlayEl && !settingsOverlayEl.hidden) ||
        (bonusOverlayEl && !bonusOverlayEl.hidden);
    const lastChanceOpen = lastChanceOverlayEl && !lastChanceOverlayEl.hidden;
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const isInteractiveControl = target?.closest?.("button, a, [role='button']");
    if (isDesktop && e.code === "Space" && !isInteractiveControl) {
        e.preventDefault();
        if (e.repeat || overlayOpen || lastChanceOpen) return;
        if (autoSpinRunning) {
            handleSpinAction();
            return;
        }
        clearTimeout(spaceSpinHoldTimer);
        spaceSpinHoldTimer = setTimeout(() => {
            spaceSpinHoldTimer = 0;
            if (!isSpinning) runAutoSpin();
        }, 420);
    } else if (overlayOpen && e.key === "ArrowLeft") {
        e.preventDefault();
        stepOverlayPage(-1);
    } else if (overlayOpen && e.key === "ArrowRight") {
        e.preventDefault();
        stepOverlayPage(1);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        creditUpBtn.click();
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        creditDownBtn.click();
    }
});

document.addEventListener("keyup", (e) => {
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isDesktop || e.code !== "Space" || !spaceSpinHoldTimer) return;
    e.preventDefault();
    clearTimeout(spaceSpinHoldTimer);
    spaceSpinHoldTimer = 0;
    handleSpinAction();
});

// Init
(function init() {
    setupSettingsOverlay();
    setupFeatureUI();
    [freeSpinsOddsEl, freeSpinsAwardEl, bonusGameOddsEl].forEach((select) => select?.addEventListener("change", () => {
        updateFeatureRules();
        updateFeatureStatus();
    }));
    bonusPrizeSelectEls.forEach((select, index) => select?.addEventListener("change", () => {
        syncBonusPrizeCustomInput(index);
        updateFeatureRules();
    }));
    bonusPrizeCustomEls.forEach((input) => input?.addEventListener("input", updateFeatureRules));
    bonusPrizeSelectEls.forEach((select, index) => syncBonusPrizeCustomInput(index));
    updateFeatureRules();
    if (skipWinAnimationDelayEl) skipWinAnimationDelayEl.checked = true;
    renderBlankGrid();
    updateTotals();
    renderLinesPreview();
    updateGameOddsDisplay();
    updateJackpotDisplay();
    updateAutoSpinControls();

    // ARIA defaults
    payInfoBtn?.setAttribute("aria-expanded", "false");
    if (previewOverlayEl) previewOverlayEl.hidden = true;
    if (lastChanceOverlayEl) lastChanceOverlayEl.hidden = true;
    applyOverlayPage(0);

    ensureSessionStatsUI();
    creditStepEl.value = formatCreditStepValue(creditStepEl.value);
    updateAllSessionDisplays();
    updateSessionStatsVisibility();
    updateRealtimeCreditMessage();
    bindSpinHold();
})();
