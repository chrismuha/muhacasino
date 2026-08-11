(() => {
  const launchParameters = new URLSearchParams(window.location.search);
  if (launchParameters.has("screen") || launchParameters.has("player")) return;

  let renderQueued = false;
  const footerCollapsedStorageKey = "muha-bingo-planet-footer-collapsed";
  const cardSerialStartKey = "muha-bingo-card-serial-start";
  const cardSerialStepKey = "muha-bingo-card-serial-step";
  const specialBallStorageKey = "muha-bingo-special-ball-settings";

  function specialBallDisplaySettings() {
    try {
      return {
        hotEnabled: false,
        hotNumber: 1,
        hotMultiplier: 2,
        birthdayEnabled: false,
        birthdayNumber: 1,
        birthdayDate: "",
        birthdayMultiplier: 2,
        ...JSON.parse(window.localStorage.getItem(specialBallStorageKey) || "{}"),
      };
    } catch {
      return {};
    }
  }

  function birthdayDisplayIsActive(settings) {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return Boolean(settings.birthdayEnabled && settings.birthdayDate?.slice(5) === monthDay);
  }

  function syncSpecialBallDisplay(shell) {
    const settings = specialBallDisplaySettings();
    const hotFeature = shell.querySelector(".planet-idle-feature.hot-ball");
    const birthdayFeature = shell.querySelector(".planet-idle-feature.birthday-ball");
    const birthdayActive = birthdayDisplayIsActive(settings);
    const hotBall = hotFeature.querySelector(".planet-idle-ball");
    hotBall.textContent = settings.hotEnabled ? String(settings.hotNumber) : "";
    hotBall.classList.toggle("is-placeholder", !settings.hotEnabled);
    hotFeature.querySelector("small").textContent = settings.hotEnabled ? `${settings.hotMultiplier}× PRIZE` : "OFF";
    hotFeature.classList.toggle("is-active", Boolean(settings.hotEnabled));
    const birthdayBall = birthdayFeature.querySelector(".planet-idle-ball");
    birthdayBall.textContent = birthdayActive ? String(settings.birthdayNumber) : "";
    birthdayBall.classList.toggle("is-placeholder", !birthdayActive);
    birthdayFeature.querySelector("small").textContent = birthdayActive
      ? `${settings.birthdayMultiplier}× PRIZE · ACTIVE TODAY`
      : settings.birthdayEnabled ? "SCHEDULED" : "OFF";
    birthdayFeature.classList.toggle("is-active", birthdayActive);
  }

  function savedPositiveInteger(key, fallback) {
    try {
      const value = Number(window.localStorage.getItem(key));
      return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function cardSerial(cardIndex) {
    const start = savedPositiveInteger(cardSerialStartKey, 1);
    const step = savedPositiveInteger(cardSerialStepKey, 1);
    return start + (cardIndex * step);
  }

  function numberFromCell(cell) {
    const value = cell.querySelector("strong")?.textContent?.trim();
    return /^\d+$/.test(value || "") ? Number(value) : null;
  }

  function cardCopy(sourceCard, cardIndex) {
    const copy = sourceCard.cloneNode(true);
    copy.classList.add("planet-card");
    copy.dataset.sourceCard = String(cardIndex);
    copy.dataset.cardLabel = `#${cardSerial(cardIndex)}`;
    const distanceText = sourceCard.querySelector(".card-distance strong")?.textContent?.trim() || "";
    const distanceMatch = distanceText.match(/^(\d+)\s+(?:left until Bingo|Away)$/i);
    copy.dataset.cardAway = /^Bingo!/i.test(distanceText)
      ? "BINGO!"
      : distanceMatch
        ? `${distanceMatch[1]} Away`
        : "— Away";
    copy.querySelectorAll("button.number-cell").forEach((cell, cellIndex) => {
      cell.dataset.sourceCell = String(cellIndex);
      cell.removeAttribute("tabindex");
    });
    return copy;
  }

  function activeCalledNumbers(sourceCards) {
    const called = new Set();
    sourceCards.forEach((card) => {
      card.querySelectorAll(".number-cell.called").forEach((cell) => {
        const number = numberFromCell(cell);
        if (number) called.add(number);
      });
    });
    return called;
  }

  function renderNumberBoard(board, calledNumbers, latestNumber) {
    board.replaceChildren();
    for (let number = 1; number <= 75; number += 1) {
      const cell = document.createElement("span");
      cell.textContent = String(number);
      cell.classList.toggle("called", calledNumbers.has(number));
      cell.classList.toggle("latest", number === latestNumber);
      board.append(cell);
    }
  }

  function syncPlanetHall() {
    renderQueued = false;
    const shell = document.querySelector(".planet-hall-shell");
    const sourceCards = [...document.querySelectorAll("#app .bingo-card:not(.preview-card):not(.verification-full-card)")];
    if (!shell) return;

    const sourceAppShell = document.querySelector("#app .app-shell");
    const appearance = sourceAppShell?.classList.contains("theme-light") ? "light" : "dark";
    const legendInk = appearance === "light" ? "#17243a" : "#ffffff";
    shell.dataset.appearance = appearance;
    shell.querySelectorAll(".planet-legend-item, .planet-legend-label").forEach((label) => {
      label.style.setProperty("color", legendInk, "important");
      label.style.setProperty("-webkit-text-fill-color", legendInk, "important");
      label.style.setProperty("text-shadow", "none", "important");
      label.style.setProperty("opacity", "1", "important");
    });
    shell.querySelectorAll(".planet-free-item, .planet-free-item .planet-legend-label").forEach((freeLabel) => {
      freeLabel.style.setProperty("color", legendInk, "important");
      freeLabel.style.setProperty("-webkit-text-fill-color", legendInk, "important");
    });

    const wall = shell.querySelector(".planet-card-wall");
    const empty = shell.querySelector(".planet-empty");
    wall.replaceChildren(...sourceCards.map(cardCopy));
    empty.hidden = sourceCards.length > 0;

    const roundActive = document.documentElement.classList.contains("dealer-round-active");
    const idleFlashboard = shell.querySelector(".planet-idle-flashboard");
    shell.classList.toggle("planet-round-idle", !roundActive);
    if (idleFlashboard) idleFlashboard.hidden = roundActive;
    syncSpecialBallDisplay(shell);

    const sourceBall = document.querySelector(
      "#app .bingo-ball, #app .dealer-current-ball, #app .audience-ball"
    );
    const latestText = sourceBall?.querySelector("strong")?.textContent?.trim() || "#";
    const latestLetter = sourceBall?.querySelector("span, small")?.textContent?.trim() || "-";
    const latestNumber = /^\d+$/.test(latestText) ? Number(latestText) : null;
    const ballMarker = shell.querySelector(".planet-current-ball small");
    ballMarker.textContent = latestNumber ? latestLetter : "-";
    ballMarker.classList.toggle("is-placeholder", !latestNumber);
    ballMarker.closest(".planet-current-ball")?.classList.toggle("has-placeholder", !latestNumber);
    const currentBall = shell.querySelector(".planet-current-ball");
    currentBall.querySelector("strong").textContent = latestNumber ? latestText : "#";
    currentBall.setAttribute("aria-label", latestNumber ? `Current ball ${latestLetter} ${latestText}` : "No ball called yet");
    renderNumberBoard(shell.querySelector(".planet-number-board"), activeCalledNumbers(sourceCards), latestNumber);
    renderNumberBoard(shell.querySelector(".planet-idle-number-board"), activeCalledNumbers(sourceCards), latestNumber);

    const patternCopy = shell.querySelector(".planet-pattern-copy");
    const sourcePattern = document.querySelector("#app .footer-pattern");
    if (patternCopy && sourcePattern) {
      patternCopy.replaceChildren(sourcePattern.cloneNode(true));
    }

    const darkMode = document.querySelector("#app .app-shell")?.classList.contains("theme-dark");
    const modeButton = shell.querySelector(".planet-mode-trigger");
    if (modeButton) {
      modeButton.innerHTML = darkMode
        ? '<span aria-hidden="true">☀</span> LIGHT'
        : '<span aria-hidden="true">☾</span> DARK';
      modeButton.setAttribute("aria-label", darkMode ? "Use light mode" : "Use dark mode");
    }
  }

  function queueSync() {
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(syncPlanetHall);
  }

  function fitTextToWidth(element, availableWidth, maximumSize, minimumSize) {
    if (!element || availableWidth <= 0) return;
    let size = maximumSize;
    element.style.fontSize = `${size}px`;
    while (size > minimumSize && element.scrollWidth > availableWidth) {
      size -= 0.5;
      element.style.fontSize = `${size}px`;
    }
  }

  function fitPlanetHallText() {
    const shell = document.querySelector(".planet-hall-shell");
    if (!shell) return;
    shell.querySelectorAll(".planet-footer-controls button").forEach((button) => {
      const label = button.querySelector("span");
      if (!label) return;
      const icon = button.querySelector(".bi");
      const style = getComputedStyle(button);
      const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const gap = icon ? parseFloat(style.columnGap || style.gap || 0) : 0;
      const iconWidth = icon?.getBoundingClientRect().width || 0;
      const available = button.clientWidth - horizontalPadding - gap - iconWidth - 2;
      const isPrimary = button.matches(".hall-start-button, .hall-dealer-button");
      fitTextToWidth(label, available, isPrimary ? 20 : 16, 6);
    });

    const ball = shell.querySelector(".planet-current-ball");
    const number = ball?.querySelector("strong");
    if (ball && number) {
      const maximum = Math.min(48, Math.max(22, ball.clientHeight * 0.46));
      fitTextToWidth(number, ball.clientWidth * 0.72, maximum, 20);
    }
  }

  function mountPlanetHall() {
    if (document.querySelector(".planet-hall-shell")) return;
    const shell = document.createElement("main");
    shell.className = "planet-hall-shell";
    shell.innerHTML = `
      <header class="planet-terminal-header">
        <div class="muha-bingo-logo" role="img" aria-label="Muha Bingo">
          <span class="muha-bingo-words"><b>MUHA</b><span>BINGO</span></span>
        </div>
        <button class="planet-mode-trigger" type="button" aria-label="Use dark mode">
          <span aria-hidden="true">☾</span> DARK
        </button>
      </header>
      <section class="planet-play-surface">
        <section class="planet-idle-flashboard" aria-label="Waiting for dealer flashboard">
          <header>
            <div class="planet-idle-feature hot-ball">
              <span class="planet-idle-ball is-placeholder" aria-hidden="true"></span>
              <strong>HOT BALL</strong>
              <small>OFF</small>
            </div>
            <div class="planet-idle-message">
              <strong>WAITING FOR DEALER TO START GAME</strong>
              <span>The full flashboard will update when calling begins.</span>
            </div>
            <div class="planet-idle-feature birthday-ball">
              <span class="planet-idle-ball is-placeholder" aria-hidden="true"></span>
              <strong>BIRTHDAY BALL</strong>
              <small>OFF</small>
            </div>
          </header>
          <div class="planet-idle-number-board" aria-label="Bingo numbers 1 through 75"></div>
        </section>
        <div class="planet-card-area">
          <div class="planet-card-wall"></div>
          <div class="planet-empty">
            <strong>PLAYER HALL</strong>
            <span>Use PURCHASE to prepare cards for this session.</span>
          </div>
        </div>
        <aside class="planet-number-board" aria-label="Called number board"></aside>
      </section>
      <footer class="planet-status-bar">
        <button class="planet-footer-collapse" type="button" aria-expanded="true" aria-label="Collapse Hall footer" title="Collapse Hall footer">⌄</button>
        <section class="planet-pattern-box" aria-label="Current winning pattern">
          <div class="planet-pattern-copy"></div>
          <div class="planet-pattern-legend" aria-label="Card mark legend">
            <span class="planet-legend-item planet-called-item"><i class="planet-legend-swatch planet-called-swatch"></i><b class="planet-legend-label">Called</b></span>
            <span class="planet-legend-item planet-marked-item"><i class="planet-legend-swatch planet-marked-swatch"></i><b class="planet-legend-label">Player marked</b></span>
            <span class="planet-legend-item planet-free-item"><i class="planet-legend-swatch planet-free-swatch"></i><b class="planet-legend-label">Free space</b></span>
            <small>Good luck &amp; have fun!</small>
          </div>
        </section>
        <div class="planet-current-ball" aria-label="No ball called yet"><small>-</small><strong>#</strong></div>
        <div class="planet-credit"><strong>∞</strong><span>CREDITS</span></div>
      </footer>
    `;
    shell.addEventListener("click", (event) => {
      const footerCollapse = event.target.closest(".planet-footer-collapse");
      if (footerCollapse) {
        const collapsed = !shell.classList.contains("planet-footer-collapsed");
        shell.classList.toggle("planet-footer-collapsed", collapsed);
        footerCollapse.textContent = collapsed ? "⌃" : "⌄";
        footerCollapse.setAttribute("aria-expanded", String(!collapsed));
        footerCollapse.setAttribute("aria-label", collapsed ? "Expand Hall footer" : "Collapse Hall footer");
        footerCollapse.title = collapsed ? "Expand Hall footer" : "Collapse Hall footer";
        try {
          window.localStorage.setItem(footerCollapsedStorageKey, String(collapsed));
        } catch {
          // The footer still collapses when storage is unavailable.
        }
        return;
      }
      const modeTrigger = event.target.closest(".planet-mode-trigger");
      if (modeTrigger) {
        document.querySelector('#app .appearance-btn[aria-label^="Use "]')?.click();
        queueSync();
        return;
      }
      const copiedCell = event.target.closest("[data-source-cell]");
      if (!copiedCell) return;
      const copiedCard = copiedCell.closest("[data-source-card]");
      const sourceCards = [...document.querySelectorAll("#app .bingo-card:not(.preview-card):not(.verification-full-card)")];
      sourceCards[Number(copiedCard.dataset.sourceCard)]
        ?.querySelectorAll("button.number-cell")[Number(copiedCell.dataset.sourceCell)]
        ?.click();
    });
    document.body.append(shell);
    try {
      const footerCollapsed = window.localStorage.getItem(footerCollapsedStorageKey) === "true";
      shell.classList.toggle("planet-footer-collapsed", footerCollapsed);
      const footerCollapse = shell.querySelector(".planet-footer-collapse");
      footerCollapse.textContent = footerCollapsed ? "⌃" : "⌄";
      footerCollapse.setAttribute("aria-expanded", String(!footerCollapsed));
      footerCollapse.setAttribute("aria-label", footerCollapsed ? "Expand Hall footer" : "Collapse Hall footer");
      footerCollapse.title = footerCollapsed ? "Expand Hall footer" : "Collapse Hall footer";
    } catch {
      // Use the expanded footer when storage is unavailable.
    }
    const hallResizeObserver = new ResizeObserver(() => window.requestAnimationFrame(fitPlanetHallText));
    hallResizeObserver.observe(shell);
    new MutationObserver(() => window.requestAnimationFrame(fitPlanetHallText)).observe(shell, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.addEventListener("storage", (event) => {
      if ([cardSerialStartKey, cardSerialStepKey, specialBallStorageKey].includes(event.key)) queueSync();
    });
    window.addEventListener("muha-bingo-special-balls-changed", queueSync);

    const sourceApp = document.querySelector("#app");
    if (sourceApp) new MutationObserver(queueSync).observe(sourceApp, { childList: true, subtree: true, attributes: true });
    new MutationObserver(queueSync).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    queueSync();
    window.requestAnimationFrame(fitPlanetHallText);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountPlanetHall, { once: true });
  } else {
    mountPlanetHall();
  }
})();

/* Keep the Dealer Console eyebrow readable after every Vue/theme rerender. */
(() => {
  let contrastFrame = 0;

  const dealerShortcuts = [
    ["Space", "Call number"],
    ["P", "Play / pause"],
    ["U", "Undo"],
    ["V", "Verify claim"],
    ["A", "Audience"],
  ];

  function enhanceDealerShortcuts() {
    document.querySelectorAll("#app .dealer-layout .fixed-dealer-status > small:not([data-shortcuts-enhanced])").forEach((shortcutBar) => {
      shortcutBar.dataset.shortcutsEnhanced = "true";
      shortcutBar.classList.add("dealer-shortcuts");
      shortcutBar.replaceChildren(...dealerShortcuts.map(([key, label]) => {
        const item = document.createElement("span");
        const keycap = document.createElement("kbd");
        const copy = document.createElement("span");
        keycap.textContent = key;
        copy.textContent = label;
        item.append(keycap, copy);
        return item;
      }));
      shortcutBar.setAttribute("aria-label", "Dealer keyboard shortcuts");
    });
    document.querySelectorAll("#app .dealer-layout .fixed-dealer-status").forEach((statusBar) => {
      const dealerLayout = statusBar.closest(".dealer-layout");
      if (dealerLayout && statusBar !== dealerLayout.lastElementChild) dealerLayout.append(statusBar);
    });
  }

  function enforceDealerHeaderContrast() {
    contrastFrame = 0;
    enhanceDealerShortcuts();
    const shell = document.querySelector("#app .app-shell");
    const heading = shell?.querySelector(".dealer-layout .dealer-hero .eyebrow");
    if (!heading) return;
    const surface = heading.closest(".dealer-hero") || heading.closest(".dealer-layout");
    const rgb = getComputedStyle(surface).backgroundColor.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    const luminance = rgb?.length === 3 ? (rgb[0] * 0.299) + (rgb[1] * 0.587) + (rgb[2] * 0.114) : 0;
    const isClassicLight = shell.classList.contains("theme-light")
      && ["classic", "current"].includes(document.documentElement.dataset.bingoTheme);
    const color = isClassicLight || luminance > 140 ? "#000000" : "#ffffff";
    if (heading.style.getPropertyValue("color") !== color) {
      heading.style.setProperty("color", color, "important");
      heading.style.setProperty("-webkit-text-fill-color", color, "important");
      heading.style.setProperty("opacity", "1", "important");
    }
  }

  function queueDealerHeaderContrast() {
    if (contrastFrame) return;
    contrastFrame = window.requestAnimationFrame(enforceDealerHeaderContrast);
  }

  function observeDealerHeaderContrast() {
    const app = document.querySelector("#app");
    if (!app) return;
    new MutationObserver(queueDealerHeaderContrast).observe(app, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
    queueDealerHeaderContrast();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeDealerHeaderContrast, { once: true });
  } else {
    observeDealerHeaderContrast();
  }
})();
