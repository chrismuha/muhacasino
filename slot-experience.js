(function () {
    "use strict";

    const gameKey = location.pathname.split("/").filter(Boolean).slice(-2, -1)[0] || "slots";
    const storageKey = `muhaCasino.slotExperience.${gameKey}.v1`;
    const defaultWheelPrizes = [
        { type: "multiplier", value: 1 },
        { type: "multiplier", value: 1.5 },
        { type: "multiplier", value: 2 },
        { type: "fixed", value: 10 },
        { type: "multiplier", value: 3 },
        { type: "jackpot", tier: "mini" },
    ];
    const state = {
        displayMode: "credits",
        withdrawalDemo: false,
        luckyWheel: true,
        wheelOdds: 0.5,
        wheelPrizes: defaultWheelPrizes.map((prize) => ({ ...prize })),
        revealDoors: "off",
        revealDoorRows: [0, 1, 2, 3, 4],
        deposited: 100,
        played: 0,
        balance: 100,
        jackpots: null,
    };

    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
        state.displayMode = ["credits", "money"].includes(saved.displayMode)
            ? saved.displayMode
            : (saved.moneyMode ? "money" : "credits");
        state.withdrawalDemo = typeof saved.withdrawalDemo === "boolean"
            ? saved.withdrawalDemo
            : Boolean(saved.moneyMode);
        state.luckyWheel = saved.luckyWheel !== false;
        state.wheelOdds = [0.25, 0.5, 0.75, 1].includes(Number(saved.wheelOdds)) ? Number(saved.wheelOdds) : 0.5;
        state.wheelPrizes = Array.isArray(saved.wheelPrizes) && saved.wheelPrizes.length === 6
            ? saved.wheelPrizes.map((prize, index) => normalizeWheelPrize(prize, defaultWheelPrizes[index]))
            : defaultWheelPrizes.map((prize, index) => ({
                ...prize,
                ...(Array.isArray(saved.wheelMultipliers) && index < saved.wheelMultipliers.length
                    ? { type: "multiplier", value: Math.max(1, Number(saved.wheelMultipliers[index]) || index + 1) }
                    : {}),
            }));
        state.revealDoors = ["off", "reels", "symbols"].includes(saved.revealDoors) ? saved.revealDoors : "off";
        state.revealDoorRows = Array.isArray(saved.revealDoorRows)
            ? [...new Set(saved.revealDoorRows.map(Number).filter((row) => Number.isInteger(row) && row >= 0 && row < 5))]
            : [0, 1, 2, 3, 4];
        state.jackpots = saved.jackpots && typeof saved.jackpots === "object" ? saved.jackpots : null;
    } catch {  }

    function money(value) {
        return `$${Number(value || 0).toFixed(2)}`;
    }

    function formatAmount(value) {
        const amount = Number(value || 0).toFixed(2);
        return state.displayMode === "money" ? `$${amount}` : `${amount} cr`;
    }

    function save() {
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                displayMode: state.displayMode,
                withdrawalDemo: state.withdrawalDemo,
                luckyWheel: state.luckyWheel,
                wheelOdds: state.wheelOdds,
                wheelPrizes: state.wheelPrizes,
                revealDoors: state.revealDoors,
                revealDoorRows: state.revealDoorRows,
                jackpots: state.jackpots,
            }));
        } catch {  }
    }

    function withdrawable() {
        return state.played + 0.0001 >= state.deposited ? Math.max(0, state.balance) : 0;
    }

    function normalizeWheelPrize(prize, fallback = { type: "multiplier", value: 1 }) {
        const type = ["multiplier", "fixed", "jackpot"].includes(prize?.type) ? prize.type : fallback.type;
        if (type === "jackpot") {
            const tier = ["mini", "minor", "major", "grand"].includes(prize?.tier) ? prize.tier : (fallback.tier || "mini");
            return { type, tier };
        }
        return { type, value: Math.max(type === "multiplier" ? 0.25 : 0.01, Number(prize?.value) || Number(fallback.value) || 1) };
    }

    function formatWheelPrize(prize) {
        if (prize.type === "jackpot") return prize.tier.toUpperCase();
        if (prize.type === "fixed") return money(prize.value);
        return `${Number(prize.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}×`;
    }

    function wheelPrizeEditor(prize, index) {
        const value = prize.type === "jackpot" ? 1 : prize.value;
        const tier = prize.type === "jackpot" ? prize.tier : "mini";
        return `<div class="wheel-prize-card" data-wheel-editor="${index}" data-prize-type="${prize.type}">
            <strong>Win ${index + 1}</strong>
            <label>Type<select data-wheel-prize-type="${index}">
                <option value="multiplier"${prize.type === "multiplier" ? " selected" : ""}>Bet multiplier</option>
                <option value="fixed"${prize.type === "fixed" ? " selected" : ""}>Fixed value</option>
                <option value="jackpot"${prize.type === "jackpot" ? " selected" : ""}>Jackpot</option>
            </select></label>
            <label class="wheel-prize-number">Amount<input type="number" min="0.01" max="1000000" step="0.25" value="${value}" data-wheel-prize-value="${index}"></label>
            <label class="wheel-prize-tier">Tier<select data-wheel-prize-tier="${index}">
                ${["mini", "minor", "major", "grand"].map((name) => `<option value="${name}"${tier === name ? " selected" : ""}>${name[0].toUpperCase()}${name.slice(1)}</option>`).join("")}
            </select></label>
        </div>`;
    }

    function getConfiguredJackpotAmount(tierName, wager, denomination = 0.01, fallback = 0.01) {
        const config = state.jackpots;
        const base = Number(config?.amounts?.[tierName] ?? fallback);
        if (!config?.enabled) return Math.max(0.01, Math.round(base * 100) / 100);
        const bet = Math.max(0.01, Number(wager) || config.baseWager);
        const denominationFactor = Math.max(0.01, Number(denomination) || 0.01) / 0.01;
        const scaledBet = bet * denominationFactor;
        const amount = config.mode === "increment"
            ? base + ((scaledBet - config.baseWager) / config.betStep) * config.stepAmount
            : base * (scaledBet / config.baseWager);
        return Math.max(0.01, Math.round(amount * 100) / 100);
    }

    function updateMoneyUi() {
        document.body.classList.toggle("money-display-mode", state.displayMode === "money");
        document.body.classList.toggle("credits-display-mode", state.displayMode === "credits");
        const withdrawalToggle = document.getElementById("withdrawalDemoToggle");
        if (withdrawalToggle) withdrawalToggle.checked = state.withdrawalDemo;
        const button = document.getElementById("withdrawalButton");
        if (button) button.hidden = !state.withdrawalDemo;
        const balanceLabel = document.querySelector('.stat:has(#balance) .muted');
        if (balanceLabel) balanceLabel.textContent = state.displayMode === "money" ? "Available Balance:" : "Available Credits:";
        const adjustmentLabel = document.querySelector('label[for="creditStep"]');
        if (adjustmentLabel) adjustmentLabel.textContent = state.displayMode === "money" ? "Adjust Money (dollars):" : "Adjust Credits:";
        const insertedLabel = document.querySelector('.stat:has(#creditsInserted) .muted');
        if (insertedLabel) insertedLabel.textContent = state.displayMode === "money" ? "Money Added:" : "Credits Inserted:";
        const values = {
            withdrawalDeposited: state.deposited,
            withdrawalPlayed: state.played,
            withdrawalAvailable: withdrawable(),
        };
        Object.entries(values).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = money(value);
        });
        const progress = document.getElementById("withdrawalProgress");
        if (progress) {
            const remaining = Math.max(0, state.deposited - state.played);
            progress.textContent = remaining > 0
                ? `Play ${money(remaining)} more in paid wagers to meet the withdrawal rule.`
                : "Play-through requirement met for this session.";
        }
        save();
    }

    function closeOverlay(id) {
        const overlay = document.getElementById(id);
        if (overlay) overlay.hidden = true;
        if (id === "luckyWheelOverlay") pendingWheel = null;
        document.body.classList.remove("slot-experience-overlay-open");
        document.documentElement.classList.remove("slot-experience-overlay-open");
        document.getElementById(id === "withdrawalOverlay" ? "withdrawalButton" : "spin")?.focus();
    }

    function injectUi() {
        document.body.classList.add(`slot-game-${gameKey}`);
        const settingsRoot = document.querySelector(".controls, .settings, .control-panel") || document.body;
        const settings = document.createElement("div");
        settings.className = "slot-experience-settings";
        settings.innerHTML = `
            <label class="checkbox-setting slot-withdrawal-setting">
                <input id="withdrawalDemoToggle" type="checkbox">
                <span><strong>Withdrawal demonstration</strong><small>Show the separate simulated withdrawal experience.</small></span>
            </label>
            <label class="checkbox-setting slot-wheel-setting">
                <input id="luckyWheelToggle" type="checkbox" checked>
                <span><strong>One rescue wheel when credits run out</strong><small>Available once per session after paid play leaves too few credits for the current wager.</small></span>
            </label>
            <div class="select slot-wheel-odds-setting">
                <label for="luckyWheelOdds">Lucky Wheel Win / Loss Ratio</label>
                <select id="luckyWheelOdds">
                    <option value="0.25">25% Win / 75% Loss</option>
                    <option value="0.5" selected>50% Win / 50% Loss</option>
                    <option value="0.75">75% Win / 25% Loss</option>
                    <option value="1">100% Win / 0% Loss</option>
                </select>
                <small>Winning wedges award their configured multiplier of the credits needed for the current wager.</small>
            </div>
            <div class="jackpot-config-setting slot-wheel-prizes-setting">
                <strong>Lucky wheel winning wedges</strong>
                <div class="wheel-prize-grid">
                    ${state.wheelPrizes.map(wheelPrizeEditor).join("")}
                </div>
                <small>Configure six winning wedges as bet multipliers, fixed values, or scaled jackpots. Six alternating 0× wedges remain no-award results; Win / Loss Ratio controls which group can be selected.</small>
            </div>
            <div class="jackpot-config-setting jackpot-amounts-setting">
                <strong>Jackpot amounts</strong>
                <div class="jackpot-base-grid">
                    ${["Mini", "Minor", "Major", "Grand"].map((name) => `<label>${name}<input type="number" min="0.01" step="0.01" data-jackpot-base="${name.toLowerCase()}"></label>`).join("")}
                </div>
                <small>Set the base Mini, Minor, Major, and Grand awards.</small>
            </div>
            <div class="jackpot-config-setting jackpot-scaling-setting">
                <strong>Jackpot bet scaling</strong>
                <label class="jackpot-scale-toggle"><input id="jackpotScalingEnabled" type="checkbox" checked><span>Adjust jackpots with total bet and denomination</span></label>
                <label>Scaling method<select id="jackpotScalingMode"><option value="multiply">Multiply with bet</option><option value="increment">Add an amount per bet step</option></select></label>
                <div class="jackpot-scale-grid">
                    <label>Reference bet<input id="jackpotBaseWager" type="number" min="0.01" step="0.01"></label>
                    <label>Bet step<input id="jackpotBetStep" type="number" min="0.01" step="0.01"></label>
                    <label>Amount per step<input id="jackpotStepAmount" type="number" min="0" step="0.01"></label>
                </div>
            </div>
            ${gameKey === "pretty-penny" ? `<div class="select penny-door-setting">
                <label for="pennyRevealDoors">Pretty Penny reveal doors</label>
                <select id="pennyRevealDoors">
                    <option value="off">Off</option>
                    <option value="reels">Cover selected rows</option>
                    <option value="symbols">Cover individual symbols in selected rows</option>
                </select>
                <div class="penny-door-rows" role="group" aria-labelledby="pennyDoorRowsTitle">
                    <strong id="pennyDoorRowsTitle">Rows concealed</strong>
                    ${Array.from({ length: 5 }, (_, row) => `<label><input type="checkbox" data-penny-door-row="${row}"> Row ${row + 1}</label>`).join("")}
                </div>
                <small>Choose one, several, or all rows. Doors are off by default.</small>
            </div>` : ""}`;
        settingsRoot.appendChild(settings);

        const betSelect = document.getElementById("bet");
        if (betSelect && !betSelect.dataset.buttonBetsReady) {
            betSelect.dataset.buttonBetsReady = "true";
            const betSetting = betSelect.parentElement;
            const denomSelect = document.getElementById("denom");
            const linesSelect = document.getElementById("lines");
            const betLabel = betSetting.querySelector('label[for="bet"]');
            if (betLabel) betLabel.textContent = "Total Bet";
            betSetting.hidden = false;
            betSelect.hidden = true;
            betSelect.tabIndex = -1;
            betSelect.setAttribute("aria-hidden", "true");

            const presets = document.createElement("div");
            presets.className = "bet-presets";
            presets.setAttribute("aria-label", "Quick total bet presets");
            const totalBetPresets = [
                { total: 0.5, label: "50¢", bet: "5" },
                { total: 1.5, label: "$1.50", bet: "15" },
                { total: 4, label: "$4.00", bet: "40" },
                { total: 8, label: "$8.00", bet: "80" },
            ];
            totalBetPresets.forEach(({ total, label, bet }) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "bet-preset";
                button.dataset.betTotal = String(total);
                button.dataset.baseLabel = label;
                button.textContent = label;
                button.setAttribute("aria-label", `Set total bet to ${label}`);
                button.addEventListener("click", () => {
                    if (linesSelect) linesSelect.value = "10";
                    betSelect.value = bet;
                    linesSelect?.dispatchEvent(new Event("change", { bubbles: true }));
                    betSelect.dispatchEvent(new Event("change", { bubbles: true }));
                });
                presets.appendChild(button);
            });
            const wagerRow = document.createElement("div");
            wagerRow.className = "slot-wager-row";
            wagerRow.appendChild(presets);
            const denomSetting = denomSelect?.closest(".select");
            if (denomSetting) {
                denomSetting.classList.add("slot-denomination-control");
                const denomLabel = denomSetting.querySelector('label[for="denom"]');
                if (denomLabel) denomLabel.textContent = "Denom";
                wagerRow.appendChild(denomSetting);
            }
            betSetting.appendChild(wagerRow);

            const syncBetPresets = () => {
                const denomination = Number(denomSelect?.value || 0.01);
                const denominationScale = denomination / 0.01;
                const currentTotal = denomination * Number(linesSelect?.value || 0) * Number(betSelect.value || 0);
                presets.querySelectorAll(".bet-preset").forEach((button) => {
                    const scaledTotal = Number(button.dataset.betTotal) * denominationScale;
                    const display = denominationScale === 1 ? button.dataset.baseLabel : money(scaledTotal);
                    const selected = Math.abs(scaledTotal - currentTotal) < 0.001;
                    button.textContent = display;
                    button.setAttribute("aria-label", `Set total bet to ${display} at the current denomination`);
                    button.classList.toggle("is-selected", selected);
                    button.setAttribute("aria-pressed", String(selected));
                });
            };
            betSelect.addEventListener("change", syncBetPresets);
            denomSelect?.addEventListener("change", syncBetPresets);
            linesSelect?.addEventListener("change", syncBetPresets);
            syncBetPresets();

            betSetting.classList.add("slot-bet-control");
            document.querySelector(".right")?.prepend(betSetting);
        }

        document.body.insertAdjacentHTML("beforeend", `
            <button id="withdrawalButton" class="withdrawal-button" type="button" hidden>Withdraw</button>
            <div id="withdrawalOverlay" class="overlay slot-experience-overlay" role="dialog" aria-modal="true" aria-labelledby="withdrawalTitle" hidden>
                <div class="overlay-panel overlay-panel-compact slot-experience-panel">
                    <div class="overlay-head"><h3 id="withdrawalTitle">Withdrawals not available right now</h3><button type="button" class="overlay-close" data-close="withdrawalOverlay">Close</button></div>
                    <p class="overlay-note">Withdrawal rule: all deposited credits must be played in paid wagers before any balance becomes withdrawable.</p>
                    <div class="withdrawal-totals">
                        <div><span>Total deposited</span><strong id="withdrawalDeposited">$0.00</strong></div>
                        <div><span>Total played</span><strong id="withdrawalPlayed">$0.00</strong></div>
                        <div><span>Total withdrawable</span><strong id="withdrawalAvailable">$0.00</strong></div>
                    </div>
                    <p id="withdrawalProgress" class="overlay-note"></p>
                </div>
            </div>
            <div id="luckyWheelOverlay" class="overlay slot-experience-overlay" role="dialog" aria-modal="true" aria-labelledby="luckyWheelTitle" hidden>
                <div class="overlay-panel overlay-panel-compact slot-experience-panel lucky-wheel-panel">
                    <div class="overlay-head"><h3 id="luckyWheelTitle">Lucky Credit Wheel</h3><button type="button" class="overlay-close" data-close="luckyWheelOverlay">Close</button></div>
                    <p class="overlay-note">You are short on credits. Spin for a chance to keep playing.</p>
                    <div class="lucky-wheel" aria-label="Lucky wheel with six configurable winning wedges and six no-award wedges"><div class="lucky-wheel-pointer">▼</div><div class="lucky-wheel-disc">${Array.from({ length: 12 }, (_, index) => index % 2 === 0 ? `<span data-wheel-value="${index / 2}">${formatWheelPrize(state.wheelPrizes[index / 2])}</span>` : "<span>0×</span>").join("")}</div></div>
                    <p id="luckyWheelResult" class="last-chance-summary">The wheel odds follow your setting.</p>
                    <button id="luckyWheelSpin" type="button">Spin Lucky Wheel</button>
                </div>
            </div>`);

        const withdrawalButton = document.getElementById("withdrawalButton");
        const actionArea = document.querySelector(".right");
        if (actionArea) {
            const actionStatus = actionArea.querySelector(".auto-spin-hint, .message");
            actionArea.insertBefore(withdrawalButton, actionStatus);
        }

        const withdrawalToggle = document.getElementById("withdrawalDemoToggle");
        const wheelToggle = document.getElementById("luckyWheelToggle");
        const odds = document.getElementById("luckyWheelOdds");
        const revealDoors = document.getElementById("pennyRevealDoors");
        withdrawalToggle.checked = state.withdrawalDemo;
        wheelToggle.checked = state.luckyWheel;
        odds.value = String(state.wheelOdds);
        if (revealDoors) revealDoors.value = state.revealDoors;
        const revealDoorRows = Array.from(document.querySelectorAll("[data-penny-door-row]"));
        revealDoorRows.forEach((checkbox) => {
            checkbox.checked = state.revealDoorRows.includes(Number(checkbox.dataset.pennyDoorRow));
            checkbox.addEventListener("change", () => {
                state.revealDoorRows = revealDoorRows
                    .filter((rowCheckbox) => rowCheckbox.checked)
                    .map((rowCheckbox) => Number(rowCheckbox.dataset.pennyDoorRow));
                save();
            });
        });
        withdrawalToggle.addEventListener("change", () => {
            state.withdrawalDemo = withdrawalToggle.checked;
            updateMoneyUi();
        });
        wheelToggle.addEventListener("change", () => {
            state.luckyWheel = wheelToggle.checked;
            save();
            window.dispatchEvent(new CustomEvent("slot-experience-settings-change"));
        });
        odds.addEventListener("change", () => { state.wheelOdds = Number(odds.value); save(); });
        const updateWheelPrize = (index) => {
            const editor = document.querySelector(`[data-wheel-editor="${index}"]`);
            const type = document.querySelector(`[data-wheel-prize-type="${index}"]`)?.value;
            const valueInput = document.querySelector(`[data-wheel-prize-value="${index}"]`);
            const tier = document.querySelector(`[data-wheel-prize-tier="${index}"]`)?.value;
            state.wheelPrizes[index] = normalizeWheelPrize({ type, value: valueInput?.value, tier }, defaultWheelPrizes[index]);
            if (editor) editor.dataset.prizeType = state.wheelPrizes[index].type;
            if (valueInput && state.wheelPrizes[index].type !== "jackpot") valueInput.value = String(state.wheelPrizes[index].value);
            const wedge = document.querySelector(`[data-wheel-value="${index}"]`);
            if (wedge) wedge.textContent = formatWheelPrize(state.wheelPrizes[index]);
            save();
        };
        state.wheelPrizes.forEach((_, index) => {
            document.querySelector(`[data-wheel-prize-type="${index}"]`)?.addEventListener("change", () => updateWheelPrize(index));
            document.querySelector(`[data-wheel-prize-value="${index}"]`)?.addEventListener("change", () => updateWheelPrize(index));
            document.querySelector(`[data-wheel-prize-tier="${index}"]`)?.addEventListener("change", () => updateWheelPrize(index));
        });
        revealDoors?.addEventListener("change", () => { state.revealDoors = revealDoors.value; save(); });
        document.querySelectorAll(".jackpot-amounts-setting input, .jackpot-scaling-setting input, .jackpot-scaling-setting select").forEach((control) => {
            control.addEventListener("change", () => {
                if (!state.jackpots) return;
                state.jackpots.enabled = document.getElementById("jackpotScalingEnabled").checked;
                state.jackpots.mode = document.getElementById("jackpotScalingMode").value === "increment" ? "increment" : "multiply";
                state.jackpots.baseWager = Math.max(0.01, Number(document.getElementById("jackpotBaseWager").value) || 0.5);
                state.jackpots.betStep = Math.max(0.01, Number(document.getElementById("jackpotBetStep").value) || 0.5);
                state.jackpots.stepAmount = Math.max(0, Number(document.getElementById("jackpotStepAmount").value) || 0);
                document.querySelectorAll("[data-jackpot-base]").forEach((input) => {
                    state.jackpots.amounts[input.dataset.jackpotBase] = Math.max(0.01, Number(input.value) || 0.01);
                });
                save();
                window.dispatchEvent(new CustomEvent("slot-experience-settings-change"));
            });
        });
        withdrawalButton.addEventListener("click", () => {
            updateMoneyUi();
            document.getElementById("withdrawalOverlay").hidden = false;
            document.body.classList.add("slot-experience-overlay-open");
            document.documentElement.classList.add("slot-experience-overlay-open");
            document.querySelector('#withdrawalOverlay [data-close]')?.focus();
        });
        document.querySelectorAll(".slot-experience-overlay [data-close]").forEach((button) => button.addEventListener("click", () => closeOverlay(button.dataset.close)));
        document.addEventListener("keydown", (event) => {
            const openOverlay = ["luckyWheelOverlay", "withdrawalOverlay"]
                .map((id) => document.getElementById(id))
                .find((overlay) => overlay && !overlay.hidden);
            if (!openOverlay) return;
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopImmediatePropagation();
                closeOverlay(openOverlay.id);
                return;
            }
            if (event.key !== "Tab") event.stopImmediatePropagation();
        }, true);
        updateMoneyUi();
    }

    let pendingWheel = null;
    let luckyWheelUsed = false;
    let rescueRearmCredits = 0;
    function offerLuckyWheel({ needed, wager, denomination = 0.01, onAward }) {
        const currentWager = Math.max(0.01, Number(wager) || 0.01);
        const hasPlayedToDepletion = state.played > 0 && state.balance + 0.0001 < currentWager;
        if (!state.luckyWheel || luckyWheelUsed || pendingWheel || !hasPlayedToDepletion) return false;
        pendingWheel = { needed: Math.max(0.01, needed), wager, denomination, onAward };
        const overlay = document.getElementById("luckyWheelOverlay");
        const button = document.getElementById("luckyWheelSpin");
        const result = document.getElementById("luckyWheelResult");
        overlay.hidden = false;
        document.body.classList.add("slot-experience-overlay-open");
        document.documentElement.classList.add("slot-experience-overlay-open");
        result.textContent = `${Math.round(state.wheelOdds * 100)}% chance to win enough credits for another spin.`;
        button.disabled = false;
        button.textContent = "Spin Lucky Wheel";
        button.onclick = () => {
            luckyWheelUsed = true;
            button.disabled = true;
            const attempt = pendingWheel;
            const disc = overlay.querySelector(".lucky-wheel-disc");
            const won = Math.random() < state.wheelOdds;
            const eligibleSlices = won ? [0, 2, 4, 6, 8, 10] : [1, 3, 5, 7, 9, 11];
            const slice = eligibleSlices[Math.floor(Math.random() * eligibleSlices.length)];
            const prizeIndex = won ? slice / 2 : -1;
            const sliceCenter = 15 + slice * 30;
            disc.style.setProperty("--wheel-turn", `${1440 + (360 - sliceCenter)}deg`);
            disc.classList.add("spinning");
            window.setTimeout(async () => {
                if (pendingWheel !== attempt) return;
                disc.classList.remove("spinning");
                if (!won) {
                    result.textContent = "No award this time. The one rescue spin for this session has been used.";
                    button.disabled = false;
                    button.textContent = "Close";
                    button.onclick = () => closeOverlay("luckyWheelOverlay");
                    return;
                }
                const prize = state.wheelPrizes[prizeIndex];
                const award = prize.type === "jackpot"
                    ? getConfiguredJackpotAmount(prize.tier, attempt.wager, attempt.denomination)
                    : prize.type === "fixed"
                        ? prize.value
                        : attempt.needed * prize.value;
                result.textContent = `Lucky win — ${formatWheelPrize(prize)}! ${money(award)} in simulated credits was added.`;
                const callback = attempt.onAward;
                await callback(award);
                if (pendingWheel !== attempt) return;
                button.disabled = false;
                button.textContent = "Close";
                button.onclick = () => closeOverlay("luckyWheelOverlay");
            }, 1500);
        };
        button.focus();
        return true;
    }

    function closeReelDoors(reels) {
        if (state.revealDoors === "off" || state.revealDoorRows.length === 0) return;
        const host = reels?.parentElement;
        if (!reels || !host || host.querySelector(":scope > .penny-reveal-doors")) return;
        host.classList.add("penny-door-host");
        reels.classList.add("penny-doors-active");
        const selectedRows = new Set(state.revealDoorRows);
        const doorMarkup = state.revealDoors === "symbols"
            ? `<div class="penny-symbol-doors">${Array.from({ length: 25 }, (_, index) => {
                const selected = selectedRows.has(Math.floor(index / 5));
                return `<i class="${selected ? "selected" : "uncovered"}"><span>${index % 2 ? "Penny" : "Pretty"}</span></i>`;
            }).join("")}</div>`
            : `<div class="penny-row-doors">${Array.from({ length: 5 }, (_, row) => selectedRows.has(row)
                ? `<div class="penny-row-door-track"><i class="penny-door left"><span>Pretty</span></i><i class="penny-door right"><span>Penny</span></i></div>`
                : "<div></div>").join("")}</div>`;
        host.insertAdjacentHTML("beforeend", `<div class="penny-reveal-doors mode-${state.revealDoors}" aria-hidden="true">${doorMarkup}</div>`);
        const doors = host.querySelector(":scope > .penny-reveal-doors");
        doors.style.top = `${reels.offsetTop}px`;
        doors.style.left = `${reels.offsetLeft}px`;
        doors.style.width = `${reels.offsetWidth}px`;
        doors.style.height = `${reels.offsetHeight}px`;
    }

    async function revealReelDoors(reels) {
        const doors = reels?.parentElement?.querySelector(":scope > .penny-reveal-doors");
        if (!doors) return;
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        doors.classList.add("open");
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        doors.remove();
        reels.classList.remove("penny-doors-active");
        reels.parentElement?.classList.remove("penny-door-host");
    }

    function renderResultMessage(element, message) {
        if (!element) return;
        const winMatch = /^WIN\s+(\S+)\s+—\s+(.+)$/.exec(message);
        element.classList.toggle("has-win-breakdown", Boolean(winMatch));
        element.setAttribute("aria-label", message.trim());
        if (!winMatch) {
            element.textContent = message;
            return;
        }
        const primary = document.createElement("strong");
        primary.className = "win-result-primary";
        primary.textContent = `WIN ${winMatch[1]}`;
        const details = document.createElement("span");
        details.className = "win-result-details";
        winMatch[2].split(" • ").forEach((text, index) => {
            if (index) details.append(" • ");
            const part = document.createElement("span");
            part.className = /(FREE SPINS|BONUS|JACKPOT|WHEEL)/i.test(text)
                ? "win-result-feature"
                : "win-result-explanation";
            part.textContent = text;
            details.append(part);
        });
        element.replaceChildren(primary, details);
    }

    function renderFeatureStatus(element, primaryText = "", detailText = "") {
        if (!element) return;
        element.classList.toggle("feature-active", Boolean(primaryText));
        element.setAttribute("aria-label", [primaryText, detailText].filter(Boolean).join(" — "));
        if (!primaryText) {
            element.replaceChildren();
            return;
        }
        const primary = document.createElement("strong");
        primary.className = "feature-status-primary";
        primary.textContent = primaryText;
        const detail = document.createElement("span");
        detail.className = "feature-status-detail";
        detail.textContent = detailText;
        element.replaceChildren(primary, ...(detailText ? [detail] : []));
    }

    injectUi();
    window.slotExperience = {
        formatAmount,
        getDisplayMode: () => state.displayMode,
        toggleDisplayMode() {
            state.displayMode = state.displayMode === "money" ? "credits" : "money";
            updateMoneyUi();
            window.dispatchEvent(new CustomEvent("slot-experience-settings-change"));
        },
        configureJackpots(tiers, { baseWager = 0.5 } = {}) {
            const defaults = Object.fromEntries(tiers.map((tier) => [tier.name.toLowerCase(), Number(tier.amountUSD)]));
            const saved = state.jackpots || {};
            state.jackpots = {
                enabled: saved.enabled !== false,
                mode: saved.mode === "increment" ? "increment" : "multiply",
                baseWager: Math.max(0.01, Number(saved.baseWager) || baseWager),
                betStep: Math.max(0.01, Number(saved.betStep) || baseWager),
                stepAmount: Math.max(0, Number(saved.stepAmount) || 10),
                amounts: Object.fromEntries(Object.entries({ ...defaults, ...(saved.amounts || {}) })
                    .map(([name, amount]) => [name, Math.max(0.01, Number(amount) || defaults[name] || 0.01)])),
            };
            document.getElementById("jackpotScalingEnabled").checked = state.jackpots.enabled;
            document.getElementById("jackpotScalingMode").value = state.jackpots.mode;
            document.getElementById("jackpotBaseWager").value = state.jackpots.baseWager;
            document.getElementById("jackpotBetStep").value = state.jackpots.betStep;
            document.getElementById("jackpotStepAmount").value = state.jackpots.stepAmount;
            document.querySelectorAll("[data-jackpot-base]").forEach((input) => { input.value = state.jackpots.amounts[input.dataset.jackpotBase]; });
            save();
        },
        getJackpotAmount(tier, wager, denomination = 0.01) {
            return getConfiguredJackpotAmount(tier.name.toLowerCase(), wager, denomination, tier.amountUSD);
        },
        offerLuckyWheel,
        closeReelDoors,
        revealReelDoors,
        renderResultMessage,
        renderFeatureStatus,
        isLuckyWheelEnabled: () => state.luckyWheel && !luckyWheelUsed,
        recordDeposit(amount) {
            if (amount > 0) {
                state.deposited += amount;
                if (luckyWheelUsed) rescueRearmCredits += amount;
            }
            updateMoneyUi();
        },
        recordPlay(amount) {
            if (amount > 0) {
                state.played += amount;
                if (luckyWheelUsed && rescueRearmCredits + 0.0001 >= amount) {
                    luckyWheelUsed = false;
                    rescueRearmCredits = 0;
                }
            }
            updateMoneyUi();
        },
        setBalance(amount) { state.balance = Math.max(0, Number(amount) || 0); updateMoneyUi(); },
        reset(balance = 100) { state.deposited = balance; state.played = 0; state.balance = balance; luckyWheelUsed = false; rescueRearmCredits = 0; updateMoneyUi(); },
    };
})();
