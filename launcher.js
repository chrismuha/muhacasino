const games = {
  "big-money-deluxe": {
    title: "Big Money Deluxe",
    subtitle: "Classic Cash",
    path: "games/big-money-deluxe/index.html",
    className: "card-money",
    reels: "7 $ 7",
    icon: "💰",
    categories: ["classic", "jackpot"],
  },
  "neon-slots": {
    title: "Neon Slots",
    subtitle: "Electric Casino",
    path: "games/neon-slots/index.html",
    className: "card-neon",
    reels: "⚡ BAR ⚡",
    icon: "ϟ",
    categories: ["classic", "jackpot"],
  },
  "pretty-penny": {
    title: "Pretty Penny",
    subtitle: "Feature Game",
    path: "games/pretty-penny/index.html",
    className: "card-penny",
    reels: "¢ ¢ ¢",
    icon: "¢",
    categories: ["feature", "jackpot"],
  },
  treasurepots: {
    title: "TreasurePots",
    subtitle: "Hold & Link",
    path: "games/treasurepots/index.html",
    className: "card-treasure",
    reels: "☘ $ ☘",
    icon: "🏆",
    categories: ["feature", "jackpot"],
  },
  bingo: {
    title: "Muha Bingo",
    subtitle: "75-Ball Bingo",
    path: "games/bingo/index.html",
    className: "card-bingo",
    reels: "B I N G O",
    icon: "●",
    categories: ["hall", "feature"],
  },
  sorry: {
    title: "Sorry!",
    subtitle: "Classic Board Game",
    path: "games/sorry/index.html",
    className: "card-sorry",
    reels: "1 2 3 4",
    icon: "♟",
    categories: ["table"],
  },
  yahtzee: {
    title: "Yahtzee",
    subtitle: "Classic Dice Game",
    path: "games/yahtzee/index.html",
    className: "card-yahtzee",
    reels: "⚄ ⚅ ⚄",
    icon: "⚂",
    categories: ["table"],
  },
};

const categoryNames = {
  classic: "Casino Classics",
  feature: "Feature Games",
  jackpot: "Jackpot Chase",
  hall: "Casino Hall",
  table: "Tabletop Games",
};

const SITE_BUILD = "20260801-stable-release-v16";
const launcher = document.querySelector("#launcher");
const gameView = document.querySelector("#gameView");
const gameFrame = document.querySelector("#gameFrame");
const currentGame = document.querySelector("#currentGame");
const backButton = document.querySelector("#backButton");
const bingoThemeToolbar = document.querySelector("#bingoThemeToolbar");
const bingoThemeSelect = document.querySelector("#bingoThemeSelect");
const gameLoadState = document.querySelector("#gameLoadState");
const gameLoadTitle = document.querySelector("#gameLoadTitle");
const gameLoadMessage = document.querySelector("#gameLoadMessage");
const gameLoadActions = document.querySelector("#gameLoadActions");
const reloadGameButton = document.querySelector("#reloadGame");
const returnToLibraryFromError = document.querySelector("#returnToLibraryFromError");
const slides = [...document.querySelectorAll(".hero-slide")];
const heroDots = document.querySelector("#heroDots");
const categoryResults = document.querySelector("#categoryResults");
const categoryTitle = document.querySelector("#categoryTitle");
const categoryRail = document.querySelector("#categoryRail");
let activeSlide = 0;
let sliderTimer;
let lastHeroWheelAt = 0;
let activeGameId = null;
let gameLoadTimer = 0;
const bingoThemeChannel = "BroadcastChannel" in window
  ? new BroadcastChannel("muha-bingo-theme-sync")
  : null;

function removeLegacyCasinoCaching() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {
        // Direct network loading still works when service-worker access is restricted.
      });
  }
  if ("caches" in window) {
    window.caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith("muha-casino-"))
          .map((name) => window.caches.delete(name))
      ))
      .catch(() => {
        // Direct network loading still works when cache storage is restricted.
      });
  }
}

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle("active", slideIndex === activeSlide));
  [...heroDots.children].forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === activeSlide);
    dot.setAttribute("aria-current", dotIndex === activeSlide ? "true" : "false");
  });
}

function restartSlider() {
  window.clearInterval(sliderTimer);
  sliderTimer = window.setInterval(() => showSlide(activeSlide + 1), 6500);
}

slides.forEach((slide, index) => {
  const dot = document.createElement("button");
  dot.className = "hero-dot";
  dot.type = "button";
  dot.setAttribute("aria-label", `Show ${games[slide.dataset.heroGame].title}`);
  dot.addEventListener("click", () => {
    showSlide(index);
    restartSlider();
  });
  heroDots.append(dot);
});

document.querySelector("#heroPrevious").addEventListener("click", () => {
  showSlide(activeSlide - 1);
  restartSlider();
});

document.querySelector("#heroNext").addEventListener("click", () => {
  showSlide(activeSlide + 1);
  restartSlider();
});

function addHorizontalSwipe(element, onSwipe, { dragScroll = false } = {}) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let dragged = false;

  element.style.touchAction = "pan-y pinch-zoom";
  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = element.scrollLeft;
    dragged = false;
    element.setPointerCapture?.(pointerId);
  });
  element.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) < 8 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    dragged = true;
    if (dragScroll) element.scrollLeft = startScrollLeft - deltaX;
  });
  element.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    element.releasePointerCapture?.(pointerId);
    pointerId = null;
    if (!dragScroll && Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY)) {
      onSwipe(deltaX < 0 ? 1 : -1);
    }
  });
  element.addEventListener("pointercancel", () => { pointerId = null; });
  element.addEventListener("click", (event) => {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }, true);
}

addHorizontalSwipe(document.querySelector("#heroTrack"), (direction) => {
  showSlide(activeSlide + direction);
  restartSlider();
});

document.querySelector("#heroTrack").addEventListener("wheel", (event) => {
  if (Math.abs(event.deltaX) < 24 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
  event.preventDefault();
  if (Date.now() - lastHeroWheelAt < 500) return;
  lastHeroWheelAt = Date.now();
  showSlide(activeSlide + (event.deltaX > 0 ? 1 : -1));
  restartSlider();
}, { passive: false });

document.querySelectorAll(".game-rail").forEach((rail) => {
  addHorizontalSwipe(rail, () => {}, { dragScroll: true });
  rail.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    rail.scrollLeft += event.deltaX;
  }, { passive: false });
});

function showLauncher() {
  window.clearTimeout(gameLoadTimer);
  activeGameId = null;
  gameLoadState.hidden = true;
  gameFrame.src = "about:blank";
  gameView.hidden = true;
  launcher.hidden = false;
  bingoThemeToolbar.hidden = true;
  document.title = "Muha Casino";
  history.replaceState(null, "", window.location.pathname);
  restartSlider();
}

function showGameLoading() {
  window.clearTimeout(gameLoadTimer);
  gameLoadState.classList.remove("is-error");
  gameLoadTitle.textContent = "Loading game…";
  gameLoadMessage.textContent = "Preparing the latest version.";
  gameLoadActions.hidden = true;
  gameLoadState.hidden = false;
  gameLoadTimer = window.setTimeout(() => {
    showGameError("This game is taking too long to load.");
  }, 12000);
}

function showGameError(message = "The game could not be loaded.") {
  window.clearTimeout(gameLoadTimer);
  gameLoadState.classList.add("is-error");
  gameLoadTitle.textContent = "Game unavailable";
  gameLoadMessage.textContent = message;
  gameLoadActions.hidden = false;
  gameLoadState.hidden = false;
}

function activeGameUrl() {
  const game = games[activeGameId];
  if (!game) return null;
  const url = new URL(game.path, window.location.href);
  url.searchParams.set("build", SITE_BUILD);
  url.searchParams.set("reload", Date.now().toString());
  return url.href;
}

function launchGame(gameId, updateHistory = true) {
  const game = games[gameId];
  if (!game) return;

  window.clearInterval(sliderTimer);
  activeGameId = gameId;
  showGameLoading();
  currentGame.textContent = game.title;
  bingoThemeToolbar.hidden = gameId !== "bingo";
  if (gameId === "bingo") {
    try {
      const savedTheme = localStorage.getItem("muha-bingo-theme");
      bingoThemeSelect.value = ["planet", "classic", "current"].includes(savedTheme) ? savedTheme : "planet";
    } catch {
      bingoThemeSelect.value = "planet";
    }
  }
  gameFrame.title = game.title;
  gameFrame.src = activeGameUrl();
  launcher.hidden = true;
  gameView.hidden = false;
  document.title = `${game.title} | Muha Casino`;

  if (updateHistory) history.pushState({ gameId }, "", `#${gameId}`);
}

function gameCard(gameId) {
  const game = games[gameId];
  const card = document.createElement("button");
  card.className = `game-card ${game.className}`;
  card.type = "button";
  card.dataset.game = gameId;
  card.innerHTML = `
    <span class="card-visual"><span class="mini-reels">${game.reels}</span><i>${game.icon}</i></span>
    <span class="card-details"><strong>${game.title}</strong><small>${game.subtitle}</small></span>
    <span class="card-play">▶</span>
  `;
  return card;
}

function showCategory(categoryId) {
  categoryTitle.textContent = categoryNames[categoryId];
  categoryRail.replaceChildren();
  Object.entries(games)
    .filter(([, game]) => game.categories.includes(categoryId))
    .forEach(([gameId]) => categoryRail.append(gameCard(gameId)));
  categoryResults.hidden = false;
  categoryResults.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("click", (event) => {
  const gameButton = event.target.closest("[data-game]");
  if (gameButton) {
    launchGame(gameButton.dataset.game);
  }

  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) showCategory(categoryButton.dataset.category);

  const scrollButton = event.target.closest("[data-scroll-to]");
  if (scrollButton) document.querySelector(`#${scrollButton.dataset.scrollTo}`).scrollIntoView({ behavior: "smooth" });

  const railButton = event.target.closest("[data-rail]");
  if (railButton) {
    document.querySelector(`#${railButton.dataset.rail}`).scrollBy({
      left: Number(railButton.dataset.direction) * 390,
      behavior: "smooth",
    });
  }
});

document.querySelector("#closeCategory").addEventListener("click", () => {
  categoryResults.hidden = true;
  document.querySelector("#categories").scrollIntoView({ behavior: "smooth" });
});

backButton.addEventListener("click", showLauncher);

bingoThemeSelect.addEventListener("change", () => {
  const theme = bingoThemeSelect.value;
  try {
    localStorage.setItem("muha-bingo-theme", theme);
  } catch {
    // Bingo can still switch themes when storage is unavailable.
  }
  sendBingoTheme(theme);
});

function sendBingoTheme(theme) {
  gameFrame.contentWindow?.postMessage({
    type: "muha-bingo-theme",
    theme,
  }, window.location.origin);
}

bingoThemeChannel?.addEventListener("message", (event) => {
  const theme = event.data?.theme;
  if (!["planet", "classic", "current"].includes(theme)) return;
  bingoThemeSelect.value = theme;
  if (!bingoThemeToolbar.hidden) sendBingoTheme(theme);
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "muha-bingo-focus-player-hall") return;
  if (activeGameId !== "bingo") launchGame("bingo");
  window.focus();
  gameFrame.focus();
});

gameFrame.addEventListener("load", () => {
  if (!activeGameId || gameFrame.src === "about:blank") return;
  window.clearTimeout(gameLoadTimer);
  try {
    const frameDocument = gameFrame.contentDocument;
    const visibleText = frameDocument?.body?.innerText?.trim();
    const hasContent = Boolean(frameDocument?.body?.children?.length || visibleText);
    if (!hasContent) {
      showGameError("The game opened without any content.");
      return;
    }
  } catch {
    // Cross-origin frames cannot be inspected, but a completed load is still usable.
  }
  gameLoadState.hidden = true;
  if (!bingoThemeToolbar.hidden) {
    sendBingoTheme(bingoThemeSelect.value);
  }
});

gameFrame.addEventListener("error", () => {
  if (activeGameId) showGameError();
});

reloadGameButton.addEventListener("click", () => {
  const url = activeGameUrl();
  if (!url) return showLauncher();
  showGameLoading();
  gameFrame.src = url;
});

returnToLibraryFromError.addEventListener("click", showLauncher);

window.addEventListener("popstate", () => {
  const gameId = window.location.hash.slice(1);
  if (games[gameId]) launchGame(gameId, false);
  else showLauncher();
});

showSlide(0);
restartSlider();
removeLegacyCasinoCaching();

const requestedGame = window.location.hash.slice(1);
if (games[requestedGame]) launchGame(requestedGame, false);
