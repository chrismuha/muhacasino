(function () {
    "use strict";

    const gameKey = location.pathname.split("/").filter(Boolean).slice(-2, -1)[0] || "slots";
    const storageKey = `muhaCasino.slotExperience.${gameKey}.v1`;
    const state = {
        displayMode: "credits",
        withdrawalDemo: false,
        luckyWheel: true,
        wheelOdds: 0.5,
        revealDoors: "off",
        revealDoorRows: [0, 1, 2, 3, 4],
        deposited: 100,
        played: 0,
        balance: 100,
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
        state.revealDoors = ["off", "reels", "symbols"].includes(saved.revealDoors) ? saved.revealDoors : "off";
        state.revealDoorRows = Array.isArray(saved.revealDoorRows)
            ? [...new Set(saved.revealDoorRows.map(Number).filter((row) => Number.isInteger(row) && row >= 0 && row < 5))]
            : [0, 1, 2, 3, 4];
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
                revealDoors: state.revealDoors,
                revealDoorRows: state.revealDoorRows,
            }));
        } catch {  }
    }

    function withdrawable() {
        return state.played + 0.0001 >= state.deposited ? Math.max(0, state.balance) : 0;
    }

    function updateMoneyUi() {
        document.body.classList.toggle("money-display-mode", state.displayMode === "money");
        document.body.classList.toggle("credits-display-mode", state.displayMode === "credits");
        const modeSelect = document.getElementById("playModeSelect");
        if (modeSelect) modeSelect.value = state.displayMode;
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
        const settingsRoot = document.querySelector(".controls, .settings, .control-panel") || document.body;
        const settings = document.createElement("div");
        settings.className = "slot-experience-settings";
        settings.innerHTML = `
            <div class="select slot-play-mode-setting">
                <label for="playModeSelect">Play balance as</label>
                <select id="playModeSelect">
                    <option value="credits">Credits (fake money)</option>
                    <option value="money">Money ($, simulated)</option>
                </select>
                <small>Changes how balances, bets, and prizes are displayed. All play remains simulated.</small>
            </div>
            <label class="checkbox-setting slot-withdrawal-setting">
                <input id="withdrawalDemoToggle" type="checkbox">
                <span><strong>Withdrawal demonstration</strong><small>Show the separate simulated withdrawal experience.</small></span>
            </label>
            <label class="checkbox-setting slot-wheel-setting">
                <input id="luckyWheelToggle" type="checkbox" checked>
                <span><strong>Lucky wheel when credits run out</strong><small>Turn off to restore the original last-chance behavior.</small></span>
            </label>
            <div class="select slot-wheel-odds-setting">
                <label for="luckyWheelOdds">Lucky Wheel Win / Loss Ratio</label>
                <select id="luckyWheelOdds">
                    <option value="0.25">25% Win / 75% Loss</option>
                    <option value="0.50">50% Win / 50% Loss</option>
                    <option value="0.75">75% Win / 25% Loss</option>
                    <option value="1">100% Win / 0% Loss</option>
                </select>
                <small>Winning slices award 1×, 2×, or 3× the credits needed for the current wager.</small>
            </div>
            ${gameKey === "pretty-penny" ? `<div class="select penny-door-setting">
                <label for="pennyRevealDoors">Pretty Penny reveal doors</label>
                <select id="pennyRevealDoors">
                    <option value="off">Off</option>
                    <option value="reels">Cover selected rows</option>
                    <option value="symbols">Cover individual symbols in selected rows</option>
                </select>
                <fieldset class="penny-door-rows">
                    <legend>Rows concealed</legend>
                    ${Array.from({ length: 5 }, (_, row) => `<label><input type="checkbox" data-penny-door-row="${row}"> Row ${row + 1}</label>`).join("")}
                </fieldset>
                <small>Choose one, several, or all rows. Doors are off by default.</small>
            </div>` : ""}`;
        settingsRoot.appendChild(settings);

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
                    <div class="lucky-wheel" aria-label="Lucky wheel"><div class="lucky-wheel-pointer">▼</div><div class="lucky-wheel-disc"><span>1×</span><span>TRY<br>AGAIN</span><span>2×</span><span>TRY<br>AGAIN</span><span>3×</span><span>TRY<br>AGAIN</span></div></div>
                    <p id="luckyWheelResult" class="last-chance-summary">The wheel odds follow your setting.</p>
                    <button id="luckyWheelSpin" type="button">Spin Lucky Wheel</button>
                </div>
            </div>`);

        const withdrawalButton = document.getElementById("withdrawalButton");
        const actionArea = document.querySelector(".right");
        if (actionArea) actionArea.insertBefore(withdrawalButton, actionArea.querySelector(".auto-spin-hint, .message"));

        const playModeSelect = document.getElementById("playModeSelect");
        const withdrawalToggle = document.getElementById("withdrawalDemoToggle");
        const wheelToggle = document.getElementById("luckyWheelToggle");
        const odds = document.getElementById("luckyWheelOdds");
        const revealDoors = document.getElementById("pennyRevealDoors");
        playModeSelect.value = state.displayMode;
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
        playModeSelect.addEventListener("change", () => {
            state.displayMode = playModeSelect.value === "money" ? "money" : "credits";
            updateMoneyUi();
            window.dispatchEvent(new CustomEvent("slot-experience-settings-change"));
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
        revealDoors?.addEventListener("change", () => { state.revealDoors = revealDoors.value; save(); });
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
    function offerLuckyWheel({ needed, wager, onAward }) {
        if (!state.luckyWheel || pendingWheel) return false;
        pendingWheel = { needed: Math.max(0.01, needed), wager, onAward };
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
            button.disabled = true;
            const attempt = pendingWheel;
            const disc = overlay.querySelector(".lucky-wheel-disc");
            const won = Math.random() < state.wheelOdds;
            const multipliers = [1, 2, 3];
            const multiplier = won ? multipliers[Math.floor(Math.random() * multipliers.length)] : 0;
            const eligibleSlices = won ? [0, 2, 4] : [1, 3, 5];
            const slice = eligibleSlices[Math.floor(Math.random() * eligibleSlices.length)];
            const sliceCenter = 30 + slice * 60;
            disc.style.setProperty("--wheel-turn", `${1440 + (360 - sliceCenter)}deg`);
            disc.classList.add("spinning");
            window.setTimeout(async () => {
                if (pendingWheel !== attempt) return;
                disc.classList.remove("spinning");
                if (!won) {
                    result.textContent = "No award this time. You can try the wheel again.";
                    button.disabled = false;
                    button.textContent = "Spin Again";
                    return;
                }
                const award = Math.max(attempt.needed, attempt.needed * multiplier);
                result.textContent = `Lucky win! ${money(award)} in simulated credits was added.`;
                const callback = attempt.onAward;
                window.setTimeout(async () => {
                    if (pendingWheel !== attempt) return;
                    pendingWheel = null;
                    closeOverlay("luckyWheelOverlay");
                    await callback(award);
                }, 700);
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

    injectUi();
    window.slotExperience = {
        formatAmount,
        getDisplayMode: () => state.displayMode,
        offerLuckyWheel,
        closeReelDoors,
        revealReelDoors,
        isLuckyWheelEnabled: () => state.luckyWheel,
        recordDeposit(amount) { if (amount > 0) state.deposited += amount; updateMoneyUi(); },
        recordPlay(amount) { if (amount > 0) state.played += amount; updateMoneyUi(); },
        setBalance(amount) { state.balance = Math.max(0, Number(amount) || 0); updateMoneyUi(); },
        reset(balance = 100) { state.deposited = balance; state.played = 0; state.balance = balance; updateMoneyUi(); },
    };
})();
