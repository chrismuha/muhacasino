(() => {
  const STORAGE_KEY = "muha-bingo-theme";
  const THEME_ID_VERSION_KEY = "muha-bingo-theme-id-version";
  const THEME_ID_VERSION = "legacy-restored-v1";
  const DAUB_STORAGE_KEY = "muha-bingo-daub-design";
  const SOLID_COLOR_STORAGE_KEY = "muha-bingo-solid-colors";
  const VIEW_COUNT_STORAGE_KEY = "muha-bingo-view-count";
  const CARD_COUNT_STORAGE_KEY = "muha-bingo-card-count";
  const DEALER_POPOUT_STORAGE_KEY = "muha-bingo-dealer-popout";
  const INCORRECT_BINGO_STORAGE_KEY = "muha-bingo-incorrect-claims";
  const SCHEDULE_STORAGE_KEY = "muha-bingo-schedule";
  const PRIZES_STORAGE_KEY = "muha-bingo-prizes";
  const SCHEDULE_STARTED_STORAGE_KEY = "muha-bingo-schedule-started";
  const DEALER_SECTION_STORAGE_KEY = "muha-bingo-dealer-section";
  const CARD_SERIAL_START_STORAGE_KEY = "muha-bingo-card-serial-start";
  const CARD_SERIAL_STEP_STORAGE_KEY = "muha-bingo-card-serial-step";
  const CARD_SERIAL_DEFAULT_VERSION_KEY = "muha-bingo-card-serial-default-version";
  const SPECIAL_BALL_STORAGE_KEY = "muha-bingo-special-ball-settings";
  const UNLIMITED_CREDITS = 1_000_000_000;
  const launchParameters = new URLSearchParams(window.location.search);
  const isPopout = launchParameters.has("screen") || launchParameters.has("player");
  const themeChannel = "BroadcastChannel" in window
    ? new BroadcastChannel("muha-bingo-theme-sync")
    : null;
  const incorrectBingoChannel = "BroadcastChannel" in window
    ? new BroadcastChannel("muha-bingo-incorrect-claims")
    : null;

  function migrateLegacyCardSerialDefaults() {
    try {
      if (window.localStorage.getItem(CARD_SERIAL_DEFAULT_VERSION_KEY) === "sequential-v1") return;
      const savedStart = window.localStorage.getItem(CARD_SERIAL_START_STORAGE_KEY);
      const savedStep = window.localStorage.getItem(CARD_SERIAL_STEP_STORAGE_KEY);
      const hasNoSavedNumbering = savedStart === null && savedStep === null;
      const usesLegacyDefaults = Number(savedStart) === 7077 && Number(savedStep) === 37;
      if (hasNoSavedNumbering || usesLegacyDefaults) {
        window.localStorage.setItem(CARD_SERIAL_START_STORAGE_KEY, "1");
        window.localStorage.setItem(CARD_SERIAL_STEP_STORAGE_KEY, "1");
      }
      window.localStorage.setItem(CARD_SERIAL_DEFAULT_VERSION_KEY, "sequential-v1");
    } catch {
      // Storage can be unavailable; the sequential runtime fallbacks still apply.
    }
  }

  migrateLegacyCardSerialDefaults();
  const CANONICAL_THEME_IDS = Object.freeze({
    "planet-hall-2": "planet",
    "planet-hall-1": "classic",
    classic: "current",
  });
  const THEME_DEFINITIONS = Object.freeze([
    { id: "planet", label: "Planet Hall 2" },
    { id: "classic", label: "Planet Hall 1" },
    { id: "current", label: "Classic" },
  ]);
  const themes = THEME_DEFINITIONS.map(({ id }) => id);
  const daubOptions = [
    ["solid", "Solid Color", ""], ["splat", "Splat (Solid Color)", ""],
    ["sharp-splat", "Sharp Splat (Solid Color)", ""], ["circle", "Circle (Solid Color)", ""],
    ["pig", "Pig", "🐷"], ["duck", "Duck", "🦆"], ["star", "Star", "★"],
    ["planet", "Planet", "🪐"], ["confetti", "Confetti", "🎉"], ["firework", "Firework", "🎆"],
    ["dynamite", "Dynamite", "🧨"], ["cowboy", "Cowboy", "🤠"], ["clover", "Clover", "🍀"],
    ["diamond", "Diamond", "💎"], ["lightning", "Lightning", "⚡"],
    ["dog", "Dog", "🐶"], ["sheep", "Sheep", "🐑"], ["cat", "Cat", "🐱"],
    ["horse", "Horse", "🐴"], ["elephant", "Elephant", "🐘"], ["butterfly", "Butterfly", "🦋"],
    ["parrot", "Parrot", "🦜"], ["dragon", "Dragon", "🐉"], ["fish", "Fish", "🐟"],
    ["buffalo", "Buffalo", "🦬"], ["unicorn", "Unicorn", "🦄"], ["tropical-fish", "Clownfish", "🐠"],
    ["shark", "Shark", "🦈"], ["turtle", "Turtle", "🐢"], ["rooster", "Rooster", "🐓"],
    ["ladybug", "Ladybug", "🐞"], ["flag", "Flag", "🇺🇸"], ["eagle", "Eagle", "🦅"],
    ["shooting-star", "Shooting Star", "🌠"], ["seven", "Lucky Seven", "7️⃣"], ["shell", "Shell", "🐚"],
    ["horseshoe", "Horseshoe", "∩"], ["dreamcatcher", "Dreamcatcher", "🕸️"], ["yin-yang", "Yin Yang", "☯️"],
    ["meditation", "Meditation", "🧘"], ["mystery", "Mystery", "❓"], ["peace", "Peace", "☮️"],
    ["bomb", "Bomb", "💣"],
  ];
  const daubDesigns = daubOptions.map(([id]) => id);
  const solidColorDaubDesigns = new Set(["solid", "circle", "splat", "sharp-splat"]);
  const defaultSolidColors = {
    pre: "#ed3d35",
    actual: "#126eff",
    free: "#f5cc4e",
  };
  let currentViewCount = 3;
  let specialBallSyncFrame = 0;

  const defaultSpecialBallSettings = {
    hotEnabled: false,
    hotNumber: 1,
    hotMultiplier: 2,
    birthdayEnabled: false,
    birthdayNumber: 1,
    birthdayDate: "",
    birthdayMultiplier: 2,
    showOtherThemesFlashboard: false,
  };

  function specialBallSettings() {
    try {
      return {
        ...defaultSpecialBallSettings,
        ...JSON.parse(window.localStorage.getItem(SPECIAL_BALL_STORAGE_KEY) || "{}"),
      };
    } catch {
      return { ...defaultSpecialBallSettings };
    }
  }

  function localMonthDay(date = new Date()) {
    return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function birthdayBallIsActive(settings = specialBallSettings()) {
    return Boolean(
      settings.birthdayEnabled
      && /^\d{4}-\d{2}-\d{2}$/.test(settings.birthdayDate)
      && settings.birthdayDate.slice(5) === localMonthDay()
    );
  }

  function savedSolidColors() {
    try {
      return {
        ...defaultSolidColors,
        ...JSON.parse(window.localStorage.getItem(SOLID_COLOR_STORAGE_KEY) || "{}"),
      };
    } catch {
      return { ...defaultSolidColors };
    }
  }

  function applySolidColors(colors = savedSolidColors()) {
    const values = {
      "--pre-daub": colors.pre,
      "--actual-daub": colors.actual,
      "--free-space": colors.free,
    };
    [document.documentElement, ...document.querySelectorAll("#app, #app .app-shell")].forEach((element) => {
      Object.entries(values).forEach(([property, value]) => {
        element.style.setProperty(property, value, "important");
      });
    });
    document.querySelectorAll("[data-solid-color]").forEach((input) => {
      input.value = colors[input.dataset.solidColor];
    });
    try {
      window.localStorage.setItem(SOLID_COLOR_STORAGE_KEY, JSON.stringify(colors));
    } catch {
      // The colors still work when storage is unavailable.
    }
  }

  function savedTheme() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      const storedVersion = window.localStorage.getItem(THEME_ID_VERSION_KEY);
      const migratedValue = storedVersion === "canonical-v1"
        ? (CANONICAL_THEME_IDS[value] || value)
        : value;
      if (storedVersion !== THEME_ID_VERSION) window.localStorage.setItem(THEME_ID_VERSION_KEY, THEME_ID_VERSION);
      if (themes.includes(migratedValue)) {
        if (migratedValue !== value) window.localStorage.setItem(STORAGE_KEY, migratedValue);
        return migratedValue;
      }
      return "planet";
    } catch {
      return "planet";
    }
  }

  function setHallControlsCollapsed(collapsed) {
    document.documentElement.classList.toggle("hall-controls-collapsed", collapsed);
    const app = document.querySelector("#app");
    if (app) app.inert = !collapsed;
    const controlsToggle = document.querySelector(".hall-controls-toggle");
    if (!controlsToggle) return;
    controlsToggle.innerHTML = collapsed
      ? '<i class="bi bi-caret-left-fill" aria-hidden="true"></i>'
      : '<i class="bi bi-caret-right-fill" aria-hidden="true"></i>';
    controlsToggle.setAttribute("aria-expanded", String(!collapsed));
    controlsToggle.setAttribute(
      "aria-label",
      collapsed ? "Show Hall controls" : "Hide Hall controls"
    );
  }

  function applyTheme(theme, broadcast = true) {
    const selectedTheme = themes.includes(theme) ? theme : "planet";
    const previousTheme = document.documentElement.dataset.bingoTheme;
    document.documentElement.classList.remove("hall-native-controls-open");
    document.querySelector(".hall-overlay-background")?.remove();
    setHallControlsCollapsed(true);
    document.documentElement.dataset.bingoTheme = selectedTheme;
    window.requestAnimationFrame(syncOtherThemeWaitingFlashboard);
    const app = document.querySelector("#app");
    const planetHallShell = document.querySelector(".planet-hall-shell");
    const usePlanetHall2Surface = selectedTheme === "planet" && !isPopout;
    if (planetHallShell) {
      planetHallShell.hidden = !usePlanetHall2Surface;
      planetHallShell.style.setProperty("display", usePlanetHall2Surface ? "flex" : "none", "important");
    }
    if (app) {
      app.style.setProperty("display", usePlanetHall2Surface ? "none" : "block", "important");
      app.style.removeProperty("left");
      app.style.removeProperty("visibility");
      app.style.removeProperty("pointer-events");
      app.style.removeProperty("opacity");
    }
    const closeButton = document.querySelector(".hall-native-controls-close");
    if (closeButton) closeButton.hidden = true;
    const windowHeader = document.querySelector(".hall-dealer-window-header");
    if (windowHeader) windowHeader.hidden = true;

    document.querySelectorAll(".bingo-theme-option").forEach((button) => {
      const isActive = button.dataset.theme === selectedTheme;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    try {
      window.localStorage.setItem(STORAGE_KEY, selectedTheme);
    } catch {
      // The theme still works when local storage is unavailable.
    }
    if (broadcast && previousTheme !== selectedTheme) {
      themeChannel?.postMessage({ theme: selectedTheme });
    }
  }

  window.applyBingoTheme = applyTheme;
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && event.newValue) applyTheme(event.newValue, false);
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "muha-bingo-focus-player-hall") {
      window.focus();
      if (window.parent !== window) {
        window.parent.postMessage(event.data, window.location.origin);
        window.parent.focus();
      }
      return;
    }
    if (event.data?.type !== "muha-bingo-theme") return;
    applyTheme(event.data.theme, false);
  });
  themeChannel?.addEventListener("message", (event) => {
    if (event.data?.theme) applyTheme(event.data.theme, false);
  });

  function savedDaubDesign() {
    try {
      const value = window.localStorage.getItem(DAUB_STORAGE_KEY);
      return daubDesigns.includes(value) ? value : "splat";
    } catch {
      return "splat";
    }
  }

  function applyDaubDesign(design) {
    const selectedDesign = daubDesigns.includes(design) ? design : "splat";
    const selectedOption = daubOptions.find(([id]) => id === selectedDesign);
    document.documentElement.dataset.daubDesign = selectedDesign;
    document.documentElement.style.setProperty("--daub-symbol", JSON.stringify(selectedOption?.[2] || ""));
    document.querySelectorAll("[data-daub-design]").forEach((button) => {
      const isActive = button.dataset.daubDesign === selectedDesign;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    try {
      window.localStorage.setItem(DAUB_STORAGE_KEY, selectedDesign);
    } catch {
      // The selected dauber still works when storage is unavailable.
    }
    if (solidColorDaubDesigns.has(selectedDesign)) applySolidColors();
  }

  function mountThemeSwitcher() {
    if (document.querySelector(".bingo-theme-switcher")) return true;

    const switcher = document.createElement("div");
    switcher.className = "bingo-theme-switcher";
    switcher.setAttribute("aria-label", "Bingo interface theme");
    switcher.innerHTML = `
      <button class="bingo-theme-trigger" type="button" aria-expanded="false" aria-controls="bingo-theme-menu">
        <i class="bi bi-palette-fill" aria-hidden="true"></i><span>Theme</span>
      </button>
      <div id="bingo-theme-menu" class="bingo-theme-menu" hidden>
        <strong>Choose a theme</strong>
        ${THEME_DEFINITIONS.map(({ id, label }) =>
          `<button class="bingo-theme-option" type="button" data-theme="${id}">${label}</button>`
        ).join("")}
      </div>
    `;
    switcher.addEventListener("click", (event) => {
      const trigger = event.target.closest(".bingo-theme-trigger");
      const menu = switcher.querySelector(".bingo-theme-menu");
      if (trigger) {
        const willOpen = menu.hidden;
        menu.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", String(willOpen));
        return;
      }
      const button = event.target.closest("[data-theme]");
      if (button) {
        applyTheme(button.dataset.theme);
        menu.hidden = true;
        switcher.querySelector(".bingo-theme-trigger").setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("click", (event) => {
      if (switcher.contains(event.target)) return;
      switcher.querySelector(".bingo-theme-menu").hidden = true;
      switcher.querySelector(".bingo-theme-trigger").setAttribute("aria-expanded", "false");
    });

    const headerActions = document.querySelector("#app .header-actions");
    (headerActions || document.body).append(switcher);
    switcher.classList.toggle("header-theme-switcher", Boolean(headerActions));
    if (window.parent !== window && !isPopout) switcher.hidden = true;
    if (isPopout) switcher.hidden = false;
    if (!isPopout) mountPlayerHallControls();
    applyTheme(savedTheme());
    return true;
  }

  function clickMatchingControl(pattern) {
    const controls = [...document.querySelectorAll("#app button, #app [role='button']")];
    const target = controls.find((control) =>
      !control.disabled && pattern.test(control.textContent.trim())
    );
    if (!target) return false;
    target.click();
    return true;
  }

  function waitAndClick(pattern, timeoutMs = 1200) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const attempt = () => {
        if (clickMatchingControl(pattern)) {
          resolve(true);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }
        window.setTimeout(attempt, 40);
      };
      attempt();
    });
  }

  function waitAndClickSelector(selector, timeoutMs = 1800) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const attempt = () => {
        const target = document.querySelector(selector);
        if (target && !target.disabled) {
          target.click();
          resolve(true);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }
        window.setTimeout(attempt, 50);
      };
      attempt();
    });
  }

  function ensureSetupOpen(timeoutMs = 1800) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const attempt = () => {
        const button = document.querySelector("#app .edit-setup-btn");
        if (button && !button.disabled) {
          if (!/close setup/i.test(button.textContent)) button.click();
          resolve(true);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }
        window.setTimeout(attempt, 50);
      };
      attempt();
    });
  }

  function applyDefaultSetupValues() {
    const defaults = new Map([
      ["players", 1],
      ["cards per player", 3],
      ["maximum winners", 1],
      ["prize budget", 100],
    ]);

    document.querySelectorAll("#app .setup-fields label").forEach((label) => {
      const name = label.querySelector("span")?.textContent?.trim().toLowerCase();
      const input = label.querySelector("input[type='number']");
      const fallback = defaults.get(name);
      if (!input || fallback == null) return;
      const value = Number(input.value);
      const minimum = Number(input.min || 0);
      if (input.value.trim() && Number.isFinite(value) && value >= minimum) return;
      input.value = String(fallback);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    setSetupNumber(/^starting credits$/i, UNLIMITED_CREDITS);
  }

  function setSetupNumber(labelPattern, value) {
    const label = [...document.querySelectorAll("#app .setup-fields label")].find((candidate) =>
      labelPattern.test(candidate.querySelector("span")?.textContent?.trim() || "")
    );
    const input = label?.querySelector("input[type='number']");
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, String(value));
    else input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function showUnlimitedCredits() {
    document.querySelectorAll("#app div").forEach((container) => {
      const label = container.querySelector(":scope > span")?.textContent?.trim() || "";
      if (!/^(credit balance|player balance|starting credits)$/i.test(label)) return;
      const value = container.querySelector(":scope > strong");
      if (value && value.textContent !== "∞ credits") value.textContent = "∞ credits";
    });
    const planetCredit = document.querySelector(".planet-credit");
    if (planetCredit) {
      if (!planetCredit.querySelector("strong") || !planetCredit.querySelector("span")) {
        planetCredit.innerHTML = "<strong>∞</strong><span>CREDITS</span>";
      }
      planetCredit.querySelector("strong").textContent = "∞";
      planetCredit.querySelector("span").textContent = "CREDITS";
    }
  }

  function enhanceDealerSetup() {
    const setup = document.querySelector("#app .game-setup-panel");
    if (!setup) return;
    if (!setup.querySelector(".dealer-setup-guide")) {
      const guide = document.createElement("ol");
      guide.className = "dealer-setup-guide";
      guide.setAttribute("aria-label", "Dealer setup steps");
      guide.innerHTML = `
        <li><strong>1</strong><span><b>Set up</b><small>Choose players, cards, and winners.</small></span></li>
        <li><strong>2</strong><span><b>Prepare cards</b><small>Create the Player Hall cards.</small></span></li>
        <li><strong>3</strong><span><b>Start calling</b><small>Begin the session when players are ready.</small></span></li>
      `;
      setup.prepend(guide);
    }
    const fields = setup.querySelector(".setup-fields");
    if (fields && !fields.querySelector("[data-card-serial-start]")) {
      const { start, step } = cardSerialSettings();
      fields.insertAdjacentHTML("beforeend", `
        <label><span>First card number</span><input type="number" min="1" max="999999" step="1" value="${start}" data-card-serial-start></label>
        <label><span>Card number increment</span><input type="number" min="1" max="9999" step="1" value="${step}" data-card-serial-step></label>
      `);
    }
  }

  function activeSpecialBalls(settings = specialBallSettings()) {
    const balls = [];
    if (settings.hotEnabled) {
      balls.push({
        kind: "hot",
        label: "Hot Ball",
        number: Math.max(1, Math.min(75, Number(settings.hotNumber) || 1)),
        multiplier: Math.max(2, Math.min(10, Number(settings.hotMultiplier) || 2)),
      });
    }
    if (birthdayBallIsActive(settings)) {
      balls.push({
        kind: "birthday",
        label: "Birthday Ball",
        number: Math.max(1, Math.min(75, Number(settings.birthdayNumber) || 1)),
        multiplier: Math.max(2, Math.min(10, Number(settings.birthdayMultiplier) || 2)),
      });
    }
    return balls;
  }

  window.bingoSpecialBallIsFree = (number) => activeSpecialBalls()
    .some((ball) => ball.number === Number(number));

  window.bingoSpecialBallPrizeForCard = (cardId, basePrize, cards = []) => {
    const card = cards.find((candidate) => Number(candidate?.id) === Number(cardId));
    const assignedPrize = readPrizes().find((prize) => Number(prize.cardNumber) === Number(cardId));
    const configuredBasePrize = assignedPrize ? prizeAmount(assignedPrize) : Number(basePrize) || 0;
    if (!card) return configuredBasePrize;
    const cardNumbers = new Set((card.cells || []).map((cell) => Number(cell?.number)).filter(Boolean));
    const multiplier = activeSpecialBalls()
      .filter((ball) => cardNumbers.has(ball.number))
      .reduce((highest, ball) => Math.max(highest, ball.multiplier), 1);
    return configuredBasePrize * multiplier;
  };

  function specialBallStatusText(settings = specialBallSettings()) {
    if (!settings.birthdayEnabled) return "Birthday Ball is off.";
    if (!settings.birthdayDate) return "Choose the birthday month and day.";
    const selected = new Date(`${settings.birthdayDate}T12:00:00`);
    const dateText = Number.isNaN(selected.getTime())
      ? settings.birthdayDate
      : selected.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    return birthdayBallIsActive(settings)
      ? `Active today · ${dateText}`
      : `Activates annually on ${dateText}`;
  }

  function enhanceSpecialBallSettings() {
    const layout = document.querySelector("#app .dealer-layout");
    if (!layout) return;
    let panel = layout.querySelector(".special-ball-settings");
    const settings = specialBallSettings();
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "dealer-card special-ball-settings";
      panel.innerHTML = `
        <div class="special-ball-heading">
          <span class="eyebrow">SPECIAL BALL SETTINGS</span>
          <h2>Hot Ball and Birthday Ball</h2>
          <p>Matching card squares stamp automatically and count like Free Space. Bonus multipliers appear with winning results.</p>
          <label class="other-theme-flashboard-setting"><input type="checkbox" data-special-ball-setting="showOtherThemesFlashboard"><span><strong>Show waiting flashboard in Planet Hall 1</strong><small>Classic keeps its own pre-game screen.</small></span></label>
        </div>
        <div class="special-ball-grid">
          <fieldset class="special-ball-card hot-ball-settings">
            <legend>Hot Ball</legend>
            <label class="special-ball-switch"><input type="checkbox" data-special-ball-setting="hotEnabled"><span>Enable Hot Ball</span></label>
            <label><span>Ball number</span><input type="number" min="1" max="75" step="1" data-special-ball-setting="hotNumber"></label>
            <label><span>Prize multiplier</span><select data-special-ball-setting="hotMultiplier"><option value="2">2× prize</option><option value="3">3× prize</option><option value="4">4× prize</option><option value="5">5× prize</option><option value="10">10× prize</option></select></label>
            <small>Every matching square is automatically stamped for the full game.</small>
          </fieldset>
          <fieldset class="special-ball-card birthday-ball-settings">
            <legend>Birthday Ball</legend>
            <label class="special-ball-switch"><input type="checkbox" data-special-ball-setting="birthdayEnabled"><span>Enable Birthday Ball</span></label>
            <label><span>Ball number</span><input type="number" min="1" max="75" step="1" data-special-ball-setting="birthdayNumber"></label>
            <label><span>Birthday date</span><input type="date" data-special-ball-setting="birthdayDate"></label>
            <label><span>Prize multiplier</span><select data-special-ball-setting="birthdayMultiplier"><option value="2">2× prize</option><option value="3">3× prize</option><option value="4">4× prize</option><option value="5">5× prize</option><option value="10">10× prize</option></select></label>
            <small data-birthday-ball-status></small>
          </fieldset>
        </div>`;
      const setup = layout.querySelector(".game-setup-panel");
      if (setup) setup.insertAdjacentElement("afterend", panel);
      else layout.append(panel);
      panel.addEventListener("input", saveSpecialBallSetting);
      panel.addEventListener("change", saveSpecialBallSetting);
    }

    panel.querySelectorAll("[data-special-ball-setting]").forEach((input) => {
      const key = input.dataset.specialBallSetting;
      if (input.type === "checkbox") input.checked = Boolean(settings[key]);
      else if (document.activeElement !== input) input.value = String(settings[key] ?? "");
    });
    const birthdayStatus = panel.querySelector("[data-birthday-ball-status]");
    const nextStatus = specialBallStatusText(settings);
    if (birthdayStatus.textContent !== nextStatus) birthdayStatus.textContent = nextStatus;
  }

  function saveSpecialBallSetting(event) {
    const input = event.target.closest("[data-special-ball-setting]");
    if (!input) return;
    const settings = specialBallSettings();
    const key = input.dataset.specialBallSetting;
    if (input.type === "checkbox") settings[key] = input.checked;
    else if (input.type === "number") settings[key] = Math.max(
      Number(input.min || 1),
      Math.min(Number(input.max || 75), Math.trunc(Number(input.value) || Number(input.min || 1)))
    );
    else settings[key] = input.value;
    try {
      window.localStorage.setItem(SPECIAL_BALL_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // The special-ball settings remain active in this window.
    }
    enhanceSpecialBallSettings();
    queueSpecialBallSync();
    syncOtherThemeWaitingFlashboard();
    window.dispatchEvent(new CustomEvent("muha-bingo-special-balls-changed", { detail: settings }));
  }

  function numberCellValue(cell) {
    const value = Number(cell.querySelector("strong")?.textContent?.trim());
    return value >= 1 && value <= 75 ? value : null;
  }

  function syncSpecialBallStamps() {
    specialBallSyncFrame = 0;
    const activeBalls = activeSpecialBalls();
    const activeNumbers = new Map();
    activeBalls.forEach((ball) => {
      const matches = activeNumbers.get(ball.number) || [];
      matches.push(ball);
      activeNumbers.set(ball.number, matches);
    });
    const cards = document.querySelectorAll("#app .bingo-card:not(.preview-card):not(.verification-full-card)");

    cards.forEach((card) => {
      card.querySelectorAll(".number-cell").forEach((cell) => {
        const balls = activeNumbers.get(numberCellValue(cell)) || [];
        const wasAutomatic = cell.classList.contains("special-ball-auto-stamped");
        if (!balls.length) {
          if (wasAutomatic && cell.classList.contains("marked") && !cell.classList.contains("called")) cell.click();
          cell.classList.remove("special-ball-auto-stamped", "hot-ball-stamp", "birthday-ball-stamp");
          cell.removeAttribute("data-special-ball-prize");
          if (cell.dataset.specialBallOriginalAria != null) {
            if (cell.dataset.specialBallOriginalAria) cell.setAttribute("aria-label", cell.dataset.specialBallOriginalAria);
            else cell.removeAttribute("aria-label");
            delete cell.dataset.specialBallOriginalAria;
          }
          return;
        }

        cell.classList.toggle("hot-ball-stamp", balls.some((ball) => ball.kind === "hot"));
        cell.classList.toggle("birthday-ball-stamp", balls.some((ball) => ball.kind === "birthday"));
        cell.dataset.specialBallPrize = balls.map((ball) => `${ball.label} · ${ball.multiplier}× prize`).join(" + ");
        if (cell.dataset.specialBallOriginalAria == null) {
          cell.dataset.specialBallOriginalAria = cell.getAttribute("aria-label") || "";
        }
        cell.setAttribute("aria-label", balls.map((ball) =>
          `${ball.label} ${ball.number}, automatically stamped, ${ball.multiplier} times prize`
        ).join("; "));
        if (!cell.matches(".marked, .called, .free")) {
          cell.classList.add("special-ball-auto-stamped");
          cell.click();
        }
      });
    });
  }

  function queueSpecialBallSync() {
    if (specialBallSyncFrame) return;
    specialBallSyncFrame = window.requestAnimationFrame(syncSpecialBallStamps);
  }

  function observeSpecialBalls() {
    const app = document.querySelector("#app");
    if (app && app.dataset.specialBallObserver !== "true") {
      app.dataset.specialBallObserver = "true";
      new MutationObserver(() => {
        enhanceSpecialBallSettings();
        queueSpecialBallSync();
        syncStartButtons();
      }).observe(app, { childList: true, subtree: true });
    }
    window.setInterval(() => {
      enhanceSpecialBallSettings();
      queueSpecialBallSync();
      syncOtherThemeWaitingFlashboard();
      window.dispatchEvent(new CustomEvent("muha-bingo-special-balls-changed"));
    }, 60000);
    queueSpecialBallSync();
  }

  function renderOtherThemeNumberBoard(board) {
    if (!board) return;
    const called = calledNumbers();
    board.replaceChildren();
    for (let number = 1; number <= 75; number += 1) {
      const cell = document.createElement("span");
      cell.textContent = String(number);
      cell.classList.toggle("called", called.has(number));
      board.append(cell);
    }
  }

  function syncOtherThemeWaitingFlashboard() {
    const board = document.querySelector(".other-theme-waiting-flashboard");
    if (!board) return;
    const settings = specialBallSettings();
    const selectedTheme = document.documentElement.dataset.bingoTheme;
    const shouldShow = !isPopout
      && settings.showOtherThemesFlashboard
      && selectedTheme === "classic"
      && !document.documentElement.classList.contains("dealer-round-active")
      && !document.documentElement.classList.contains("dealer-overlay-open");
    board.hidden = !shouldShow;
    if (!shouldShow) return;

    const headerBottom = Math.max(0, Math.ceil(document.querySelector("#app .topbar")?.getBoundingClientRect().bottom || 0));
    board.style.setProperty("--other-flashboard-top", `${headerBottom}px`);
    const activeBirthday = birthdayBallIsActive(settings);
    const hot = board.querySelector(".other-hot-ball");
    const birthday = board.querySelector(".other-birthday-ball");
    hot.querySelector(".special-waiting-ball").textContent = settings.hotEnabled ? String(settings.hotNumber) : "—";
    hot.querySelector("small").textContent = settings.hotEnabled ? `${settings.hotMultiplier}× PRIZE` : "OFF";
    hot.classList.toggle("is-active", Boolean(settings.hotEnabled));
    birthday.querySelector(".special-waiting-ball").textContent = activeBirthday ? String(settings.birthdayNumber) : "—";
    birthday.querySelector("small").textContent = activeBirthday
      ? `${settings.birthdayMultiplier}× PRIZE · ACTIVE TODAY`
      : settings.birthdayEnabled ? "SCHEDULED" : "OFF";
    birthday.classList.toggle("is-active", activeBirthday);
    renderOtherThemeNumberBoard(board.querySelector(".other-theme-number-board"));
  }

  function mountOtherThemeWaitingFlashboard() {
    if (isPopout || document.querySelector(".other-theme-waiting-flashboard")) return;
    const board = document.createElement("section");
    board.className = "other-theme-waiting-flashboard";
    board.hidden = true;
    board.setAttribute("aria-label", "Waiting for Dealer flashboard");
    board.innerHTML = `
      <header>
        <div class="special-waiting-feature other-hot-ball">
          <span class="special-waiting-ball" aria-hidden="true">—</span>
          <strong>HOT BALL</strong>
          <small>OFF</small>
        </div>
        <div class="other-waiting-message">
          <strong>WAITING FOR DEALER TO START GAME</strong>
          <span>The flashboard will update when number calling begins.</span>
        </div>
        <div class="special-waiting-feature other-birthday-ball">
          <span class="special-waiting-ball" aria-hidden="true">—</span>
          <strong>BIRTHDAY BALL</strong>
          <small>OFF</small>
        </div>
      </header>
      <div class="other-theme-number-board" aria-label="Bingo numbers 1 through 75"></div>`;
    document.body.append(board);
    window.addEventListener("resize", syncOtherThemeWaitingFlashboard, { passive: true });
    syncOtherThemeWaitingFlashboard();
  }

  function storedPositiveInteger(key, fallback) {
    try {
      const value = Number(window.localStorage.getItem(key));
      return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function cardSerialSettings() {
    return {
      start: storedPositiveInteger(CARD_SERIAL_START_STORAGE_KEY, 1),
      step: storedPositiveInteger(CARD_SERIAL_STEP_STORAGE_KEY, 1),
    };
  }

  function syncCardSerials() {
    const { start, step } = cardSerialSettings();
    document.querySelectorAll("#app .bingo-card:not(.preview-card):not(.verification-full-card)").forEach((card, index) => {
      const cardId = card.querySelector(".card-id");
      const serial = `#${start + (index * step)}`;
      if (cardId && cardId.textContent !== serial) cardId.textContent = serial;
    });
  }

  function saveCardSerialSetting(event) {
    const input = event.target.closest("[data-card-serial-start], [data-card-serial-step]");
    if (!input) return;
    const value = Math.max(1, Math.trunc(Number(input.value) || 1));
    input.value = String(value);
    const key = input.matches("[data-card-serial-start]")
      ? CARD_SERIAL_START_STORAGE_KEY
      : CARD_SERIAL_STEP_STORAGE_KEY;
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // The dealer's value remains active in the current rendered setup.
    }
    syncCardSerials();
  }

  function readSchedule() {
    try {
      const entries = JSON.parse(window.localStorage.getItem(SCHEDULE_STORAGE_KEY) || "[]");
      return Array.isArray(entries) ? entries.filter((entry) => entry?.title && (entry.date || entry.time)) : [];
    } catch {
      return [];
    }
  }

  function writeSchedule(entries) {
    try {
      window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // The schedule remains available in the current rendered view.
    }
  }

  function scheduleWhen(entry) {
    const parts = [];
    if (entry.date) {
      const date = new Date(`${entry.date}T12:00:00`);
      parts.push(Number.isNaN(date.getTime()) ? entry.date : date.toLocaleDateString(undefined, {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
      }));
    }
    if (entry.time) {
      const time = new Date(`2000-01-01T${entry.time}`);
      parts.push(Number.isNaN(time.getTime()) ? entry.time : time.toLocaleTimeString(undefined, {
        hour: "numeric", minute: "2-digit",
      }));
    }
    return parts.join(" at ");
  }

  function scheduleListMarkup(entries, editable = false) {
    if (!entries.length) return '<p class="bingo-schedule-empty">No Bingo events have been scheduled.</p>';
    return `<ul class="bingo-schedule-list">${entries.map((entry) => `
      <li>
        <span><strong>${escapeScheduleText(entry.title)}</strong><small>${escapeScheduleText(scheduleWhen(entry))}${entry.autoStart ? " · Automatic start" : ""}</small></span>
        ${editable ? `<button type="button" data-schedule-delete="${escapeScheduleText(entry.id)}" aria-label="Delete ${escapeScheduleText(entry.title)}">Delete</button>` : ""}
      </li>`).join("")}</ul>`;
  }

  function escapeScheduleText(value) {
    const element = document.createElement("span");
    element.textContent = String(value || "");
    return element.innerHTML;
  }

  function renderSchedule() {
    const entries = readSchedule();
    document.querySelectorAll("[data-schedule-list]").forEach((list) => {
      list.innerHTML = scheduleListMarkup(entries, list.dataset.scheduleList === "editable");
    });
  }

  function enhanceDealerSchedule() {
    const layout = document.querySelector("#app .dealer-layout");
    if (!layout || layout.querySelector(".bingo-schedule-editor")) return;
    const editor = document.createElement("section");
    editor.className = "dealer-card bingo-schedule-editor";
    editor.innerHTML = `
      <div class="bingo-schedule-heading">
        <span class="eyebrow">EVENT SCHEDULE</span>
        <h2>Schedule Bingo events</h2>
        <p>Set when each game begins and choose whether the Dealer starts it automatically.</p>
      </div>
      <form class="bingo-schedule-form" novalidate>
        <label><span>Event title <b aria-hidden="true">*</b></span><input name="title" type="text" required maxlength="80" placeholder="Saturday Night Bingo"></label>
        <label><span>Date</span><input name="date" type="date"></label>
        <label><span>Time</span><input name="time" type="time"></label>
        <label class="bingo-schedule-check"><input name="autoStart" type="checkbox"><span>Start automatically</span></label>
        <button type="submit">Add event</button>
        <p class="bingo-schedule-error" role="alert" hidden></p>
      </form>
      <div data-schedule-list="editable"></div>`;
    const hero = layout.querySelector(".dealer-hero");
    hero?.insertAdjacentElement("afterend", editor);
    if (!hero) layout.prepend(editor);
    editor.addEventListener("click", (event) => {
      const button = event.target.closest("[data-schedule-delete]");
      if (!button) return;
      event.stopPropagation();
      writeSchedule(readSchedule().filter((entry) => entry.id !== button.dataset.scheduleDelete));
      renderSchedule();
    });
    editor.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const form = event.currentTarget;
      const data = new FormData(form);
      const title = String(data.get("title") || "").trim();
      const date = String(data.get("date") || "");
      const time = String(data.get("time") || "");
      const autoStart = data.get("autoStart") === "on";
      const error = form.querySelector(".bingo-schedule-error");
      if (!title || (!date && !time) || (autoStart && (!date || !time))) {
        error.textContent = !title
          ? "Enter an event title."
          : autoStart && (!date || !time)
            ? "Automatic starts require both a date and time."
            : "Choose a date, a time, or both.";
        error.hidden = false;
        return;
      }
      error.hidden = true;
      const entries = readSchedule();
      entries.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, date, time, autoStart });
      writeSchedule(entries);
      form.reset();
      renderSchedule();
    });
    renderSchedule();
  }

  function readPrizes() {
    try {
      const prizes = JSON.parse(window.localStorage.getItem(PRIZES_STORAGE_KEY) || "[]");
      return Array.isArray(prizes) ? prizes.filter((prize) =>
        prize?.title && Number(prize.winner) > 0 && Number(prize.cardNumber) > 0
      ) : [];
    } catch {
      return [];
    }
  }

  function writePrizes(prizes) {
    try {
      window.localStorage.setItem(PRIZES_STORAGE_KEY, JSON.stringify(prizes));
    } catch {
      // Prize details remain available in the current rendered view.
    }
  }

  function prizeAssignment(prize) {
    const details = [`Winner ${Number(prize.winner)}`];
    details.push(`Card #${Number(prize.cardNumber)}`);
    if (Number(prize.amount) > 0) details.push(`${Number(prize.amount)} credits`);
    return details.join(" · ");
  }

  function escapePrizeText(value) {
    const safeText = document.createElement("span");
    safeText.textContent = String(value || "");
    return safeText.innerHTML;
  }

  function prizeListMarkup(prizes, editable = false) {
    if (!prizes.length) return '<p class="bingo-prizes-empty">No prizes have been assigned to winners.</p>';
    return `<ul class="bingo-prizes-list">${prizes.map((prize) => `
      <li>
        <span><strong>${escapePrizeText(prize.title)}</strong><small>${escapePrizeText(prizeAssignment(prize))}</small></span>
        ${editable ? `<button type="button" data-prize-delete="${escapePrizeText(prize.id)}" aria-label="Delete ${escapePrizeText(prize.title)}">Delete</button>` : ""}
      </li>`).join("")}</ul>`;
  }

  function renderPrizes() {
    const prizes = readPrizes();
    document.querySelectorAll("[data-prizes-list]").forEach((list) => {
      list.innerHTML = prizeListMarkup(prizes, list.dataset.prizesList === "editable");
    });
  }

  window.bingoPrizeForWinner = (winnerNumber, cardNumber, fallbackPrize = 0) => {
    const winner = Math.max(1, Math.trunc(Number(winnerNumber) || 1));
    const card = Math.max(0, Math.trunc(Number(cardNumber) || 0));
    const configured = readPrizes().find((prize) =>
      Number(prize.winner) === winner && (!Number(prize.cardNumber) || Number(prize.cardNumber) === card)
    );
    return configured && Number(prizeAmount(configured)) >= 0
      ? prizeAmount(configured)
      : Number(fallbackPrize) || 0;
  };

  function prizeAmount(prize) {
    return Math.max(0, Math.trunc(Number(prize?.amount) || 0));
  }

  function enhanceDealerPrizes() {
    const layout = document.querySelector("#app .dealer-layout");
    if (!layout || layout.querySelector(".bingo-prizes-editor")) return;
    const editor = document.createElement("section");
    editor.className = "dealer-card bingo-prizes-editor";
    editor.innerHTML = `
      <div class="bingo-prizes-heading">
        <span class="eyebrow">PRIZE SCHEDULE</span>
        <h2>Assign prizes to winners</h2>
        <p>Give each winner an individual prize and assign the exact card number that receives it.</p>
      </div>
      <form class="bingo-prizes-form" novalidate>
        <label><span>Prize title <b aria-hidden="true">*</b></span><input name="title" type="text" required maxlength="80" placeholder="Grand prize drawing"></label>
        <label><span>Winner number</span><input name="winner" type="number" min="1" max="100" step="1" value="1" required></label>
        <label><span>Winning card number</span><input name="cardNumber" type="number" min="1" max="999999" step="1" required></label>
        <label><span>Prize credits</span><input name="amount" type="number" min="0" max="999999" step="1" value="100"></label>
        <button type="submit">Add prize</button>
        <p class="bingo-prizes-error" role="alert" hidden></p>
      </form>
      <div data-prizes-list="editable"></div>`;
    const scheduleEditor = layout.querySelector(".bingo-schedule-editor");
    if (scheduleEditor) scheduleEditor.insertAdjacentElement("afterend", editor);
    else layout.prepend(editor);
    editor.addEventListener("click", (event) => {
      const button = event.target.closest("[data-prize-delete]");
      if (!button) return;
      event.stopPropagation();
      writePrizes(readPrizes().filter((prize) => prize.id !== button.dataset.prizeDelete));
      renderPrizes();
    });
    editor.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const form = event.currentTarget;
      const data = new FormData(form);
      const title = String(data.get("title") || "").trim();
      const winner = Math.max(1, Math.trunc(Number(data.get("winner")) || 1));
      const cardNumber = Math.max(0, Math.trunc(Number(data.get("cardNumber")) || 0));
      const amount = Math.max(0, Math.trunc(Number(data.get("amount")) || 0));
      const error = form.querySelector(".bingo-prizes-error");
      if (!title || !cardNumber) {
        error.textContent = !title ? "Enter a prize title." : "Enter the winning card number.";
        error.hidden = false;
        return;
      }
      error.hidden = true;
      const prizes = readPrizes();
      prizes.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, winner, cardNumber, amount });
      writePrizes(prizes);
      form.reset();
      renderPrizes();
    });
    renderPrizes();
  }

  function requestedDealerSection() {
    try {
      return window.localStorage.getItem(DEALER_SECTION_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function revealRequestedDealerSection() {
    const selector = requestedDealerSection();
    const section = selector ? document.querySelector(selector) : null;
    if (!section) return false;
    try {
      window.localStorage.removeItem(DEALER_SECTION_STORAGE_KEY);
    } catch {
      // Scrolling still works when storage is unavailable.
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    section.querySelector("input, button")?.focus({ preventScroll: true });
    return true;
  }

  function openDealerSection(selector) {
    try {
      window.localStorage.setItem(DEALER_SECTION_STORAGE_KEY, selector);
    } catch {
      // The current window can still reveal its Dealer section.
    }
    const opened = openDealerWindow();
    if (!opened) return;
    let attempts = 0;
    const reveal = () => {
      attempts += 1;
      if (!revealRequestedDealerSection() && attempts < 30) window.setTimeout(reveal, 100);
    };
    window.setTimeout(reveal, 100);
  }

  function scheduledStartTimestamp(entry) {
    if (!entry.autoStart || !entry.date || !entry.time) return Number.NaN;
    return new Date(`${entry.date}T${entry.time}`).getTime();
  }

  function readStartedSchedules() {
    try {
      const ids = JSON.parse(window.localStorage.getItem(SCHEDULE_STARTED_STORAGE_KEY) || "[]");
      return new Set(Array.isArray(ids) ? ids : []);
    } catch {
      return new Set();
    }
  }

  function writeStartedSchedules(ids) {
    try {
      window.localStorage.setItem(SCHEDULE_STARTED_STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // This window still prevents repeat starts during the current check.
    }
  }

  async function startDueScheduledGame() {
    if (isPopout || calledNumbers().size > 0) return;
    const cardsExist = Boolean(document.querySelector("#app .bingo-card:not(.preview-card):not(.verification-full-card)"));
    if (!cardsExist) return;
    const now = Date.now();
    const started = readStartedSchedules();
    const due = readSchedule().find((entry) => {
      const timestamp = scheduledStartTimestamp(entry);
      return Number.isFinite(timestamp) && timestamp <= now && now - timestamp < 86_400_000 && !started.has(entry.id);
    });
    if (!due) return;
    started.add(due.id);
    writeStartedSchedules(started);
    const didStart = await startOrPausePreparedRound();
    if (!didStart) {
      started.delete(due.id);
      writeStartedSchedules(started);
    }
  }

  function monitorScheduledStarts() {
    if (document.documentElement.dataset.scheduleMonitor === "true") return;
    document.documentElement.dataset.scheduleMonitor = "true";
    startDueScheduledGame();
    window.setInterval(startDueScheduledGame, 15_000);
  }

  function readIncorrectBingoState() {
    try {
      return {
        count: 0,
        lastCallCount: 0,
        lastClaimCall: 0,
        ...JSON.parse(window.localStorage.getItem(INCORRECT_BINGO_STORAGE_KEY) || "{}"),
      };
    } catch {
      return { count: 0, lastCallCount: 0, lastClaimCall: 0 };
    }
  }

  function saveIncorrectBingoState(state, announce = false) {
    try {
      window.localStorage.setItem(INCORRECT_BINGO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The current window can still show the tally without persistent storage.
    }
    incorrectBingoChannel?.postMessage({ type: "incorrect-bingo-state", state, announce });
    renderIncorrectBingoTally(state, announce);
  }

  function incorrectBingoPanel(className = "", tagName = "section") {
    const panel = document.createElement(tagName);
    panel.className = `incorrect-bingo-tally ${className}`.trim();
    panel.innerHTML = "<span>Incorrect Bingo calls</span><strong>0</strong><small>Claims checked and rejected</small>";
    return panel;
  }

  function renderIncorrectBingoTally(state = readIncorrectBingoState(), announce = false) {
    const dealerStats = document.querySelector("#app .dealer-stats");
    if (dealerStats && !dealerStats.querySelector(".incorrect-bingo-tally")) {
      dealerStats.append(incorrectBingoPanel("dealer-incorrect-bingo"));
    }
    const audienceWinners = document.querySelector("#app .audience-winners");
    if (audienceWinners && !audienceWinners.querySelector(".incorrect-bingo-tally")) {
      audienceWinners.append(incorrectBingoPanel("audience-incorrect-bingo", "div"));
    }
    document.querySelectorAll(".incorrect-bingo-tally strong").forEach((value) => {
      const next = String(state.count);
      if (value.textContent !== next) value.textContent = next;
    });

    if (!announce) return;
    let alert = document.querySelector(".incorrect-bingo-alert");
    if (!alert) {
      alert = document.createElement("div");
      alert.className = "incorrect-bingo-alert";
      alert.setAttribute("role", "status");
      alert.innerHTML = "<strong>INCORRECT BINGO</strong><span>Claim checked and rejected</span>";
      document.body.append(alert);
    }
    alert.classList.add("show");
    window.clearTimeout(Number(alert.dataset.hideTimer || 0));
    alert.dataset.hideTimer = String(window.setTimeout(() => alert.classList.remove("show"), 4200));
  }

  function syncIncorrectBingoClaims() {
    const callCount = calledNumbers().size;
    const state = readIncorrectBingoState();
    if (callCount === 0 && state.lastCallCount > 0) {
      saveIncorrectBingoState({ count: 0, lastCallCount: 0, lastClaimCall: 0 });
      return;
    }
    if (isPopout || callCount <= state.lastCallCount) {
      renderIncorrectBingoTally(state);
      return;
    }

    state.lastCallCount = callCount;
    saveIncorrectBingoState(state);
  }

  function recordManualClaimDecision(event) {
    const rejectButton = event.target.closest("#app .verify-reject");
    if (!rejectButton || rejectButton.dataset.incorrectBingoRecorded === "true") return;
    rejectButton.dataset.incorrectBingoRecorded = "true";

    const state = readIncorrectBingoState();
    const callCount = calledNumbers().size;
    state.count += 1;
    state.lastCallCount = Math.max(state.lastCallCount, callCount);
    state.lastClaimCall = callCount;
    saveIncorrectBingoState(state, true);
  }

  incorrectBingoChannel?.addEventListener("message", (event) => {
    if (event.data?.type !== "incorrect-bingo-state") return;
    renderIncorrectBingoTally(event.data.state, event.data.announce);
  });

  window.addEventListener("storage", (event) => {
    if ([CARD_SERIAL_START_STORAGE_KEY, CARD_SERIAL_STEP_STORAGE_KEY].includes(event.key)) {
      syncCardSerials();
      return;
    }
    if (event.key !== INCORRECT_BINGO_STORAGE_KEY || !event.newValue) return;
    try {
      renderIncorrectBingoTally(JSON.parse(event.newValue));
    } catch {
      // Ignore an incomplete cross-window update.
    }
  });

  async function purchaseCards(cardCount) {
    const count = Math.max(1, Math.min(6, Number(cardCount) || 1));
    try {
      window.localStorage.setItem(CARD_COUNT_STORAGE_KEY, String(count));
    } catch {
      // The purchase can still complete when preference storage is unavailable.
    }

    const dealerOpened = openDealerWindow();
    if (!dealerOpened || !await ensureSetupOpen(2000)) return false;
    setSetupNumber(/^players$/i, 1);
    setSetupNumber(/^cards per player$/i, count);
    setSetupNumber(/^starting credits$/i, UNLIMITED_CREDITS);
    setSetupNumber(/^card cost$/i, 1);
    setSetupNumber(/^maximum winners$/i, 1);

    const prepared =
      await waitAndClickSelector("#app .setup-round-btn", 2400) ||
      await waitAndClick(/apply\s*&\s*start round/i, 1200);
    if (!prepared) return false;
    await waitAndClickSelector("#app .prompt-confirm-btn", 1800);
    const cardsReady = await waitForPlayerCards(3500);
    await returnToPlayerHall();
    showUnlimitedCredits();
    return cardsReady;
  }

  function waitForPlayerCards(timeoutMs = 3000) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const attempt = () => {
        const cardsExist = Boolean(document.querySelector(
          "#app .bingo-card:not(.preview-card):not(.verification-full-card)"
        ));
        if (cardsExist || Date.now() - startedAt >= timeoutMs) {
          resolve(cardsExist);
          return;
        }
        window.setTimeout(attempt, 60);
      };
      attempt();
    });
  }

  async function returnToPlayerHall() {
    await waitAndClick(/^player floor$/i, 1200);
  }

  async function prepareAndStartDefaultRound() {
    if (typeof window.bingoHallStart === "function") {
      return window.bingoHallStart();
    }

    const dealerOpened = await waitAndClick(/^dealer console$/i, 1200);
    if (!dealerOpened) return false;

    const setupButton = await ensureSetupOpen();
    if (!setupButton) return false;
    applyDefaultSetupValues();

    const roundPrepared =
      await waitAndClickSelector("#app .setup-round-btn", 2400) ||
      await waitAndClick(/apply\s*&\s*start round/i, 1200);
    if (!roundPrepared) return false;
    await waitAndClickSelector("#app .prompt-confirm-btn", 1800);
    if (!await waitForPlayerCards()) return false;

    const callingStarted =
      await waitAndClickSelector("#app .btn-auto", 2400) ||
      await waitAndClick(/^▶?\s*start automatic play$|^start auto call$/i, 1200) ||
      await waitAndClickSelector("#app .btn-call", 1000) ||
      await waitAndClick(/call random ball|call next number/i, 1000);
    await returnToPlayerHall();
    return callingStarted;
  }

  async function startOrPausePreparedRound() {
    const dealerOpened = await waitAndClick(/^dealer console$/i, 1200);
    if (!dealerOpened) return false;

    const newRoundButton = document.querySelector(
      "#app .dealer-new-round:not(:disabled), #app .round-complete-alert button:not(:disabled)"
    );
    if (newRoundButton) {
      newRoundButton.click();
      await waitAndClickSelector("#app .prompt-confirm-btn", 1800);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      return prepareAndStartDefaultRound();
    }

    const toggled =
      await waitAndClickSelector("#app .btn-auto", 1800) ||
      await waitAndClick(/^■?\s*stop automatic play$|^pause auto call$/i, 1000) ||
      await waitAndClick(/^▶?\s*start automatic play$|^start auto call$/i, 1000) ||
      await waitAndClickSelector("#app .btn-call", 1000) ||
      await waitAndClick(/call random ball|call next number/i, 1000);
    await returnToPlayerHall();
    return toggled;
  }

  function openDealerWindow() {
    let usePopout = false;
    try {
      usePopout = window.localStorage.getItem(DEALER_POPOUT_STORAGE_KEY) === "true";
    } catch {
      // The full-screen Dealer overlay remains the default.
    }
    // Planet Hall 2's red DEALER control is the in-window console action.
    if (document.documentElement.dataset.bingoTheme === "planet") usePopout = false;
    if (!usePopout) {
      const opened = clickMatchingControl(/^dealer console$/i);
      // Hall 2 normally hides #app, so reveal it only after Vue switches views.
      if (opened) document.documentElement.classList.add("dealer-overlay-open");
      return opened;
    }
    const popup = window.bingoApi?.openScreen?.("dealer");
    if (!popup) {
      showHallMessage(
        "DEALER WINDOW BLOCKED",
        "Allow pop-ups for Muha Casino, then press DEALER or CONTROLS again."
      );
      return false;
    }
    return true;
  }

  function showHallMessage(title, message) {
    let dialog = document.querySelector(".player-hall-dialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.className = "player-hall-dialog";
      dialog.innerHTML = `
        <section role="dialog" aria-modal="true" aria-labelledby="hall-dialog-title">
          <header id="hall-dialog-title"></header>
          <p></p>
          <button type="button">CONFIRM</button>
        </section>
      `;
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog || event.target.closest("section > button")) dialog.hidden = true;
      });
      document.body.append(dialog);
    }
    dialog.querySelector("header").textContent = title;
    dialog.querySelector("p").textContent = message;
    dialog.hidden = false;
  }

  function handleHallAction(action) {
    if (action === "start") {
      openDealerWindow();
      const cardsExist = Boolean(document.querySelector(
        "#app .bingo-card:not(.preview-card):not(.verification-full-card)"
      ));
      if (!cardsExist) {
        showHallMessage(
          "SETUP REQUIRED",
          "Complete Dealer Setup and prepare player cards before starting the game."
        );
        return;
      }

      startOrPausePreparedRound().then((started) => {
        if (started) {
          setHallControlsCollapsed(true);
        } else {
          showHallMessage(
            "START GAME",
            "The Bingo engine is still loading. Wait a moment and press Start Game again."
          );
        }
      });
      return;
    }

    if (action === "dealer") {
      openDealerWindow();
      return;
    }

    if (action === "view") {
      openViewOverlay();
      return;
    }

    if (action === "options") {
      openDaubOptions();
      return;
    }

    if (action === "purchase") {
      openPurchaseOverlay();
      return;
    }

    if (action === "next") {
      const next = document.querySelector(".card-pager button:last-of-type");
      if (next && !next.disabled) next.click();
      else showHallMessage("NEXT", "There are no additional card pages to display.");
      return;
    }

    if (action === "schedule") {
      openScheduleOverlay();
      return;
    }

    if (action === "prizes") {
      openPrizesOverlay();
      return;
    }

    if (action === "trade") {
      showHallMessage("BONANZA TRADE", "Card trading opens after cards are prepared and before number calling begins.");
    }
  }

  function mountPlayerHallControls() {
    if (document.querySelector(".player-hall-controls")) return;
    const controlsMarkup = `
      <button class="hall-start-button" type="button" data-hall-action="start"><i class="bi bi-play-fill" aria-hidden="true"></i><span>PLAY SESSION</span></button>
      <button class="hall-dealer-button" type="button" data-hall-action="dealer"><i class="bi bi-person-badge-fill" aria-hidden="true"></i><span>DEALER</span></button>
      <button type="button" data-hall-action="view"><i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i><span>VIEW</span></button>
      <button type="button" data-hall-action="options"><i class="bi bi-gear-fill" aria-hidden="true"></i><span>OPTIONS</span></button>
      <button type="button" data-hall-action="purchase"><i class="bi bi-cart-fill" aria-hidden="true"></i><span>PURCHASE</span></button>
      <button type="button" data-hall-action="schedule"><i class="bi bi-calendar3" aria-hidden="true"></i><span>SCHEDULE</span></button>
      <button type="button" data-hall-action="prizes"><i class="bi bi-trophy-fill" aria-hidden="true"></i><span>PRIZES</span></button>
      <button type="button" data-hall-action="trade" disabled aria-label="Bonanza Trade unavailable" title="Coming soon"><i class="bi bi-arrow-left-right" aria-hidden="true"></i><span>BONANZA TRADE</span></button>
      <button type="button" data-hall-action="next" disabled aria-label="Next unavailable" title="Coming soon"><span>NEXT</span><i class="bi bi-arrow-right" aria-hidden="true"></i></button>
    `;
    const classicControls = document.createElement("nav");
    classicControls.className = "player-hall-controls classic-hall-controls";
    classicControls.setAttribute("aria-label", "Bingo Hall controls");
    classicControls.innerHTML = `
      <button class="hall-panel-close" type="button" aria-label="Hide Hall controls">
        <i class="bi bi-caret-right-fill" aria-hidden="true"></i><span>HIDE CONTROLS</span>
      </button>
      ${controlsMarkup}
    `;
    classicControls.querySelector(".hall-panel-close")?.addEventListener("click", () => {
      setHallControlsCollapsed(true);
    });

    const positionClassicControls = () => {
      const header = document.querySelector("#app .topbar");
      const headerBottom = Math.max(12, Math.ceil(header?.getBoundingClientRect().bottom || 0) + 10);
      classicControls.style.setProperty("--hall-controls-safe-top", `${headerBottom}px`);
    };
    window.addEventListener("resize", positionClassicControls, { passive: true });
    if (window.ResizeObserver) {
      const headerResizeObserver = new ResizeObserver(positionClassicControls);
      const header = document.querySelector("#app .topbar");
      if (header) headerResizeObserver.observe(header);
    }
    window.requestAnimationFrame(positionClassicControls);

    const planetControls = document.createElement("nav");
    planetControls.className = "player-hall-controls planet-footer-controls";
    planetControls.setAttribute("aria-label", "Planet Hall 2 controls");
    planetControls.innerHTML = `
      <button class="hall-start-button" type="button" data-hall-action="start"><i class="bi bi-play-fill" aria-hidden="true"></i><span>PLAY SESSION</span></button>
      <button class="hall-dealer-button" type="button" data-hall-action="dealer"><i class="bi bi-person-badge-fill" aria-hidden="true"></i><span>DEALER</span></button>
      <button type="button" data-hall-action="view"><i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i><span>VIEW</span></button>
      <button type="button" data-hall-action="options"><i class="bi bi-gear-fill" aria-hidden="true"></i><span>OPTIONS</span></button>
      <button type="button" data-hall-action="purchase"><i class="bi bi-cart-fill" aria-hidden="true"></i><span>PURCHASE</span></button>
      <button type="button" data-hall-action="schedule"><i class="bi bi-calendar3" aria-hidden="true"></i><span>SCHEDULE</span></button>
      <button type="button" data-hall-action="prizes"><i class="bi bi-trophy-fill" aria-hidden="true"></i><span>PRIZES</span></button>
      <button type="button" data-hall-action="trade" disabled aria-label="Bonanza Trade unavailable" title="Coming soon"><i class="bi bi-arrow-left-right" aria-hidden="true"></i><span>BONANZA TRADE</span></button>
      <button type="button" data-hall-action="next" disabled aria-label="Next unavailable" title="Coming soon"><span>NEXT</span><i class="bi bi-arrow-right" aria-hidden="true"></i></button>
    `;

    [classicControls, planetControls].forEach((controls) => {
      controls.addEventListener("click", (event) => {
        const button = event.target.closest("[data-hall-action]");
        if (button) handleHallAction(button.dataset.hallAction);
      });
      document.body.append(controls);
    });

    const universalDock = document.createElement("nav");
    universalDock.className = "universal-controls-dock";
    universalDock.setAttribute("aria-label", "Player Hall actions");
    document.body.append(universalDock);

    const universalStart = document.createElement("button");
    universalStart.className = "universal-start-button";
    universalStart.type = "button";
    universalStart.dataset.hallAction = "start";
    universalStart.innerHTML = '<i class="bi bi-play-fill" aria-hidden="true"></i><span>START GAME</span>';
    universalStart.addEventListener("click", () => handleHallAction("start"));
    universalDock.append(universalStart);

    const universalPurchase = document.createElement("button");
    universalPurchase.className = "universal-purchase-button";
    universalPurchase.type = "button";
    universalPurchase.dataset.hallAction = "purchase";
    universalPurchase.innerHTML = '<i class="bi bi-cart-fill" aria-hidden="true"></i><span>PURCHASE</span>';
    universalPurchase.addEventListener("click", () => handleHallAction("purchase"));
    universalDock.prepend(universalPurchase);

    const controlsToggle = document.createElement("button");
    controlsToggle.className = "hall-controls-toggle";
    controlsToggle.type = "button";
    controlsToggle.addEventListener("click", () => {
      const shouldCollapse = !document.documentElement.classList.contains("hall-controls-collapsed");
      setHallControlsCollapsed(shouldCollapse);
    });
    document.body.append(controlsToggle);
    setHallControlsCollapsed(false);
  }

  function calledNumbers() {
    const values = new Set();
    document.querySelectorAll("#app .number-cell.called strong").forEach((element) => {
      const value = Number(element.textContent.trim());
      if (value >= 1 && value <= 75) values.add(value);
    });
    return values;
  }

  function renderFlashboard() {
    const board = document.querySelector(".view-flashboard-grid");
    if (!board) return;
    const called = calledNumbers();
    board.replaceChildren();
    for (let row = 1; row <= 15; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const number = row + column * 15;
        const cell = document.createElement("span");
        cell.textContent = String(number);
        cell.classList.toggle("called", called.has(number));
        board.append(cell);
      }
    }
  }

  function selectCardView(count) {
    const selectedCount = Math.max(1, Math.min(6, Number(count) || 1));
    currentViewCount = selectedCount;
    const source = [...document.querySelectorAll("#app .view-control button")]
      .find((button) => button.textContent.trim() === String(selectedCount));
    if (source) source.click();
    document.querySelectorAll("[data-card-count]").forEach((button) => {
      const isActive = Number(button.dataset.cardCount) === selectedCount;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    try {
      window.localStorage.setItem(VIEW_COUNT_STORAGE_KEY, String(selectedCount));
    } catch {
      // Card view remains usable when storage is unavailable.
    }
    document.querySelector(".bingo-view-overlay").hidden = true;
  }

  function savedCount(key, fallback = 3) {
    try {
      const value = Number(window.localStorage.getItem(key));
      return value >= 1 && value <= 6 ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function restoreCardView() {
    const selectedCount = currentViewCount;
    const source = [...document.querySelectorAll("#app .view-control button")]
      .find((button) => button.textContent.trim() === String(selectedCount));
    if (!source) return false;
    if (source.getAttribute("aria-pressed") !== "true" && !source.classList.contains("active")) source.click();
    document.querySelectorAll("[data-card-count]").forEach((button) => {
      const isActive = Number(button.dataset.cardCount) === selectedCount;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    return true;
  }

  function cardsPerPlayerInput() {
    return [...document.querySelectorAll("#app label")].find((label) =>
      /cards per player/i.test(label.textContent)
    )?.querySelector("input");
  }

  function restoreCardCount() {
    const input = cardsPerPlayerInput();
    if (!input || input.dataset.savedCardCountRestored === "true") return Boolean(input);
    input.dataset.savedCardCountRestored = "true";
    const count = savedCount(CARD_COUNT_STORAGE_KEY);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, String(count));
    else input.value = String(count);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function saveCardCount(event) {
    const input = cardsPerPlayerInput();
    if (!input || event.target !== input) return;
    const count = Math.max(1, Math.min(6, Number(input.value) || 1));
    try {
      window.localStorage.setItem(CARD_COUNT_STORAGE_KEY, String(count));
    } catch {
      // Setup remains usable when storage is unavailable.
    }
  }

  function saveNativeCardView(event) {
    const button = event.target.closest("#app .view-control button");
    if (!button) return;
    const count = Number(button.textContent.trim());
    if (count < 1 || count > 6) return;
    currentViewCount = count;
    try {
      window.localStorage.setItem(VIEW_COUNT_STORAGE_KEY, String(count));
    } catch {
      // The selected view still works for the current session.
    }
    document.querySelectorAll("[data-card-count]").forEach((choice) => {
      const isActive = Number(choice.dataset.cardCount) === count;
      choice.classList.toggle("active", isActive);
      choice.setAttribute("aria-pressed", String(isActive));
    });
  }

  function updateBingoProximity() {
    const cards = [...document.querySelectorAll(
      "#app .bingo-card:not(.preview-card):not(.verification-full-card)"
    )];
    const winners = [];

    cards.forEach((card) => {
      const distanceValue = card.querySelector(".card-distance strong");
      const distanceText = distanceValue?.textContent?.trim() || "";
      const match = distanceText.match(/^(\d+)\s+(?:left until Bingo|Away)$/i);
      const away = /^Bingo!/i.test(distanceText) ? 0 : match ? Number(match[1]) : null;
      const distanceLabel = away === 0 ? "BINGO!" : away == null ? "" : `${away} Away`;
      if (distanceValue && distanceLabel && distanceValue.textContent !== distanceLabel) {
        distanceValue.textContent = distanceLabel;
      }
      card.classList.toggle("bingo-ready", away === 0);
      card.classList.toggle("near-bingo", away === 1 || away === 2);
      if (away == null) {
        if (card.hasAttribute("data-bingo-away")) card.removeAttribute("data-bingo-away");
      } else {
        const awayValue = String(away);
        if (card.dataset.bingoAway !== awayValue) card.dataset.bingoAway = awayValue;
      }

      let badge = card.querySelector(".bingo-proximity-badge");
      if (away != null && away <= 2) {
        if (!badge) {
          badge = document.createElement("strong");
          badge.className = "bingo-proximity-badge";
          card.querySelector(".card-top")?.append(badge);
        }
        const label = away === 0 ? "BINGO!" : `${away} AWAY`;
        if (badge.textContent !== label) badge.textContent = label;
      } else {
        badge?.remove();
      }

      if (away === 0) {
        const cardName = card.querySelector(".card-id")?.textContent?.trim() || `Card ${cards.indexOf(card) + 1}`;
        const cardNumbers = new Set([...card.querySelectorAll(".number-cell")].map(numberCellValue).filter(Boolean));
        const bonuses = activeSpecialBalls()
          .filter((ball) => cardNumbers.has(ball.number))
          .map((ball) => `${ball.label} ${ball.multiplier}× PRIZE`);
        winners.push(bonuses.length ? `${cardName} · ${bonuses.join(" + ")}` : cardName);
      }
    });

    let alert = document.querySelector(".bingo-win-alert");
    if (!alert) {
      alert = document.createElement("div");
      alert.className = "bingo-win-alert";
      alert.setAttribute("role", "alert");
      alert.setAttribute("aria-live", "assertive");
      alert.innerHTML = "<span>BINGO!</span><strong></strong>";
      document.body.append(alert);
    }
    const winnerText = winners.length ? `${winners.join(" · ")} has a winning pattern` : "";
    alert.hidden = winners.length === 0;
    if (alert.querySelector("strong").textContent !== winnerText) {
      alert.querySelector("strong").textContent = winnerText;
    }
    syncBingoCallHalt(winners.length > 0);
  }

  function syncBingoCallHalt(hasWinner) {
    const wasHalted = document.documentElement.classList.contains("bingo-call-halted");
    document.documentElement.classList.toggle("bingo-call-halted", hasWinner);

    if (hasWinner && !wasHalted) {
      const runningAutoCall = [...document.querySelectorAll("#app button")].find((button) =>
        /stop automatic play|pause auto call|pause automatic play/i.test(button.textContent)
      );
      runningAutoCall?.click();
    }

    document.querySelectorAll("#app button").forEach((button) => {
      if (!/call random ball|call next number|call number|call next target number|start number calling|start automatic play|start auto call/i.test(button.textContent)) return;
      if (hasWinner) {
        button.dataset.bingoCallHalted = "true";
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
      } else if (button.dataset.bingoCallHalted === "true") {
        delete button.dataset.bingoCallHalted;
        button.disabled = false;
        button.removeAttribute("aria-disabled");
      }
    });
  }

  function blockCallingShortcutAfterBingo(event) {
    if (!document.documentElement.classList.contains("bingo-call-halted")) return;
    if (event.code !== "Space" && !/^[pP]$/.test(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function syncStartButtons() {
    const controls = [...document.querySelectorAll("#app button")];
    const isRunning = controls.some((button) => /stop automatic play|pause auto call/i.test(button.textContent));
    const hasCards = Boolean(document.querySelector(
      "#app .bingo-card:not(.preview-card):not(.verification-full-card)"
    ));
    const label = isRunning ? "PAUSE SESSION" : hasCards ? "PLAY SESSION" : "START GAME";
    document.documentElement.classList.toggle(
      "dealer-round-active",
      isRunning || calledNumbers().size > 0
    );
    syncOtherThemeWaitingFlashboard();
    document.querySelectorAll("[data-hall-action='start'] span").forEach((span) => {
      if (span.textContent !== label) span.textContent = label;
    });
  }

  function restoreSavedPreferences() {
    applySolidColors();
    restoreCardView();
    restoreCardCount();
    updateBingoProximity();
    syncStartButtons();
    showUnlimitedCredits();
    enhanceDealerSetup();
    enhanceSpecialBallSettings();
    syncCardSerials();
    enhanceDealerSchedule();
    enhanceDealerPrizes();
    revealRequestedDealerSection();
    monitorScheduledStarts();
    syncIncorrectBingoClaims();
  }

  function openScheduleOverlay() {
    const overlay = document.querySelector(".bingo-schedule-overlay");
    if (!overlay) return;
    renderSchedule();
    overlay.hidden = false;
    overlay.querySelector("[data-schedule-close]")?.focus();
  }

  function mountScheduleOverlay() {
    if (document.querySelector(".bingo-schedule-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "bingo-schedule-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="bingo-schedule-title">
        <header>
          <span>PLANET HALL 2</span>
          <h2 id="bingo-schedule-title">Bingo Event Schedule</h2>
        </header>
        <div data-schedule-list></div>
        <footer><button type="button" data-schedule-dealer>Dealer schedule settings</button><button type="button" data-schedule-close>Close</button></footer>
      </section>`;
    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-schedule-dealer]")) {
        overlay.hidden = true;
        openDealerSection(".bingo-schedule-editor");
      } else if (event.target === overlay || event.target.closest("[data-schedule-close]")) overlay.hidden = true;
    });
    document.body.append(overlay);
    renderSchedule();
  }

  function openPrizesOverlay() {
    const overlay = document.querySelector(".bingo-prizes-overlay");
    if (!overlay) return;
    renderPrizes();
    overlay.hidden = false;
    overlay.querySelector("[data-prizes-close]")?.focus();
  }

  function mountPrizesOverlay() {
    if (document.querySelector(".bingo-prizes-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "bingo-prizes-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="bingo-prizes-title">
        <header>
          <span>BINGO PRIZES</span>
          <h2 id="bingo-prizes-title">Bingo Prize Schedule</h2>
        </header>
        <div data-prizes-list></div>
        <footer><button type="button" data-prizes-dealer>Dealer prize settings</button><button type="button" data-prizes-close>Close</button></footer>
      </section>`;
    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-prizes-dealer]")) {
        overlay.hidden = true;
        openDealerSection(".bingo-prizes-editor");
      } else if (event.target === overlay || event.target.closest("[data-prizes-close]")) overlay.hidden = true;
    });
    document.body.append(overlay);
    renderPrizes();
  }

  function openPurchaseOverlay() {
    const overlay = document.querySelector(".purchase-cards-overlay");
    if (!overlay) return;
    updatePurchaseQuantity(overlay, 1);
    overlay.hidden = false;
  }

  function updatePurchaseQuantity(overlay, requestedCount) {
    const count = Math.max(1, Math.min(6, Number(requestedCount) || 1));
    overlay.querySelector("[data-purchase-count]").value = String(count);
    overlay.querySelector("[data-purchase-quantity]").textContent = String(count);
    overlay.querySelector("[data-purchase-summary]").textContent = `${count} CREDIT${count === 1 ? "" : "S"}`;
    overlay.querySelector("[data-purchase-minus]").disabled = count <= 1;
    overlay.querySelector("[data-purchase-plus]").disabled = count >= 6;
  }

  function mountPurchaseOverlay() {
    if (document.querySelector(".purchase-cards-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "purchase-cards-overlay planet-purchase-terminal";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="purchase-cards-title">
        <header>
          <span>PLANET HALL 2 PLAYER STORE</span>
          <h2 id="purchase-cards-title">Add Cards for Purchase</h2>
        </header>
        <div class="purchase-table" role="group" aria-label="Bingo card order">
          <div class="purchase-table-head" aria-hidden="true">
            <span>GAME</span><span>PRICE</span><span>QUANTITY</span><span>PURCHASE</span>
          </div>
          <div class="purchase-item-row">
            <strong>Planet Hall Bingo Cards</strong>
            <span>1 CREDIT</span>
            <output data-purchase-quantity aria-live="polite">1</output>
            <div class="purchase-stepper">
              <button type="button" data-purchase-minus aria-label="Remove one card">−</button>
              <button type="button" data-purchase-plus aria-label="Add one card">+</button>
            </div>
          </div>
          <input type="hidden" data-purchase-count value="1">
          <div class="purchase-totals">
            <span>Balance:</span><strong>∞ CREDITS</strong>
            <span>Total:</span><strong data-purchase-summary>1 CREDIT</strong>
          </div>
        </div>
        <footer>
          <button type="button" data-purchase-cancel>← BACK</button>
          <button type="button" data-purchase-confirm>🛒 PURCHASE</button>
        </footer>
      </section>
    `;
    const countInput = overlay.querySelector("[data-purchase-count]");
    overlay.addEventListener("click", async (event) => {
      if (event.target === overlay || event.target.closest("[data-purchase-cancel]")) overlay.hidden = true;
      if (event.target.closest("[data-purchase-minus]")) {
        updatePurchaseQuantity(overlay, Number(countInput.value) - 1);
        return;
      }
      if (event.target.closest("[data-purchase-plus]")) {
        updatePurchaseQuantity(overlay, Number(countInput.value) + 1);
        return;
      }
      const confirm = event.target.closest("[data-purchase-confirm]");
      if (!confirm) return;
      confirm.disabled = true;
      confirm.textContent = "PREPARING CARDS…";
      const purchased = await purchaseCards(Number(countInput.value));
      confirm.disabled = false;
      confirm.textContent = "🛒 PURCHASE";
      overlay.hidden = true;
      showHallMessage(
        purchased ? "PURCHASE COMPLETE" : "PURCHASE NEEDS ATTENTION",
        purchased
          ? "Your cards are ready in the Player Hall. Your fake-credit balance remains unlimited."
          : "The Bingo setup did not finish. Open Controls / Setup and try the purchase again."
      );
    });
    document.body.append(overlay);
  }

  function openViewOverlay() {
    const overlay = document.querySelector(".bingo-view-overlay");
    if (!overlay) return;
    overlay.querySelector(".view-choice-panel").hidden = false;
    overlay.querySelector(".view-flashboard-panel").hidden = true;
    overlay.hidden = false;
  }

  function mountViewOverlay() {
    if (document.querySelector(".bingo-view-overlay")) return;

    const viewButton = document.createElement("button");
    viewButton.className = "universal-view-button";
    viewButton.type = "button";
    viewButton.innerHTML = '<i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i><span>VIEW</span>';
    viewButton.addEventListener("click", openViewOverlay);
    (document.querySelector(".universal-controls-dock") || document.body).append(viewButton);

    const overlay = document.createElement("div");
    overlay.className = "bingo-view-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="view-choice-panel" role="dialog" aria-modal="true" aria-labelledby="view-title">
        <header id="view-title">Select a card view:</header>
        <div>
          <button type="button" data-card-count="1">1 Card View</button>
          <button type="button" data-card-count="2">2 Card View</button>
          <button type="button" data-card-count="3">3 Card View</button>
          <button type="button" data-card-count="4">4 Card View</button>
          <button type="button" data-card-count="5">5 Card View</button>
          <button type="button" data-card-count="6">6 Card View</button>
          <button type="button" data-view-flashboard>Flashboard</button>
        </div>
        <footer><button type="button" data-view-close>CANCEL</button></footer>
      </section>
      <section class="view-flashboard-panel" hidden role="dialog" aria-modal="true" aria-label="Bingo flashboard">
        <header>FLASHBOARD <button type="button" data-view-back>BACK</button></header>
        <div class="view-flashboard-grid"></div>
        <footer><button type="button" data-view-close>CLOSE</button></footer>
      </section>
    `;
    overlay.addEventListener("click", (event) => {
      const countButton = event.target.closest("[data-card-count]");
      if (countButton) selectCardView(Number(countButton.dataset.cardCount));
      if (event.target.closest("[data-view-flashboard]")) {
        overlay.querySelector(".view-choice-panel").hidden = true;
        overlay.querySelector(".view-flashboard-panel").hidden = false;
        renderFlashboard();
      }
      if (event.target.closest("[data-view-back]")) {
        overlay.querySelector(".view-choice-panel").hidden = false;
        overlay.querySelector(".view-flashboard-panel").hidden = true;
      }
      if (event.target.closest("[data-view-close]") || event.target === overlay) overlay.hidden = true;
    });
    document.body.append(overlay);
    restoreCardView();

    const app = document.querySelector("#app");
    if (app) new MutationObserver(() => {
      if (!overlay.querySelector(".view-flashboard-panel").hidden) renderFlashboard();
      restoreSavedPreferences();
    }).observe(app, { childList: true, subtree: true, attributes: true });
  }

  function openDaubOptions() {
    const overlay = document.querySelector(".daub-options-overlay");
    if (overlay) {
      overlay.querySelector(".daub-design-grid").hidden = false;
      overlay.querySelector(".solid-color-panel").hidden = true;
      overlay.querySelector("header").textContent = "Choose a dauber design:";
      overlay.hidden = false;
    }
  }

  function mountDaubOptions() {
    if (document.querySelector(".daub-options-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "daub-options-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="daub-options-title">
        <header id="daub-options-title">Choose a dauber design:</header>
        <button type="button" class="daub-options-x" data-daub-options-x aria-label="Close dauber design">&times;</button>
        <div class="daub-design-grid">${daubOptions.map(([id, label, symbol]) => {
          const previewClass = solidColorDaubDesigns.has(id) ? ` ${id}` : "";
          return `<button type="button" data-daub-design="${id}"><i class="daub-preview${previewClass}">${symbol}</i><span>${label}</span></button>`;
        }).join("")}</div>
        <div class="solid-color-panel" hidden>
          <div class="solid-color-heading">
            <button type="button" data-solid-color-back aria-label="Back to dauber designs"><i class="bi bi-arrow-left" aria-hidden="true"></i><span>Back</span></button>
          <div><strong data-color-panel-title>Solid Color</strong><span>Customize every type of daub</span></div>
          </div>
          <div class="solid-color-fields">
            <label><input type="color" data-solid-color="pre"><span><strong>Player mark</strong><small>Before the number is called</small></span></label>
            <label><input type="color" data-solid-color="actual"><span><strong>Called number</strong><small>After the number is called</small></span></label>
            <label><input type="color" data-solid-color="free"><span><strong>Free space</strong><small>Every center free square</small></span></label>
          </div>
          <div class="solid-color-card-preview">
            <span style="--preview-color:var(--pre-daub)">PLAYER</span>
            <span style="--preview-color:var(--actual-daub)">CALLED</span>
            <span style="--preview-color:var(--free-space)">FREE</span>
          </div>
        </div>
        <label class="dealer-window-setting">
          <input type="checkbox" data-dealer-popout>
          <span><strong>Open Dealer in a separate window</strong><small>Disabled by default. Enable this to use a separate Dealer tab instead of the full-screen overlay.</small></span>
        </label>
        <footer><button type="button" data-daub-options-close>CONFIRM</button></footer>
        <div class="daub-discard-prompt" data-daub-discard-prompt hidden role="alertdialog" aria-modal="true" aria-labelledby="daub-discard-title">
          <section>
            <strong id="daub-discard-title">Discard unsaved changes?</strong>
            <p>Your dauber design changes will be returned to the choices you had before opening this window.</p>
            <div><button type="button" data-daub-keep>KEEP EDITING</button><button type="button" data-daub-discard>DISCARD</button></div>
          </section>
        </div>
      </section>
    `;
    let openingState = null;
    const captureState = () => ({
      design: savedDaubDesign(),
      colors: savedSolidColors(),
      dealerPopout: overlay.querySelector("[data-dealer-popout]")?.checked || false,
    });
    const statesMatch = (first, second) => Boolean(first && second)
      && first.design === second.design
      && first.dealerPopout === second.dealerPopout
      && first.colors.pre === second.colors.pre
      && first.colors.actual === second.colors.actual
      && first.colors.free === second.colors.free;
    const hasUnsavedChanges = () => !statesMatch(openingState, captureState());
    const closeDaubOptions = (confirmed = false) => {
      if (!confirmed && hasUnsavedChanges()) {
        overlay.querySelector("[data-daub-discard-prompt]").hidden = false;
        return;
      }
      overlay.hidden = true;
    };
    overlay.addEventListener("click", (event) => {
      const designButton = event.target.closest("[data-daub-design]");
      if (designButton) {
        applyDaubDesign(designButton.dataset.daubDesign);
        if (solidColorDaubDesigns.has(designButton.dataset.daubDesign)) {
          const designName = daubOptions.find(([id]) => id === designButton.dataset.daubDesign)?.[1] || "Solid Color";
          overlay.querySelector(".daub-design-grid").hidden = true;
          overlay.querySelector(".solid-color-panel").hidden = false;
          overlay.querySelector("[data-color-panel-title]").textContent = designName;
          overlay.querySelector("header").textContent = `Customize ${designName.replace(" (Solid Color)", "").toLowerCase()} colors:`;
        }
      }
      if (event.target.closest("[data-solid-color-back]")) {
        overlay.querySelector(".daub-design-grid").hidden = false;
        overlay.querySelector(".solid-color-panel").hidden = true;
        overlay.querySelector("header").textContent = "Choose a dauber design:";
      }
      if (event.target.closest("[data-daub-options-close]")) closeDaubOptions(true);
      if (event.target.closest("[data-daub-options-x]") || event.target === overlay) closeDaubOptions();
      if (event.target.closest("[data-daub-keep]")) overlay.querySelector("[data-daub-discard-prompt]").hidden = true;
      if (event.target.closest("[data-daub-discard]")) {
        if (openingState) {
          applyDaubDesign(openingState.design);
          applySolidColors(openingState.colors);
          overlay.querySelector("[data-dealer-popout]").checked = openingState.dealerPopout;
          try { window.localStorage.setItem(DEALER_POPOUT_STORAGE_KEY, String(openingState.dealerPopout)); } catch {}
        }
        overlay.querySelector("[data-daub-discard-prompt]").hidden = true;
        overlay.hidden = true;
      }
    });
    overlay.addEventListener("input", (event) => {
      if (event.target.matches("[data-dealer-popout]")) {
        try {
          window.localStorage.setItem(DEALER_POPOUT_STORAGE_KEY, String(event.target.checked));
        } catch {
          // The selection remains usable until this page closes.
        }
        return;
      }
      if (!event.target.matches("[data-solid-color]")) return;
      const colors = savedSolidColors();
      colors[event.target.dataset.solidColor] = event.target.value;
      applySolidColors(colors);
    });
    document.body.append(overlay);
    try {
      overlay.querySelector("[data-dealer-popout]").checked =
        window.localStorage.getItem(DEALER_POPOUT_STORAGE_KEY) === "true";
    } catch {
      overlay.querySelector("[data-dealer-popout]").checked = false;
    }
    applySolidColors();
    applyDaubDesign(savedDaubDesign());
    const originalOpen = openDaubOptions;
    openDaubOptions = function openDaubOptionsWithSnapshot() {
      openingState = captureState();
      overlay.querySelector("[data-daub-discard-prompt]").hidden = true;
      originalOpen();
    };
  }

  function mountBallTapControl() {
    if (document.documentElement.dataset.ballTapReady === "true") return;
    document.documentElement.dataset.ballTapReady = "true";
    document.addEventListener("click", (event) => {
      if (event.target.closest("#app button")?.textContent?.trim().match(/^player floor$/i)) {
        document.documentElement.classList.remove("dealer-overlay-open");
      }
      const ball = event.target.closest(
        ".planet-current-ball, #app .bingo-ball, #app .dealer-current-ball, #app .audience-ball"
      );
      if (ball && typeof window.bingoBallTap === "function") window.bingoBallTap();
    });
  }

  function returnToPlayerWindow() {
    const playerUrl = new URL(window.location.href);
    playerUrl.searchParams.delete("screen");
    playerUrl.searchParams.delete("player");
    playerUrl.searchParams.set("build", "20260731-classic-header-final");

    if (window.opener && !window.opener.closed) {
      let playerWindow = window.opener;
      try {
        playerWindow = window.opener.top || window.opener;
      } catch {
        // The immediate opener is still usable.
      }
      playerWindow.postMessage({ type: "muha-bingo-focus-player-hall" }, window.location.origin);
      playerWindow.focus();
      window.setTimeout(() => window.location.replace(playerUrl.href), 250);
      window.close();
      return;
    }
    window.location.replace(playerUrl.href);
  }

  function mountPlayerReturnButton() {
    if (!isPopout || document.querySelector(".return-to-player-window")) return;
    const button = document.createElement("button");
    button.className = "return-to-player-window";
    button.type = "button";
    button.innerHTML = '<i class="bi bi-arrow-left-circle-fill" aria-hidden="true"></i><span>RETURN TO PLAYER HALL</span>';
    button.addEventListener("click", returnToPlayerWindow);
    document.body.append(button);
  }

  function mountPopoutToolbar() {
    if (!isPopout) return;
    let toolbar = document.querySelector(".bingo-popout-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("nav");
      toolbar.className = "bingo-popout-toolbar";
      toolbar.setAttribute("aria-label", "Bingo window controls");
      document.body.append(toolbar);
    }
    const returnButton = document.querySelector(".return-to-player-window");
    const themeSwitcher = document.querySelector(".bingo-theme-switcher");
    if (returnButton && returnButton.parentElement !== toolbar) toolbar.prepend(returnButton);
    if (themeSwitcher && themeSwitcher.parentElement !== toolbar) toolbar.append(themeSwitcher);
  }

  document.addEventListener("input", saveCardCount, true);
  document.addEventListener("change", saveCardCount, true);
  document.addEventListener("change", saveCardSerialSetting, true);
  document.addEventListener("click", saveNativeCardView, true);
  document.addEventListener("click", recordManualClaimDecision, true);
  document.addEventListener("click", (event) => {
    if (event.target.closest("#app .number-cell")) window.setTimeout(queueSpecialBallSync, 0);
    if (event.target.closest("#app button")) {
      window.setTimeout(syncStartButtons, 50);
      window.setTimeout(syncStartButtons, 500);
    }
  }, true);
  document.addEventListener("keydown", blockCallingShortcutAfterBingo, true);
  window.addEventListener("storage", (event) => {
    if (event.key === SPECIAL_BALL_STORAGE_KEY) {
      enhanceSpecialBallSettings();
      queueSpecialBallSync();
      syncOtherThemeWaitingFlashboard();
      window.dispatchEvent(new CustomEvent("muha-bingo-special-balls-changed"));
      return;
    }
    if (event.key === SCHEDULE_STORAGE_KEY) {
      renderSchedule();
      startDueScheduledGame();
      return;
    }
    if (event.key === PRIZES_STORAGE_KEY) renderPrizes();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (isPopout) {
        mountThemeSwitcher();
        mountPlayerReturnButton();
        mountPopoutToolbar();
        mountViewOverlay();
        mountScheduleOverlay();
        mountPrizesOverlay();
        observeSpecialBalls();
        restoreSavedPreferences();
        return;
      }
      mountThemeSwitcher();
      mountViewOverlay();
      mountDaubOptions();
      mountPurchaseOverlay();
      mountScheduleOverlay();
      mountPrizesOverlay();
      mountBallTapControl();
      mountOtherThemeWaitingFlashboard();
      observeSpecialBalls();
      restoreSavedPreferences();
    }, { once: true });
  } else {
    if (isPopout) {
      mountThemeSwitcher();
      mountPlayerReturnButton();
      mountPopoutToolbar();
      mountViewOverlay();
      mountScheduleOverlay();
      mountPrizesOverlay();
      observeSpecialBalls();
      restoreSavedPreferences();
      return;
    }
    mountThemeSwitcher();
    mountViewOverlay();
    mountDaubOptions();
    mountPurchaseOverlay();
    mountScheduleOverlay();
    mountPrizesOverlay();
    mountBallTapControl();
    mountOtherThemeWaitingFlashboard();
    observeSpecialBalls();
    restoreSavedPreferences();
  }
})();
