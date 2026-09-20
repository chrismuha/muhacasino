const games = [
  ["big-money-deluxe", "Big Money Deluxe"],
  ["neon-slots", "Neon Slots"],
  ["pretty-penny", "Pretty Penny"],
  ["treasurepots", "Treasure Pots"],
];

const money = (value) => `$${Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const statistics = games.map(([gameId, title]) => {
  let stats = {};
  try {
    stats = JSON.parse(localStorage.getItem(`muhaCasino.slotExperience.${gameId}.v1`) || "{}");
  } catch { }

  const wagered = Math.max(0, Number(stats.lifetimeWagered) || 0);
  const won = Math.max(0, Number(stats.lifetimeWon) || 0);
  const lost = Math.max(0, Number(stats.lifetimeLost) || 0);
  const net = won - wagered;
  return { gameId, title, wagered, won, lost, net };
});

const allTime = statistics.reduce((totals, game) => ({
  gameId: "all-time",
  title: "All Time",
  wagered: totals.wagered + game.wagered,
  won: totals.won + game.won,
  lost: totals.lost + game.lost,
  net: totals.net + game.net,
}), { wagered: 0, won: 0, lost: 0, net: 0 });

const filters = [allTime, ...statistics];
const filterRoot = document.querySelector("#statsFilter");
const grid = document.querySelector("#overallStatsGrid");

function renderStatistics(selectedId) {
  const selected = filters.find(({ gameId }) => gameId === selectedId) || allTime;
  const card = document.createElement("article");
  card.className = "overall-stat-card";
  card.innerHTML = `<h2>${selected.title}</h2><div><span>Won overall</span><strong>${money(selected.won)}</strong></div><div><span>Lost overall</span><strong>${money(selected.lost)}</strong></div><div><span>Wagered overall</span><strong>${money(selected.wagered)}</strong></div><div><span>Net</span><strong class="${selected.net >= 0 ? "positive" : "negative"}">${money(selected.net)}</strong></div>`;
  grid?.replaceChildren(card);
  filterRoot?.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.game === selected.gameId));
  });
}

filterRoot?.replaceChildren(...filters.map(({ gameId, title }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.game = gameId;
  button.textContent = title;
  button.setAttribute("aria-pressed", "false");
  return button;
}));

filterRoot?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-game]");
  if (button) renderStatistics(button.dataset.game);
});

renderStatistics("all-time");
