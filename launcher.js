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
  bingo: {
    title: "Lucky Hall Bingo",
    subtitle: "75-Ball Bingo",
    path: "games/bingo/index.html",
    className: "card-bingo",
    reels: "B I N G O",
    icon: "●",
    categories: ["hall", "feature"],
  },
};

const categoryNames = {
  classic: "Casino Classics",
  feature: "Feature Games",
  jackpot: "Jackpot Chase",
  hall: "Casino Hall",
};

const launcher = document.querySelector("#launcher");
const gameView = document.querySelector("#gameView");
const gameFrame = document.querySelector("#gameFrame");
const currentGame = document.querySelector("#currentGame");
const backButton = document.querySelector("#backButton");
const slides = [...document.querySelectorAll(".hero-slide")];
const heroDots = document.querySelector("#heroDots");
const categoryResults = document.querySelector("#categoryResults");
const categoryTitle = document.querySelector("#categoryTitle");
const categoryRail = document.querySelector("#categoryRail");
let activeSlide = 0;
let sliderTimer;

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

function showLauncher() {
  gameFrame.src = "about:blank";
  gameView.hidden = true;
  launcher.hidden = false;
  document.title = "Muha Casino";
  history.replaceState(null, "", window.location.pathname);
  restartSlider();
}

function launchGame(gameId, updateHistory = true) {
  const game = games[gameId];
  if (!game) return;

  window.clearInterval(sliderTimer);
  currentGame.textContent = game.title;
  gameFrame.title = game.title;
  gameFrame.src = game.path;
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
  if (gameButton) launchGame(gameButton.dataset.game);

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

window.addEventListener("popstate", () => {
  const gameId = window.location.hash.slice(1);
  if (games[gameId]) launchGame(gameId, false);
  else showLauncher();
});

showSlide(0);
restartSlider();

const requestedGame = window.location.hash.slice(1);
if (games[requestedGame]) launchGame(requestedGame, false);
