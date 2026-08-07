(() => {
  const launchParameters = new URLSearchParams(window.location.search);
  if (launchParameters.has("screen") || launchParameters.has("player")) return;

  let renderQueued = false;
  const cardSerialStartKey = "muha-bingo-card-serial-start";
  const cardSerialStepKey = "muha-bingo-card-serial-step";

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

    const wall = shell.querySelector(".planet-card-wall");
    const empty = shell.querySelector(".planet-empty");
    wall.replaceChildren(...sourceCards.map(cardCopy));
    empty.hidden = sourceCards.length > 0;

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
    shell.querySelector(".planet-current-ball strong").textContent = latestText;
    renderNumberBoard(shell.querySelector(".planet-number-board"), activeCalledNumbers(sourceCards), latestNumber);

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
          <span class="muha-bingo-mark" aria-hidden="true">M</span>
          <span class="muha-bingo-words"><b>MUHA</b><span>BINGO</span></span>
        </div>
        <button class="planet-mode-trigger" type="button" aria-label="Use dark mode">
          <span aria-hidden="true">☾</span> DARK
        </button>
      </header>
      <section class="planet-play-surface">
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
        <section class="planet-pattern-box" aria-label="Current winning pattern">
          <div class="planet-pattern-copy"></div>
          <div class="planet-pattern-legend" aria-label="Card mark legend">
            <span><i class="legend-dot called-dot"></i>Called</span>
            <span><i class="legend-dot marked-dot"></i>Player marked</span>
            <span><i class="legend-dot free-dot"></i>Free space</span>
            <small>Good luck &amp; have fun!</small>
          </div>
        </section>
        <div class="planet-current-ball"><small>-</small><strong>#</strong></div>
        <div class="planet-credit"><strong>∞</strong><span>CREDITS</span></div>
      </footer>
    `;
    shell.addEventListener("click", (event) => {
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
    const footerControls = document.querySelector(".planet-footer-controls");
    if (footerControls) shell.querySelector(".planet-status-bar").append(footerControls);

    const hallResizeObserver = new ResizeObserver(() => window.requestAnimationFrame(fitPlanetHallText));
    hallResizeObserver.observe(shell);
    new MutationObserver(() => window.requestAnimationFrame(fitPlanetHallText)).observe(shell, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.addEventListener("storage", (event) => {
      if ([cardSerialStartKey, cardSerialStepKey].includes(event.key)) queueSync();
    });

    const sourceApp = document.querySelector("#app");
    if (sourceApp) new MutationObserver(queueSync).observe(sourceApp, { childList: true, subtree: true, attributes: true });
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

  function enforceDealerHeaderContrast() {
    contrastFrame = 0;
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
