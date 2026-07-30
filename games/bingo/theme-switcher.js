(() => {
  const STORAGE_KEY = "muha-bingo-theme";
  const DAUB_STORAGE_KEY = "muha-bingo-daub-design";
  const SOLID_COLOR_STORAGE_KEY = "muha-bingo-solid-colors";
  const VIEW_COUNT_STORAGE_KEY = "muha-bingo-view-count";
  const CARD_COUNT_STORAGE_KEY = "muha-bingo-card-count";
  const launchParameters = new URLSearchParams(window.location.search);
  const isPopout = launchParameters.has("screen") || launchParameters.has("player");
  const themes = ["planet", "classic", "current"];
  const daubDesigns = [
    "solid", "splat", "pig", "duck", "star", "circle", "planet", "confetti",
    "firework", "dynamite", "cowboy", "clover", "diamond", "lightning",
  ];
  const defaultSolidColors = {
    pre: "#ed3d35",
    actual: "#126eff",
    free: "#f5cc4e",
  };

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
      if (value === "vault") return "classic";
      return themes.includes(value) ? value : "planet";
    } catch {
      return "planet";
    }
  }

  function setHallControlsCollapsed(collapsed) {
    document.documentElement.classList.toggle("hall-controls-collapsed", collapsed);
    const controlsToggle = document.querySelector(".hall-controls-toggle");
    if (!controlsToggle) return;
    controlsToggle.innerHTML = collapsed
      ? '<i class="bi bi-chevron-left" aria-hidden="true"></i>'
      : '<i class="bi bi-chevron-right" aria-hidden="true"></i>';
    controlsToggle.setAttribute("aria-expanded", String(!collapsed));
    controlsToggle.setAttribute(
      "aria-label",
      collapsed ? "Show Hall controls" : "Hide Hall controls"
    );
  }

  function applyTheme(theme) {
    const selectedTheme = themes.includes(theme) ? theme : "planet";
    document.documentElement.classList.remove("hall-native-controls-open");
    document.querySelector(".hall-overlay-background")?.remove();
    if (selectedTheme !== "planet") {
      setHallControlsCollapsed(false);
    }
    document.documentElement.dataset.bingoTheme = selectedTheme;
    const app = document.querySelector("#app");
    if (app) {
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
  }

  window.applyBingoTheme = applyTheme;
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && event.newValue) applyTheme(event.newValue);
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== "muha-bingo-theme") return;
    applyTheme(event.data.theme);
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
    document.documentElement.dataset.daubDesign = selectedDesign;
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
    if (selectedDesign === "solid" || selectedDesign === "circle") applySolidColors();
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
        <button class="bingo-theme-option" type="button" data-theme="planet">Planet Hall 2</button>
        <button class="bingo-theme-option" type="button" data-theme="classic">Planet Hall</button>
        <button class="bingo-theme-option" type="button" data-theme="current">Classic</button>
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

    document.body.append(switcher);
    if (window.parent !== window && !isPopout) switcher.hidden = true;
    if (isPopout) switcher.hidden = false;
    mountPlayerHallControls();
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
        prepareAndStartDefaultRound().then((started) => {
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

    if (action === "setup") {
      openDealerWindow();
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
      if (!clickMatchingControl(/setup|prepare|new round/i)) {
        showHallMessage("PURCHASE", "Prepare player cards in Game Setup before adding cards to the session.");
      }
      return;
    }

    if (action === "next") {
      const next = document.querySelector(".card-pager button:last-of-type");
      if (next && !next.disabled) next.click();
      else showHallMessage("NEXT", "There are no additional card pages to display.");
      return;
    }

    if (action === "schedule") {
      const game = document.querySelector(".footer-pattern strong, .pattern-panel strong")?.textContent?.trim();
      showHallMessage("SCHEDULE", game ? `Current session pattern: ${game}.` : "Prepare a round to display the active game schedule.");
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
      <button class="hall-setup-button" type="button" data-hall-action="setup"><i class="bi bi-sliders" aria-hidden="true"></i><span>CONTROLS / SETUP</span></button>
      <button type="button" data-hall-action="view"><i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i><span>VIEW</span></button>
      <button type="button" data-hall-action="options"><i class="bi bi-gear-fill" aria-hidden="true"></i><span>OPTIONS</span></button>
      <button type="button" data-hall-action="trade"><i class="bi bi-arrow-left-right" aria-hidden="true"></i><span>TRADE</span></button>
      <button type="button" data-hall-action="schedule"><i class="bi bi-calendar3" aria-hidden="true"></i><span>SCHEDULE</span></button>
      <button type="button" data-hall-action="purchase"><i class="bi bi-cart-fill" aria-hidden="true"></i><span>PURCHASE</span></button>
      <button type="button" data-hall-action="next"><span>NEXT</span><i class="bi bi-arrow-right-circle-fill" aria-hidden="true"></i></button>
    `;
    const classicControls = document.createElement("nav");
    classicControls.className = "player-hall-controls classic-hall-controls";
    classicControls.setAttribute("aria-label", "Planet Hall controls");
    classicControls.innerHTML = controlsMarkup;

    const planetControls = document.createElement("nav");
    planetControls.className = "player-hall-controls planet-footer-controls";
    planetControls.setAttribute("aria-label", "Planet Hall 2 controls");
    planetControls.innerHTML = `
      <button class="hall-start-button" type="button" data-hall-action="start"><i class="bi bi-play-fill" aria-hidden="true"></i><span>PLAY SESSION</span></button>
      <button class="hall-dealer-button" type="button" data-hall-action="dealer"><i class="bi bi-person-badge-fill" aria-hidden="true"></i><span>DEALER</span></button>
      <button class="hall-setup-button" type="button" data-hall-action="setup"><i class="bi bi-sliders" aria-hidden="true"></i><span>CONTROLS / SETUP</span></button>
      <button type="button" data-hall-action="view"><i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i><span>VIEW</span></button>
      <button type="button" data-hall-action="options"><i class="bi bi-gear-fill" aria-hidden="true"></i><span>OPTIONS</span></button>
      <button type="button" data-hall-action="purchase"><i class="bi bi-cart-fill" aria-hidden="true"></i><span>PURCHASE</span></button>
      <button type="button" data-hall-action="schedule"><i class="bi bi-calendar3" aria-hidden="true"></i><span>SCHEDULE</span></button>
    `;

    [classicControls, planetControls].forEach((controls) => {
      controls.addEventListener("click", (event) => {
        const button = event.target.closest("[data-hall-action]");
        if (button) handleHallAction(button.dataset.hallAction);
      });
      document.body.append(controls);
    });

    const universalStart = document.createElement("button");
    universalStart.className = "universal-start-button";
    universalStart.type = "button";
    universalStart.dataset.hallAction = "start";
    universalStart.innerHTML = '<i class="bi bi-play-fill" aria-hidden="true"></i><span>START GAME</span>';
    universalStart.addEventListener("click", () => handleHallAction("start"));
    document.body.append(universalStart);

    const universalSetup = document.createElement("button");
    universalSetup.className = "universal-setup-button";
    universalSetup.type = "button";
    universalSetup.dataset.hallAction = "setup";
    universalSetup.innerHTML = '<i class="bi bi-sliders" aria-hidden="true"></i><span>CONTROLS</span>';
    universalSetup.addEventListener("click", () => handleHallAction("setup"));
    document.body.append(universalSetup);

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

  function savedCount(key, fallback = 2) {
    try {
      const value = Number(window.localStorage.getItem(key));
      return value >= 1 && value <= 6 ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function restoreCardView() {
    const selectedCount = savedCount(VIEW_COUNT_STORAGE_KEY);
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

  function updateBingoProximity() {
    const cards = [...document.querySelectorAll(
      "#app .bingo-card:not(.preview-card):not(.verification-full-card)"
    )];
    const winners = [];

    cards.forEach((card) => {
      const hint = card.querySelector(".card-hint");
      const hintText = hint?.textContent?.trim() || "";
      const match = hintText.match(/^(\d+)\s+left until Bingo/i);
      const away = /^Bingo!/i.test(hintText) ? 0 : match ? Number(match[1]) : null;
      card.classList.toggle("bingo-ready", away === 0);
      card.classList.toggle("near-bingo", away === 1 || away === 2);
      if (away == null || away > 2) {
        card.removeAttribute("data-bingo-away");
      } else {
        card.dataset.bingoAway = String(away);
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
        winners.push(card.querySelector(".card-id")?.textContent?.trim() || `Card ${cards.indexOf(card) + 1}`);
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
  }

  function syncStartButtons() {
    const controls = [...document.querySelectorAll("#app button")];
    const isRunning = controls.some((button) => /stop automatic play|pause auto call/i.test(button.textContent));
    const hasCards = Boolean(document.querySelector(
      "#app .bingo-card:not(.preview-card):not(.verification-full-card)"
    ));
    const label = isRunning ? "PAUSE SESSION" : hasCards ? "PLAY SESSION" : "START GAME";
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
    document.body.append(viewButton);

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
        <div class="daub-design-grid">
          <button type="button" data-daub-design="solid"><i class="daub-preview solid"></i><span>Solid Color</span></button>
          <button type="button" data-daub-design="splat"><i class="daub-preview splat"></i><span>Splat</span></button>
          <button type="button" data-daub-design="pig"><i class="daub-preview">🐷</i><span>Pig</span></button>
          <button type="button" data-daub-design="duck"><i class="daub-preview">🦆</i><span>Duck</span></button>
          <button type="button" data-daub-design="star"><i class="daub-preview star">★</i><span>Star</span></button>
          <button type="button" data-daub-design="circle"><i class="daub-preview circle"></i><span>Circle</span></button>
          <button type="button" data-daub-design="planet"><i class="daub-preview">🪐</i><span>Planet</span></button>
          <button type="button" data-daub-design="confetti"><i class="daub-preview">🎉</i><span>Confetti</span></button>
          <button type="button" data-daub-design="firework"><i class="daub-preview">🎆</i><span>Firework</span></button>
          <button type="button" data-daub-design="dynamite"><i class="daub-preview">🧨</i><span>Dynamite</span></button>
          <button type="button" data-daub-design="cowboy"><i class="daub-preview">🤠</i><span>Cowboy</span></button>
          <button type="button" data-daub-design="clover"><i class="daub-preview">🍀</i><span>Clover</span></button>
          <button type="button" data-daub-design="diamond"><i class="daub-preview">💎</i><span>Diamond</span></button>
          <button type="button" data-daub-design="lightning"><i class="daub-preview">⚡</i><span>Lightning</span></button>
        </div>
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
        <footer><button type="button" data-daub-options-close>CONFIRM</button></footer>
      </section>
    `;
    overlay.addEventListener("click", (event) => {
      const designButton = event.target.closest("[data-daub-design]");
      if (designButton) {
        applyDaubDesign(designButton.dataset.daubDesign);
        if (designButton.dataset.daubDesign === "solid" || designButton.dataset.daubDesign === "circle") {
          const panelName = designButton.dataset.daubDesign === "circle" ? "Circle" : "Solid Color";
          overlay.querySelector(".daub-design-grid").hidden = true;
          overlay.querySelector(".solid-color-panel").hidden = false;
          overlay.querySelector("[data-color-panel-title]").textContent = panelName;
          overlay.querySelector("header").textContent = `Customize ${panelName.toLowerCase()} colors:`;
        }
      }
      if (event.target.closest("[data-solid-color-back]")) {
        overlay.querySelector(".daub-design-grid").hidden = false;
        overlay.querySelector(".solid-color-panel").hidden = true;
        overlay.querySelector("header").textContent = "Choose a dauber design:";
      }
      if (event.target.closest("[data-daub-options-close]") || event.target === overlay) overlay.hidden = true;
    });
    overlay.addEventListener("input", (event) => {
      if (!event.target.matches("[data-solid-color]")) return;
      const colors = savedSolidColors();
      colors[event.target.dataset.solidColor] = event.target.value;
      applySolidColors(colors);
    });
    document.body.append(overlay);
    applySolidColors();
    applyDaubDesign(savedDaubDesign());
  }

  function mountBallTapControl() {
    if (document.documentElement.dataset.ballTapReady === "true") return;
    document.documentElement.dataset.ballTapReady = "true";
    document.addEventListener("click", (event) => {
      const ball = event.target.closest(
        ".planet-current-ball, #app .bingo-ball, #app .dealer-current-ball, #app .audience-ball"
      );
      if (ball && typeof window.bingoBallTap === "function") window.bingoBallTap();
    });
  }

  document.addEventListener("input", saveCardCount, true);
  document.addEventListener("change", saveCardCount, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (isPopout) {
        applyTheme(savedTheme());
        mountViewOverlay();
        restoreSavedPreferences();
        return;
      }
      mountThemeSwitcher();
      mountViewOverlay();
      mountDaubOptions();
      mountBallTapControl();
      restoreSavedPreferences();
    }, { once: true });
  } else {
    if (isPopout) {
      applyTheme(savedTheme());
      mountViewOverlay();
      restoreSavedPreferences();
      return;
    }
    mountThemeSwitcher();
    mountViewOverlay();
    mountDaubOptions();
    mountBallTapControl();
    restoreSavedPreferences();
  }
})();
